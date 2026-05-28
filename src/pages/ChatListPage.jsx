import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, MessageCircle, Search, Users } from 'lucide-react';
import { C, E } from '../tokens';
import EmptyState from '../components/EmptyState.jsx';
import DuoAvatarStack from '../components/DuoAvatarStack.jsx';
import ChatThreadPage from './ChatThreadPage.jsx';
import { staggerContainer, staggerItem } from '../lib/motion';
import { getMyChats, getMyDuoRooms, getMyHomieRooms } from '../lib/messages.js';

const DATE_LABELS = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  friday: 'This Friday',
  saturday: 'Saturday',
  sunday: 'This Sunday',
  next_week: 'Next week',
};

const TIME_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

const TABS = ['All', 'Hangouts', 'Homies'];

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(str, n = 56) {
  if (!str) return null;
  return str.length > n ? `${str.slice(0, n)}...` : str;
}

function memberName(member) {
  return member?.name ?? member?.profiles?.name ?? '';
}

function planLine(chat) {
  const parts = [
    chat?.vibe,
    DATE_LABELS[chat?.date] ?? chat?.date,
    TIME_LABELS[chat?.timeSlot] ?? chat?.timeSlot,
    chat?.place,
  ].filter(Boolean);
  return parts.join(' - ');
}

function matchesSearch(row, query) {
  if (!query) return true;
  const haystack = [
    row.title,
    row.preview,
    row.context,
    ...(row.members ?? []).map(memberName),
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function ChatEmptyState() {
  return (
    <div
      style={{
        height: '100%',
        minHeight: 420,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background:
          'radial-gradient(circle at 50% 18%, rgba(255,107,0,0.10), transparent 34%), #FFFFFF',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            margin: '0 auto 16px',
            background: C.gradientCTA,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: E.buttonShadow,
          }}
        >
          <MessageCircle size={25} color={C.cream} strokeWidth={2.4} />
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>
          Select a chat to start talking
        </h2>
        <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: C.muted }}>
          Open a confirmed hangout conversation from the inbox.
        </p>
      </div>
    </div>
  );
}

