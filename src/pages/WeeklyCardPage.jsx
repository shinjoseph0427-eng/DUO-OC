// src/pages/WeeklyCardPage.jsx
// "When are you free this week?" — create/edit your weekly availability card.

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { C } from '../tokens';
import { getMyWeeklyCard, createWeeklyCard } from '../lib/weeklyCards.js';
import TopBar from '../components/TopBar.jsx';

const DAYS = [
  { v: 'mon', label: 'Mon' },
  { v: 'tue', label: 'Tue' },
  { v: 'wed', label: 'Wed' },
  { v: 'thu', label: 'Thu' },
  { v: 'fri', label: 'Fri' },
  { v: 'sat', label: 'Sat' },
  { v: 'sun', label: 'Sun' },
];

const SLOTS = [
  { v: 'morning',   label: 'Morning' },
  { v: 'afternoon', label: 'Afternoon' },
  { v: 'evening',   label: 'Evening' },
];

const LABEL = {
  fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase',
  color: C.muted, margin: '0 0 12px', display: 'block',
};

const INPUT = {
  width: '100%', boxSizing: 'border-box',
  background: C.cardElevated, border: `0.5px solid ${C.border}`,
  borderRadius: 14, padding: '14px 16px', fontSize: 15, color: C.white, outline: 'none',
};

function Chip({ selected, onClick, children }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.1 }}
      style={{
        padding: '10px 0',
        borderRadius: 12,
        border: `1px solid ${selected ? C.amber : C.border}`,
        background: selected ? C.amberT08 : C.cardElevated,
        color: selected ? C.amber : C.muted,
        fontSize: 13, fontWeight: 700, cursor: 'pointer',
        textAlign: 'center',
      }}
    >
      {children}
    </motion.button>
  );
}

export default function WeeklyCardPage({ currentUser, go, showToast }) {
  const [days,    setDays]    = useState([]);
  const [slots,   setSlots]   = useState([]);
  const [place,   setPlace]   = useState('');
  const [vibe,    setVibe]    = useState('');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

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

  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const canSave = days.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
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
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.white, display: 'flex', flexDirection: 'column' }}>
      <TopBar showBack onBack={() => go('home')} onLogoClick={() => go('home')} />

      <div style={{ flex: 1, padding: '12px 16px 110px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: C.white, margin: '4px 0 6px', letterSpacing: '-0.5px' }}>
          This Week
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px', lineHeight: 1.5 }}>
          Pick the days and times you are open. We'll use them to find people whose week overlaps with yours.
        </p>

        {loading ? (
          <div className="shimmer" style={{ height: 180, borderRadius: 16, background: C.cardElevated }} />
        ) : (
          <>
            {/* Days */}
            <span style={LABEL}>Days</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 26 }}>
              {DAYS.map((d) => (
                <Chip key={d.v} selected={days.includes(d.v)} onClick={() => toggle(days, setDays, d.v)}>
                  {d.label}
                </Chip>
              ))}
            </div>

            {/* Time slots */}
            <span style={LABEL}>Time of day</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 26 }}>
              {SLOTS.map((s) => (
                <Chip key={s.v} selected={slots.includes(s.v)} onClick={() => toggle(slots, setSlots, s.v)}>
                  {s.label}
                </Chip>
              ))}
            </div>

            {/* Place */}
            <span style={LABEL}>Area <span style={{ textTransform: 'none', fontWeight: 600, color: C.muted }}>(optional)</span></span>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value.slice(0, 80))}
              placeholder="Neighborhood or area (e.g. Irvine, OC)"
              style={{ ...INPUT, marginBottom: 22 }}
            />

            {/* Vibe */}
            <span style={LABEL}>Vibe <span style={{ textTransform: 'none', fontWeight: 600, color: C.muted }}>(optional)</span></span>
            <input
              value={vibe}
              onChange={(e) => setVibe(e.target.value.slice(0, 60))}
              placeholder="What are you in the mood for? (e.g. coffee, walk, food)"
              style={INPUT}
            />
          </>
        )}
      </div>

      {/* Save */}
      {!loading && (
        <div style={{
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
          borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0,
        }}>
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            whileTap={canSave ? { scale: 0.98 } : {}}
            transition={{ duration: 0.1 }}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
              background: canSave ? C.gradientCTA : C.cardDeep,
              color: canSave ? '#fff' : C.muted,
              fontSize: 16, fontWeight: 800,
              cursor: canSave ? 'pointer' : 'default',
              boxShadow: canSave ? '0 10px 26px rgba(255,107,0,0.3)' : 'none',
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
    </div>
  );
}
