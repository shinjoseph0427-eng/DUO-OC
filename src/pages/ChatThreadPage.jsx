import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, SendHorizonal } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import { messageVariants } from '../lib/motion';
import { getMessages, sendMessage, subscribeMessages } from '../lib/messages.js';

const MAX_MESSAGE_LENGTH = 500;

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
                  color:        '#fff',
                  borderRadius: '18px 18px 4px 18px',
                  fontWeight:   500,
                }
              : {
                  background:   '#1E1E24',
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
  const otherDuo   = chat?.otherDuo ?? { name: 'Duo', members: [] };

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
    if (!text || sending || !currentUser || !myDuo) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;

    setInput('');
    setSending(true);

    // optimistic update
    const optimistic = {
      id:             `opt-${Date.now()}`,
      hangout_id:     hangoutId,
      sender_duo_id:  myDuo.id,
      sender_user_id: currentUser.id,
      content:        text,
      created_at:     new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(scrollToBottom, 50);

    try {
      await sendMessage({
        hangoutId,
        senderDuoId:  myDuo.id,
        senderUserId: currentUser.id,
        content:      text,
      });
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

  const headerNames = otherDuo.members.map((m) => m.name).join(' & ') || otherDuo.name;

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
          gap:          12,
          padding:      '0 16px',
          position:     'sticky',
          top:          0,
          zIndex:       100,
          flexShrink:   0,
        }}
      >
        <motion.button
          type="button"
          aria-label="Back to chat list"
          onClick={goBack}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} color={C.white} strokeWidth={2} />
        </motion.button>

        <div
          style={{
            width:          32,
            height:         32,
            borderRadius:   10,
            background:     AVATAR_GRADIENTS[0],
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       12,
            fontWeight:     800,
            color:          '#fff',
            flexShrink:     0,
          }}
        >
          {(otherDuo.name ?? '?')[0].toUpperCase()}
        </div>

        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>{headerNames}</p>
          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Matched duo</p>
        </div>
      </header>

      {/* Messages */}
      <div
        style={{
          flex:          1,
          overflowY:     'auto',
          padding:       '16px 16px 24px',
          display:       'flex',
          flexDirection: 'column',
          gap:           10,
        }}
      >
        {messages.length === 0 && (
          <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 40 }}>
            No messages yet. Say hi! 👋
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMine = msg.sender_duo_id === myDuo?.id;
            const senderLabel = isMine ? 'You' : otherDuo.name;
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
          placeholder={`Message ${otherDuo.name}…`}
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
          <SendHorizonal size={16} color={input.trim() && input.trim().length <= MAX_MESSAGE_LENGTH ? '#fff' : C.muted} strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
}
