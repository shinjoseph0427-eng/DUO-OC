// src/lib/soloMessages.js
// Solo 1:1 chat — cloned from the duoRoomMessages.js pattern, keyed by match_id.
// Does not modify the existing messages.js / duoRoomMessages.js.

import { supabase } from "./supabaseClient.js";

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
      id, match_id, sender_user_id, content, created_at,
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
      id, match_id, sender_user_id, content, created_at,
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
