import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, SendHorizonal } from 'lucide-react';
import { C } from '../tokens';
import { messageVariants } from '../lib/motion';
import {
  getDuoMessages,
  sendDuoMessage,
  subscribeDuoMessages,
} from '../lib/duoRoomMessages.js';

const MAX_MESSAGE_LENGTH = 500;

function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
            maxWidth: '72%',
            padding: '10px 14px',
            fontSize: 14,
            lineHeight: 1.5,
            ...(isMine
              ? {
                  background: C.gradientCTA,
                  color: '#fff',
                  borderRadius: '18px 18px 4px 18px',
                  fontWeight: 500,
                }
              : {
                  background: '#1E1E24',
                  color: C.white,
                  border: `0.5px solid ${C.border}`,
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

export default function DuoRoomPage({ currentUser, myDuo, go }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [inputFocus, setInputFocus] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const duoId = myDuo?.id;
  const memberNames = useMemo(() => {
    const map = {};
    (myDuo?.duo_members ?? []).forEach((member) => {
      map[member.user_id] = member.profiles?.name ?? 'Partner';
    });
    return map;
  }, [myDuo?.duo_members]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!duoId || !currentUser?.id) return;

    let cancelled = false;
    let unsub = null;

    getDuoMessages(duoId, currentUser.id).then((msgs) => {
      if (cancelled) return;
      setMessages(msgs);
      setTimeout(scrollToBottom, 50);
    }).catch(() => {});

    subscribeDuoMessages(duoId, currentUser.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(scrollToBottom, 50);
    }).then((fn) => {
      if (cancelled) fn?.();
      else unsub = fn;
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [duoId, currentUser?.id, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !currentUser?.id || !duoId) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;

    setInput('');
    setSending(true);

    const optimistic = {
      id: `opt-${Date.now()}`,
      duo_id: duoId,
      sender_user_id: currentUser.id,
      content: text,
      created_at: new Date().toISOString(),
      profiles: { name: memberNames[currentUser.id] ?? 'You' },
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(scrollToBottom, 50);

    try {
      await sendDuoMessage({
        duoId,
        senderUserId: currentUser.id,
        content: text,
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const duoName = myDuo?.name ?? 'My Duo';

  return (
    <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header
        style={{
          background: C.bg2,
          borderBottom: `0.5px solid ${C.border}`,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        <motion.button
          type="button"
          aria-label="Back"
          onClick={() => go('me')}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          style={{
            width: 36,
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color={C.white} strokeWidth={2} />
        </motion.button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: 0 }}>
            Duo Room
          </p>
          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{duoName}</p>
        </div>

        <div style={{ width: 36, flexShrink: 0 }} />
      </header>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 40 }}>
            Start your duo room conversation.
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMine = msg.sender_user_id === currentUser?.id;
            const senderLabel = isMine
              ? 'You'
              : msg.profiles?.name ?? memberNames[msg.sender_user_id] ?? 'Partner';
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

      <div
        style={{
          background: C.bg2,
          borderTop: `0.5px solid ${C.border}`,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          aria-label="Message your duo"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setInputFocus(true)}
          onBlur={() => setInputFocus(false)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Message your duo..."
          style={{
            flex: 1,
            background: C.cardElevated,
            border: `1px solid ${inputFocus ? C.amber : 'transparent'}`,
            borderRadius: 22,
            padding: '10px 16px',
            fontSize: 14,
            color: C.white,
            outline: 'none',
            transition: 'border-color 0.15s',
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
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: input.trim() && input.trim().length <= MAX_MESSAGE_LENGTH ? C.gradientCTA : C.cardElevated,
            border: 'none',
            cursor: input.trim() && input.trim().length <= MAX_MESSAGE_LENGTH ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <SendHorizonal
            size={16}
            color={input.trim() && input.trim().length <= MAX_MESSAGE_LENGTH ? '#fff' : C.muted}
            strokeWidth={2}
          />
        </motion.button>
      </div>
    </div>
  );
}
