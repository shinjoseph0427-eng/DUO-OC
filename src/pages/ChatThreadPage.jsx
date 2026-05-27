import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, SendHorizonal } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import { messageVariants } from '../lib/motion';
import { getMessages, sendMessage, subscribeMessages } from '../lib/messages.js';

const MAX_MESSAGE_LENGTH = 500;

const DATE_LABELS = {
  today: 'Today', tomorrow: 'Tomorrow', friday: 'This Friday',
  saturday: 'Saturday', sunday: 'This Sunday', next_week: 'Next week',
};
const TIME_LABELS = {
  morning: 'Morning (10am–12pm)', afternoon: 'Afternoon (12pm–4pm)',
  evening: 'Evening (4pm–7pm)', night: 'Night (7pm–10pm)',
};
const QUICK_REPLIES = [
  'Saturday works for us',
  'What time works?',
  'Down for this spot',
  'Any food preferences?',
];

function PlanCard({ chat }) {
  const vibe     = chat?.vibe     ?? null;
  const date     = DATE_LABELS[chat?.date]     ?? chat?.date     ?? null;
  const timeSlot = TIME_LABELS[chat?.timeSlot] ?? chat?.timeSlot ?? null;
  const place    = chat?.place    ?? null;
  const meta     = [vibe, date, timeSlot].filter(Boolean).join(' · ');
  if (!meta && !place) return null;
  return (
    <div
      style={{
        background:   'rgba(255,107,0,0.08)',
        border:       `0.5px solid ${C.greenBorder}`,
        borderRadius: 14,
        padding:      '12px 14px',
        marginBottom: 8,
        flexShrink:   0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: meta || place ? 6 : 0 }}>
        <span
          style={{
            fontSize:      10,
            fontWeight:    700,
            color:         C.moss,
            letterSpacing: '0.9px',
            textTransform: 'uppercase',
          }}
        >
          ✓ Confirmed
        </span>
      </div>
      {meta && (
        <p style={{ fontSize: 13, color: C.white, margin: '0 0 2px', lineHeight: 1.5 }}>
          {meta}
        </p>
      )}
      {place && (
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          📍 {place}
        </p>
      )}
    </div>
  );
}

function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function MessageBubble({ msg, isMine, senderLabel }) {
  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}
    >
      <p style={{ fontSize: 11, color: C.muted, margin: '0 4px 4px', fontWeight: 500 }}>
        {senderLabel}
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMine ? 'row-reverse' : 'row' }}>
        <div
          style={{
            maxWidth:    '72%',
            padding:     '10px 14px',
            fontSize:    14,
            lineHeight:  1.5,
            ...(isMine
              ? {
                  background:   C.gradientCTA,
                  color:        C.cream,
                  borderRadius: '18px 18px 4px 18px',
                  fontWeight:   500,
                }
              : {
                  background:   C.cardElevated,
                  color:        C.white,
                  border:       `0.5px solid ${C.border}`,
                  borderRadius: '18px 18px 18px 4px',
                }),
          }}
        >
          {msg.content}
        </div>
        <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, paddingBottom: 2 }}>
          {formatMsgTime(msg.created_at)}
        </span>
      </div>
    </motion.div>
  );
}

