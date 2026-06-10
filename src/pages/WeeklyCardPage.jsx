// src/pages/WeeklyCardPage.jsx
// "When are you free this week?" — create/edit your weekly availability card.

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../tokens';
import { getMyWeeklyCard, createWeeklyCard } from '../lib/weeklyCards.js';
import TopBar from '../components/TopBar.jsx';

const ORANGE = '#FF8C00';

const DAYS = [
  { v: 'mon', label: 'Mon' },
  { v: 'tue', label: 'Tue' },
  { v: 'wed', label: 'Wed' },
  { v: 'thu', label: 'Thu' },
  { v: 'fri', label: 'Fri' },
  { v: 'sat', label: 'Sat' },
  { v: 'sun', label: 'Sun' },
];

// Orange particle burst from the Save button center.
function SaveParticles({ buttonRef }) {
  const rect = buttonRef.current?.getBoundingClientRect();
  if (!rect) return null;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'fixed',
            left: centerX,
            top: centerY,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: ORANGE,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{
            scale: [0, 1.2, 0],
            x: [0, (i % 2 ? 1 : -1) * (Math.random() * 60 + 20)],
            y: [0, -(Math.random() * 60 + 20)],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

export default function WeeklyCardPage({ currentUser, go, showToast }) {
  const [days,    setDays]    = useState([]);
  // Preserved from the loaded card and saved back unchanged (logic untouched).
  const [slots,   setSlots]   = useState([]);
  const [place,   setPlace]   = useState('');
  const [vibe,    setVibe]    = useState('');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [particles, setParticles] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) { setLoading(false); return; }
    let cancelled = false;
    getMyWeeklyCard()
      .then((card) => {
        if (cancelled || !card) return;
        setDays(card.days ?? []);
        setSlots(card.time_slots ?? []);
        setPlace(card.place ?? '');
        setVibe(card.vibe ?? '');
      })
      .catch(() => showToast?.('Failed to load your card', 'error'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (v) =>
    setDays(days.includes(v) ? days.filter((x) => x !== v) : [...days, v]);

  const canSave = days.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setParticles(true);
    setTimeout(() => setParticles(false), 600);
    setSaving(true);
    try {
      await createWeeklyCard({
        days,
        time_slots: slots,
        place: place.trim() || null,
        vibe: vibe.trim() || null,
      });
      showToast?.('Your week is set!', 'success');
      go('home');
    } catch (e) {
      showToast?.(e?.message ?? 'Failed to save', 'error');
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', height: '100dvh', background: C.bg, color: C.white, display: 'flex', flexDirection: 'column' }}>
      <TopBar showBack onBack={() => go('home')} onLogoClick={() => go('home')} />

      <div style={{ flex: 1, minHeight: 0, padding: '12px 16px 16px', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: C.white, margin: '4px 0 6px', letterSpacing: '-0.5px' }}>
          This Week
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 18px', lineHeight: 1.5 }}>
          Pick the days you are open. We'll use them to find people whose week overlaps with yours.
        </p>

        {loading ? (
          <div className="shimmer" style={{ flex: 1, borderRadius: 16, background: C.cardElevated }} />
        ) : (
          // Days row — 7 cards in a row, filling the available height.
          <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flex: 1, minHeight: 0 }}>
            {DAYS.map((d) => {
              const selected = days.includes(d.v);
              return (
                <motion.button
                  key={d.v}
                  type="button"
                  onClick={() => toggleDay(d.v)}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: `1.5px solid ${ORANGE}`,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: selected ? ORANGE : '#fff',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: selected ? '#fff' : ORANGE,
                    textAlign: 'center',
                  }}>
                    {d.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Save */}
      {!loading && (
        <div style={{
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
          borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0,
        }}>
          <motion.button
            ref={buttonRef}
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            whileTap={canSave ? { scale: 0.97 } : {}}
            transition={{ duration: 0.1 }}
            style={{
              width: '100%', padding: '18px 0', borderRadius: 30, border: 'none',
              background: canSave ? ORANGE : '#D1D5DB',
              color: '#fff',
              fontSize: 16, fontWeight: 800,
              cursor: canSave ? 'pointer' : 'default',
              boxShadow: canSave ? '0 10px 26px rgba(255,140,0,0.3)' : 'none',
            }}
          >
            {saving ? 'Saving…' : 'Save My Week'}
          </motion.button>
          {days.length === 0 && (
            <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', margin: '8px 0 0' }}>
              Pick at least one day to set your week
            </p>
          )}
        </div>
      )}

      {/* Particle burst overlay */}
      <AnimatePresence>
        {particles && <SaveParticles buttonRef={buttonRef} />}
      </AnimatePresence>
    </div>
  );
}
