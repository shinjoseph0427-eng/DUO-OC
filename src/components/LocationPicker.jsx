import { useEffect, useState } from 'react';
import { Star, MapPin } from 'lucide-react';
import { C } from '../tokens';

const ACCENT = C.amber;
const BODY_FONT = "'DM Sans', 'Inter', system-ui, sans-serif";

const MAPS_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  import.meta.env.VITE_GOOGLE_PLACES_API_KEY ||
  '';

// Activity → Google Places type
const TYPE_MAP = {
  Coffee: 'cafe',
  Boba: 'cafe',
  Beach: 'park',
  'Chill walk': 'park',
  Dinner: 'restaurant',
  Gym: 'gym',
  'Night out': 'bar',
};

// Hardcoded OC spots (used when geolocation is denied or the proxy has no key).
const OC_FALLBACK = [
  { id: 'oc-spectrum', name: 'Irvine Spectrum',       neighborhood: 'Irvine',     lat: 33.6500, lng: -117.7440 },
  { id: 'oc-jamboree', name: 'Diamond Jamboree',      neighborhood: 'Irvine',     lat: 33.6846, lng: -117.8540 },
  { id: 'oc-packing',  name: 'Anaheim Packing House', neighborhood: 'Anaheim',    lat: 33.8330, lng: -117.9110 },
  { id: 'oc-balboa',   name: 'Balboa Island',         neighborhood: 'Newport',    lat: 33.6065, lng: -117.8970 },
  { id: 'oc-hbpier',   name: 'Huntington Beach Pier', neighborhood: 'HB',         lat: 33.6553, lng: -118.0030 },
  { id: 'oc-camp',     name: 'The CAMP Costa Mesa',   neighborhood: 'Costa Mesa', lat: 33.6860, lng: -117.8890 },
];

function milesBetween(a, b) {
  if (!a || !b) return null;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 3958.8; // miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function Skeleton() {
  return (
    <div
      className="shimmer"
      style={{ minWidth: 150, height: 64, borderRadius: 16, flexShrink: 0 }}
    />
  );
}

/**
 * @param {string} activity  selected vibe (Coffee, Boba, …)
 * @param {{name:string,lat?:number,lng?:number}|null} value  selected place
 * @param {(place: object|null) => void} onChange
 */
export default function LocationPicker({ activity, value, onChange }) {
  const [status, setStatus] = useState('loading'); // loading | ready | fallback
  const [coords, setCoords] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    const useFallback = () => {
      if (cancelled) return;
      setResults(OC_FALLBACK);
      setStatus('fallback');
    };

    if (!navigator.geolocation) {
      useFallback();
      return () => { cancelled = true; };
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(here);
        const type = TYPE_MAP[activity] ?? 'cafe';
        try {
          const r = await fetch(`/api/places?lat=${here.lat}&lng=${here.lng}&type=${type}`);
          const data = await r.json();
          if (cancelled) return;
          if (data.fallback || !Array.isArray(data.results) || data.results.length === 0) {
            useFallback();
          } else {
            setResults(data.results);
            setStatus('ready');
          }
        } catch {
          useFallback();
        }
      },
      () => useFallback(),
      { timeout: 8000 },
    );

    return () => { cancelled = true; };
  }, [activity]);

  const selectedName = value?.name ?? null;
  const selectedPlace = selectedName
    ? results.find((p) => p.name === selectedName) ?? value
    : null;

  const staticMapUrl = (place) => {
    if (!MAPS_KEY || !place?.lat || !place?.lng) return null;
    const c = `${place.lat},${place.lng}`;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${c}&zoom=15&size=400x180&markers=color:orange|${c}&key=${MAPS_KEY}`;
  };

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      {status === 'fallback' && (
        <p style={{ fontSize: 11, color: C.muted, margin: '0 0 8px', fontWeight: 500 }}>
          Based on OC
        </p>
      )}

      <div
        className="no-scrollbar"
        style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
      >
        {status === 'loading'
          ? [0, 1, 2].map((i) => <Skeleton key={i} />)
          : results.map((p) => {
              const active = selectedName === p.name;
              const dist = coords ? milesBetween(coords, p) : null;
              return (
                <button
                  key={p.id ?? p.name}
                  type="button"
                  onClick={() => onChange(active ? null : p)}
                  style={{
                    flexShrink: 0,
                    minWidth: 150,
                    textAlign: 'left',
                    background: active ? ACCENT : C.cardElevated,
                    border: `1px solid ${active ? 'transparent' : '#eee'}`,
                    borderRadius: 16,
                    padding: '12px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: active ? '#fff' : C.text,
                    marginBottom: 3, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200,
                  }}>
                    {p.name}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 11, color: active ? 'rgba(255,255,255,0.85)' : C.muted,
                  }}>
                    {p.neighborhood && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={10} strokeWidth={2} />
                        {p.neighborhood}
                      </span>
                    )}
                    {typeof p.rating === 'number' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <Star size={10} strokeWidth={2} fill="currentColor" />
                        {p.rating.toFixed(1)}
                      </span>
                    )}
                    {dist != null && <span>{dist.toFixed(1)} mi</span>}
                  </div>
                </button>
              );
            })}
      </div>

      {/* Static map thumbnail */}
      {selectedPlace && staticMapUrl(selectedPlace) && (
        <img
          src={staticMapUrl(selectedPlace)}
          alt={`Map of ${selectedPlace.name}`}
          width={400}
          height={180}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: 16,
            marginTop: 12,
            border: '1px solid #eee',
            objectFit: 'cover',
            animation: 'fadeUp 0.3s ease',
          }}
        />
      )}
    </div>
  );
}
