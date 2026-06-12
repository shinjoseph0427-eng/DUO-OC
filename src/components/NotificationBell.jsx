import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { C } from '../tokens';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  subscribeNotifications,
} from '../lib/notifications.js';
import { acceptSoloRequest, declineSoloRequest } from '../lib/solo.js';

const TYPE_META = {
  solo_request:      { label: (p) => `${p.sender_name ?? 'Someone'} sent you a 1:1 request.`, page: 'solo_inbox' },
  solo_accepted:     { label: (p) => `${p.partner_name ?? 'Someone'} accepted your 1:1 request.`, page: 'solo_inbox' },
  plan_proposed:     { label: (p) => `${p.sender_name ?? 'Someone'} suggested a plan: ${[p.day, p.time_label, p.place].filter(Boolean).join(' · ')}`, page: 'solo_inbox' },
  plan_confirmed:    { label: (p) => `${p.partner_name ?? 'Someone'} confirmed your plan.`, page: 'solo_inbox' },
  plan_guest_invited:  { label: (p) => `${p.inviter_name ?? 'Someone'} invited you as their +1.`, page: 'solo_inbox' },
  plan_guest_accepted: { label: (p) => `${p.guest_name ?? 'Your friend'} is coming as your +1.`, page: 'solo_inbox' },
  plan_guest_declined: { label: (p) => `${p.guest_name ?? 'Your friend'} can't make it as your +1.`, page: 'solo_inbox' },
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

export default function NotificationBell({ currentUser, go, showToast }) {
  const [notifs,        setNotifs]        = useState([]);
  const [open,          setOpen]          = useState(false);
  const [reqState,      setReqState]      = useState({}); // notifId -> 'accepting'|'declining'|'accepted'|'declined'
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
    if (!n.read) {
      try {
        await markAsRead(n.id);
        setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {
        showToast?.('Could not update notification yet.', 'error');
        return;
      }
    }
    const meta = TYPE_META[n.type];
    if (meta?.page) go(meta.page);
    setOpen(false);
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

  const markNotifRead = (n) => {
    if (n.read) return;
    markAsRead(n.id).catch(() => {});
    setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  };

  const handleAcceptRequest = async (n) => {
    const reqId = n.payload?.request_id;
    if (!reqId || reqState[n.id]) return;
    setReqState((s) => ({ ...s, [n.id]: 'accepting' }));
    try {
      await acceptSoloRequest(reqId);
      setReqState((s) => ({ ...s, [n.id]: 'accepted' }));
      markNotifRead(n);
      showToast?.('Request accepted! Say hi 👋', 'success');
      go?.('solo_inbox');
      setOpen(false);
    } catch (e) {
      setReqState((s) => { const c = { ...s }; delete c[n.id]; return c; });
      showToast?.(e?.message ?? 'Could not accept request', 'error');
    }
  };

  const handleDeclineRequest = async (n) => {
    const reqId = n.payload?.request_id;
    if (!reqId || reqState[n.id]) return;
    setReqState((s) => ({ ...s, [n.id]: 'declining' }));
    try {
      await declineSoloRequest(reqId);
      setReqState((s) => ({ ...s, [n.id]: 'declined' }));
      markNotifRead(n);
    } catch (e) {
      setReqState((s) => { const c = { ...s }; delete c[n.id]; return c; });
      showToast?.(e?.message ?? 'Could not decline request', 'error');
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
                  const meta      = TYPE_META[n.type] ?? { label: () => n.type };
                  const label     = meta.label(n.payload ?? {});
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

                        {/* Inline accept / decline for incoming solo requests. */}
                        {n.type === 'solo_request' && n.payload?.request_id && (
                          (reqState[n.id] === 'accepted' || reqState[n.id] === 'declined') ? (
                            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: '8px 0 0' }}>
                              {reqState[n.id] === 'accepted' ? 'Accepted ✓' : 'Declined'}
                            </p>
                          ) : (
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeclineRequest(n); }}
                                disabled={!!reqState[n.id]}
                                style={{
                                  flex: 1, padding: '7px 0', borderRadius: 9,
                                  background: 'transparent', border: `1px solid ${C.border}`,
                                  color: C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                }}
                              >
                                {reqState[n.id] === 'declining' ? '…' : 'Decline'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleAcceptRequest(n); }}
                                disabled={!!reqState[n.id]}
                                style={{
                                  flex: 1, padding: '7px 0', borderRadius: 9,
                                  background: C.amber, border: 'none',
                                  color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                }}
                              >
                                {reqState[n.id] === 'accepting' ? '…' : 'Accept'}
                              </button>
                            </div>
                          )
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
    </div>
  );
}