function ChatConversationRow({ row, active, onOpen }) {
  return (
    <motion.button
      type="button"
      layout
      variants={staggerItem}
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      style={{
        width: '100%',
        border: 0,
        borderBottom: `0.5px solid ${C.border}`,
        background: active ? C.orangeSurface : C.cardElevated,
        cursor: 'pointer',
        padding: '13px 16px',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <DuoAvatarStack members={row.members} size={34} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p
            style={{
              margin: 0,
              flex: 1,
              minWidth: 0,
              fontSize: 14,
              fontWeight: 850,
              color: C.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.title}
          </p>
          {row.time && (
            <span style={{ flexShrink: 0, fontSize: 11, color: C.muted }}>
              {row.time}
            </span>
          )}
        </div>

        <p
          style={{
            margin: '3px 0 0',
            fontSize: 12.5,
            color: C.muted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.preview || 'No messages yet'}
        </p>

        {row.context && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 11.5,
              color: active ? C.orange : C.textMuted,
              fontWeight: 750,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {row.kind === 'hangout' ? <CalendarDays size={12} strokeWidth={2.2} /> : <Users size={12} strokeWidth={2.2} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.context}
            </span>
          </p>
        )}
      </div>
    </motion.button>
  );
}

export default function ChatListPage({ go, currentUser }) {
  const [chats, setChats] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [homieRooms, setHomieRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All');
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return undefined;
    }

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

  const activeChats = useMemo(
    () => chats.filter((c) => c?.duoA?.status === 'active' && c?.duoB?.status === 'active'),
    [chats],
  );

  useEffect(() => {
    if (!activeChat?.hangoutId) return;
    const next = activeChats.find((chat) => chat.hangoutId === activeChat.hangoutId);
    if (next && next !== activeChat) setActiveChat(next);
  }, [activeChat, activeChats]);

  const rows = useMemo(() => {
    const duoRows = rooms.map((room) => ({
      id: `duo-${room.duoId}`,
      kind: 'duo',
      title: room.duoName ?? 'Duo Room',
      members: room.members ?? [],
      preview: truncate(room.lastMessage),
      context: 'Duo Room',
      time: formatTime(room.updatedAt),
      updatedAt: room.updatedAt,
      room,
    }));

    const homieRows = homieRooms.map((room) => ({
      id: `homie-${room.roomId}`,
      kind: 'homie',
      title: room.homieName ?? 'Homie',
      members: room.members ?? [],
      preview: truncate(room.lastMessage),
      context: 'Homie',
      time: formatTime(room.updatedAt),
      updatedAt: room.updatedAt,
      room,
    }));

    const hangoutRows = activeChats.map((chat) => ({
      id: `hangout-${chat.hangoutId}`,
      kind: 'hangout',
      title: chat.otherDuo?.name ?? 'Duo',
      members: chat.otherDuo?.members ?? [],
      preview: truncate(chat.lastMessage),
      context: planLine(chat),
      time: formatTime(chat.updatedAt),
      updatedAt: chat.updatedAt,
      chat,
    }));

    return [...duoRows, ...homieRows, ...hangoutRows].sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [activeChats, homieRooms, rooms]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (tab === 'Hangouts' && row.kind !== 'hangout') return false;
      if (tab === 'Homies' && row.kind !== 'homie') return false;
      return matchesSearch(row, query);
    });
  }, [rows, search, tab]);

  const hasContent = rows.length > 0;

  const openRow = (row) => {
    if (row.kind === 'duo') {
      const duoShape = {
        id: row.room.duoId,
        name: row.room.duoName,
        duo_members: (row.room.members ?? []).map((m) => ({
          user_id: m.userId,
          profiles: { name: m.name, photos: m.avatarUrl ? [m.avatarUrl] : [] },
        })),
      };
      go('duo_room', duoShape);
      return;
    }

    if (row.kind === 'homie') {
      if (row.room.profile) go('homie_profile', row.room.profile);
      return;
    }

    const isWide = typeof window !== 'undefined' && window.matchMedia('(min-width: 860px)').matches;
    if (isWide) setActiveChat(row.chat);
    else go('chat_thread', null, null, row.chat);
  };

  return (
    <div className="chat-shell" style={{ minHeight: '100vh', background: C.bg }}>
      <style>{`
        .chat-shell {
          display: grid;
          grid-template-columns: minmax(320px, 36%) minmax(0, 1fr);
        }
        .chat-left-panel {
          min-width: 0;
          border-right: 0.5px solid ${C.border};
          background: ${C.cardElevated};
        }
        .chat-right-panel {
          min-width: 0;
          background: ${C.bg};
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 859px) {
          .chat-shell {
            display: block;
          }
          .chat-right-panel {
            display: none;
          }
          .chat-left-panel {
            border-right: 0;
            min-height: 100vh;
          }
        }
      `}</style>

      <section className="chat-left-panel">
        <div
          style={{
            padding: '20px 18px 14px',
            borderBottom: `0.5px solid ${C.border}`,
            position: 'sticky',
            top: 0,
            zIndex: 5,
            background: C.cardElevated,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 950, color: C.text }}>Messages</h1>
          <p style={{ margin: '3px 0 14px', fontSize: 13, color: C.muted }}>
            Plans, duos, and homies
          </p>

          <label style={{ position: 'relative', display: 'block' }}>
            <Search
              size={15}
              color={C.muted}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search messages"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '0 12px 0 36px',
                borderRadius: 999,
                border: `0.5px solid ${C.border}`,
                background: C.bg2,
                color: C.text,
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </label>

          <div
            role="tablist"
            aria-label="Message filters"
            style={{
              marginTop: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 4,
              padding: 4,
              borderRadius: 999,
              background: C.cardDeep,
            }}
          >
            {TABS.map((name) => {
              const active = tab === name;
              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(name)}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    padding: '8px 10px',
                    background: active ? C.cardElevated : 'transparent',
                    color: active ? C.text : C.muted,
                    fontSize: 12,
                    fontWeight: 850,
                    cursor: 'pointer',
                    boxShadow: active ? '0 1px 8px rgba(17,17,17,0.08)' : 'none',
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ overflowY: 'auto', paddingBottom: 88 }}>
          {loading ? (
            <div style={{ padding: 16 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                  <div className="shimmer" style={{ width: 48, height: 48, borderRadius: '50%', background: C.cardDeep, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="shimmer" style={{ width: '52%', height: 13, borderRadius: 6, background: C.cardDeep, marginBottom: 7 }} />
                    <div className="shimmer" style={{ width: '76%', height: 11, borderRadius: 6, background: C.cardDeep }} />
                  </div>
                </div>
              ))}
            </div>
          ) : !hasContent ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '58vh', padding: 24 }}>
              <EmptyState
                icon={MessageCircle}
                title="No chats yet"
                subtitle="Form a duo to open a Duo Room, or accept a hangout to start a 2v2 chat."
                action={() => go('hangouts')}
                actionLabel="Find a hangout"
              />
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              No conversations match this search.
            </div>
          ) : (
            <AnimatePresence>
              <motion.div variants={staggerContainer} initial="initial" animate="animate">
                {filteredRows.map((row) => (
                  <ChatConversationRow
                    key={row.id}
                    row={row}
                    active={row.kind === 'hangout' && row.chat?.hangoutId === activeChat?.hangoutId}
                    onOpen={() => openRow(row)}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </section>

      <section className="chat-right-panel">
        {activeChat ? (
          <ChatThreadPage
            chat={activeChat}
            go={go}
            currentUser={currentUser}
            embedded
          />
        ) : (
          <ChatEmptyState />
        )}
      </section>
    </div>
  );
}
