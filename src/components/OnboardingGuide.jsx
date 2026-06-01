import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../tokens.js';

// Maps each guide step to the BottomNav tab it points at — used by App.jsx to
// pulse the matching tab while the sheet is open.
export const STEP_TABS = { 1: 'home', 2: 'explore', 3: 'me', 4: 'hangouts', 5: 'chat' };

const TOTAL_STEPS = 5;

// Static copy for each step. ctaAction is resolved at render time from the
// handlers passed in (navigate / advanceStep / skipAll).
const STEP_COPY = {
  1: {
    title: '👋 Duo OC에 온 걸 환영해!',
    body:  '여기가 홈이야. 새 요청이 오면 여기서 바로 볼 수 있어.',
    cta:   'Homie 찾으러 가기 →',
  },
  2: {
    title: '🔍 마음에 드는 사람 찾아봐',
    body:  '카드를 탭하면 프로필을 볼 수 있어. Homie Request를 보내면 상대가 수락할 때 알려줄게.',
    cta:   '알겠어, 요청 보내볼게',
  },
  3: {
    title: '🎉 Homie가 수락했어!',
    body:  'ME 탭에 DUO CARD가 생겼어. 이름이랑 사진을 추가해서 듀오 프로필을 완성해봐.',
    cta:   'DUO CARD 완성하러 가기 →',
  },
  4: {
    title: '📍 이제 Hangout을 잡을 수 있어',
    body:  '직접 Plan을 만들거나, 다른 듀오 Hangout에 참여 요청을 보내봐. 둘 다 Hangout 탭에서 할 수 있어.',
    cta:   'Hangout 탭 보러 가기 →',
  },
  5: {
    title: '💬 Hangout이 확정되면 채팅방이 열려',
    body:  '4명이 모이면 자동으로 채팅방이 생겨. 여기서 장소랑 시간 얘기해봐.',
    cta:   '완료! 시작하기 →',
  },
};

export default function OnboardingGuide({ currentStep, navigate, advanceStep, skipAll }) {
  const copy = STEP_COPY[currentStep];
  if (!copy) return null;

  // Each CTA advances the linear flow; steps that point at another tab also
  // navigate there (without pushing onto the back stack).
  const handleCta = () => {
    switch (currentStep) {
      case 1: advanceStep(); navigate('explore'); break;
      case 2: advanceStep(); break; // stay put; step 3 waits for homie_accepted
      case 3: advanceStep(); navigate('me'); break;
      case 4: advanceStep(); navigate('hangouts'); break;
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
          {/* Top row: grabber + "나중에" skip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8, minHeight: 20 }}>
            <button
              type="button"
              onClick={skipAll}
              style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '2px 0' }}
            >
              나중에
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
