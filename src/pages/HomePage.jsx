// src/pages/HomePage.jsx
// WEEKLY home — greeting, confirmed plan, this week's matches, and quick actions.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, MessageCircle, Calendar, User, MapPin, Plus } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import { getMyWeeklyCard } from '../lib/weeklyCards.js';
import { getMySoloMatches } from '../lib/solo.js';
import { getSoloPlan, dayLabel } from '../lib/soloPlans.js';

// ── design tokens (light) ──────────────────────────────────
const BG        = '#fafafa';
const ORANGE    = '#FF8C00';
const TEXT       = '#1a1a1a';
const TEXT_SUB   = '#888';
const CARD       = '#fff';
const CARD_BORDER = '0.5px solid #e8e8e8';
const SECTION_PAD = '0 20px';

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const DAY_ORDER  = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const OC_IMAGES = [
  '/oc_01.jpg', '/oc_02.jpg', '/oc_03.jpg', '/oc_04.jpg',
  '/oc_05.jpg', '/oc_06.jpg', '/oc_07.jpg',
];

// Stable index pick from an id (same id → same starting photo, no Math.random).
function ocIndexFor(id = '') {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % OC_IMAGES.length;
}

function ocImageFor(id = '') {
  return OC_IMAGES[ocIndexFor(id)];
}

// Crossfading slideshow of OC location photos. Starts on the id's stable pick,
// then fades to the next photo every few seconds. Layers sit behind the card's
// gradient overlay (DOM order = stacking order, all absolutely positioned).
function LocationBackdrop({ seedId, interval = 4500, fade = 1100 }) {
  const [idx, setIdx] = useState(() => ocIndexFor(seedId));
  useEffect(() => {
    const t = setInterval(
      () => setIdx((i) => (i + 1) % OC_IMAGES.length),
      interval,
    );
    return () => clearInterval(t);
  }, [interval]);

  return (
    <>
      {OC_IMAGES.map((src, i) => (
        <div
          key={src}
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: i === idx ? 1 : 0,
            transition: `opacity ${fade}ms ease-in-out`,
          }}
        />
      ))}
    </>
  );
}

function greetingWord() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12)  return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Matched within the last 3 days → flag as new.
function isNewMatch(matchedAt) {
  if (!matchedAt) return false;
  return Date.now() - new Date(matchedAt).getTime() < 3 * 24 * 60 * 60 * 1000;
}

function SectionTitle({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, color: '#bbb', letterSpacing: '0.08em',
      textTransform: 'uppercase', margin: '0 0 12px', padding: SECTION_PAD,
    }}>
      {children}
    </p>
  );
}

