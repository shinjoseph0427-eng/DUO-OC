import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check } from 'lucide-react';
import { C } from '../tokens';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  subscribeNotifications,
} from '../lib/notifications.js';
import { acceptPlanRequest, declinePlanRequest, formatPlanDateLabel } from '../lib/hangouts.js';
import { getChatByHangoutId } from '../lib/messages.js';
import HomieAcceptedCelebration from './HomieAcceptedCelebration.jsx';

const TYPE_META = {
  solo_request:      { label: (p) => `${p.sender_name ?? 'Someone'} sent you a 1:1 request.`, page: 'solo_inbox' },
  solo_accepted:     { label: (p) => `${p.partner_name ?? 'Someone'} accepted your 1:1 request.`, page: 'solo_inbox' },
};

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell({ currentUser, go, onOpenPlanRequest, showToast }) {
  const [notifs,        setNotifs]        = useState([]);
  const [planBusyId,    setPlanBusyId]    = useState(null);
  const [celebratePartner, setCelebratePartner] = useState(null);
  const [open,          setOpen]          = useState(false);
  const panelRef = useRef(null);
  const btnRef   = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    getNotifications(currentUser.id).then(setNotifs).catch(() => {});
    const unsub = subscribeNotifications(currentUser.id, currentUser.id, (n) => {
      setNotifs((prev) => [n, ...prev]);
    });
    return unsub;
  }, [currentUser]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const handleNotifClick = async (n) => {
    // plan_request → open detail modal instead of navigating away
    if (n.type === 'plan_request') {
      const reqId = n.payload?.request_id;
      if (!reqId || !onOpenPlanRequest) {
        showToast?.('This request is no longer available.', 'info');
        setOpen(false);
        return;
      }
      if (!n.read) {
        try {
          await markAsRead(n.id);
          setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        } catch {
          showToast?.('Could not update notification yet.', 'error');
          return;
        }
      }
      onOpenPlanRequest(reqId);
      setOpen(false);
      return;
    }
    if (!n.read) {
      try {
        await markAsRead(n.id);
        setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {
        showToast?.('Could not update notification yet.', 'error');
        return;
      }
    }
    // hangout_confirmed → deep-link straight into the 4-person chat room.
    if (n.type === 'hangout_confirmed' && n.payload?.hangout_id && currentUser?.id) {
      setOpen(false);
      const chat = await getChatByHangoutId(currentUser.id, n.payload.hangout_id).catch(() => null);
      if (chat) { go('chat_thread', null, null, chat); return; }
      go('chat');
      return;
    }
    const meta = TYPE_META[n.type];
    if (meta?.page) go(meta.page);
    setOpen(false);
  };

  const handleAcceptPlan = async (e, n) => {
    e.preventDefault();
    e.stopPropagation();
    const reqId = n.payload?.request_id;
    if (planBusyId || !currentUser) return;
    if (!reqId) {
      showToast?.('This request is no longer available.', 'info');
      return;
    }
    setPlanBusyId(n.id);
    try {
      const res = await acceptPlanRequest(reqId, currentUser.id);
      await markAsRead(n.id);
      setNotifs((prev) => prev.filter((x) => x.id !== n.id));
      showToast?.('Accepted! Chat opened.', 'success');
      setOpen(false);
      const chat = res?.hangoutId
        ? await getChatByHangoutId(currentUser.id, res.hangoutId).catch(() => null)
        : null;
      if (chat) go?.('chat_thread', null, null, chat);
      else go?.('chat');
    } catch (err) {
      showToast?.(err?.message || 'Failed to accept', 'error');
    } finally {
      setPlanBusyId(null);
    }
  };

  const handleDeclinePlan = async (e, n) => {
    e.preventDefault();
    e.stopPropagation();
    const reqId = n.payload?.request_id;
    if (planBusyId || !currentUser) return;
    if (!reqId) {
      showToast?.('This request is no longer available.', 'info');
      return;
    }
    setPlanBusyId(n.id);
    try {
      await declinePlanRequest(reqId, currentUser.id);
      await markAsRead(n.id);
      setNotifs((prev) => prev.filter((x) => x.id !== n.id));
      showToast?.('Request declined', 'info');
    } catch (err) {
      showToast?.(err?.message || 'Failed to decline', 'error');
    } finally {
      setPlanBusyId(null);
    }
  };

  const handleReview = async (e, n, action) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await markAsRead(n.id);
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch {
      showToast?.('Could not update notification yet.', 'error');
      return;
    }
    if (action === 'review') {
      showToast?.('Review flow coming soon.', 'info');
      setOpen(false);
    }
  };

  const handleMarkAll = async () => {
    if (!currentUser) return;
    try {
      await markAllAsRead(currentUser.id);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      showToast?.('Could not mark notifications read yet.', 'error');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        ref={btnRef}
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.88 }}
        transition={{ duration: 0.1 }}
        style={{
          width:          34,
          height:         34,
          borderRadius:   10,
          background:     open ? 'rgba(255,107,0,0.10)' : C.cardElevated,
          border:         `0.5px solid ${open ? 'rgba(255,107,0,0.22)' : C.border}`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          cursor:         'pointer',
          position:       'relative',
        }}
      >
        <Bell size={17} color={open ? C.amber : C.muted} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <div
            style={{
              position:     'absolute',
              top:          -4,
              right:        -4,
              minWidth:     16,
              height:       16,
              borderRadius: 9999,
              background:   C.danger,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              fontSize:     9,
              fontWeight:   800,
              color:        '#fff',
              padding:      '0 3px',
              border:       `1.5px solid ${C.cream}`,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0,   scale: 0.94, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{
              position:     'absolute',
              top:          42,
              right:        0,
              width:        300,
              maxHeight:    360,
              overflowY:    'auto',
              background:   C.cardElevated,
              border:       `0.5px solid ${C.border}`,
              borderRadius: 16,
              boxShadow:    '0 16px 48px rgba(0,0,0,0.6)',
              zIndex:       500,
            }}
          >
            {/* ── Panel header ── */}
            <div style={{
              padding:        '14px 16px 10px',
              borderBottom:   `0.5px solid ${C.border}`,
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.white }}>
                Activity
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {notifs.some((n) => !n.read) && (
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.muted, fontWeight: 600, padding: '2px 4px' }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >
                  <X size={14} color={C.muted} />
                </button>
              </div>
            </div>

            {/* ── Notifications ── */}
            {notifs.length > 0 && (
              <div>
                {notifs.map((n) => {
                  // ── Review prompt card ──
                  if (n.type === 'review') {
                    const duoName  = n.payload?.duo_name ?? 'your duo';
                    const dateText = formatPlanDateLabel(n.payload?.date);
                    return (
                      <div
                        key={n.id}
                        style={{
                          padding:        '12px 14px',
                          borderLeft:     `3px solid ${C.amber}`,
                          borderBottom:   `0.5px solid ${C.border}`,
                          background:     n.read ? 'transparent' : C.amberT08,
                        }}
                      >
                        <p style={{ fontSize: 13, fontWeight: 700, color: C.white, margin: 0, lineHeight: 1.4 }}>
                          How was your hangout with {duoName}?
                        </p>
                        <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>
                          {[dateText, timeAgo(n.created_at)].filter(Boolean).join(' · ')}
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => handleReview(e, n, 'review')}
                            style={{
                              border:       'none',
                              background:   C.amber,
                              color:        '#fff',
                              borderRadius: 9999,
                              padding:      '7px 14px',
                              fontSize:     12,
                              fontWeight:   700,
                              cursor:       'pointer',
                            }}
                          >
                            Leave a review
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleReview(e, n, 'skip')}
                            style={{
                              border:     'none',
                              background: 'none',
                              color:      C.muted,
                              fontSize:   12,
                              fontWeight: 600,
                              cursor:     'pointer',
                            }}
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const meta      = TYPE_META[n.type] ?? { label: () => n.type };
                  const label     = meta.label(n.payload ?? {});
                  const isPlanReq = n.type === 'plan_request' && n.payload?.request_id;
                  const busy      = planBusyId === n.id;
                  return (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotifClick(n)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleNotifClick(n); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'flex-start',
                        gap: 10, padding: '12px 14px',
                        background: n.read ? 'transparent' : C.amberT08,
                        borderBottom: `0.5px solid ${C.border}`,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {meta.emoji && (
                        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>{meta.emoji}</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: n.read ? C.muted : C.white, margin: 0, lineHeight: 1.4 }}>
                          {label}
                        </p>
                        <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>
                          {timeAgo(n.created_at)}
                        </p>
                        {isPlanReq && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button
                              type="button"
                              onClick={(e) => handleAcceptPlan(e, n)}
                              onKeyDown={(e) => e.stopPropagation()}
                              disabled={busy}
                              style={{
                                display:      'inline-flex',
                                alignItems:   'center',
                                gap:          4,
                                padding:      '6px 10px',
                                borderRadius: 8,
                                border:       'none',
                                background:   busy ? C.muted : C.amber,
                                color:        '#fff',
                                fontSize:     11,
                                fontWeight:   700,
                                cursor:       busy ? 'default' : 'pointer',
                              }}
                            >
                              <Check size={11} strokeWidth={2.5} /> Accept
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeclinePlan(e, n)}
                              onKeyDown={(e) => e.stopPropagation()}
                              disabled={busy}
                              style={{
                                padding:      '6px 10px',
                                borderRadius: 8,
                                border:       `0.5px solid ${C.border}`,
                                background:   'transparent',
                                color:        C.muted,
                                fontSize:     11,
                                fontWeight:   600,
                                cursor:       busy ? 'default' : 'pointer',
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                      {!n.read && (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.amber, flexShrink: 0, marginTop: 4 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Empty state ── */}
            {notifs.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>You're all caught up.</div>
                <div style={{ fontSize: 11, color: C.muted }}>Duo requests and hangout updates show up here.</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {celebratePartner && (
        <HomieAcceptedCelebration
          partnerName={celebratePartner}
          onGoToDuoCard={() => { setCelebratePartner(null); go('me'); }}
          onClose={() => setCelebratePartner(null)}
        />
      )}
    </div>
  );
}
