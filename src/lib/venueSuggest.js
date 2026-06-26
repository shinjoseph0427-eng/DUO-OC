// Venue suggestions for the PLAN card. All Google Places calls go through the
// `suggest-venues` Edge Function — the API key never touches the client.

import { supabase } from "./supabaseClient.js";

let debounceTimer = null;

export async function suggestVenues(place, activity) {
  const p = (place || "").trim();
  const a = (activity || "").trim();
  if (!p && !a) return [];

  try {
    const { data, error } = await supabase.functions.invoke("suggest-venues", {
      body: { place: p, activity: a },
    });
    if (error) {
      console.error("Venue suggestion error:", error);
      return [];
    }
    return data?.venues || [];
  } catch (e) {
    console.error("Venue suggestion failed:", e);
    return [];
  }
}

export function suggestVenuesDebounced(place, activity, callback, delay = 400) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const venues = await suggestVenues(place, activity);
    callback(venues);
  }, delay);
}

export const CATEGORY_EMOJI = {
  matcha: "🍵",
  boba: "🧋",
  kbbq: "🥩",
  karaoke: "🎤",
  dessert: "🍦",
  cafe: "☕",
  food: "🍜",
  other: "📍",
};

// "🧋 Boba Time, Irvine" style prefix; empty for 'other'/unknown.
export function categoryEmojiPrefix(placeType) {
  if (!placeType || placeType === "other") return "";
  const emoji = CATEGORY_EMOJI[placeType];
  return emoji ? `${emoji} ` : "";
}
