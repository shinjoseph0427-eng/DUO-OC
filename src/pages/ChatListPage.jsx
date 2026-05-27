import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Users } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { staggerContainer, staggerItem } from '../lib/motion';
import { getMyChats, getMyDuoRooms } from '../lib/messages.js';

// ── Purple palette for Duo Rooms ──────────────────────────────────
const P = {
  solid:    C.purple,
  gradient: `linear-gradient(135deg, #7C3AED 0%, ${C.purple} 100%)`,
  t08:      C.purpleT08,
  t14:      C.purpleT14,
  t22:      C.purpleBorder,
  shadow:   'rgba(139,92,246,0.18)',
};

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

function truncate(str, n) {
  if (!str) return null;
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function InitialsAvatar({ name, size = 38, bg, border, color = '#fff', fontSize }) {
  return (
    <div style={{
      width:          size,
      height:         size,
      borderRadius:   size * 0.28,
      background:     bg ?? AVATAR_GRADIENTS[0],
      border:         border ?? 'none',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontSize:       fontSize ?? size * 0.38,
      fontWeight:     800,
      color,
      flexShrink:     0,
    }}>
      {(name ?? '?')[0].toUpperCase()}
    </div>
  );
}

// ── Section header with horizontal rule ──────────────────────────
function SectionHeader({ label, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px' }}>
      <span style={{
        fontSize:      11,
        fontWeight:    700,
        color:         C.muted,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        whiteSpace:    'nowrap',
        display:       'flex',
        alignItems:    'center',
        gap:           6,
      }}>
        {label}
        {count != null && (
          <span style={{
            background:   'rgba(255,255,255,0.08)',
            borderRadius: 9999,
            padding:      '1px 7px',
            fontSize:     10,
            color:        C.muted,
            fontWeight:   700,
          }}>
            {count}
          </span>
        )}
      </span>
      <div style={{ flex: 1, height: '0.5px', background: C.border }} />
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: C.cardElevated, border: `0.5px solid ${C.border}`, borderRadius: 18, padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div className="shimmer" style={{ width: 40, height: 40, borderRadius: 10, background: C.cardDeep }} />
        <div style={{ flex: 1 }}>
          <div className="shimmer" style={{ width: '55%', height: 13, borderRadius: 6, background: C.cardDeep, marginBottom: 8 }} />
          <div className="shimmer" style={{ width: '35%', height: 10, borderRadius: 6, background: C.cardDeep }} />
        </div>
      </div>
      <div className="shimmer" style={{ width: '80%', height: 11, borderRadius: 6, background: C.cardDeep, marginBottom: 14 }} />
      <div className="shimmer" style={{ width: '100%', height: 38, borderRadius: 10, background: C.cardDeep }} />
    </div>
  );
}

// ── Duo Room card (purple) ─────────────────────────────────────────
function DuoRoomCard({ room, go }) {
  const preview     = truncate(room.lastMessage, 42);
  const memberNames = room.members.map((m) => m.name).join(' & ');

  const duoShape = {
    id:          room.duoId,
    name:        room.duoName,
    duo_members: room.members.map((m) => ({
      user_id:  m.userId,
      profiles: { name: m.name },
    })),
  };

  return (
    <motion.div
      layout
      style={{
        background:   C.bg2,
        border:       `0.5px solid ${P.t22}`,
        borderRadius: 18,
        overflow:     'hidden',
        marginBottom: 10,
      }}
    >
      {/* Purple accent bar */}
      <div style={{ height: 3, background: P.gradient }} />

      <div style={{ padding: 16 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width:          40,
            height:         40,
            borderRadius:   10,
            background:     P.t08,
            border:         `0.5px solid ${P.t22}`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}>
            <Users size={18} color={P.solid} strokeWidth={2.2} />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              fontSize:     15,
              fontWeight:   700,
              color:        C.white,
              margin:       '0 0 2px',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {room.duoName}
            </p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
              {memberNames}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{
              background:   P.t08,
              color:        P.solid,
              borderRadius: 9999,
              padding:      '2px 8px',
              fontSize:     10,
              fontWeight:   700,
              letterSpacing:'0.03em',
            }}>
              Duo Room
            </span>
            {room.updatedAt && (
              <span style={{ fontSize: 10, color: C.muted }}>
                {formatTime(room.updatedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Last message */}
        <p style={{
          fontSize:     12,
          color:        preview ? C.muted : P.solid,
          margin:       '0 0 14px',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          fontStyle:    preview ? 'normal' : 'italic',
        }}>
          {preview ?? 'Your private duo chat — say something!'}
        </p>

        {/* CTA */}
        <motion.button
          type="button"
          onClick={() => go('duo_room', duoShape)}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
          style={{
            width:        '100%',
            background:   P.gradient,
            color:        C.white,
            border:       'none',
            borderRadius: 11,
            padding:      '11px 0',
            fontSize:     13,
            fontWeight:   700,
            cursor:       'pointer',
            boxShadow:    `0 2px 12px ${P.shadow}`,
          }}
        >
          Open Room
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Hangout chat card (amber) ──────────────────────────────────────
function ChatCard({ chat, go }) {
  const metaParts = [
    chat.vibe,
    DATE_LABELS[chat.date]     ?? chat.date,
    TIME_LABELS[chat.timeSlot] ?? chat.timeSlot,
    chat.place,
  ].filter(Boolean);

  const otherName = chat.otherDuo?.name ?? chat.duoA.name;
  const preview   = truncate(chat.lastMessage, 42);

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
      {/* Amber accent bar */}
      <div style={{ height: 3, background: C.gradientCTA }} />

      <div style={{ padding: 16 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <InitialsAvatar
            name={otherName}
            bg={AVATAR_GRADIENTS[2]}
            size={40}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              fontSize:     15,
              fontWeight:   700,
              color:        C.white,
              margin:       '0 0 2px',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {otherName}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                background:   C.greenT12,
                color:        C.success,
                borderRadius: 9999,
                padding:      '2px 8px',
                fontSize:     10,
                fontWeight:   700,
              }}>
                Confirmed
              </span>
              <span style={{ fontSize: 10, color: C.muted }}>
                {formatTime(chat.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Hangout meta */}
        {metaParts.length > 0 && (
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 8px', lineHeight: 1.5 }}>
            {metaParts.join(' · ')}
          </p>
        )}

        {/* Last message */}
        <p style={{
          fontSize:     12,
          color:        preview ? C.muted : C.amber,
          margin:       '0 0 14px',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          fontStyle:    preview ? 'normal' : 'italic',
        }}>
          {preview ?? 'Chat is open — say hi!'}
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
          Open Chat
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function ChatListPage({ go, onLogout, currentUser }) {
  const [chats,    setChats]    = useState([]);
  const [rooms,    setRooms]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }

    const load = () =>
      Promise.all([
        getMyChats(currentUser.id).catch(() => []),
        getMyDuoRooms(currentUser.id).catch(() => []),
      ]).then(([nextChats, nextRooms]) => {
        setChats(nextChats);
        setRooms(nextRooms);
      }).finally(() => setLoading(false));

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const activeChats = chats.filter(
    (c) => c.duoA?.status === 'active' && c.duoB?.status === 'active',
  );

  const hasContent = rooms.length > 0 || activeChats.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <TopBar onLogout={onLogout} onLogoClick={() => go('home')} />

      <div style={{ flex: 1, padding: '16px 16px 88px' }}>
        {loading ? (
          <>
            <div style={{ height: 20, marginBottom: 12 }} />
            <SkeletonCard />
            <div style={{ height: 20, marginBottom: 12 }} />
            <SkeletonCard />
          </>
        ) : !hasContent ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <EmptyState
              icon={MessageCircle}
              title="No chats yet"
              subtitle="Form a duo to open a Duo Room, or accept a hangout to start a 2v2 chat."
              action={() => go('hangouts')}
              actionLabel="Find a hangout →"
            />
          </div>
        ) : (
          <AnimatePresence>
            <motion.div variants={staggerContainer} initial="initial" animate="animate">

              {/* ── Duo Rooms section ── */}
              {rooms.length > 0 && (
                <motion.div variants={staggerItem}>
                  <SectionHeader label="Duo Rooms" count={rooms.length} />
                  {rooms.map((room) => (
                    <DuoRoomCard key={room.duoId} room={room} go={go} />
                  ))}
                </motion.div>
              )}

              {/* ── 2v2 Hangout Chats section ── */}
              {activeChats.length > 0 && (
                <motion.div
                  variants={staggerItem}
                  style={{ marginTop: rooms.length > 0 ? 8 : 0 }}
                >
                  <SectionHeader label="2v2 Hangouts" count={activeChats.length} />
                  {activeChats.map((chat) => (
                    <ChatCard key={chat.hangoutId} chat={chat} go={go} />
                  ))}
                </motion.div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
