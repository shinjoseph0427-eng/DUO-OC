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
                  color: C.cream,
                  borderRadius: '18px 18px 4px 18px',
                  fontWeight: 500,
                }
              : {
                  background: '#1E1E24',
                  color: '#FFFFFF',
                  border: '0.5px solid rgba(255,255,255,0.10)',
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
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef(null);

  const duoId = myDuo?.id;
  const memberCount = myDuo?.duo_members?.length ?? 0;
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
    if (!duoId || !currentUser?.id || memberCount < 2) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsub = null;

    setLoading(true);
    setErrorMessage('');
    getDuoMessages(duoId, currentUser.id).then((msgs) => {
      if (cancelled) return;
      setMessages(msgs);
      setTimeout(scrollToBottom, 50);
    }).catch((error) => {
      if (cancelled) return;
      console.error('DuoRoomPage load failed:', error);
      setErrorMessage(error?.message ?? 'Failed to load Duo Room messages.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    subscribeDuoMessages(duoId, currentUser.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg];
      });
      setTimeout(scrollToBottom, 50);
    }).then((fn) => {
      if (cancelled) {
        fn?.();
      } else {
        unsub = fn;
        if (!fn) {
          setErrorMessage((prev) => prev || 'Realtime subscription is unavailable for this Duo Room.');
        }
      }
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [duoId, currentUser?.id, memberCount, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !currentUser?.id || !duoId) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;

    setInput('');
    setSending(true);
    setSendError('');

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
      const saved = await sendDuoMessage({
        duoId,
        senderUserId: currentUser.id,
        content: text,
      });
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== optimistic.id);
        const alreadyPresent = without.some((m) => m.id === saved.id);
        return alreadyPresent ? without : [...without, saved];
      });
    } catch (error) {
      console.error('DuoRoomPage send failed:', error);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
      setSendError(error?.message ?? 'Failed to send message.');
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

  if (!myDuo) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
        <header style={{ background: C.bg2, borderBottom: `0.5px solid ${C.border}`, height: 56, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
          <motion.button type="button" aria-label="Back" onClick={() => go('me')} whileTap={{ scale: 0.88 }} transition={{ duration: 0.1 }} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} color={C.white} strokeWidth={2} />
          </motion.button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800 }}>Duo Room</div>
          <div style={{ width: 36 }} />
        </header>
        <p style={{ fontSize: 14, color: C.muted, textAlign: 'center', padding: '44px 24px' }}>
          No active duo found.
        </p>
      </div>
    );
  }

  if (memberCount < 2) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
        <header style={{ background: C.bg2, borderBottom: `0.5px solid ${C.border}`, height: 56, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
          <motion.button type="button" aria-label="Back" onClick={() => go('me')} whileTap={{ scale: 0.88 }} transition={{ duration: 0.1 }} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} color={C.white} strokeWidth={2} />
          </motion.button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800 }}>Duo Room</div>
          <div style={{ width: 36 }} />
        </header>
        <p style={{ fontSize: 14, color: C.muted, textAlign: 'center', padding: '44px 24px' }}>
          Create a duo first.
        </p>
      </div>
    );
  }

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
        {loading && (
          <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 40 }}>
            Loading Duo Room...
          </p>
        )}
        {!loading && errorMessage && (
          <div
            style={{
              background: 'rgba(239,68,68,0.09)',
              border: '0.5px solid rgba(239,68,68,0.28)',
              borderRadius: 16,
              padding: 14,
              marginTop: 20,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: '0 0 4px' }}>
              Duo Room error
            </p>
            <p style={{ fontSize: 12, color: 'rgba(245,245,248,0.72)', margin: 0, lineHeight: 1.45 }}>
              {errorMessage}
            </p>
          </div>
        )}
        {!loading && !errorMessage && messages.length === 0 && (
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
          position: 'relative',
        }}
      >
        {sendError && (
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 60, background: 'rgba(239,68,68,0.12)', border: '0.5px solid rgba(239,68,68,0.28)', borderRadius: 12, padding: '9px 12px' }}>
            <p style={{ fontSize: 12, color: C.white, margin: 0, lineHeight: 1.35 }}>{sendError}</p>
          </div>
        )}
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
            width: sending ? 86 : 38,
            height: 38,
            borderRadius: sending ? 9999 : '50%',
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
          {sending ? (
            <span style={{ fontSize: 12, fontWeight: 800, color: C.cream }}>Sending...</span>
          ) : (
            <SendHorizonal
              size={16}
              color={input.trim() && input.trim().length <= MAX_MESSAGE_LENGTH ? '#fff' : C.muted}
              strokeWidth={2}
            />
          )}
        </motion.button>
      </div>
    </div>
  );
}
