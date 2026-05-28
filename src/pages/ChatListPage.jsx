import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Search } from 'lucide-react';
import { C } from '../tokens';
import EmptyState from '../components/EmptyState.jsx';
import { staggerContainer, staggerItem } from '../lib/motion';
import { getMyChats, getMyDuoRooms, getMyHomieRooms } from '../lib/messages.js';

const DATE_LABELS = {
  today: 'Today', tomorrow: 'Tomorrow', friday: 'This Friday',
  saturday: 'Saturday', sunday: 'This Sunday', next_week: 'Next week',
};
const TIME_LABELS = {
  morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night',
};

// Avatar color palette (cycling)
const AV_COLORS = [
  { bg: '#FAECE7', color: '#993C1D' },
  { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#FBEAF0', color: '#993556' },
  { bg: '#E6F1FB', color: '#185FA5' },
];

function avColor(idx) { return AV_COLORS[idx % AV_COLORS.length]; }

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

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

// ── Overlapping duo avatar stack ──────────────────────────────────
function ThreadAvatars({ m0Name, m1Name, colorIdx0 = 0, colorIdx1 = 1, online = false }) {
  const c0 = avColor(colorIdx0);
  const c1 = avColor(colorIdx1);
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: 44, height: 44 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: c0.bg, color: c0.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600,
        position: 'absolute', top: 0, left: 0,
        border: `2px solid ${C.cardElevated}`,
      }}>
        {initials(m0Name)}
      </div>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: c1.bg, color: c1.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600,
        position: 'absolute', bottom: 0, right: 0,
        border: `2px solid ${C.cardElevated}`,
      }}>
        {initials(m1Name)}
      </div>
      {online && (
        <div style={{
          width: 10, height: 10, background: '#22c55e', borderRadius: '50%',
          border: `2px solid ${C.cardElevated}`,
          position: 'absolute', bottom: 0, left: 0,
        }} />
      )}
    </div>
  );
}

