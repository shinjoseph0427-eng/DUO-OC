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

const TYPE_META = {
  match:             { emoji: '🎉', label: (p) => `${p.matched_duo_name}과 매칭됐어요!`,      page: 'hangouts' },
  hangout_request:   { emoji: '📅', label: (p) => `${p.duo_name}이 행아웃을 제안했어요`,     page: 'hangouts' },
  hangout_accepted:  { emoji: '✅', label: (p) => `${p.duo_name}이 수락했어요`,               page: 'hangouts' },
  hangout_declined:  { emoji: '❌', label: (p) => `${p.duo_name}이 거절했어요`,               page: 'hangouts' },
  homie_request:     { label: (p) => 'Someone wants to be your homie',                        page: 'find_homie' },
  homie_accepted:    { label: (p) => `${p.accepted_by_name ?? 'Your homie'} accepted. You are now a duo.`, page: 'edit_duo_profile' },
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

export default function NotificationBell({ currentUser, go }) {
  const [notifs, setNotifs] = useState([]);
  const [open,   setOpen]   = useState(false);
  const panelRef = useRef(null);
  const btnRef   = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    getNotifications(currentUser.id).then(setNotifs);
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
      await markAsRead(n.id);
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    const meta = TYPE_META[n.type];
    if (meta?.page) go(meta.page);
    setOpen(false);
  };

  const handleMarkAll = async () => {
    if (!currentUser) return;
    await markAllAsRead(currentUser.id);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
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
          background:     open ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.06)',
          border:         `0.5px solid ${open ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
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
              background:   '#EF4444',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              fontSize:     9,
              fontWeight:   800,
              color:        '#fff',
              padding:      '0 3px',
              border:       '1.5px solid #0A0A0F',
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
              border:       '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              boxShadow:    '0 16px 48px rgba(0,0,0,0.6)',
              zIndex:       500,
            }}
          >
            {/* Header */}
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                padding:        '14px 14px 10px',
                borderBottom:   '0.5px solid rgba(255,255,255,0.07)',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: C.white, margin: 0 }}>
                Notifications
                {unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft:   8,
                      background:   'rgba(239,68,68,0.15)',
                      color:        '#EF4444',
                      borderRadius: 9999,
                      padding:      '1px 7px',
                      fontSize:     11,
                      fontWeight:   700,
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: C.muted, fontWeight: 600, padding: '2px 4px',
                    }}
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

            {/* Items */}
            {notifs.length === 0 ? (
              <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '28px 16px' }}>
                No notifications yet
              </p>
            ) : (
              notifs.map((n) => {
                const meta  = TYPE_META[n.type] ?? { emoji: '🔔', label: () => n.type };
                const label = meta.label(n.payload ?? {});
                return (
                  <motion.button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotifClick(n)}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.08 }}
                    style={{
                      width:        '100%',
                      display:      'flex',
                      alignItems:   'flex-start',
                      gap:          10,
                      padding:      '12px 14px',
                      background:   n.read ? 'transparent' : 'rgba(245,158,11,0.05)',
                      border:       'none',
                      borderBottom: '0.5px solid rgba(255,255,255,0.05)',
                      cursor:       'pointer',
                      textAlign:    'left',
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>
                      {meta.emoji}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize:   13,
                          fontWeight: n.read ? 400 : 600,
                          color:      n.read ? C.muted : C.white,
                          margin:     0,
                          lineHeight: 1.4,
                        }}
                      >
                        {label}
                      </p>
                      <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.read && (
                      <div
                        style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: C.amber, flexShrink: 0, marginTop: 4,
                        }}
                      />
                    )}
                  </motion.button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
