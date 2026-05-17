import { motion } from 'framer-motion';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import { staggerContainer, staggerItem } from '../lib/motion';

const CHATS = [
  {
    id:          1,
    duoName:     'Mia & Jess',
    lastMessage: 'Down for Friday?',
    time:        '10:23pm',
    unread:      true,
    initials:    'MJ',
  },
  {
    id:          2,
    duoName:     'Jay & Marcus',
    lastMessage: 'Boba sounds good 👍',
    time:        '9:11pm',
    unread:      false,
    initials:    'JM',
  },
  {
    id:          3,
    duoName:     'Sophie & Ana',
    lastMessage: 'What time works for you?',
    time:        'Yesterday',
    unread:      false,
    initials:    'SA',
  },
];

const AVATAR_COLORS = [
  'linear-gradient(135deg, #FBBF24, #F97316)',
  'linear-gradient(135deg, #60A5FA, #6366F1)',
  'linear-gradient(135deg, #A78BFA, #8B5CF6)',
];

function ChatRow({ chat, index, go }) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`Open chat with ${chat.duoName}`}
      onClick={() => go('chat_thread', null, null, chat)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go('chat_thread', null, null, chat)}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.12 }}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          14,
        padding:      '14px 16px',
        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
        cursor:       'pointer',
        userSelect:   'none',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width:          44,
            height:         44,
            borderRadius:   12,
            background:     AVATAR_COLORS[index % AVATAR_COLORS.length],
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       13,
            fontWeight:     800,
            color:          '#fff',
          }}
        >
          {chat.initials}
        </div>
        {chat.unread && (
          <div
            className="unread-dot"
            style={{
              width:        8,
              height:       8,
              borderRadius: '50%',
              background:   C.amber,
              position:     'absolute',
              top:          1,
              right:        1,
              border:       `1.5px solid ${C.bg}`,
            }}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize:     14,
            fontWeight:   chat.unread ? 700 : 600,
            color:        C.white,
            margin:       0,
            marginBottom: 2,
          }}
        >
          {chat.duoName}
        </p>
        <p
          style={{
            fontSize:     13,
            color:        chat.unread ? 'rgba(245,245,248,0.8)' : C.muted,
            fontWeight:   chat.unread ? 500 : 400,
            margin:       0,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}
        >
          {chat.lastMessage}
        </p>
      </div>

      <span
        style={{
          fontSize:  11,
          color:     chat.unread ? C.amber : C.muted,
          flexShrink: 0,
          fontWeight: chat.unread ? 600 : 400,
        }}
      >
        {chat.time}
      </span>
    </motion.div>
  );
}

export default function ChatListPage({ go, onLogout }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <TopBar title="Chat" onLogout={onLogout} />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ flex: 1, paddingTop: 8 }}
      >
        {CHATS.map((chat, i) => (
          <motion.div key={chat.id} variants={staggerItem}>
            <ChatRow chat={chat} index={i} go={go} />
          </motion.div>
        ))}
      </motion.div>

    </div>
  );
}
