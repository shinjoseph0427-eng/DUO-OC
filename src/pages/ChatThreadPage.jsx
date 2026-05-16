import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, SendHorizonal } from 'lucide-react';
import { C } from '../tokens';
import { messageVariants, staggerContainer } from '../lib/motion';

const MESSAGES = [
  { id: 1, mine: false, text: "Hey! saw your duo profile 👋",              time: '9:00pm' },
  { id: 2, mine: true,  text: "Hey! yeah we're down for boba this weekend", time: '9:02pm' },
  { id: 3, mine: false, text: "Nice! Irvine or Newport area?",              time: '9:03pm' },
  { id: 4, mine: true,  text: "Either works for us. Irvine Spectrum?",      time: '9:05pm' },
  { id: 5, mine: false, text: "Perfect. Saturday around 3pm?",              time: '9:06pm' },
  { id: 6, mine: true,  text: "Saturday 3pm works 🙌",                      time: '9:07pm' },
];

const B = {
  bg:      '#FAFAF7',
  bar:     '#FFFFFF',
  divider: 'rgba(0,0,0,0.08)',
  text:    '#111114',
  textSub: '#6E6E78',
  inputBg: '#F0F0EE',
  msgBg:   '#FFFFFF',
};

function MessageBubble({ msg }) {
  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      style={{ display: 'flex', justifyContent: msg.mine ? 'flex-end' : 'flex-start' }}
    >
      <div
        style={{
          maxWidth:    '72%',
          padding:     '10px 14px',
          fontSize:    14,
          lineHeight:  1.5,
          ...(msg.mine
            ? {
                background:   C.gradientCTA,
                color:        '#fff',
                borderRadius: '18px 18px 4px 18px',
                fontWeight:   500,
              }
            : {
                background:   B.msgBg,
                color:        B.text,
                border:       `0.5px solid ${B.divider}`,
                borderRadius: '18px 18px 18px 4px',
                boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
              }),
        }}
      >
        {msg.text}
      </div>
    </motion.div>
  );
}

export default function ChatThreadPage({ chat, go }) {
  const [input, setInput]           = useState('');
  const [inputFocus, setInputFocus] = useState(false);
  const messagesEndRef              = useRef(null);

  const fallback = { duoName: 'Duo', initials: '??', avatarBg: C.cardElevated };
  const c = chat ?? fallback;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ background: B.bg, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Topbar */}
      <header
        style={{
          background:  B.bar,
          borderBottom:`0.5px solid ${B.divider}`,
          height:      56,
          display:     'flex',
          alignItems:  'center',
          gap:         12,
          padding:     '0 16px',
          position:    'sticky',
          top:         0,
          zIndex:      100,
          boxShadow:   '0 1px 0 rgba(0,0,0,0.06)',
        }}
      >
        <motion.button
          type="button"
          aria-label="Back to chat list"
          onClick={() => go('chat')}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} color={B.text} strokeWidth={2} />
        </motion.button>

        <div
          style={{
            width:          32,
            height:         32,
            borderRadius:   10,
            background:     C.gradientCTA,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       11,
            fontWeight:     800,
            color:          '#fff',
            flexShrink:     0,
          }}
        >
          {c.initials}
        </div>

        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: B.text, margin: 0 }}>{c.duoName}</p>
          <p style={{ fontSize: 11, color: B.textSub, margin: 0 }}>Matched duo</p>
        </div>
      </header>

      {/* Messages */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{
          flex:          1,
          overflowY:     'auto',
          padding:       '16px 16px 24px',
          display:       'flex',
          flexDirection: 'column',
          gap:           8,
        }}
      >
        {MESSAGES.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        <div ref={messagesEndRef} />
      </motion.div>

      {/* Input bar */}
      <div
        style={{
          background: B.bar,
          borderTop:  `0.5px solid ${B.divider}`,
          padding:    '10px 14px',
          display:    'flex',
          alignItems: 'center',
          gap:        8,
          position:   'sticky',
          bottom:     0,
          boxShadow:  '0 -1px 0 rgba(0,0,0,0.04)',
        }}
      >
        <input
          type="text"
          aria-label={`Message ${c.duoName}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setInputFocus(true)}
          onBlur={() => setInputFocus(false)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${c.duoName}...`}
          style={{
            flex:         1,
            background:   B.inputBg,
            border:       `1px solid ${inputFocus ? C.amber : 'transparent'}`,
            borderRadius: 22,
            padding:      '10px 16px',
            fontSize:     14,
            color:        B.text,
            outline:      'none',
            transition:   'border-color 0.15s',
          }}
        />
        <motion.button
          type="button"
          aria-label="Send message"
          onClick={handleSend}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          style={{
            width:          38,
            height:         38,
            borderRadius:   '50%',
            background:     input.trim() ? C.gradientCTA : '#E5E5E5',
            border:         'none',
            cursor:         input.trim() ? 'pointer' : 'default',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
            transition:     'background 0.15s',
          }}
        >
          <SendHorizonal size={16} color={input.trim() ? '#fff' : '#A1A1AA'} strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
}
