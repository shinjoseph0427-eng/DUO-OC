// src/pages/WeeklyExplorePage.jsx
// Weekly explore — card-swipe discovery for this week's availability overlap.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Calendar, Heart, MapPin, X } from 'lucide-react';
import { getMyWeeklyCard, getWeeklyMatches } from '../lib/weeklyCards.js';
import { sendSoloRequest } from '../lib/solo.js';

// ── tokens ──────────────────────────────────────────────────
const ORANGE = '#FF8C00';
const PAGE_BG = '#fafafa';
const SWIPE_THRESHOLD = 90;

const DAY_ORDER  = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

// oc_07.jpg was removed from the project, so this stack uses the 6 available
// photos (stable per user via charCode sum).
const OC_IMAGES = ['/oc_01.jpg', '/oc_02.jpg', '/oc_03.jpg', '/oc_04.jpg', '/oc_05.jpg', '/oc_06.jpg'];

// ── helpers ─────────────────────────────────────────────────
function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normDay(d) {
  return String(d).trim().toLowerCase().slice(0, 3);
}

function getMatchUserId(match) {
  return match?.user_id ?? match?.profile_id ?? match?.id ?? null;
}

function getPhoto(match) {
  const photos = asList(match?.photos);
  return photos[0] ?? match?.photo_url ?? match?.avatar_url ?? null;
}

function ocImageFor(id = '') {
  const s = String(id);
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  return OC_IMAGES[sum % OC_IMAGES.length];
}

function distanceText(km) {
  if (km == null || Number.isNaN(Number(km))) return null;
  const n = Number(km);
  return `${n < 10 ? n.toFixed(1) : Math.round(n)} km away`;
}

function vibeTags(match) {
  return asList(match?.vibe)
    .flatMap((v) => String(v).split(','))
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
}

// Per-day overlap state between my week and a match's week.
function dayStates(match, myDaySet) {
  const overlap = new Set(asList(match?.overlap_days).map(normDay));
  const theirs  = new Set(asList(match?.days).map(normDay));
  // Fall back to the RPC overlap when the match's full days aren't provided.
  if (overlap.size === 0) {
    for (const d of theirs) if (myDaySet.has(d)) overlap.add(d);
  }
  if (theirs.size === 0) {
    for (const d of overlap) theirs.add(d);
  }

  const states = DAY_ORDER.map((day) => {
    const mine  = myDaySet.has(day);
    const their = theirs.has(day);
    const both  = overlap.has(day) || (mine && their);
    let state = 'none';
    if (both) state = 'both';
    else if (mine) state = 'mine';
    else if (their) state = 'theirs';
    return { day, state };
  });

  const overlapDays = states.filter((s) => s.state === 'both').map((s) => s.day);
  return { states, overlapDays };
}

function overlapScore(match, myDaySet) {
  const overlap = asList(match?.overlap_days).map(normDay);
  if (overlap.length) return overlap.length;
  return asList(match?.days).map(normDay).filter((d) => myDaySet.has(d)).length;
}

// ── overlap bar ─────────────────────────────────────────────
const DAY_CHIP = {
  both:   { background: ORANGE,    color: '#fff',    scale: 1.08, shadow: '0 4px 10px rgba(255,140,0,0.35)' },
  mine:   { background: '#FFE0B2', color: ORANGE,    scale: 1,    shadow: 'none' },
  theirs: { background: '#E3F2FD', color: '#1976D2', scale: 1,    shadow: 'none' },
  none:   { background: '#f5f5f5', color: '#ccc',    scale: 1,    shadow: 'none' },
};