// ── Plan banner between thread rows ──────────────────────────────
function PlanBanner({ vibe, place, date, timeSlot }) {
  const dateLabel = DATE_LABELS[date] ?? date ?? '';
  const timeLabel = TIME_LABELS[timeSlot] ?? timeSlot ?? '';
  const when = [dateLabel, timeLabel].filter(Boolean).join(' ');
  return (
    <div style={{
      margin: '4px 0',
      padding: '8px 10px',
      background: C.amberT08,
      border: `1px solid #FDBA74`,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <div style={{
        width: 28, height: 28, background: C.amber, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, color: '#fff' }}>☕</span>
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#C2410C', fontWeight: 500, lineHeight: 1.3 }}>
          {[vibe, place].filter(Boolean).join(' · ')}
        </div>
        {when && (
          <div style={{ fontSize: 10, color: '#9A3412' }}>
            {when} · confirmed
          </div>
        )}
      </div>
    </div>
  );
}

// ── Thread row ────────────────────────────────────────────────────
function ThreadRow({ name, m0Name, m1Name, colorIdx0, colorIdx1, preview, time, unreadCount, online, isActive, onClick, planBanner }) {
  return (
    <>
      <motion.div
        layout
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 14px',
          cursor: 'pointer',
          borderBottom: `0.5px solid ${C.border}`,
          background: isActive ? C.amberT08 : C.cardElevated,
          position: 'relative',
        }}
      >
        <ThreadAvatars
          m0Name={m0Name}
          m1Name={m1Name}
          colorIdx0={colorIdx0}
          colorIdx1={colorIdx1}
          online={online}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {name}
          </div>
          <div style={{
            fontSize: 12,
            color: unreadCount ? C.text : C.muted,
            fontWeight: unreadCount ? 500 : 400,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginTop: 1,
          }}>
            {preview ?? 'Chat is open — say hi!'}
          </div>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 11, color: C.muted }}>{time}</span>
          {unreadCount > 0 && (
            <div style={{
              width: 18, height: 18, background: C.amber, borderRadius: '50%',
              fontSize: 10, color: '#fff', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {unreadCount}
            </div>
          )}
        </div>
      </motion.div>
      {planBanner && <div style={{ padding: '0 12px' }}>{planBanner}</div>}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function ChatListPage({ go, onLogout, currentUser }) {
  const [chats,    setChats]    = useState([]);
  const [rooms,    setRooms]    = useState([]);
  const [homieRooms, setHomieRooms] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }

    const load = () =>
      Promise.all([
        getMyChats(currentUser.id).catch(() => []),
        getMyDuoRooms(currentUser.id).catch(() => []),
        getMyHomieRooms(currentUser.id).catch(() => []),
      ]).then(([nextChats, nextRooms, nextHomieRooms]) => {
        setChats(nextChats);
        setRooms(nextRooms);
        setHomieRooms(nextHomieRooms);
      }).finally(() => setLoading(false));

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const activeChats = chats.filter(
    (c) => c.duoA?.status === 'active' && c.duoB?.status === 'active',
  );

  const hasContent = rooms.length > 0 || homieRooms.length > 0 || activeChats.length > 0;

  const lc = search.toLowerCase();
  const filteredRooms = rooms.filter((r) =>
    !search || r.duoName?.toLowerCase().includes(lc) ||
    r.members.some((m) => m.name?.toLowerCase().includes(lc))
  );
  const filteredHomieRooms = homieRooms.filter((r) =>
    !search || r.homieName?.toLowerCase().includes(lc) ||
    r.members.some((m) => m.name?.toLowerCase().includes(lc))
  );
  const filteredChats = activeChats.filter((c) =>
    !search || c.otherDuo?.name?.toLowerCase().includes(lc) ||
    (c.otherDuo?.members ?? []).some((m) => m.name?.toLowerCase().includes(lc))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      {/* Header */}
      <div style={{
        background: C.cardElevated,
        borderBottom: `0.5px solid ${C.border}`,
        padding: '16px 16px 12px',
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Messages</div>
        <div style={{ marginTop: 10, position: 'relative' }}>
          <Search
            size={14}
            color={C.muted}
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              borderRadius: 8,
              border: `0.5px solid ${C.border}`,
              background: C.bg2,
              fontSize: 13,
              color: C.text,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Thread list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 88 }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: `0.5px solid ${C.border}` }}>
                <div className="shimmer" style={{ width: 44, height: 44, borderRadius: '50%', background: C.cardDeep, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="shimmer" style={{ width: '50%', height: 13, borderRadius: 6, background: C.cardDeep, marginBottom: 6 }} />
                  <div className="shimmer" style={{ width: '70%', height: 11, borderRadius: 6, background: C.cardDeep }} />
                </div>
              </div>
            ))}
          </div>
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

              {/* ── Duo Rooms ── */}
              {filteredRooms.map((room, idx) => {
                const m0 = room.members[0];
                const m1 = room.members[1];
                const preview = truncate(room.lastMessage, 42);
                return (
                  <motion.div key={room.duoId} variants={staggerItem}>
                    <ThreadRow
                      name={room.duoName ?? 'Duo Room'}
                      m0Name={m0?.name}
                      m1Name={m1?.name}
                      colorIdx0={idx * 2}
                      colorIdx1={idx * 2 + 1}
                      preview={preview ?? 'Your private duo chat — say something!'}
                      time={formatTime(room.updatedAt)}
                      online={false}
                      onClick={() => {
                        const duoShape = {
                          id:          room.duoId,
                          name:        room.duoName,
                          duo_members: room.members.map((m) => ({
                            user_id:  m.userId,
                            profiles: { name: m.name },
                          })),
                        };
                        go('duo_room', duoShape);
                      }}
                    />
                  </motion.div>
                );
              })}

              {/* ── 2v2 Hangout Chats ── */}
              {filteredHomieRooms.length > 0 && (
                <div style={{ padding: '14px 14px 6px', fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Direct Messages
                </div>
              )}
              {filteredHomieRooms.map((room, idx) => {
                const m0 = room.members[0];
                const m1 = room.members[1];
                return (
                  <motion.div key={room.roomId} variants={staggerItem}>
                    <ThreadRow
                      name={room.homieName ?? 'Homie'}
                      m0Name={m0?.name}
                      m1Name={m1?.name}
                      colorIdx0={(filteredRooms.length + idx) * 2}
                      colorIdx1={(filteredRooms.length + idx) * 2 + 1}
                      preview="Connected homie"
                      time={formatTime(room.updatedAt)}
                      online={false}
                      onClick={() => room.profile && go('homie_profile', room.profile)}
                    />
                  </motion.div>
                );
              })}

              {filteredChats.map((chat, idx) => {
                const otherMembers = chat.otherDuo?.members ?? [];
                const m0 = otherMembers[0];
                const m1 = otherMembers[1];
                const preview = truncate(chat.lastMessage, 42);
                const colorBase = (filteredRooms.length + filteredHomieRooms.length + idx) * 2;
                const metaParts = [
                  chat.vibe,
                  DATE_LABELS[chat.date] ?? chat.date,
                  TIME_LABELS[chat.timeSlot] ?? chat.timeSlot,
                  chat.place,
                ].filter(Boolean);
                const banner = metaParts.length > 0 ? (
                  <PlanBanner
                    vibe={chat.vibe}
                    place={chat.place}
                    date={chat.date}
                    timeSlot={chat.timeSlot}
                  />
                ) : null;
                return (
                  <motion.div key={chat.hangoutId} variants={staggerItem}>
                    <ThreadRow
                      name={chat.otherDuo?.name ?? 'Duo'}
                      m0Name={m0?.name}
                      m1Name={m1?.name}
                      colorIdx0={colorBase}
                      colorIdx1={colorBase + 1}
                      preview={preview}
                      time={formatTime(chat.updatedAt)}
                      online={false}
                      onClick={() => go('chat_thread', null, null, chat)}
                      planBanner={banner}
                    />
                  </motion.div>
                );
              })}

            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
