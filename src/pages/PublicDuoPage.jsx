import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MapPin } from 'lucide-react';
import { C } from '../tokens';
import { getPublicDuo } from '../lib/publicDuo.js';

export default function PublicDuoPage({ duoId, go }) {
  const [duo, setDuo] = useState(null);
  const [state, setState] = useState('loading'); // 'loading' | 'ready' | 'notfound' | 'error'

  useEffect(() => {
    let cancelled = false;
    if (!duoId) { setState('notfound'); return () => { cancelled = true; }; }
    setState('loading');
    getPublicDuo(duoId)
      .then((data) => {
        if (cancelled) return;
        if (!data) { setState('notfound'); return; }
        setDuo(data);
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [duoId]);

  const handleJoin = () => {
    if (go) go('auth');
    else window.open('https://duo-oc.com', '_blank');
  };

  const photos = duo?.photos?.filter(Boolean) ?? [];
  const members = duo?.members ?? [];
  const vibes = (duo?.vibe_tags ?? []).filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white, paddingBottom: 96 }}>
      {/* Brand header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56, borderBottom: `0.5px solid ${C.border}` }}>
        <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px' }}>
          <span style={{
            background: C.gradientCTA,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>DUO OC</span>
        </span>
      </header>

      {state === 'loading' && (
        <div style={{ padding: '16px' }}>
          <div className="shimmer" style={{ height: 280, borderRadius: 20, background: C.cardElevated, marginBottom: 16 }} />
          <div className="shimmer" style={{ height: 24, width: '60%', borderRadius: 8, background: C.cardElevated }} />
        </div>
      )}

      {state === 'notfound' && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Duo not found</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            This link expired or the duo is no longer active.
          </p>
        </div>
      )}

      {state === 'error' && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Couldn't load</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Please try again in a moment.</p>
        </div>
      )}

      {state === 'ready' && duo && (
        <>
          <div style={{ padding: '16px 16px 0' }}>
            {/* Photo */}
            <div style={{
              position: 'relative',
              borderRadius: 22,
              overflow: 'hidden',
              background: C.cardElevated,
              border: `0.5px solid ${C.border}`,
              aspectRatio: '4/5',
              marginBottom: 18,
            }}>
              {photos[0] ? (
                <img src={photos[0]} alt={duo.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.amberT08 }}>
                  <Users size={48} color={C.amber} strokeWidth={1.8} />
                </div>
              )}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.78) 100%)',
              }} />
              <div style={{ position: 'absolute', left: 18, right: 18, bottom: 16 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                  {duo.name}
                </h1>
                {duo.city && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} strokeWidth={2} /> {duo.city}
                  </p>
                )}
              </div>
            </div>

            {/* Members */}
            {members.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                {members.map((m, i) => (
                  <div key={i} style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 14,
                    background: C.cardElevated, border: `0.5px solid ${C.border}`,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                      background: C.amberT08, border: `1px solid ${C.brownBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 800, color: C.amber,
                    }}>
                      {m.photos?.[0]
                        ? <img src={m.photos[0]} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (m.name?.[0]?.toUpperCase() ?? '?')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name ?? 'Member'}
                      </p>
                      {m.age != null && (
                        <p style={{ fontSize: 12, color: C.muted, margin: '1px 0 0' }}>{m.age}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vibe tags */}
            {vibes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {vibes.map((v) => (
                  <span key={v} style={{
                    background: C.amberT08, border: `0.5px solid ${C.brownBorder}`, color: C.amber,
                    borderRadius: 9999, padding: '6px 14px', fontSize: 13, fontWeight: 700,
                  }}>
                    {v}
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            {duo.bio && (
              <p style={{ fontSize: 15, color: 'rgba(17,17,17,0.78)', lineHeight: 1.6, margin: '0 0 8px' }}>
                {duo.bio}
              </p>
            )}
          </div>

          {/* Fixed CTA */}
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0,
            padding: '14px 16px calc(14px + env(safe-area-inset-bottom))',
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)',
            borderTop: `0.5px solid ${C.border}`,
          }}>
            <motion.button
              type="button"
              onClick={handleJoin}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
                background: C.gradientCTA, color: '#fff', fontSize: 16, fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 10px 26px rgba(255,107,0,0.3)',
              }}
            >
              Join Duo OC
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
