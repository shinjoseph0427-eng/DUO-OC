import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Clock, Sparkles, Users } from 'lucide-react';
import { C, F } from '../tokens';
import { getPlanRequestDetail, acceptPlanRequest, declinePlanRequest } from '../lib/hangouts.js';

const E_BUTTON_SHADOW = '0 4px 16px rgba(255,107,0,0.28)';

function formatVibe(vibe) {
  if (!vibe) return 'Hangout';
  return vibe.charAt(0).toUpperCase() + vibe.slice(1);
}

function formatTime(date, slot) {
  const bits = [];
  if (date) bits.push(date);
  if (slot) bits.push(slot);
  return bits.join(' · ') || 'Time TBD';
}

function getRequesterNames(duo) {
  const members = duo?.duo_members ?? [];
  return members
    .map((m) => m?.profiles?.name)
    .filter(Boolean)
    .slice(0, 2);
}

export default function RequestModal({ requestId, currentUserId, onClose, showToast, go }) {
  const [detail,    setDetail]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [accepted,  setAccepted]  = useState(false);
  const [busy,      setBusy]      = useState(false);
  const busyRef = useRef(false);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!requestId) return;
    setLoading(true);
    setDetail(null);
    setAccepted(false);
    setBusy(false);
    busyRef.current = false;

    getPlanRequestDetail(requestId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
      })
      .catch(() => {
        if (cancelled) return;
        setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [requestId]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && !accepted && !busy) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [accepted, busy, onClose]);

  const handleBackdrop = () => {
    if (!accepted && !busy) onClose();
  };

  const handleAccept = async () => {
    if (!detail || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await acceptPlanRequest(detail.id, currentUserId);
      setAccepted(true);
      closeTimerRef.current = setTimeout(() => {
        showToast?.('Accepted! Chat opened.', 'success');
        onClose();
        go?.('chat');
      }, 800);
    } catch (err) {
      showToast?.(err?.message || 'Failed to accept', 'error');
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!detail || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await declinePlanRequest(detail.id, currentUserId);
      showToast?.('Request declined', 'info');
      onClose();
    } catch (err) {
      showToast?.(err?.message || 'Failed to decline', 'error');
      busyRef.current = false;
      setBusy(false);
    }
  };

  const requesterDuo   = detail?.requester_duo;
  const plan           = detail?.plan;
  const requesterNames = getRequesterNames(requesterDuo);
  const namesLabel     = requesterNames.length > 0 ? requesterNames.join(' & ') : (requesterDuo?.name ?? 'A duo');

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdrop}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)' }}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        style={{
          position:     'fixed',
          bottom:       0,
          left:         0,
          right:        0,
          zIndex:       301,
          background:   C.cardElevated,
          borderRadius: '20px 20px 0 0',
          border:       `0.5px solid ${C.border}`,
          padding:      '0 16px 32px',
          maxHeight:    '88vh',
          overflowY:    'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(17,17,17,0.12)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0 18px' }}>
          <p style={{ ...F.h3, color: C.white, margin: 0 }}>Join request</p>
          <motion.button
            type="button"
            onClick={handleBackdrop}
            whileTap={{ scale: 0.9 }}
            disabled={accepted || busy}
            style={{ background: 'none', border: 'none', cursor: (accepted || busy) ? 'default' : 'pointer', padding: 4 }}
          >
            <X size={18} color={C.muted} />
          </motion.button>
        </div>

        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>Loading…</div>
        )}

        {!loading && !detail && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>
            This request is no longer available.
          </div>
        )}

        {!loading && detail && (
          <>
            {/* Requester duo card */}
            <div style={{
              background:   C.amberT08,
              border:       `0.5px solid ${C.brownBorder}`,
              borderRadius: 16,
              padding:      '16px 16px 14px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: detail.message ? 12 : 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: C.gradientCTA, color: C.cream,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, flexShrink: 0,
                }}>
                  {namesLabel.split(' & ').map((n) => n[0]?.toUpperCase()).join('').slice(0, 2) || 'D'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>
                    {namesLabel}
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>
                    wants to join your plan
                  </p>
                </div>
              </div>

              {detail.message && (
                <div style={{
                  background:   C.cardElevated,
                  borderRadius: 12,
                  padding:      '10px 12px',
                  fontSize:     13,
                  color:        C.white,
                  lineHeight:   1.5,
                  fontStyle:    'italic',
                }}>
                  "{detail.message}"
                </div>
              )}
            </div>

            {/* Plan detail rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              <DetailRow icon={<Sparkles size={14} color={C.amber} />} text={`${formatVibe(plan?.vibe)} · your plan`} />
              {plan?.place && (
                <DetailRow icon={<MapPin size={14} color={C.amber} />} text={plan.place} />
              )}
              <DetailRow icon={<Clock size={14} color={C.amber} />} text={formatTime(plan?.date, plan?.time_slot)} />
              {requesterDuo?.city && (
                <DetailRow icon={<Users size={14} color={C.amber} />} text={`Based in ${requesterDuo.city}`} />
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                type="button"
                onClick={handleDecline}
                disabled={accepted || busy}
                whileTap={(accepted || busy) ? {} : { scale: 0.97 }}
                style={{
                  flex:         1,
                  padding:      '13px 0',
                  borderRadius: 12,
                  border:       `0.5px solid ${C.border}`,
                  background:   'transparent',
                  color:        C.muted,
                  fontSize:     14,
                  fontWeight:   600,
                  cursor:       (accepted || busy) ? 'default' : 'pointer',
                }}
              >
                Decline
              </motion.button>
              <motion.button
                type="button"
                onClick={handleAccept}
                disabled={accepted || busy}
                whileTap={(accepted || busy) ? {} : { scale: 0.97 }}
                style={{
                  flex:         2,
                  padding:      '13px 0',
                  borderRadius: 12,
                  border:       'none',
                  background:   accepted ? C.success : C.gradientCTA,
                  color:        C.cream,
                  fontSize:     14,
                  fontWeight:   700,
                  cursor:       (accepted || busy) ? 'default' : 'pointer',
                  boxShadow:    accepted ? 'none' : E_BUTTON_SHADOW,
                  transition:   'background 0.2s',
                }}
              >
                {accepted ? '✓ Accepted!' : (busy ? 'Working…' : 'Accept request')}
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}

function DetailRow({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 16, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <span style={{ fontSize: 13, color: C.muted }}>{text}</span>
    </div>
  );
}
