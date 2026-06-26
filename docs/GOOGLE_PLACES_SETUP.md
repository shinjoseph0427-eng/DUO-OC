# Google Places (New) setup — venue suggestions for PLAN

The PLAN card suggests real Orange County venues via Google **Places API (New)**.
The API key is **server-side only** — it lives in Supabase secrets and is used
exclusively by the `suggest-venues` Edge Function. It is **never** shipped to the
browser. If the key is absent, the feature degrades gracefully (no suggestions,
no errors, build still passes).

## 1. Create a Google Cloud project
1. Go to https://console.cloud.google.com/ → top bar → **New Project**.
2. Name it (e.g. `weekly-venues`) → Create.

## 2. Enable **Places API (New)**
1. APIs & Services → **Library**.
2. Search **"Places API (New)"** — enable that one. ⚠️ NOT the legacy
   "Places API" (this project calls `https://places.googleapis.com/v1/...`).

## 3. Create an API key
1. APIs & Services → **Credentials** → **Create credentials** → **API key**.
2. Copy the key.

## 4. Restrict the key (server-side use)
Edit the key:
- **Application restrictions:** leave as **None** (HTTP-referrer restrictions
  would break server-side calls — the Edge Function has no browser referrer).
  Security comes from the key never leaving the server + Supabase auth on the
  function.
- **API restrictions:** **Restrict key** → allow only **Places API (New)**.

## 5. Billing / free credit / alerts
- Google gives a recurring **$200/month** Places free usage tier — confirm under
  Billing.
- Billing → **Budgets & alerts** → create a budget, set an email alert at **$50**.
- Text Search (New) is billed per request; our cost guards (24h cache, negative
  cache, per-user rate limit, results capped at 8) keep volume low.

## 6. Store the key in Supabase secrets
```bash
supabase secrets set GOOGLE_PLACES_API_KEY=YOUR_KEY_HERE
```
(Verify with `supabase secrets list`.) The Edge Function reads
`Deno.env.get("GOOGLE_PLACES_API_KEY")`. No key → function returns an empty list.

## 7. Deploy the function
```bash
supabase functions deploy suggest-venues
```

## Notes / limitations
- **Business-only:** results are filtered to OPERATIONAL businesses in allowed OC
  cities, with ≥20 ratings and ≥4.0 stars, and explicitly exclude lodging,
  schools, medical, worship, residential/address types, etc. See
  `supabase/functions/suggest-venues/index.ts`.
- **Photos:** `photo_url` is intentionally `null`. Google photo media URLs would
  embed the API key, which must never reach the client. Proxying photos through a
  second authenticated endpoint is a possible follow-up; until then cards render
  without a photo.
- **Rate limit** is best-effort in-memory (per warm function instance); the
  durable cost guard is the 24h cache table.
