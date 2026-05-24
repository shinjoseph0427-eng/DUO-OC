import { motion } from 'framer-motion';
import { C } from '../tokens';

export default function EmptyState({ icon: Icon, title, subtitle, action, actionLabel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding:      '48px 20px',
        textAlign:    'center',
        background:   C.bg2,
        border:       `1px dashed ${C.border}`,
        borderRadius: 20,
      }}
    >
      {Icon && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Icon size={44} color={C.muted} strokeWidth={1.5} />
        </div>
      )}
      <p style={{ fontSize: 18, fontWeight: 700, color: C.white, margin: '0 0 6px' }}>{title}</p>
      {subtitle && (
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px', lineHeight: 1.6 }}>{subtitle}</p>
      )}
      {action && actionLabel && (
        <button
          type="button"
          onClick={action}
          style={{
            background:   C.amberT08,
            border:       `0.5px solid ${C.brownBorder}`,
            borderRadius: 10,
            padding:      '10px 20px',
            color:        C.white,
            fontSize:     14,
            fontWeight:   600,
            cursor:       'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
