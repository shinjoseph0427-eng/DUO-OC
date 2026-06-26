// src/lib/soloMessages.js
// Solo 1:1 chat — cloned from the duoRoomMessages.js pattern, keyed by match_id.
// Does not modify the existing messages.js / duoRoomMessages.js.

import { supabase } from "./supabaseClient.js";
import { getMySoloMatches } from "./solo.js";

// profiles display fields — actual schema (name + photos[]).
const SENDER_FIELDS = "id, username, name, photos";

// ─────────────────────────────────────────────────────────
// 1. Fetch messages (oldest first)
// ─────────────────────────────────────────────────────────
export async function getSoloMessages(matchId, opts = {}) {
  const { limit = 50, before } = opts;

  let query = supabase
    .from("solo_messages")
    .select(`
      id, match_id, sender_user_id, content, is_system, created_at,
      sender:profiles!solo_messages_sender_user_id_fkey(${SENDER_FIELDS})
    `)
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────
// 2. Send a message
// ─────────────────────────────────────────────────────────
export async function getLatestSoloMessages(matchIds = []) {
  const ids = [...new Set(matchIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("solo_messages")
    .select(`
      id, match_id, sender_user_id, content, is_system, created_at,
      sender:profiles!solo_messages_sender_user_id_fkey(${SENDER_FIELDS})
    `)
    .in("match_id", ids)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const latest = new Map();
  for (const msg of data || []) {
    if (!latest.has(msg.match_id)) latest.set(msg.match_id, msg);
  }
  return latest;
}

export async function sendSoloMessage(matchId, content) {
  const trimmed = content?.trim();
  if (!trimmed) throw new Error("Message is empty.");

  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;
  if (!myId) throw new Error("Sign in required");

  const { data, error } = await supabase
    .from("solo_messages")
    .insert({ match_id: matchId, sender_user_id: myId, content: trimmed })
    .select(`
      id, match_id, sender_user_id, content, is_system, created_at,
      sender:profiles!solo_messages_sender_user_id_fkey(${SENDER_FIELDS})
    `)
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────
// 3. Realtime subscribe — returns a cleanup fn (matches existing pattern)
// ─────────────────────────────────────────────────────────
export function subscribeSoloMessages(matchId, onMessage) {
  const channel = supabase
    .channel(`solo_messages:${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "solo_messages",
        filter: `match_id=eq.${matchId}`,
      },
      async (payload) => {
        // System messages (e.g. "X left the chat") have no author — skip the
        // sender lookup so a null sender_user_id can't break the subscription.
        if (payload.new.is_system || !payload.new.sender_user_id) {
          onMessage({ ...payload.new, sender: null });
          return;
        }
        // realtime payload has no join, so fetch the sender separately.
        const { data: sender } = await supabase
          .from("profiles")
          .select(SENDER_FIELDS)
          .eq("id", payload.new.sender_user_id)
          .single();
        onMessage({ ...payload.new, sender });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ─────────────────────────────────────────────────────────
// 4. Delete a message (own only)
// ─────────────────────────────────────────────────────────
export async function deleteSoloMessage(messageId) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  const { error } = await supabase
    .from("solo_messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_user_id", myId);

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────
// 5. Unread count (for badges)
// ─────────────────────────────────────────────────────────
export async function getSoloUnreadCount(matchId, lastReadAt) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  let query = supabase
    .from("solo_messages")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .neq("sender_user_id", myId);

  if (lastReadAt) query = query.gt("created_at", lastReadAt);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────
// 6. Read state — per-match "last read" markers (solo_match_reads)
// ─────────────────────────────────────────────────────────

// Mark a match as read up to now for the current user (upsert their marker).
export async function markSoloMatchRead(matchId) {
  if (!matchId) return;
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;
  if (!myId) return;

  const { error } = await supabase
    .from("solo_match_reads")
    .upsert(
      { match_id: matchId, user_id: myId, last_read_at: new Date().toISOString() },
      { onConflict: "match_id,user_id" },
    );
  // Best-effort: a failed read-marker must never break the chat UI.
  if (error) console.warn("markSoloMatchRead failed:", error.message);
}

// Returns Map<matchId, lastReadAt ISO string> for the current user.
export async function getSoloMatchReads(matchIds = []) {
  const ids = [...new Set(matchIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;
  if (!myId) return new Map();

  const { data, error } = await supabase
    .from("solo_match_reads")
    .select("match_id, last_read_at")
    .eq("user_id", myId)
    .in("match_id", ids);

  if (error) {
    // Table missing (pre-migration) → treat everything as unread, don't throw.
    if (error.code === "42P01" || error.code === "PGRST205") return new Map();
    throw error;
  }

  const reads = new Map();
  for (const row of data || []) reads.set(row.match_id, row.last_read_at);
  return reads;
}

// Unread count per match for the current user: Map<matchId, count>.
export async function getSoloUnreadCounts(matchIds = []) {
  const ids = [...new Set(matchIds.filter(Boolean))];
  const counts = new Map();
  if (ids.length === 0) return counts;

  const reads = await getSoloMatchReads(ids).catch(() => new Map());
  const results = await Promise.all(
    ids.map((id) => getSoloUnreadCount(id, reads.get(id)).catch(() => 0)),
  );
  ids.forEach((id, i) => counts.set(id, results[i]));
  return counts;
}

// Total unread messages across all of my active matches (for the tab badge).
export async function getTotalSoloUnread() {
  const matches = await getMySoloMatches().catch(() => []);
  const ids = matches.map((m) => m.matchId);
  if (ids.length === 0) return 0;
  const counts = await getSoloUnreadCounts(ids);
  let total = 0;
  for (const n of counts.values()) total += n;
  return total;
}