export default function HomePage({ go, currentUser, profile, showToast }) {
  const [card,    setCard]    = useState(null);
  const [matches, setMatches] = useState([]);
  const [plan,    setPlan]    = useState(null); // { plan, match }
  const [loading, setLoading] = useState(true);

  const firstName = profile?.name?.trim()?.split(/\s+/)?.[0] ?? null;

  useEffect(() => {
    if (!currentUser?.id) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getMyWeeklyCard().catch(() => null),
      getMySoloMatches().catch(() => []),
    ])
      .then(async ([cardData, matchData]) => {
        if (cancelled) return;
        setCard(cardData);
        setMatches(matchData);

        // Find a confirmed plan among my matches (first one wins).
        const plans = await Promise.all(
          matchData.map((m) => getSoloPlan(m.matchId).catch(() => null))
        );
        if (cancelled) return;
        let found = null;
        for (let i = 0; i < plans.length; i++) {
          if (plans[i]?.status === 'confirmed') { found = { plan: plans[i], match: matchData[i] }; break; }
        }
        setPlan(found);
      })
      .catch(() => { if (!cancelled) showToast?.('Could not load your home', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDays = (card?.days ?? [])
    .slice()
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const hasCard = card && selectedDays.length > 0;

  const openChat = (match) =>
    go('solo_chat', null, null, { matchId: match.matchId, partner: match.partner });

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT }}>
      <TopBar
        onLogoClick={() => go('home')}
        rightContent={<NotificationBell currentUser={currentUser} go={go} showToast={showToast} />}
      />

      <div style={{ padding: '8px 0 96px' }}>
        {/* ── Greeting ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          style={{ padding: '18px 20px 16px' }}
        >
          <p style={{ fontSize: 24, fontWeight: 600, color: TEXT, margin: 0, lineHeight: 1.2 }}>
            {greetingWord()}
            {firstName ? <>, <span style={{ color: ORANGE }}>{firstName}</span></> : ''}
          </p>
          {hasCard ? (
            <p style={{ fontSize: 13, color: TEXT_SUB, margin: '6px 0 0' }}>
              Week set ·{' '}
              <span style={{ color: ORANGE, fontWeight: 700 }}>
                {selectedDays.map((d) => DAY_LABELS[d] ?? d).join(' · ')}
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => go('weekly_card')}
              style={{ background: 'none', border: 'none', padding: '6px 0 0', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: 13, color: TEXT_SUB }}>Set your week to find matches</span>
            </button>
          )}
        </motion.div>

        {/* ── Plan card (always shown — invites first-timers when empty) ── */}
        {!loading && (
          <motion.button
            type="button"
            onClick={() => (plan ? openChat(plan.match) : go(hasCard ? 'weekly_explore' : 'weekly_card'))}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            style={{
              display: 'block', width: `calc(100% - 40px)`, margin: '0 20px 22px',
              height: 110, borderRadius: 20, overflow: 'hidden', position: 'relative',
              border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
              background: '#000',
            }}
          >
            <LocationBackdrop seedId={plan ? plan.plan.match_id : (currentUser?.id ?? 'guest')} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.65), rgba(0,0,0,0.2))',
            }} />
            <span style={{
              position: 'absolute', top: 12, left: 14,
              background: ORANGE, color: '#fff', fontSize: 11, fontWeight: 700,
              padding: '4px 10px', borderRadius: 999,
            }}>
              {plan ? `This ${dayLabel(plan.plan.day)}` : 'Orange County'}
            </span>
            <div style={{ position: 'absolute', left: 14, bottom: 12, right: 14 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {plan
                  ? (plan.plan.activity || plan.plan.place || 'Your hangout')
                  : 'No plans yet'}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '3px 0 0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {plan
                  ? ([plan.plan.place, plan.plan.time_label].filter(Boolean).join(' · ') || 'Tap to view')
                  : (hasCard ? 'Find someone to meet this week →' : 'Set your week to find matches →')}
              </p>
            </div>
          </motion.button>
        )}

        {/* ── This week's matches ──────────────────────────── */}
        {!loading && (
          <div style={{ marginBottom: 22 }}>
            <SectionTitle>This week's matches</SectionTitle>
            <div style={{
              display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 4px',
              scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
            }}>
              {matches.map((m) => {
                const photo = m.partner?.photos?.[0] || ocImageFor(m.partner?.id);
                const name  = m.partner?.name || m.partner?.username || 'Someone';
                return (
                  <motion.button
                    key={m.matchId}
                    type="button"
                    onClick={() => openChat(m)}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      flexShrink: 0, width: 140, height: 180, borderRadius: 18,
                      position: 'relative', overflow: 'hidden', border: 'none',
                      cursor: 'pointer', padding: 0, textAlign: 'left',
                      backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center',
                    }}
                  >
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.05) 60%)',
                    }} />
                    {isNewMatch(m.matchedAt) && (
                      <span style={{
                        position: 'absolute', top: 10, left: 10,
                        background: ORANGE, color: '#fff', fontSize: 10, fontWeight: 800,
                        letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 999,
                      }}>
                        NEW
                      </span>
                    )}
                    <div style={{ position: 'absolute', left: 12, bottom: 12, right: 12 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </p>
                      {m.partner?.city && (
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: '3px 0 0',
                          display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={10} strokeWidth={2} /> {m.partner.city}
                        </p>
                      )}
                    </div>
                  </motion.button>
                );
              })}

              {/* Find more — dashed empty card */}
              <button
                type="button"
                onClick={() => go('weekly_explore')}
                style={{
                  flexShrink: 0, width: 140, height: 180, borderRadius: 18,
                  border: `2px dashed #d8d8d8`, background: CARD, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#fff7ee',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Plus size={20} color={ORANGE} strokeWidth={2.4} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SUB }}>Find more</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Quick actions ────────────────────────────────── */}
        <div style={{ padding: SECTION_PAD }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <QuickAction
              accent
              Icon={Compass}
              title="Explore"
              sub="Free this week"
              onClick={() => go('weekly_explore')}
            />
            <QuickAction
              Icon={MessageCircle}
              title="Messages"
              sub={matches.length > 0 ? `${matches.length} active` : 'Your chats'}
              onClick={() => go('solo_inbox')}
            />
            <QuickAction
              Icon={Calendar}
              title="My Week"
              sub={hasCard ? selectedDays.map((d) => DAY_LABELS[d] ?? d).join(' · ') : 'Not set yet'}
              onClick={() => go('weekly_card')}
            />
            <QuickAction
              Icon={User}
              title="My Profile"
              sub="View & edit"
              onClick={() => go('me')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick action card ──────────────────────────────────────
function QuickAction({ Icon, title, sub, onClick, accent = false }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
        padding: 16, borderRadius: 18, cursor: 'pointer', textAlign: 'left',
        background: accent ? ORANGE : CARD,
        border: accent ? 'none' : CARD_BORDER,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: accent ? 'rgba(255,255,255,0.22)' : '#fff7ee',
      }}>
        <Icon size={18} color={accent ? '#fff' : ORANGE} strokeWidth={2.2} />
      </div>
      <div style={{ minWidth: 0, width: '100%' }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: accent ? '#fff' : TEXT }}>
          {title}
        </p>
        <p style={{
          fontSize: 11, margin: '2px 0 0', color: accent ? 'rgba(255,255,255,0.85)' : '#aaa',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {sub}
        </p>
      </div>
    </motion.button>
  );
}
