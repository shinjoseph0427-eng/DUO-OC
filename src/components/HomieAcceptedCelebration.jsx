import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../tokens.js';

// Full-screen celebration shown right after a homie request is accepted (to the
// accepter) or when the requester opens the app after their request was accepted.
// CTA deep-links to the ME tab where the new DUO CARD lives.
export default function HomieAcceptedCelebration({ partnerName, onGoToDuoCard, onClose }) {
  const name = partnerName?.trim() || '새 듀오';

  return (
    <AnimatePresence>
      <motion.div
        key="celebration"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position:       'fixed',
          inset:          0,
          background:     'rgba(0,0,0,0.78)',
          zIndex:         1100,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '0 24px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background:   C.bg,
            borderRadius: 24,
            padding:      '36px 26px 26px',
            width:        '100%',
            maxWidth:     400,
            textAlign:    'center',
            border:       `0.5px solid ${C.border}`,
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.08 }}
            style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}
          >
            🎉
          </motion.div>

          <h2 style={{ fontSize: 23, fontWeight: 900, color: C.white, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
            이제 듀오가 됐어요!
          </h2>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '0 0 26px' }}>
            {name}님과 듀오를 맺었어요. ME 탭에 새 <strong style={{ color: C.amber }}>DUO CARD</strong>가
            생겼어요 — 거기서 다른 듀오와 hangout을 시작할 수 있어요.
          </p>

          <button
            type="button"
            onClick={onGoToDuoCard}
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
            DUO CARD 보러 가기 →
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width:      '100%',
              marginTop:  12,
              padding:    '10px 0',
              background: 'none',
              border:     'none',
              color:      C.muted,
              fontSize:   13,
              fontWeight: 600,
              cursor:     'pointer',
            }}
          >
            나중에 볼게요
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
