import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../tokens.js';

const STEPS = [
  {
    emoji: '👋',
    title: 'Find your homie',
    body: 'First, find a duo partner near you. Send them a homie request — when they accept, you become a duo.',
    cta: 'Got it',
  },
  {
    emoji: '🔍',
    title: 'Explore other duos',
    body: 'Browse duos in OC. When you find one you vibe with, propose a hangout.',
    cta: 'Got it',
  },
  {
    emoji: '📍',
    title: 'Propose a hangout',
    body: 'Pick a spot, a time, and send the invite. The other duo accepts — and it\'s locked in.',
    cta: 'Got it',
  },
  {
    emoji: '💬',
    title: 'Chat opens up',
    body: 'Once a hangout is confirmed, a 2v2 group chat opens automatically. See you out there.',
    cta: 'Let\'s go →',
  },
];

export default function FirstTimeGuide({ onDone }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  function advance() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      localStorage.setItem('duo_oc_guide_seen', '1');
      setVisible(false);
      onDone?.();
    }
  }

  const s = STEPS[step];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="guide-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '0 0 40px',
          }}
          onClick={advance}
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: C.bg,
              borderRadius: 20,
              padding: '28px 24px 24px',
              width: 'calc(100% - 32px)',
              maxWidth: 400,
            }}
          >
            {/* Step dots */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 5,
              marginBottom: 20,
            }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? 16 : 5,
                  height: 5,
                  borderRadius: 3,
                  background: i === step ? C.amber : C.border,
                  transition: 'width 0.25s ease, background 0.25s ease',
                }} />
              ))}
            </div>

            {/* Emoji */}
            <div style={{
              fontSize: 40,
              textAlign: 'center',
              marginBottom: 14,
            }}>
              {s.emoji}
            </div>

            {/* Title */}
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: C.white,
              textAlign: 'center',
              marginBottom: 10,
            }}>
              {s.title}
            </div>

            {/* Body */}
            <div style={{
              fontSize: 14,
              color: C.muted,
              textAlign: 'center',
              lineHeight: 1.6,
              marginBottom: 24,
            }}>
              {s.body}
            </div>

            {/* CTA */}
            <button
              onClick={advance}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 12,
                border: 'none',
                background: C.amber,
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {s.cta}
            </button>

            {/* Skip */}
            {step < STEPS.length - 1 && (
              <div
                onClick={() => {
                  localStorage.setItem('duo_oc_guide_seen', '1');
                  setVisible(false);
                  onDone?.();
                }}
                style={{
                  textAlign: 'center',
                  marginTop: 14,
                  fontSize: 12,
                  color: C.muted,
                  cursor: 'pointer',
                }}
              >
                Skip guide
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
