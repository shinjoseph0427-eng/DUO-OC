// src/pages/HomePage.jsx
// WEEKLY home — greeting, this-week card status, and entry points.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Compass, MessageCircle } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import { getMyWeeklyCard } from '../lib/weeklyCards.js';

const DAY_LABELS = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const ENTRIES = [
  { key: 'explore',  page: 'weekly_explore', Icon: Compass,       title: 'Explore',  sub: 'Find people free this week' },
  { key: 'messages', page: 'solo_inbox',     Icon: MessageCircle, title: 'Messages', sub: 'Your matches & chats' },
  { key: 'myweek',   page: 'weekly_card',    Icon: Calendar,      title: 'My Week',  sub: 'Set your availability' },
];

export default function HomePage({ go, onLogout, currentUser, profile, showToast }) {
  const [card,    setCard]    = useState(null);
  const [loading, setLoading] = useState(true);

  const firstName = profile?.name?.trim()?.split(/\s+/)?.[0] ?? null;

  useEffect(() => {
    if (!currentUser?.id) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    getMyWeeklyCard()
      .then((data) => { if (!cancelled) setCard(data); })
      .catch(() => { if (!cancelled) showToast?.('Could not load your week', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDays = (card?.days ?? [])
    .slice()
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const hasCard = !loading && card && selectedDays.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar
        onLogout={onLogout}
        rightContent={<NotificationBell currentUser={currentUser} go={go} showToast={showToast} />}
      />

      <div style={{ padding: '0 16px 96px' }}>
        {/* ── Greeting ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          style={{ padding: '22px 4px 18px' }}
        >
          <p style={{ fontSize: 26, fontWeight: 800, color: C.white, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.15 }}>
            {greetingWord()}{firstName ? `, ${firstName}` : ''}
          </p>
        </motion.div>

        {/* ── This week's card status ──────────────────────────────── */}
        {loading ? (
          <div className="shimmer" style={{ height: 132, borderRadius: 20, background: C.cardElevated }} />
        ) : hasCard ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26 }}
            style={{
              borderRadius: 20,
              border: `0.5px solid ${C.brownBorder}`,
              background: C.amberT08,
              padding: 20,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 850, letterSpacing: '1px', textTransform: 'uppercase', color: C.amber, margin: '0 0 12px' }}>
              Your week is set
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {selectedDays.map((d) => (
                <span
                  key={d}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 12,
                    background: C.bg,
                    border: `0.5px solid ${C.brownBorder}`,
                    color: C.white,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {DAY_LABELS[d] ?? d}
                </span>
              ))}
            </div>
            <motion.button
              type="button"
              onClick={() => go('weekly_card')}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                background: C.gradientCTA, color: '#fff', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 10px 26px rgba(255,107,0,0.28)',
              }}
            >
              Edit My Week
            </motion.button>
          </motion.div>
        ) : (
          <motion.button
            type="button"
            onClick={() => go('weekly_card')}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.26 }}
            style={{
              width: '100%', textAlign: 'left',
              borderRadius: 20, border: 'none', cursor: 'pointer',
              background: C.gradientCTA, color: '#fff', padding: 22,
              boxShadow: '0 12px 30px rgba(255,107,0,0.3)',
            }}
          >
            <p style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', lineHeight: 1.15, letterSpacing: '-0.3px' }}>
              What's your week looking like?
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 16px', color: 'rgba(255,255,255,0.85)' }}>
              Pick when you're free so we can find your overlap.
            </p>
            <span style={{
              display: 'inline-block', background: 'rgba(255,255,255,0.22)',
              borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 800,
            }}>
              Set My Week →
            </span>
          </motion.button>
        )}

        {/* ── Entry cards ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
          {ENTRIES.map(({ key, page, Icon, title, sub }, idx) => (
            <motion.button
              key={key}
              type="button"
              onClick={() => go(page)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.24, delay: 0.04 + idx * 0.05 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', textAlign: 'left',
                padding: '16px 16px',
                borderRadius: 16,
                border: `0.5px solid ${C.border}`,
                background: C.cardElevated,
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: C.amberT08, border: `0.5px solid ${C.brownBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={C.amber} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 850, color: C.white, margin: '0 0 2px' }}>
                  {title}
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.35 }}>
                  {sub}
                </p>
              </div>
              <span style={{ color: C.muted, fontSize: 20, fontWeight: 300, flexShrink: 0 }}>›</span>
            </motion.button>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div style={{ padding: '24px 0 0', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => go('privacy')}
            style={{
              background: 'none', border: 'none', color: C.muted, fontSize: 12,
              cursor: 'pointer', padding: '4px 0', textDecoration: 'underline',
              textDecorationColor: 'rgba(17,17,17,0.25)',
            }}
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}
