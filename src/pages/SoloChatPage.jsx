// src/pages/SoloChatPage.jsx
// Solo 1:1 chat room — cloned from DuoRoomPage, backed by solo_messages.
// match prop: { matchId, partner: { id, name, username, photos, ... } }

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, AlertCircle } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import {
  getSoloMessages,
  sendSoloMessage,
  subscribeSoloMessages,
} from '../lib/soloMessages.js';
import { endSoloMatch } from '../lib/solo.js';
import TopBar from '../components/TopBar.jsx';

function gradientFor(id = '') {
  const code = id ? id.charCodeAt(0) : 0;
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

const MAX_LENGTH = 500;

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── Message bubble ─────────────────────────────────────────
function Bubble({ msg, isMine, partnerPhoto, partnerName, showAvatar }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isMine ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 7,
      marginBottom: 4,
    }}>
      {/* Partner avatar (their message + last bubble in group only) */}
      {!isMine && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {showAvatar && (
            partnerPhoto ? (
              <img
                src={partnerPhoto} alt={partnerName}
                style={{ width: 28, height: 28, borderRadius: 14, objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                background: gradientFor(msg.sender_user_id),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>
                  {(partnerName || '?')[0].toUpperCase()}
                </span>
              </div>
            )
          )}
        </div>
      )}

      {/* Bubble + time */}
      <div style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 5,
        maxWidth: '72%',
      }}>
        <div style={{
          padding: '10px 13px',
          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isMine ? C.gradientCTA : C.cardDeep,
          color: isMine ? '#fff' : C.text,
          fontSize: 14,
          lineHeight: 1.45,
          wordBreak: 'break-word',
          boxShadow: isMine ? '0 2px 8px rgba(255,107,0,0.18)' : 'none',
        }}>
          {msg.content}
        </div>
        <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, marginBottom: 2 }}>
          {fmtTime(msg.created_at)}
        </span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function SoloChatPage({ match, currentUser, go, goBack, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [showEnd,  setShowEnd]  = useState(false);
  const endRef = useRef(null);

  const partner      = match?.partner ?? {};
  const matchId      = match?.matchId;
  const partnerPhoto = partner?.photos?.[0] ?? null;
  const partnerName  = partner?.name || partner?.username || 'Chat';

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initial load + realtime subscription
  useEffect(() => {
    if (!matchId) return undefined;
    let cancelled = false;
    let unsub = null;

    getSoloMessages(matchId)
      .then(msgs => {
        if (cancelled) return;
        setMessages(msgs);
        setLoading(false);
        setTimeout(scrollToBottom, 60);
      })
      .catch(() => setLoading(false));

    unsub = subscribeSoloMessages(matchId, (msg) => {
      setMessages(prev => (prev.some(x => x.id === msg.id) ? prev : [...prev, msg]));
      setTimeout(scrollToBottom, 50);
    });

    return () => { cancelled = true; unsub?.(); };
  }, [matchId, scrollToBottom]);

  // Send (optimistic update)
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !matchId) return;
    setInput('');
    setSending(true);

    const optimistic = {
      id: `opt-${Date.now()}`,
      match_id: matchId,
      sender_user_id: currentUser?.id,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(scrollToBottom, 50);

    try {
      const saved = await sendSoloMessage(matchId, text);
      setMessages(prev => prev.map(m => (m.id === optimistic.id ? saved : m)));
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(text);
      showToast?.(e?.message ?? 'Failed to send', 'error');
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

  const handleEnd = async () => {
    try {
      await endSoloMatch(matchId);
      go('home');
    } catch (e) {
      showToast?.(e?.message ?? 'Failed to leave', 'error');
    }
  };

  // No matchId → error screen
  if (!matchId) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <AlertCircle size={32} color={C.muted} />
        <p style={{ color: C.muted, fontSize: 14 }}>Chat not found</p>
        <button onClick={() => go('home')} style={{ color: C.amber, background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>
          Go home
        </button>
      </div>
    );
  }

  // Only last bubble in a group shows an avatar
  const withAvatar = messages.map((msg, i) => {
    const next = messages[i + 1];
    const isLastInGroup = !next || next.sender_user_id !== msg.sender_user_id;
    return { ...msg, showAvatar: isLastInGroup };
  });

  return (
    <div style={{ height: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <TopBar
        showBack
        onBack={goBack ?? (() => go('home'))}
        onLogoClick={() => go('home')}
        rightContent={
          <button
            onClick={() => setShowEnd(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.muted, padding: '4px 6px', whiteSpace: 'nowrap' }}
          >
            Leave
          </button>
        }
      />

      {/* Partner header strip (TopBar has no title, so name shows here) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
        {partnerPhoto ? (
          <img src={partnerPhoto} alt={partnerName} style={{ width: 32, height: 32, borderRadius: 16, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: 16, background: gradientFor(partner?.id ?? ''), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>{partnerName[0].toUpperCase()}</span>
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: C.white, margin: 0, lineHeight: 1.2 }}>{partnerName}</p>
          {partner?.username && (
            <p style={{ fontSize: 11, color: C.muted, margin: '1px 0 0' }}>@{partner.username}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: C.muted, fontSize: 13 }}>Loading...</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <p style={{ fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
              You matched with {partnerName}!<br />Say hi first.
            </p>
          </div>
        )}

        {!loading && withAvatar.map(msg => (
          <Bubble
            key={msg.id}
            msg={msg}
            isMine={msg.sender_user_id === currentUser?.id}
            partnerPhoto={partnerPhoto}
            partnerName={partnerName}
            showAvatar={msg.showAvatar}
          />
        ))}

        <div ref={endRef} style={{ height: 1 }} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        borderTop: `1px solid ${C.border}`,
        background: C.bg,
        display: 'flex', alignItems: 'flex-end', gap: 8,
        flexShrink: 0,
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          placeholder="Type a message..."
          rows={1}
          style={{
            flex: 1, resize: 'none', border: `1px solid ${C.border}`,
            borderRadius: 20, padding: '10px 14px',
            fontSize: 14, color: C.text, background: C.cardElevated,
            outline: 'none', lineHeight: 1.45,
            maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          aria-label="Send"
          style={{
            width: 42, height: 42, borderRadius: 21, border: 'none',
            background: input.trim() ? C.gradientCTA : C.cardDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <Send size={17} color={input.trim() ? '#fff' : C.muted} />
        </button>
      </div>

      {/* Leave confirmation modal */}
      {showEnd && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, padding: 24,
          }}
          onClick={() => setShowEnd(false)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ background: C.bg, borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 320, textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 8px' }}>
              Leave this chat?
            </p>
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 22px', lineHeight: 1.5 }}>
              The match ends and the chat history<br />will no longer be available.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowEnd(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, fontSize: 14, fontWeight: 600, color: C.muted, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleEnd}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: C.danger, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              >
                Leave
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
