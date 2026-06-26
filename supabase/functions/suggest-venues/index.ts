import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://duo-oc.com",
  "https://duo-oc.vercel.app",
  "http://localhost:5173",
]);

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

// ── Business-only filter config ─────────────────────────────────────────────
// At least one ALLOWED type must be present AND no BLOCKED type may be present.
const ALLOWED_TYPES = new Set([
  "restaurant", "cafe", "bakery", "bar", "meal_takeaway", "meal_delivery",
  "food", "store", "shopping_mall",
  "tourist_attraction", "museum", "art_gallery", "movie_theater",
  "bowling_alley", "amusement_park", "park",
  "night_club", "karaoke",
  "gym", "spa",
  "book_store", "clothing_store",
]);

const BLOCKED_TYPES = new Set([
  "lodging",
  "locality", "sublocality", "postal_code", "route",
  "premise", "subpremise", "street_address",
  "school", "university", "primary_school", "secondary_school",
  "hospital", "doctor", "dentist", "pharmacy",
  "place_of_worship", "church", "mosque", "synagogue",
  "cemetery", "funeral_home",
]);

// Allowed OC cities — result address must contain one (also blocks residences).
const OC_CITIES = [
  "Irvine", "Costa Mesa", "Newport Beach", "Fullerton", "Anaheim",
  "Garden Grove", "Buena Park", "Tustin", "Fountain Valley", "Huntington Beach",
  "Santa Ana", "Orange", "Westminster", "Cypress", "La Habra", "Brea",
  "Yorba Linda", "Mission Viejo", "Lake Forest", "Aliso Viejo", "La Mirada",
];

const MIN_RATINGS = 20;
const MIN_RATING = 4.0;

// ── helpers ─────────────────────────────────────────────────────────────────
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function cityFromAddress(address: string): string | null {
  const lower = address.toLowerCase();
  for (const city of OC_CITIES) {
    if (lower.includes(city.toLowerCase())) return city;
  }
  return null;
}

function priceLabel(priceLevel: unknown): string {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
    case "PRICE_LEVEL_INEXPENSIVE": return "$";
    case "PRICE_LEVEL_MODERATE": return "$$";
    case "PRICE_LEVEL_EXPENSIVE": return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE": return "$$$$";
    default: return "";
  }
}

// Estimate a frontend category key from types + name.
function inferCategory(types: string[], primaryType: string, name: string): string {
  const t = new Set(types);
  const n = name.toLowerCase();
  const has = (s: string) => t.has(s) || primaryType === s;

  if (n.includes("matcha")) return "matcha";
  if (n.includes("boba") || n.includes("bubble tea") || n.includes("milk tea")) return "boba";
  if (n.includes("kbbq") || n.includes("korean bbq") || (n.includes("korean") && n.includes("bbq"))) return "kbbq";
  if (has("night_club") || has("karaoke") || n.includes("karaoke") || n.includes("noraebang")) return "karaoke";
  if (has("bakery") || n.includes("dessert") || n.includes("ice cream") || n.includes("gelato") || n.includes("patisserie")) return "dessert";
  if (has("cafe") || n.includes("coffee") || n.includes("café") || n.includes("tea")) return "cafe";
  if (has("restaurant") || has("meal_takeaway") || has("meal_delivery") || has("food") || has("bar")) return "food";
  return "other";
}

function passesBusinessFilter(p: Record<string, unknown>): boolean {
  if (p.businessStatus !== "OPERATIONAL") return false;

  const types = Array.isArray(p.types) ? (p.types as string[]) : [];
  if (!types.some((t) => ALLOWED_TYPES.has(t))) return false;
  if (types.some((t) => BLOCKED_TYPES.has(t))) return false;

  const ratingCount = typeof p.userRatingCount === "number" ? p.userRatingCount : 0;
  if (ratingCount < MIN_RATINGS) return false;

  const rating = typeof p.rating === "number" ? p.rating : 0;
  if (rating < MIN_RATING) return false;

  const address = typeof p.formattedAddress === "string" ? p.formattedAddress : "";
  if (!cityFromAddress(address)) return false;

  return true;
}

