import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../tokens.js';

// Full-screen celebration shown right after a homie request is accepted (to the
// accepter) or when the requester opens the app after their request was accepted.
// CTA deep-links to the ME tab where the new DUO CARD lives.
export default function HomieAcceptedCelebration({ partnerName, onGoToDuoCard, onClose }) {
  const name = partnerName?.trim() || 'your new duo';

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
          <h2 style={{ fontSize: 23, fontWeight: 900, color: C.white, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
            You're now a duo!
          </h2>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '0 0 26px' }}>
            You and {name} are now a duo. A new <strong style={{ color: C.amber }}>DUO CARD</strong> just
            appeared on your ME tab — start a hangout with another duo from there.
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
            View your DUO CARD →
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
            Maybe later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