export default function ChatThreadPage({ chat, go, goBack, currentUser, myDuo }) {
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [inputFocus,  setInputFocus]  = useState(false);
  const [sending,     setSending]     = useState(false);
  const messagesEndRef                = useRef(null);

  const hangoutId  = chat?.hangoutId;
  const myDuoId    = chat?.myDuoId ?? myDuo?.id;
  const otherDuo   = chat?.otherDuo ?? { name: 'Duo', members: [] };
  const duoAName   = chat?.duoA?.name ?? otherDuo.name;
  const duoBName   = chat?.duoB?.name ?? otherDuo.name;

  // userId → display name for all 4 participants. Built once from chat prop;
  // realtime messages have sender_user_id so they resolve from the same map.
  const senderNames = useMemo(() => {
    const map = {};
    [...(chat?.duoA?.members ?? []), ...(chat?.duoB?.members ?? [])].forEach((m) => {
      if (m.userId) map[m.userId] = m.name;
    });
    return map;
  }, [chat]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!hangoutId || !currentUser) return;

    let cancelled = false;
    let unsub = null;

    getMessages(hangoutId, currentUser.id).then((msgs) => {
      if (cancelled) return;
      setMessages(msgs);
      setTimeout(scrollToBottom, 50);
    }).catch(() => {});

    subscribeMessages(hangoutId, currentUser.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(scrollToBottom, 50);
    }).then((fn) => {
      if (cancelled) fn?.();   // unmounted before promise resolved — clean up immediately
      else unsub = fn;
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [hangoutId, currentUser, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !currentUser || !myDuoId) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;

    setInput('');
    setSending(true);

    // optimistic update
    const optimistic = {
      id:             `opt-${Date.now()}`,
      hangout_id:     hangoutId,
      sender_duo_id:  myDuoId,
      sender_user_id: currentUser.id,
      content:        text,
      created_at:     new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(scrollToBottom, 50);

    try {
      const saved = await sendMessage({
        hangoutId,
        senderDuoId:  myDuoId,
        senderUserId: currentUser.id,
        content:      text,
      });
      // Replace the optimistic entry with the real saved row so the realtime
      // dedup check (m.id === newMsg.id) recognises it and skips the duplicate.
      if (saved?.id) {
        setMessages((prev) => prev.map((m) => m.id === optimistic.id ? saved : m));
      }
    } catch {
      // remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const headerNames = `${duoAName} × ${duoBName}`;

  return (
    <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header
        style={{
          background:   C.bg2,
          borderBottom: `0.5px solid ${C.border}`,
          height:       56,
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          padding:      '0 16px',
          position:     'sticky',
          top:          0,
          zIndex:       100,
          flexShrink:   0,
        }}
      >
        {/* Back */}
        <motion.button
          type="button"
          aria-label="Back"
          onClick={() => go('chat')}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          style={{
            width:          36,
            height:         36,
            display:        'inline-flex',
            alignItems:     'center',
            justifyContent: 'center',
            borderRadius:   10,
            background:     'rgba(17,17,17,0.05)',
            border:         `0.5px solid ${C.border}`,
            cursor:         'pointer',
            flexShrink:     0,
          }}
        >
          <ArrowLeft size={18} color={C.white} strokeWidth={2} />
        </motion.button>

        {/* Center: logo + duo name */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <motion.button
            type="button"
            aria-label="Home"
            onClick={() => go('home')}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.1 }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span className="gradient-text">DUO OC</span>
            </span>
          </motion.button>
          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{headerNames}</p>
        </div>

        {/* Right spacer to balance layout */}
        <div style={{ width: 36, flexShrink: 0 }} />
      </header>

      {/* Messages */}
      <div
        style={{
          flex:          1,
          overflowY:     'auto',
          padding:       '12px 16px 24px',
          display:       'flex',
          flexDirection: 'column',
          gap:           10,
        }}
      >
        <PlanCard chat={chat} />

        {messages.length === 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 16 }}>
              Start the vibe. Say hi and lock in the plan.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {QUICK_REPLIES.map((reply) => (
                <motion.button
                  key={reply}
                  type="button"
                  onClick={() => setInput(reply)}
                  whileTap={{ scale: 0.94 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    background:   'rgba(17,17,17,0.05)',
                    border:       `0.5px solid ${C.border}`,
                    borderRadius: 9999,
                    padding:      '8px 14px',
                    fontSize:     13,
                    color:        C.muted,
                    cursor:       'pointer',
                  }}
                >
                  {reply}
                </motion.button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMine = msg.sender_user_id === currentUser?.id;
            const senderLabel = isMine
              ? 'You'
              : (senderNames[msg.sender_user_id] ?? otherDuo.name);
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMine={isMine}
                senderLabel={senderLabel}
              />
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          background:  C.bg2,
          borderTop:   `0.5px solid ${C.border}`,
          padding:     '10px 14px',
          display:     'flex',
          alignItems:  'center',
          gap:         8,
          flexShrink:  0,
        }}
      >
        <input
          type="text"
          aria-label={`Message ${otherDuo.name}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setInputFocus(true)}
          onBlur={() => setInputFocus(false)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={`Message ${duoAName} × ${duoBName}…`}
          style={{
            flex:         1,
            background:   C.cardElevated,
            border:       `1px solid ${inputFocus ? C.amber : 'transparent'}`,
            borderRadius: 22,
            padding:      '10px 16px',
            fontSize:     14,
            color:        C.white,
            outline:      'none',
            transition:   'border-color 0.15s',
          }}
        />
        <motion.button
          type="button"
          aria-label="Send message"
          onClick={handleSend}
          disabled={!input.trim() || input.trim().length > MAX_MESSAGE_LENGTH || sending}
          whileTap={input.trim() && input.trim().length <= MAX_MESSAGE_LENGTH ? { scale: 0.88 } : {}}
          transition={{ duration: 0.1 }}
          style={{
            width:          38,
            height:         38,
            borderRadius:   '50%',
            background:     input.trim() && input.trim().length <= MAX_MESSAGE_LENGTH ? C.gradientCTA : C.cardElevated,
            border:         'none',
            cursor:         input.trim() && input.trim().length <= MAX_MESSAGE_LENGTH ? 'pointer' : 'default',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
            transition:     'background 0.15s',
          }}
        >
          <SendHorizonal size={16} color={input.trim() && input.trim().length <= MAX_MESSAGE_LENGTH ? C.cream : C.muted} strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
}