function normalize(p: Record<string, unknown>) {
  const types = Array.isArray(p.types) ? (p.types as string[]) : [];
  const primaryType = typeof p.primaryType === "string" ? p.primaryType : "";
  const name = isPlainObject(p.displayName) && typeof p.displayName.text === "string"
    ? p.displayName.text : "";
  const address = typeof p.formattedAddress === "string" ? p.formattedAddress : "";
  const loc = isPlainObject(p.location) ? p.location : {};
  return {
    place_id: typeof p.id === "string" ? p.id : "",
    name,
    address,
    short_address: cityFromAddress(address) ?? "",
    rating: typeof p.rating === "number" ? p.rating : 0,
    user_ratings_total: typeof p.userRatingCount === "number" ? p.userRatingCount : 0,
    price_level: priceLabel(p.priceLevel),
    category: inferCategory(types, primaryType, name),
    // Photo media URLs would embed the API key → must NOT reach the client.
    photo_url: null as string | null,
    lat: typeof loc.latitude === "number" ? loc.latitude : null,
    lng: typeof loc.longitude === "number" ? loc.longitude : null,
  };
}

// ── best-effort in-memory rate limit (per warm instance): 10 / 60s / user ────
const RL_WINDOW_MS = 60_000;
const RL_MAX = 10;
const rlHits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const hits = (rlHits.get(userId) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (hits.length >= RL_MAX) { rlHits.set(userId, hits); return true; }
  hits.push(now);
  rlHits.set(userId, hits);
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed." }, 405);

  // ── auth (block anon) ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(req, { error: "Service not configured." }, 500);
  }
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json(req, { error: "Authentication required." }, 401);

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json(req, { error: "Authentication required." }, 401);

  // ── input ──
  let body: unknown;
  try { body = await req.json(); } catch { return json(req, { error: "Invalid JSON." }, 400); }
  const place = isPlainObject(body) && typeof body.place === "string" ? body.place.trim() : "";
  const activity = isPlainObject(body) && typeof body.activity === "string" ? body.activity.trim() : "";
  if (!place && !activity) return json(req, { venues: [] }, 200);

  const queryKey = `${place}_${activity}`.toLowerCase().trim().replace(/\s+/g, "_");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── cache hit (does NOT count against rate limit) ──
  const { data: cached } = await admin
    .from("venue_search_cache")
    .select("results, expires_at")
    .eq("query_key", queryKey)
    .maybeSingle();
  if (cached && new Date(cached.expires_at as string).getTime() > Date.now()) {
    return json(req, { venues: cached.results ?? [], cached: true }, 200);
  }

  // ── rate limit (only around live Google calls) ──
  if (rateLimited(authData.user.id)) {
    return json(req, { venues: [], rate_limited: true }, 200);
  }

  // ── API key absent → graceful empty (build/app never breaks) ──
  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!apiKey) return json(req, { venues: [] }, 200);

  // ── Google Places Text Search (New) ──
  let places: Record<string, unknown>[] = [];
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id", "places.displayName", "places.formattedAddress",
          "places.types", "places.businessStatus", "places.rating",
          "places.userRatingCount", "places.priceLevel", "places.photos",
          "places.location", "places.primaryType",
        ].join(","),
      },
      body: JSON.stringify({
        textQuery: `${activity || ""} in ${place || "Orange County"}, CA`.trim(),
        locationBias: {
          circle: { center: { latitude: 33.7175, longitude: -117.8311 }, radius: 25000 },
        },
        maxResultCount: 20,
        languageCode: "en",
      }),
    });
    if (!res.ok) {
      console.error("Places searchText failed:", res.status);
      return json(req, { venues: [] }, 200);
    }
    const data: unknown = await res.json().catch(() => null);
    if (isPlainObject(data) && Array.isArray(data.places)) {
      places = data.places as Record<string, unknown>[];
    }
  } catch (e) {
    console.error("Places call error:", e instanceof Error ? e.message : "unknown");
    return json(req, { venues: [] }, 200);
  }

  // ── business-only filter + normalize + cap 8 ──
  const venues = places.filter(passesBusinessFilter).map(normalize).slice(0, 8);

  // ── cache (negative cache 1h, positive 24h) ──
  const ttlHours = venues.length === 0 ? 1 : 24;
  await admin.from("venue_search_cache").upsert(
    {
      query_key: queryKey,
      results: venues,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttlHours * 3600_000).toISOString(),
    },
    { onConflict: "query_key" },
  );

  return json(req, { venues }, 200);
});
