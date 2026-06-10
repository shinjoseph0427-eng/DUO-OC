// src/lib/solo.js
// Solo 1:1 feature — send/accept requests and open chats between two users.

import { supabase } from "./supabaseClient.js";
import { sendPushForNotification } from "./notifications.js";

// ─────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────

// Shared profiles SELECT fields — actual schema columns only (no avatar_url/full_name).
const PROFILE_FIELDS = `
  id,
  username,
  name,
  photos,
  city,
  lat,
  lng,
  instagram,
  bio,
  is_solo
`.trim();

/** Haversine distance (km) */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────
// 1. Discovery — list users to explore
// ─────────────────────────────────────────────────────────

/**
 * Returns users to explore. Excludes self / blocked / already-requested / matched,
 * sorted by distance.
 * @param {object} currentUser - { id, lat, lng }
 */
export async function findSoloUsers(currentUser, opts = {}) {
  const { maxDistanceKm = 50, limit = 30 } = opts;

  // 1) Blocks (user_blocks: blocker_id / blocked_id)
  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`);

  const blockedIds = (blocks || []).flatMap((b) => [b.blocker_id, b.blocked_id]);

  // 2) Users I already sent a request to
  const { data: sentReqs } = await supabase
    .from("solo_requests")
    .select("to_user_id")
    .eq("from_user_id", currentUser.id)
    .in("status", ["pending", "accepted"]);

  const sentToIds = (sentReqs || []).map((r) => r.to_user_id);

  // 3) Users I'm already matched with
  const { data: myMatches } = await supabase
    .from("solo_matches")
    .select("user_a, user_b")
    .or(`user_a.eq.${currentUser.id},user_b.eq.${currentUser.id}`)
    .eq("status", "active");

  const matchedIds = (myMatches || []).map((m) =>
    m.user_a === currentUser.id ? m.user_b : m.user_a
  );

  const excludeIds = [
    ...new Set([currentUser.id, ...blockedIds, ...sentToIds, ...matchedIds].filter(Boolean)),
  ];

  // 5) Query users (all users — no is_solo filter, over-fetch then distance-filter)
  const { data: users, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .not("id", "in", `(${excludeIds.join(",")})`)
    .limit(limit * 3);

  if (error) throw error;

  return (users || [])
    .map((u) => ({
      ...u,
      distanceKm:
        currentUser.lat && currentUser.lng && u.lat && u.lng
          ? haversineKm(currentUser.lat, currentUser.lng, u.lat, u.lng)
          : null,
    }))
    .filter((u) => u.distanceKm === null || u.distanceKm <= maxDistanceKm)
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────
// 2. Requests — send / list / cancel
// ─────────────────────────────────────────────────────────

export async function sendSoloRequest(toUserId) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;
  if (!myId) throw new Error("Sign in required");

  const { data, error } = await supabase
    .from("solo_requests")
    .insert({ from_user_id: myId, to_user_id: toUserId })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("You already sent a request to this person.");
    throw error;
  }

  // Notify + push the recipient (SECURITY DEFINER RPC creates the row and returns its id).
  const { data: notif, error: notifyError } = await supabase.rpc("notify_solo_request", {
    p_request_id: data.id,
  });
  if (notifyError) throw notifyError;

  const row = Array.isArray(notif) ? notif[0] : notif;
  if (row?.id) {
    try {
      await sendPushForNotification(row.id);
    } catch (e) {
      console.warn("sendPushForNotification failed:", e?.message);
    }
  }

  return data;
}

export async function getMySentSoloRequests() {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  const { data, error } = await supabase
    .from("solo_requests")
    .select(`
      id, status, created_at,
      to_user:profiles!solo_requests_to_user_id_fkey(${PROFILE_FIELDS})
    `)
    .eq("from_user_id", myId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMyReceivedSoloRequests() {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  const { data, error } = await supabase
    .from("solo_requests")
    .select(`
      id, status, created_at,
      from_user:profiles!solo_requests_from_user_id_fkey(${PROFILE_FIELDS})
    `)
    .eq("to_user_id", myId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function cancelSoloRequest(requestId) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  const { error } = await supabase
    .from("solo_requests")
    .delete()
    .eq("id", requestId)
    .eq("from_user_id", myId)
    .eq("status", "pending");

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────
// 3. Accept / decline
// ─────────────────────────────────────────────────────────

/** Accept → atomic solo_match creation via RPC. Returns match_id (uuid). */
export async function acceptSoloRequest(requestId) {
  const { data, error } = await supabase.rpc("accept_solo_request", {
    p_request_id: requestId,
  });
  if (error) throw error;

  // Notify + push the original sender that their request was accepted.
  const { data: notif, error: notifyError } = await supabase.rpc("notify_solo_accepted", {
    p_request_id: requestId,
  });
  if (notifyError) throw notifyError;

  const row = Array.isArray(notif) ? notif[0] : notif;
  if (row?.id) {
    try {
      await sendPushForNotification(row.id);
    } catch (e) {
      console.warn("sendPushForNotification failed:", e?.message);
    }
  }

  return data; // match_id
}

export async function declineSoloRequest(requestId) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  const { error } = await supabase
    .from("solo_requests")
    .update({ status: "declined" })
    .eq("id", requestId)
    .eq("to_user_id", myId)
    .eq("status", "pending");

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────
// 4. Matches
// ─────────────────────────────────────────────────────────

export async function getMySoloMatches() {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  const { data, error } = await supabase
    .from("solo_matches")
    .select(`
      id, status, matched_at,
      user_a_profile:profiles!solo_matches_user_a_fkey(${PROFILE_FIELDS}),
      user_b_profile:profiles!solo_matches_user_b_fkey(${PROFILE_FIELDS})
    `)
    .or(`user_a.eq.${myId},user_b.eq.${myId}`)
    .eq("status", "active")
    .order("matched_at", { ascending: false });

  if (error) throw error;

  const mapped = (data || []).map((m) => ({
    matchId: m.id,
    status: m.status,
    matchedAt: m.matched_at,
    partner: m.user_a_profile?.id === myId ? m.user_b_profile : m.user_a_profile,
  }));

  // Dedup by matchId — a row should never repeat, but guard the UI against any
  // query-level duplication so the same chat can't render twice.
  const byId = new Map();
  for (const m of mapped) {
    if (!byId.has(m.matchId)) byId.set(m.matchId, m);
  }
  const deduped = [...byId.values()];

  return deduped;
}

export async function getSoloMatch(matchId) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  const { data, error } = await supabase
    .from("solo_matches")
    .select(`
      id, status, matched_at,
      user_a_profile:profiles!solo_matches_user_a_fkey(${PROFILE_FIELDS}),
      user_b_profile:profiles!solo_matches_user_b_fkey(${PROFILE_FIELDS})
    `)
    .eq("id", matchId)
    .single();

  if (error) throw error;

  const partner =
    data.user_a_profile?.id === myId ? data.user_b_profile : data.user_a_profile;
  return { ...data, partner };
}

// ─────────────────────────────────────────────────────────
// 5. profiles is_solo toggle
// ─────────────────────────────────────────────────────────

export async function updateIsSolo(isSolo) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;
  if (!myId) throw new Error("Sign in required");

  const { error } = await supabase
    .from("profiles")
    .update({ is_solo: isSolo })
    .eq("id", myId);

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────
// 6. End match (leave)
// ─────────────────────────────────────────────────────────

export async function endSoloMatch(matchId) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;

  const { error } = await supabase
    .from("solo_matches")
    .update({ status: "ended" })
    .eq("id", matchId)
    .or(`user_a.eq.${myId},user_b.eq.${myId}`);

  if (error) throw error;
}
