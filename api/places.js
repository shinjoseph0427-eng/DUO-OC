// Vercel serverless function: GET /api/places?lat=&lng=&type=
//
// Proxies Google Places "Nearby Search" so the browser never sees the API key
// and to sidestep CORS. Returns the top 6 prominent results near the caller.
//
// Deploy note: this is the Vercel-correct equivalent of the originally-specced
// Express endpoint. On Vercel, files under /api are deployed as serverless
// functions automatically — no separate Node process required. During local
// `vite dev` there is no /api server, so the client LocationPicker falls back
// to the hardcoded OC spots.
//
// Env: GOOGLE_PLACES_API_KEY (preferred, server-only) or VITE_GOOGLE_PLACES_API_KEY.

import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

const ALLOWED_TYPES = new Set(['cafe', 'park', 'restaurant', 'gym', 'bar']);

export default async function handler(req, res) {
  // CORS (harmless in prod, useful if proxied locally)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!key) {
    // No key configured — signal the client to use its local fallback.
    return res.status(200).json({ results: [], fallback: true, reason: 'no_api_key' });
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const type = ALLOWED_TYPES.has(req.query.type) ? req.query.type : 'cafe';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng are required numbers' });
  }

  try {
    const response = await client.placesNearby({
      params: {
        location: { lat, lng },
        radius: 8000,        // 8 km
        type,                // ranked by prominence (the default ranking)
        key,
      },
      timeout: 5000,
    });

    const results = (response.data.results ?? []).slice(0, 6).map((p) => ({
      id: p.place_id,
      name: p.name,
      neighborhood: p.vicinity ?? '',
      rating: typeof p.rating === 'number' ? p.rating : null,
      lat: p.geometry?.location?.lat ?? null,
      lng: p.geometry?.location?.lng ?? null,
    }));

    return res.status(200).json({ results, fallback: false });
  } catch (err) {
    return res.status(200).json({
      results: [],
      fallback: true,
      reason: 'places_error',
      detail: err?.response?.data?.error_message ?? err?.message ?? 'unknown',
    });
  }
}
