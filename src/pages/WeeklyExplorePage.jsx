// src/pages/WeeklyExplorePage.jsx
// Weekly explore page - availability overlap matches for the current week.

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, MapPin, MessageCircle, RefreshCw, Sparkles, UserCheck } from 'lucide-react';
import { getWeeklyMatches, getMyWeeklyCard } from '../lib/weeklyCards.js';
import { sendSoloRequest } from '../lib/solo.js';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import InitialsAvatar from '../components/InitialsAvatar.jsx';

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function formatList(value) {
  const items = asList(value);
  return items.length ? items.join(', ') : null;
}

function formatDistance(km) {
  if (km == null || Number.isNaN(Number(km))) return null;
  const n = Number(km);
  return `about ${n < 10 ? n.toFixed(1) : Math.round(n)} km away`;
}

function getPhoto(match) {
  const photos = asList(match?.photos);
  return photos[0] ?? match?.photo_url ?? match?.avatar_url ?? null;
}

function getMatchUserId(match) {
  return match?.user_id ?? match?.profile_id ?? match?.id ?? null;
}

function SkeletonCard() {
  return (
    <div
      className="shimmer"
      style={{
        height: 168,
        borderRadius: 16,
        background: C.cardElevated,
        border: `1px solid ${C.border}`,
      }}
    />
  );
}

function AmberPill({ children }) {
  if (!children) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 9999,
        padding: '6px 10px',
        background: C.amberT14,
        border: `0.5px solid ${C.brownBorder}`,
        color: C.amber,
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

function WeeklyMatchCard({ match, onRequest, requested, requesting }) {
  const name = match?.name || match?.username || 'Someone';
  const username = match?.username && match.username !== match.name ? `@${match.username}` : null;
  const photo = getPhoto(match);
  const overlapDays = formatList(match?.overlap_days);
  const overlapSlots = formatList(match?.overlap_slots);
  const distance = formatDistance(match?.distance_km);
  const secondary = [match?.vibe, match?.place].filter(Boolean).join(' - ');

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'grid',
        gridTemplateColumns: '82px minmax(0, 1fr)',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        background: C.cardElevated,
        border: `1px solid ${C.border}`,
        boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          width: 82,
          height: 104,
          borderRadius: 14,
          overflow: 'hidden',
          background: C.bg2,
          flexShrink: 0,
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={name}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
            <InitialsAvatar name={name} size={62} />
          </div>
        )}
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                color: C.white,
                fontSize: 17,
                fontWeight: 850,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, minWidth: 0 }}>
            {match?.city && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  minWidth: 0,
                  color: C.muted,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <MapPin size={12} strokeWidth={2} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {match.city}
                </span>
              </span>
            )}
            {distance && (
              <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>
                {distance}
              </span>
            )}
          </div>
          {username && (
            <p style={{ margin: '3px 0 0', color: C.muted, fontSize: 12 }}>
              {username}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <AmberPill>{overlapDays}</AmberPill>
          <AmberPill>{overlapSlots}</AmberPill>
        </div>

        {secondary && (
          <p
            style={{
              margin: 0,
              color: C.muted,
              fontSize: 13,
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {secondary}
          </p>
        )}

        <button
          type="button"
          onClick={() => onRequest(match)}
          disabled={requested || requesting}
          style={{
            marginTop: 'auto',
            width: '100%',
            minHeight: 38,
            border: 'none',
            borderRadius: 10,
            background: requested ? 'rgba(17,17,17,0.16)' : C.gradientCTA,
            color: C.cream,
            fontSize: 13,
            fontWeight: 800,
            cursor: requested || requesting ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            opacity: requesting ? 0.72 : 1,
          }}
        >
          {requested ? (
            <>
              <UserCheck size={15} strokeWidth={2.4} />
              Requested
            </>
          ) : requesting ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'inline-flex' }}
              >
                <RefreshCw size={15} strokeWidth={2.4} />
              </motion.span>
              Sending...
            </>
          ) : (
            <>
              <MessageCircle size={15} strokeWidth={2.4} />
              Send Request
            </>
          )}
        </button>
      </div>
    </motion.article>
  );
}

export default function WeeklyExplorePage({ currentUser, go, showToast }) {
  const [myCard, setMyCard] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requested, setRequested] = useState(new Set());
  const [requesting, setRequesting] = useState(new Set());

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const card = await getMyWeeklyCard();
      setMyCard(card);

      if (!card) {
        setMatches([]);
        return;
      }

      const nextMatches = await getWeeklyMatches();
      setMatches(nextMatches);
    } catch (error) {
      showToast?.('Could not load weekly matches.', 'error');
      setMatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast, currentUser?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRequest = async (match) => {
    const toUserId = getMatchUserId(match);
    if (!toUserId || requested.has(toUserId) || requesting.has(toUserId)) return;

    setRequested(prev => new Set([...prev, toUserId]));
    setRequesting(prev => new Set([...prev, toUserId]));
    try {
      await sendSoloRequest(toUserId);
      showToast?.('Request sent!', 'success');
    } catch (error) {
      setRequested(prev => {
        const next = new Set(prev);
        next.delete(toUserId);
        return next;
      });
      showToast?.(error?.message ?? 'Failed to send request', 'error');
    } finally {
      setRequesting(prev => {
        const next = new Set(prev);
        next.delete(toUserId);
        return next;
      });
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <TopBar
        showBack
        onBack={() => go('home')}
        onLogoClick={() => go('home')}
        rightContent={
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            aria-label="Refresh weekly matches"
            style={{
              width: 36,
              height: 36,
              border: 'none',
              borderRadius: 9999,
              background: C.bg2,
              color: C.muted,
              cursor: loading || refreshing ? 'default' : 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <motion.span
              animate={{ rotate: refreshing ? 360 : 0 }}
              transition={{ duration: 0.7, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
              style={{ display: 'inline-flex' }}
            >
              <RefreshCw size={18} />
            </motion.span>
          </button>
        }
      />

      <main style={{ flex: 1, padding: '12px 16px 100px', overflowY: 'auto' }}>
        <h1 style={{ margin: '4px 0 6px', color: C.white, fontSize: 26, fontWeight: 900 }}>
          Explore This Week
        </h1>
        <p style={{ margin: '0 0 16px', color: C.muted, fontSize: 14, lineHeight: 1.5 }}>
          People whose free days and time slots overlap with yours.
        </p>

        {loading && (
          <div style={{ display: 'grid', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        )}

        {!loading && !myCard && (
          <EmptyState
            icon={CalendarClock}
            title="Set your week first"
            subtitle="Pick when you're free so we can find people who match your week."
            action={() => go('weekly_card')}
            actionLabel="Set My Week"
          />
        )}

        {!loading && myCard && matches.length === 0 && (
          <EmptyState
            icon={Sparkles}
            title="No weekly matches yet"
            subtitle="Check back later or update your week."
            action={() => go('weekly_card')}
            actionLabel="Update My Week"
          />
        )}

        {!loading && myCard && matches.length > 0 && (
          <div style={{ display: 'grid', gap: 12 }}>
            <AnimatePresence>
              {matches.map((match) => (
                <WeeklyMatchCard
                  key={match.id}
                  match={match}
                  onRequest={handleRequest}
                  requested={requested.has(getMatchUserId(match))}
                  requesting={requesting.has(getMatchUserId(match))}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