function OverlapBar({ states, overlapDays, borderColor }) {
  return (
    <motion.div
      style={{
        background: '#fff',
        borderStyle: 'solid',
        borderWidth: 0.5,
        borderColor,
        borderRadius: 16,
        padding: '12px 16px',
        margin: '0 20px 12px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        {states.map(({ day, state }) => {
          const chip = DAY_CHIP[state];
          return (
            <div
              key={day}
              style={{
                flex: 1,
                minWidth: 0,
                height: 34,
                borderRadius: 10,
                background: chip.background,
                color: chip.color,
                boxShadow: chip.shadow,
                transform: `scale(${chip.scale})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
            >
              {DAY_LABELS[day]}
            </div>
          );
        })}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, fontWeight: 600, color: overlapDays.length ? ORANGE : '#bbb' }}>
        {overlapDays.length
          ? `${overlapDays.length} ${overlapDays.length === 1 ? 'day' : 'days'} overlap — ${overlapDays.map((d) => DAY_LABELS[d]).join(', ')}`
          : 'No overlap this week'}
      </p>
    </motion.div>
  );
}

// ── card visual (shared by front + back cards) ──────────────
function CardVisual({ match }) {
  const photo = getPhoto(match) || ocImageFor(getMatchUserId(match));
  const name  = match?.name || match?.username || 'Someone';
  const title = match?.age ? `${name}, ${match.age}` : name;
  const place = match?.school || match?.city || null;
  const dist  = distanceText(match?.distance_km);
  const sub   = [place, dist].filter(Boolean).join(' · ');
  const tags  = vibeTags(match);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: '#111',
        backgroundImage: `url(${photo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 55%)',
        }}
      />
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 24 }}>
        <p style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}>
          {title}
        </p>
        {sub && (
          <p style={{
            margin: '6px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {place && <MapPin size={13} strokeWidth={2} />}
            {sub}
          </p>
        )}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {tags.map((t, i) => (
              <span
                key={`${t}-${i}`}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: '0.5px solid rgba(255,255,255,0.28)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '5px 11px',
                  borderRadius: 999,
                  backdropFilter: 'blur(4px)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const BACK_TRANSFORMS = {
  1: { transform: 'rotate(-1.5deg) translateY(5px) scale(0.97)', opacity: 0.8, zIndex: 2 },
  2: { transform: 'rotate(3deg) translateY(10px) scale(0.95)',   opacity: 0.6, zIndex: 1 },
};

function BackCard({ match, pos }) {
  const t = BACK_TRANSFORMS[pos];
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        transformOrigin: 'center bottom',
        transform: t.transform,
        opacity: t.opacity,
        zIndex: t.zIndex,
        pointerEvents: 'none',
      }}
    >
      <CardVisual match={match} />
    </div>
  );
}

// ── page ────────────────────────────────────────────────────
export default function WeeklyExplorePage({ currentUser, go, showToast }) {
  const [myCard, setMyCard] = useState(null);
  const [matches, setMatches] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const x = useMotionValue(0);
  const rotate      = useTransform(x, [-220, 220], [-16, 16]);
  const meetOpacity = useTransform(x, [30, 120], [0, 1]);
  const skipOpacity = useTransform(x, [-120, -30], [1, 0]);
  const barBorder   = useTransform(
    x,
    [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    ['rgba(244,67,54,0.3)', '#e8e8e8', 'rgba(76,175,80,0.4)'],
  );

  const lock = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    let card = null;
    if (currentUser) {
      card = await getMyWeeklyCard().catch(() => null);
    }
    setMyCard(card);

    let list = [];
    if (currentUser) {
      list = await getWeeklyMatches().catch(() => []);
    }

    const myDaySet = new Set(asList(card?.days).map(normDay));
    const sorted = [...list].sort((a, b) => {
      const ov = overlapScore(b, myDaySet) - overlapScore(a, myDaySet);
      if (ov !== 0) return ov;
      const da = Number(a?.distance_km ?? Infinity);
      const db = Number(b?.distance_km ?? Infinity);
      return da - db;
    });

    setMatches(sorted);
    setIndex(0);
    x.set(0);
    setLoading(false);
  }, [currentUser, x]);

  useEffect(() => {
    load();
  }, [load]);

  const myDaySet = useMemo(() => new Set(asList(myCard?.days).map(normDay)), [myCard]);
  const current = matches[index] ?? null;
  const overlap = useMemo(
    () => (current ? dayStates(current, myDaySet) : null),
    [current, myDaySet],
  );

  const advance = useCallback(() => {
    setIndex((i) => i + 1);
    x.set(0);
    lock.current = false;
  }, [x]);

  const flyOut = useCallback((dir, after) => {
    if (lock.current) return;
    lock.current = true;
    animate(x, dir * 600, {
      duration: 0.32,
      ease: [0.4, 0, 0.2, 1],
      onComplete: () => { after?.(); advance(); },
    });
  }, [x, advance]);

  const snapBack = useCallback(() => {
    animate(x, 0, { type: 'spring', stiffness: 340, damping: 32 });
  }, [x]);

  const fireRequest = useCallback((match) => {
    const id = getMatchUserId(match);
    if (!id) return;
    sendSoloRequest(id)
      .then(() => showToast?.('Request sent!', 'success'))
      .catch((e) => showToast?.(e?.message ?? 'Failed to send request', 'error'));
  }, [showToast]);

  const handleSkip = useCallback(() => {
    if (lock.current || !current) return;
    flyOut(-1);
  }, [current, flyOut]);

  const handleLike = useCallback(() => {
    if (lock.current || !current) return;
    if (!currentUser) { go('login'); return; }
    const match = current;
    flyOut(1, () => fireRequest(match));
  }, [current, currentUser, go, flyOut, fireRequest]);

  const handleHangout = useCallback(() => {
    if (!current) return;
    if (!currentUser) { go('login'); return; }
    const id = getMatchUserId(current);
    if (!id) return;
    sendSoloRequest(id)
      .then(() => {
        showToast?.('Request sent — plan your hangout!', 'success');
        go('solo_inbox');
      })
      .catch((e) => showToast?.(e?.message ?? 'Failed to send request', 'error'));
  }, [current, currentUser, go, showToast]);

  const handleDragEnd = useCallback((_e, info) => {
    const off = info.offset.x;
    if (off > SWIPE_THRESHOLD) handleLike();
    else if (off < -SWIPE_THRESHOLD) handleSkip();
    else snapBack();
  }, [handleLike, handleSkip, snapBack]);

  const hasCard = !!current;

  return (
    <div style={{ height: '100dvh', background: PAGE_BG, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Top bar ── */}
      <header
        style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '0.5px solid #e8e8e8',
          background: '#fff',
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>Explore</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#999' }}>OC · 18–25</span>
      </header>

      {/* ── Overlap bar ── */}
      {overlap && (
        <div style={{ paddingTop: 12 }}>
          <OverlapBar states={overlap.states} overlapDays={overlap.overlapDays} borderColor={barBorder} />
        </div>
      )}

      {/* ── Card stack ── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', margin: '0 20px 8px' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 22,
            background: '#ececec',
          }} className="shimmer" />
        )}

        {!loading && !hasCard && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#fff7ee',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Calendar size={28} color={ORANGE} strokeWidth={2} />
            </div>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>
              You've seen everyone this week
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#999' }}>
              Check back next week
            </p>
          </div>
        )}

        {!loading && hasCard && (
          <>
            {matches[index + 2] && <BackCard match={matches[index + 2]} pos={2} />}
            {matches[index + 1] && <BackCard match={matches[index + 1]} pos={1} />}

            <motion.div
              key={getMatchUserId(current)}
              drag="x"
              dragSnapToOrigin={false}
              dragMomentum={false}
              dragElastic={0.6}
              onDragEnd={handleDragEnd}
              style={{
                position: 'absolute',
                inset: 0,
                x,
                rotate,
                zIndex: 3,
                cursor: 'grab',
                touchAction: 'pan-y',
                borderRadius: 22,
                boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
              }}
              whileTap={{ cursor: 'grabbing' }}
            >
              <CardVisual match={current} />

              {/* Drag stamps */}
              <motion.div
                style={{
                  position: 'absolute', top: 24, left: 24, opacity: meetOpacity,
                  transform: 'rotate(-12deg)',
                  border: '4px solid #4CAF50', color: '#4CAF50',
                  borderRadius: 8, padding: '4px 12px',
                  fontSize: 28, fontWeight: 900, letterSpacing: '2px',
                  pointerEvents: 'none',
                }}
              >
                MEET
              </motion.div>
              <motion.div
                style={{
                  position: 'absolute', top: 24, right: 24, opacity: skipOpacity,
                  transform: 'rotate(12deg)',
                  border: '4px solid #F44336', color: '#F44336',
                  borderRadius: 8, padding: '4px 12px',
                  fontSize: 28, fontWeight: 900, letterSpacing: '2px',
                  pointerEvents: 'none',
                }}
              >
                SKIP
              </motion.div>
            </motion.div>
          </>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 20px max(20px, env(safe-area-inset-bottom))',
      }}>
        <motion.button
          type="button"
          aria-label="Skip"
          onClick={handleSkip}
          disabled={!hasCard}
          whileTap={{ scale: 0.9 }}
          style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: '#fff', border: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: hasCard ? 'pointer' : 'default', opacity: hasCard ? 1 : 0.4,
          }}
        >
          <X size={22} color="#999" strokeWidth={2.6} />
        </motion.button>

        <motion.button
          type="button"
          onClick={handleHangout}
          disabled={!hasCard}
          whileTap={{ scale: 0.97 }}
          style={{
            flex: 1, height: 52, borderRadius: 26,
            background: '#fff', border: `1.5px solid ${ORANGE}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: hasCard ? 'pointer' : 'default', opacity: hasCard ? 1 : 0.4,
          }}
        >
          <Calendar size={17} color={ORANGE} strokeWidth={2.4} />
          <span style={{ fontSize: 13, fontWeight: 700, color: ORANGE }}>Hangout this week?</span>
        </motion.button>

        <motion.button
          type="button"
          aria-label="Send request"
          onClick={handleLike}
          disabled={!hasCard}
          whileTap={{ scale: 0.9 }}
          style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: ORANGE, border: 'none',
            boxShadow: '0 6px 18px rgba(255,140,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: hasCard ? 'pointer' : 'default', opacity: hasCard ? 1 : 0.4,
          }}
        >
          <Heart size={22} color="#fff" strokeWidth={2.4} fill="#fff" />
        </motion.button>
      </div>
    </div>
  );
}
