import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, CalendarDays, Info, MessageCircle, MoreHorizontal, Paperclip, SendHorizonal } from 'lucide-react';
import { C, E } from '../tokens';
import DuoAvatarStack from '../components/DuoAvatarStack.jsx';
import PlanContextBar from '../components/PlanContextBar.jsx';
import ChatMessageBubble from '../components/MessageBubble.jsx';
import { getMessages, sendMessage, subscribeMessages } from '../lib/messages.js';
import { MAX_MESSAGE_LENGTH } from '../lib/constants.js';

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

function chatTitle(chat) {
  return chat?.otherDuo?.name ?? 'Duo';
}

function chatSubtitle(chat) {
  const plan = [
    chat?.vibe,
    DATE_LABELS[chat?.date] ?? chat?.date,
    TIME_LABELS[chat?.timeSlot] ?? chat?.timeSlot,
    chat?.place,
  ].filter(Boolean).join(' - ');

  if (plan) return plan;

  const duoAName = chat?.duoA?.name ?? null;
  const duoBName = chat?.duoB?.name ?? null;
  return [duoAName, duoBName].filter(Boolean).join(' x ') || 'Hangout chat';
}

export default function ChatThreadPage({ chat, go, currentUser, myDuo, embedded = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [inputFocus, setInputFocus] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const hangoutId = chat?.hangoutId;
  const myDuoId = chat?.myDuoId ?? myDuo?.id;
  const otherDuo = chat?.otherDuo ?? { name: 'Duo', members: [] };
  const otherMembers = otherDuo?.members ?? [];
  const title = chatTitle(chat);
  const subtitle = chatSubtitle(chat);

  const senderNames = useMemo(() => {
    const map = {};
    [...(chat?.duoA?.members ?? []), ...(chat?.duoB?.members ?? [])].forEach((m) => {
      if (m?.userId) map[m.userId] = m.name;
    });
    return map;
  }, [chat]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!hangoutId || !currentUser) return undefined;

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
      if (cancelled) fn?.();
      else unsub = fn;
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [hangoutId, currentUser, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !currentUser || !myDuoId || !hangoutId) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;

    setInput('');
    setSending(true);

    const optimistic = {
      id: `opt-${Date.now()}`,
      hangout_id: hangoutId,
      sender_duo_id: myDuoId,
      sender_user_id: currentUser.id,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(scrollToBottom, 50);

    try {
      const saved = await sendMessage({
        hangoutId,
        senderDuoId: myDuoId,
        senderUserId: currentUser.id,
        content: text,
      });
      if (saved?.id) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
      }
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

  const canSend = input.trim().length > 0
    && input.trim().length <= MAX_MESSAGE_LENGTH
    && Boolean(currentUser && myDuoId && hangoutId)
    && !sending;

  return (
    <div
      style={{
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        height: embedded ? '100%' : '100vh',
        minHeight: embedded ? 0 : '100vh',
      }}
    >
      <header
        style={{
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(18px)',
          borderBottom: `0.5px solid ${C.border}`,
          minHeight: 76,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: embedded ? '0 20px' : '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        {!embedded && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => go('chat')}
            style={{
              width: 38,
              height: 38,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: C.cardDeep,
              border: `0.5px solid ${C.border}`,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} color={C.text} strokeWidth={2.2} />
          </button>
        )}

        <DuoAvatarStack members={otherMembers} size={32} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 16,
              fontWeight: 950,
              color: C.text,
              margin: '0 0 3px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: 12,
              color: C.muted,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {[
            { label: 'Plan', icon: CalendarDays },
            { label: 'Info', icon: Info },
            { label: 'More', icon: MoreHorizontal },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: `0.5px solid ${C.border}`,
                background: C.cardElevated,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.text,
                cursor: 'default',
              }}
            >
              <Icon size={17} strokeWidth={2.2} />
            </button>
          ))}
        </div>
      </header>

      <PlanContextBar chat={chat} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: embedded ? '20px 24px 28px' : '16px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          background:
            'linear-gradient(180deg, rgba(255,243,232,0.38) 0%, rgba(255,255,255,0) 160px), #FFFFFF',
        }}
      >
        {messages.length === 0 && (
          <div style={{ margin: '42px auto 20px', maxWidth: 300, textAlign: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                margin: '0 auto 12px',
                background: C.orangeSurface,
                color: C.orange,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageCircle size={20} strokeWidth={2.2} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.55 }}>
              No messages yet. Send the first note when you are ready.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isMine = msg.sender_user_id === currentUser?.id;
            const prev = messages[index - 1];
            const grouped = prev?.sender_user_id === msg.sender_user_id;
            const senderLabel = isMine ? 'You' : (senderNames[msg.sender_user_id] ?? title);
            return (
              <div key={msg.id} style={{ marginTop: grouped ? 2 : 10 }}>
                <ChatMessageBubble
                  msg={msg}
                  isMine={isMine}
                  senderLabel={senderLabel}
                  showSender={!grouped}
                />
              </div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(16px)',
          borderTop: `0.5px solid ${C.border}`,
          padding: embedded ? '13px 20px 16px' : '11px 14px calc(11px + env(safe-area-inset-bottom))',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: C.cardElevated,
            border: `1px solid ${inputFocus ? C.orange : C.border}`,
            borderRadius: 999,
            padding: '6px 7px 6px 10px',
            boxShadow: inputFocus ? '0 0 0 3px rgba(255,107,0,0.10)' : E.cardShadow,
          }}
        >
          <button
            type="button"
            aria-label="Attachment"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: 0,
              background: C.bg2,
              color: C.muted,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'default',
              flexShrink: 0,
            }}
          >
            <Paperclip size={16} strokeWidth={2.2} />
          </button>

          <input
            type="text"
            aria-label={`Message ${title}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setInputFocus(true)}
            onBlur={() => setInputFocus(false)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={`Message ${title}`}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 0,
              padding: '9px 4px',
              fontSize: 14,
              color: C.text,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />

          <button
            type="button"
            aria-label="Send message"
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: canSend ? C.gradientCTA : C.cardDeep,
              border: 'none',
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: canSend ? E.buttonShadow : 'none',
            }}
          >
            <SendHorizonal size={17} color={canSend ? C.cream : C.muted} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
