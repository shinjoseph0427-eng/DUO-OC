import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { staggerContainer, staggerItem } from '../lib/motion';
import { getMyChats } from '../lib/messages.js';

const DATE_LABELS = {
  today: 'Today', tomorrow: 'Tomorrow', friday: 'This Friday',
  saturday: 'Saturday', sunday: 'This Sunday', next_week: 'Next week',
};
const TIME_LABELS = {
  morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night',
};

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

function DuoInitials({ name, size = 36, borderRadius = 10, gradient = 0 }) {
  return (
    <div
      style={{
        width:          size,
        height:         size,
        borderRadius,
        background:     AVATAR_GRADIENTS[gradient % AVATAR_GRADIENTS.length],
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       size * 0.38,
        fontWeight:     800,
        color:          '#fff',
        flexShrink:     0,
      }}
    >
      {(name ?? '?')[0].toUpperCase()}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: C.cardElevated, border: `0.5px solid ${C.border}`, borderRadius: 18, padding: 16, marginBottom: 10 }}>
      <div className="shimmer" style={{ width: '55%', height: 14, borderRadius: 6, background: C.cardDeep, marginBottom: 10 }} />
      <div className="shimmer" style={{ width: '35%', height: 11, borderRadius: 6, background: C.cardDeep, marginBottom: 14 }} />
      <div className="shimmer" style={{ width: '100%', height: 38, borderRadius: 10, background: C.cardDeep }} />
    </div>
  );
}

function ChatCard({ chat, go }) {
  const metaParts = [
    chat.vibe,
    DATE_LABELS[chat.date] ?? chat.date,
    TIME_LABELS[chat.timeSlot] ?? chat.timeSlot,
    chat.place,
  ].filter(Boolean);

  return (
    <motion.div
      layout
      style={{
        background:   C.cardElevated,
        border:       `0.5px solid ${C.border}`,
        borderRadius: 18,
        overflow:     'hidden',
        marginBottom: 10,
      }}
    >
      <div style={{ height: 3, background: C.gradientCTA }} />
      <div style={{ padding: 16 }}>
        {/* Duo avatars + names */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <DuoInitials name={chat.duoA.name} gradient={0} />
            <DuoInitials name={chat.duoB.name} gradient={2} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.white, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {chat.duoA.name} x {chat.duoB.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  background:   C.greenT12,
                  color:        C.success,
                  borderRadius: 9999,
                  padding:      '2px 8px',
                  fontSize:     11,
                  fontWeight:   600,
                }}
              >
                Confirmed hangout
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>
                {formatTime(chat.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Hangout meta */}
        {metaParts.length > 0 && (
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
            {metaParts.join(' · ')}
          </p>
        )}

        {/* Last message preview */}
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chat.lastMessage ?? 'No messages yet. Say hi.'}
        </p>

        {/* CTA */}
        <motion.button
          type="button"
          onClick={() => go('chat_thread', null, null, chat)}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
          style={{
            width:        '100%',
            background:   C.gradientCTA,
            color:        '#fff',
            border:       'none',
            borderRadius: 11,
            padding:      '11px 0',
            fontSize:     13,
            fontWeight:   700,
            cursor:       'pointer',
            boxShadow:    '0 2px 12px rgba(255,107,0,0.15)',
          }}
        >
          Open chat
        </motion.button>
      </div>
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

      <div style={{ flex: 1, padding: '16px 16px 80px' }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : chats.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <EmptyState
              icon={MessageCircle}
              title="Accept a hangout to start chatting."
              subtitle="Confirmed hangouts open a 2v2 chat here."
            />
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {chats.map((chat) => (
                <motion.div key={chat.hangoutId} variants={staggerItem}>
                  <ChatCard chat={chat} go={go} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
