// src/pages/SoloInboxPage.jsx
// Accept/decline received Solo requests — cloned from HomieInboxPage, no duo creation.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Inbox, MapPin } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import {
  getMyReceivedSoloRequests,
  acceptSoloRequest,
  declineSoloRequest,
} from '../lib/solo.js';
import TopBar from '../components/TopBar.jsx';
import EmptyState from '../components/EmptyState.jsx';

function gradientFor(id = '') {
  const code = id ? id.charCodeAt(0) : 0;
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

// ── Request card ──────────────────────────────────────────
function RequestCard({ req, onAccept, onDecline, busy }) {
  const u     = req.from_user;
  const photo = u?.photos?.[0] ?? null;
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
      {photo ? (
        <img
          src={photo} alt={name}
          style={{ width: 52, height: 52, borderRadius: 26, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 52, height: 52, borderRadius: 26, flexShrink: 0,
          background: gradientFor(u?.id ?? ''),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>
            {name[0].toUpperCase()}
          </span>
        </div>
      )}

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
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    getMyReceivedSoloRequests()
      .then(setRequests)
      .catch(() => showToast?.('Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async (req) => {
    if (busyId) return;
    setBusyId(req.id);
    try {
      const matchId = await acceptSoloRequest(req.id);
      setRequests(prev => prev.filter(r => r.id !== req.id));
      showToast?.('Matched! Start the chat.', 'success');
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
      <TopBar showBack onBack={goBack ?? (() => go('solo_explore'))} onLogoClick={() => go('home')} />

      <div style={{ flex: 1, padding: '12px 16px 100px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, margin: '4px 0 14px' }}>
          Solo requests
        </h1>

        {/* Count */}
        {!loading && requests.length > 0 && (
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px' }}>
            {requests.length} request{requests.length === 1 ? '' : 's'} waiting
          </p>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer" style={{ height: 80, borderRadius: 16, background: C.cardElevated }} />
            ))}
          </div>
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
        {!loading && requests.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="No requests yet"
            subtitle="Make the first move from Solo explore"
            action={() => go('solo_explore')}
            actionLabel="Explore"
          />
        )}
      </div>
    </div>
  );
}
