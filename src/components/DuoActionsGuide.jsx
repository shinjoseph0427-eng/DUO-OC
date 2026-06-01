import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Send } from 'lucide-react';
import { C } from '../tokens.js';

// First-time bottom sheet shown the first time a user lands on the ME tab with
// a real (2-person) duo. Explains the three ways to start a hangout. Shown once,
// gated on localStorage by the parent.
const ACTIONS = [
  {
    Icon:  Users,
    title: 'Join Hangout',
    body:  '다른 듀오가 올린 hangout에 참가 요청을 보내요.',
  },
  {
    Icon:  Plus,
    title: 'Create Plan',
    body:  '내가 먼저 hangout을 만들어 다른 듀오를 초대해요.',
  },
  {
    Icon:  Send,
    title: 'Hangout Request',
    body:  '마음에 드는 특정 듀오에게 직접 hangout을 제안해요.',
  },
];

export default function DuoActionsGuide({ onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        key="duo-actions-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position:       'fixed',
          inset:          0,
          background:     'rgba(0,0,0,0.72)',
          zIndex:         1050,
          display:        'flex',
          alignItems:     'flex-end',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background:    C.bg,
            borderRadius:  '24px 24px 0 0',
            padding:       '12px 22px 28px',
            width:         '100%',
            maxWidth:      480,
            borderTop:     `0.5px solid ${C.border}`,
          }}
        >
          <div style={{
            width: 38, height: 4, borderRadius: 2, background: C.border,
            margin: '0 auto 22px',
          }} />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.white, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            듀오가 됐어요 — 이제 어떻게 놀까요?
          </h2>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.55, margin: '0 0 22px' }}>
            hangout을 시작하는 3가지 방법이 있어요.
          </p>

          <div style={{ display: 'grid', gap: 12, marginBottom: 26 }}>
            {ACTIONS.map(({ Icon, title, body }) => (
              <div
                key={title}
                style={{
                  display:      'flex',
                  gap:          14,
                  alignItems:   'flex-start',
                  padding:      '14px 15px',
                  borderRadius: 16,
                  border:       `0.5px solid ${C.border}`,
                  background:   C.cardElevated,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: C.amberT08, border: `0.5px solid ${C.brownBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={19} color={C.amber} strokeWidth={2.3} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: C.white, margin: '0 0 3px' }}>
                    {title}
                  </p>
                  <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width:        '100%',
              padding:      '15px 0',
              borderRadius: 14,
              border:       'none',
              background:   C.gradientCTA,
              color:        '#fff',
              fontSize:     15,
              fontWeight:   800,
              cursor:       'pointer',
              boxShadow:    '0 10px 26px rgba(255,107,0,0.3)',
            }}
          >
            알겠어요
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
