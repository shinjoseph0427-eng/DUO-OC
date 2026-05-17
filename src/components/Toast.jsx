import { AnimatePresence, motion } from 'framer-motion';
import { Check, X, Info } from 'lucide-react';
import { C } from '../tokens';

const STYLES = {
  success: { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)', icon: Check, color: '#10B981' },
  error:   { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  icon: X,     color: '#EF4444' },
  info:    { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', icon: Info,  color: C.muted  },
};

export default function Toast({ message, type = 'info', visible }) {
  const s = STYLES[type] ?? STYLES.info;
  const Icon = s.icon;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,   scale: 1 }}
          exit={{    opacity: 0, y: -8,  scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position:     'fixed',
            top:          68,
            left:         16,
            right:        16,
            zIndex:       200,
            background:   s.bg,
            border:       `0.5px solid ${s.border}`,
            borderRadius: 12,
            padding:      '12px 16px',
            display:      'flex',
            alignItems:   'center',
            gap:          10,
          }}
        >
          <Icon size={16} color={s.color} strokeWidth={2} />
          <span style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
