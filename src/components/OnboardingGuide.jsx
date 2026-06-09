import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../tokens.js';

// Maps each guide step to the BottomNav tab it points at — used by App.jsx to
// pulse the matching tab while the sheet is open.
export const STEP_TABS = {
  1: 'home',
  2: 'weekly_explore',
  3: 'weekly_card',
  4: 'solo_inbox',
  5: 'me',
};

const TOTAL_STEPS = 5;

// Static copy for each step. ctaAction is resolved at render time from the
// handlers passed in (navigate / advanceStep / skipAll).
const STEP_COPY = {
  1: {
    title: 'Welcome to WEEKLY!',
    body:  'This is your home. Set your week, see requests, and reopen chats from here.',
    cta:   'Explore this week →',
  },
  2: {
    title: 'Find people whose week overlaps',
    body:  'Pick when you are free, then browse people who share at least one day and time with you.',
    cta:   'Set my week →',
  },
  3: {
    title: 'Send a request',
    body:  'When someone feels like a good fit, send a request. They will see it in Messages.',
    cta:   'Open Messages →',
  },
  4: {
    title: 'Chat if you both say yes',
    body:  'When a request is accepted, a 1:1 chat opens automatically.',
    cta:   'See messages →',
  },
  5: {
    title: 'You are ready',
    body:  'Set your week anytime, update it when plans change, and keep conversations going from Messages.',
    cta:   'Done! Let\'s go →',
  },
};

export default function OnboardingGuide({ currentStep, navigate, advanceStep, skipAll }) {
  const copy = STEP_COPY[currentStep];
  if (!copy) return null;

  // Keep the guide short for the WEEKLY flow; legacy gated steps can still be
  // skipped safely once the user enters the new weekly path.
  const handleCta = () => {
    switch (currentStep) {
      case 1: advanceStep(); navigate('weekly_explore'); break;
      case 2: advanceStep(); navigate('weekly_card'); break;
      case 3: advanceStep(); navigate('solo_inbox'); break;
      case 4: advanceStep(); navigate('solo_inbox'); break;
      case 5: skipAll(); break;
      default: advanceStep();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position:       'fixed',
          inset:          0,
          background:     'rgba(0,0,0,0.5)',
          zIndex:         1200,
          display:        'flex',
          alignItems:     'flex-end',
          justifyContent: 'center',
        }}
      >
        <motion.div
          key={currentStep}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{
            background:    C.bg,
            borderRadius:  '24px 24px 0 0',
            padding:       '14px 22px 26px',
            width:         '100%',
            maxWidth:      480,
            maxHeight:     '60vh',
            overflowY:     'auto',
            borderTop:     `0.5px solid ${C.border}`,
            boxShadow:     '0 -10px 40px rgba(0,0,0,0.18)',
            boxSizing:     'border-box',
          }}
        >
          {/* Top row: grabber + "Later" skip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8, minHeight: 20 }}>
            <button
              type="button"
              onClick={skipAll}
              style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '2px 0' }}
            >
              Later
            </button>
          </div>

          <div style={{ width: 38, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 22px' }} />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.white, margin: '0 0 10px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            {copy.title}
          </h2>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '0 0 24px' }}>
            {copy.body}
          </p>

          <button
            type="button"
            onClick={handleCta}
            style={{
              width:        '100%',
              padding:      '15px 0',
              borderRadius: 14,
              border:       'none',
              background:   C.gradientCTA,
              color:        C.cream,
              fontSize:     15,
              fontWeight:   800,
              cursor:       'pointer',
              boxShadow:    '0 10px 26px rgba(255,107,0,0.3)',
            }}
          >
            {copy.cta}
          </button>

          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 18 }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                style={{
                  width:        n === currentStep ? 18 : 7,
                  height:       7,
                  borderRadius: 99,
                  background:   n === currentStep ? C.amber : C.border,
                  transition:   'width 0.25s ease, background 0.25s ease',
                }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
