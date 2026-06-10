// src/pages/WeeklyCardPage.jsx
// "When are you free this week?" — create/edit your weekly availability card.

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

export default function WeeklyCardPage({ currentUser, go, showToast }) {
  const [days,    setDays]    = useState([]);
  // Preserved from the loaded card and saved back unchanged (logic untouched).
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

  const toggleDay = (v) =>
    setDays(days.includes(v) ? days.filter((x) => x !== v) : [...days, v]);

  const canSave = days.length > 0 && !saving;
  const selectedLabel = DAYS.filter((d) => days.includes(d.v)).map((d) => d.label).join(' · ');

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
    <div style={{ minHeight: '100dvh', height: '100dvh', background: '#fafafa', display: 'flex', flexDirection: 'column' }}>
      <TopBar showBack onBack={() => go('home')} onLogoClick={() => go('home')} />

      <div style={{ flex: 1, minHeight: 0, padding: '12px 16px 16px', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: 26, fontWeight: 500, color: '#1a1a1a', margin: '4px 0 6px' }}>
          This Week
        </h1>
        <p style={{ fontSize: 14, color: '#888', margin: '0 0 18px' }}>
          Which days are you free?
        </p>

        {loading ? (
          <div className="shimmer" style={{ flex: 1, borderRadius: 18, background: '#fff' }} />
        ) : (
          // Days row — 7 cards in a row, filling the available height.
          <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flex: 1, minHeight: 0 }}>
            {DAYS.map((d) => {
              const selected = days.includes(d.v);
              return (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => toggleDay(d.v)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    position: 'relative',
                    border: `2px solid ${selected ? ORANGE : '#e8e8e8'}`,
                    borderRadius: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: selected ? ORANGE : '#fff',
                    cursor: 'pointer',
                    padding: 0,
                    transform: selected ? 'scale(1.04)' : 'scale(1)',
                    boxShadow: selected ? '0 8px 24px rgba(255,140,0,0.35)' : 'none',
                    transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {selected && (
                    <span style={{
                      position: 'absolute',
                      top: 8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#fff',
                    }} />
                  )}
                  <span style={{
                    fontSize: selected ? 15 : 14,
                    fontWeight: 600,
                    color: selected ? '#fff' : '#bbb',
                    textAlign: 'center',
                  }}>
                    {d.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom — selected days + Save */}
      {!loading && (
        <div style={{ padding: '10px 16px calc(16px + env(safe-area-inset-bottom))', background: '#fafafa', flexShrink: 0 }}>
          <p style={{ fontSize: 12, color: ORANGE, fontWeight: 500, textAlign: 'center', margin: '0 0 10px', minHeight: 16 }}>
            {selectedLabel}
          </p>
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            whileTap={canSave ? { scale: 0.97 } : {}}
            transition={{ duration: 0.1 }}
            style={{
              width: '100%', padding: '18px 0', borderRadius: 32, border: 'none',
              background: canSave ? ORANGE : '#e8e8e8',
              color: canSave ? '#fff' : '#bbb',
              fontSize: 16, fontWeight: 600,
              cursor: canSave ? 'pointer' : 'default',
            }}
          >
            {saving ? 'Saving…' : 'Save My Week'}
          </motion.button>
        </div>
      )}
    </div>
  );
}
