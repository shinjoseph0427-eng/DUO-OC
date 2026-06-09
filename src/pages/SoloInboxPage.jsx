// src/pages/SoloInboxPage.jsx
// Accept/decline received Solo requests — cloned from HomieInboxPage, no duo creation.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Inbox, MapPin, MessageCircle } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import {
  getMyReceivedSoloRequests,
  acceptSoloRequest,
  declineSoloRequest,
  getMySoloMatches,
} from '../lib/solo.js';
import { getLatestSoloMessages } from '../lib/soloMessages.js';
import TopBar from '../components/TopBar.jsx';
import EmptyState from '../components/EmptyState.jsx';

function gradientFor(id = '') {
  const code = id ? id.charCodeAt(0) : 0;
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

function SectionHeader({ title, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 2px 10px' }}>
      <p style={{ fontSize: 12, fontWeight: 850, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
        {title}
      </p>
      {typeof count === 'number' && count > 0 && (
        <span style={{ fontSize: 12, fontWeight: 800, color: C.amber }}>
          {count}
        </span>
      )}
    </div>
  );
}

function SoloAvatar({ user, size = 52 }) {
  const photo = user?.photos?.[0] ?? null;
  const name = user?.name || user?.username || 'Someone';

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2, flexShrink: 0,
      background: gradientFor(user?.id ?? ''),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: Math.round(size * 0.38), fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>
        {name[0].toUpperCase()}
      </span>
    </div>
  );
}

function MatchCard({ match, latestMessage, onOpen }) {
  const partner = match.partner ?? {};
  const name = partner.name || partner.username || 'Someone';
  const preview = latestMessage?.content || 'Say hi and start the conversation.';

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      onClick={() => onOpen(match)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: C.cardElevated,
        borderRadius: 16,
        border: `0.5px solid ${C.border}`,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <SoloAvatar user={partner} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </p>
        {partner.username && (
          <p style={{ fontSize: 12, color: C.muted, margin: '1px 0 0' }}>@{partner.username}</p>
        )}
        <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview}
        </p>
        {partner.city && (
          <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
            <MapPin size={10} strokeWidth={2} /> {partner.city}
          </p>
        )}
      </div>
      <MessageCircle size={18} color={C.amber} strokeWidth={2.2} style={{ flexShrink: 0 }} />
    </motion.button>
  );
}

// ── Request card ──────────────────────────────────────────
function RequestCard({ req, onAccept, onDecline, busy }) {
  const u     = req.from_user;
  const name  = u?.name || u?.username || 'Someone';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        background: C.cardElevated,
        borderRadius: 16,
        border: `0.5px solid ${C.border}`,
      }}
    >
      {/* Avatar */}
      <SoloAvatar user={u} />

      {/* Name + city */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0, lineHeight: 1.3 }}>
          {name}
        </p>
        {u?.username && (
          <p style={{ fontSize: 12, color: C.muted, margin: '1px 0 0' }}>@{u.username}</p>
        )}
        {u?.city && (
          <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
            <MapPin size={10} strokeWidth={2} /> {u.city}
          </p>
        )}
      </div>

      {/* Accept / decline */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => onDecline(req)}
          disabled={busy}
          aria-label="Decline"
          style={{
            width: 40, height: 40, borderRadius: 20,
            border: `1.5px solid ${C.border}`,
            background: C.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <X size={16} color={C.muted} />
        </button>

        <button
          onClick={() => onAccept(req)}
          disabled={busy}
          aria-label="Accept"
          style={{
            width: 40, height: 40, borderRadius: 20,
            border: 'none',
            background: C.gradientCTA,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <Check size={16} color="#fff" strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function SoloInboxPage({ currentUser, go, goBack, showToast }) {
  const [requests, setRequests] = useState([]);
  const [matches,  setMatches]  = useState([]);
  const [latestMessages, setLatestMessages] = useState(new Map());
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    Promise.all([
      getMyReceivedSoloRequests(),
      getMySoloMatches(),
    ])
      .then(async ([nextRequests, nextMatches]) => {
        setRequests(nextRequests);
        setMatches(nextMatches);
        const latest = await getLatestSoloMessages(nextMatches.map(m => m.matchId)).catch(() => new Map());
        setLatestMessages(latest);
      })
      .catch(() => showToast?.('Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openMatch = (match) => {
    go('solo_chat', null, null, { matchId: match.matchId, partner: match.partner });
  };

  const handleAccept = async (req) => {
    if (busyId) return;
    setBusyId(req.id);
    try {
      const matchId = await acceptSoloRequest(req.id);
      setRequests(prev => prev.filter(r => r.id !== req.id));
      showToast?.('Matched! Chat opened.', 'success');
      // Jump straight into the chat — go() chat slot carries the match object
      go('solo_chat', null, null, { matchId, partner: req.from_user });
    } catch (e) {
      showToast?.(e?.message ?? 'Failed to accept', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (req) => {
    if (busyId) return;
    setBusyId(req.id);
    try {
      await declineSoloRequest(req.id);
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e) {
      showToast?.(e?.message ?? 'Failed to decline', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <TopBar showBack onBack={goBack ?? (() => go('weekly_explore'))} onLogoClick={() => go('home')} />

      <div style={{ flex: 1, padding: '12px 16px 100px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, margin: '4px 0 14px' }}>
          Messages
        </h1>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer" style={{ height: 80, borderRadius: 16, background: C.cardElevated }} />
            ))}
          </div>
        )}

        {!loading && (
          <>
            <SectionHeader title="Active Chats" count={matches.length} />
            {matches.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {matches.map(match => (
                  <MatchCard
                    key={match.matchId}
                    match={match}
                    latestMessage={latestMessages.get(match.matchId)}
                    onOpen={openMatch}
                  />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: C.muted, margin: '0 2px 2px' }}>
                No active chats yet.
              </p>
            )}

            <SectionHeader title="Requests" count={requests.length} />
          </>
        )}

        {/* Request list */}
        {!loading && requests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence mode="popLayout">
              {requests.map(req => (
                <RequestCard
                  key={req.id}
                  req={req}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  busy={busyId === req.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state */}
        {!loading && requests.length === 0 && matches.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="No requests yet"
            subtitle="Explore this week and send a request when someone's week overlaps with yours."
            action={() => go('weekly_explore')}
            actionLabel="Explore This Week"
            style={{ marginTop: 14 }}
          />
        )}
        {!loading && requests.length === 0 && matches.length > 0 && (
          <p style={{ fontSize: 13, color: C.muted, margin: '0 2px' }}>
            No requests waiting.
          </p>
        )}
      </div>
    </div>
  );
}
