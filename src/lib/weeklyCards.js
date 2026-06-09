// src/lib/weeklyCards.js
// WEEKLY availability cards — create/read your weekly card and fetch overlap matches.
// Cloned from the solo.js pattern. Adds no changes to existing files.

import { supabase } from "./supabaseClient.js";

/**
 * This week's Monday as a 'YYYY-MM-DD' string (local time).
 * getDay(): 0=Sun..6=Sat → Monday offset is (day === 0 ? -6 : 1 - day).
 * @returns {string}
 */
export function currentWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Fetch my weekly card for a given week (defaults to this week). Returns null if none.
 * @param {string} [weekStart] - 'YYYY-MM-DD'
 * @returns {Promise<object|null>}
 */
export async function getMyWeeklyCard(weekStart) {
  const ws = weekStart ?? currentWeekStart();
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;
  if (!myId) throw new Error("Sign in required");

  const { data, error } = await supabase
    .from("weekly_cards")
    .select("*")
    .eq("user_id", myId)
    .eq("week_start", ws)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

/**
 * Create (or upsert) my weekly card for this week.
 * @param {object} card - { days, time_slots, place, place_lat, place_lng, vibe }
 * @returns {Promise<object>} created/updated row
 */
export async function createWeeklyCard({ days, time_slots, place, place_lat, place_lng, vibe } = {}) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;
  if (!myId) throw new Error("Sign in required");

  const { data, error } = await supabase
    .from("weekly_cards")
    .upsert(
      {
        user_id:    myId,
        week_start: currentWeekStart(),
        days:       days ?? [],
        time_slots: time_slots ?? [],
        place:      place ?? null,
        place_lat:  place_lat ?? null,
        place_lng:  place_lng ?? null,
        vibe:       vibe ?? null,
        status:     "open",
      },
      { onConflict: "user_id,week_start" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update one of my weekly cards (only fields provided are changed).
 * @param {string} id
 * @param {object} fields - any of { days, time_slots, place, place_lat, place_lng, vibe, status }
 * @returns {Promise<object>} updated row
 */
export async function updateWeeklyCard(id, fields = {}) {
  const { data: me } = await supabase.auth.getUser();
  const myId = me?.user?.id;
  if (!myId) throw new Error("Sign in required");

  const allowed = ["days", "time_slots", "place", "place_lat", "place_lng", "vibe", "status"];
  const updates = {};
  for (const k of allowed) {
    if (fields[k] !== undefined) updates[k] = fields[k];
  }

  const { data, error } = await supabase
    .from("weekly_cards")
    .update(updates)
    .eq("id", id)
    .eq("user_id", myId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Overlap matches for a given week (defaults to this week) via the RPC.
 * @param {string} [weekStart]
 * @returns {Promise<Array>} [{ id, username, name, photos, city, lat, lng, place, vibe, overlap_days, overlap_slots, distance_km }]
 */
export async function getWeeklyMatches(weekStart) {
  const ws = weekStart ?? currentWeekStart();
  const { data, error } = await supabase.rpc("find_weekly_matches", { p_week_start: ws });
  if (error) throw error;
  return data ?? [];
}

/** Mark still-open cards from before this week as expired (call once on app load). */
export async function expireOldCards() {
  const { error } = await supabase.rpc("expire_old_weekly_cards");
  if (error) throw error;
}
