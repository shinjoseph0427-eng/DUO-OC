import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { staggerContainer, staggerItem } from '../lib/motion';
import { getMyChats } from '../lib/messages.js';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function OverlapAvatars({ members }) {
  const a = members[0];
  const b = members[1];
  const initial = (name) => (name ?? '?')[0].toUpperCase();

  return (
    <div style={{ position: 'relative', width: 54, height: 40, flexShrink: 0 }}>
      <div
        style={{
          position:       'absolute',
          left:           0,
          top:            2,
          width:          36,
          height:         36,
          borderRadius:   10,
          background:     AVATAR_GRADIENTS[0],
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       13,
          fontWeight:     800,
          color:          '#fff',
          zIndex:         2,
          border:         `2px solid ${C.bg}`,
        }}
      >
        {initial(a?.name)}
      </div>
      {b && (
        <div
          style={{
            position:       'absolute',
            left:           20,
            top:            6,
            width:          30,
            height:         30,
            borderRadius:   8,
            background:     AVATAR_GRADIENTS[2],
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       11,
            fontWeight:     800,
            color:          '#fff',
            zIndex:         1,
            border:         `2px solid ${C.bg}`,
          }}
        >
          {initial(b?.name)}
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: `0.5px solid rgba(255,255,255,0.05)` }}>
      <div className="shimmer" style={{ width: 44, height: 44, borderRadius: 12, background: C.cardElevated, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="shimmer" style={{ width: '40%', height: 14, borderRadius: 6, background: C.cardElevated, marginBottom: 8 }} />
        <div className="shimmer" style={{ width: '65%', height: 12, borderRadius: 6, background: C.cardElevated }} />
      </div>
      <div className="shimmer" style={{ width: 32, height: 11, borderRadius: 4, background: C.cardElevated }} />
    </div>
  );
}

function ChatRow({ chat, go }) {
  const names = chat.otherDuo.members.map((m) => m.name).join(' & ') || chat.otherDuo.name;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`Open chat with ${chat.otherDuo.name}`}
      onClick={() => go('chat_thread', null, null, chat)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go('chat_thread', null, null, chat)}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.12 }}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          14,
        padding:      '14px 16px',
        borderBottom: `0.5px solid rgba(255,255,255,0.05)`,
        cursor:       'pointer',
        userSelect:   'none',
      }}
    >
      <OverlapAvatars members={chat.otherDuo.members} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.white, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {names}
        </p>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chat.lastMessage ?? 'Say hi! 👋'}
        </p>
      </div>

      <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>
        {formatTime(chat.updatedAt)}
      </span>
    </motion.div>
  );
}

export default function ChatListPage({ go, onLogout, currentUser }) {
  const [chats,   setChats]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    getMyChats(currentUser.id)
      .then(setChats)
      .finally(() => setLoading(false));
  }, [currentUser]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <TopBar onLogout={onLogout} onLogoClick={() => go('home')} />

      {loading ? (
        <div style={{ paddingTop: 8 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : chats.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
          <EmptyState
            icon={MessageCircle}
            title="No chats yet."
            subtitle="Confirm a hangout to start chatting with a duo."
          />
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            style={{ flex: 1, paddingTop: 8 }}
          >
            {chats.map((chat) => (
              <motion.div key={chat.hangoutId} variants={staggerItem}>
                <ChatRow chat={chat} go={go} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
