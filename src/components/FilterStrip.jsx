import { motion } from 'framer-motion';
import { C } from '../tokens';

export default function FilterStrip({ options, value, onChange, style }) {
  return (
    <div
      className="no-scrollbar"
      style={{
        display:    'flex',
        gap:        8,
        overflowX:  'auto',
        padding:    '0 1px 2px',
        ...style,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.1 }}
            style={{
              flexShrink:    0,
              border:        `0.5px solid ${active ? C.brownBorder : C.border}`,
              borderRadius:  9999,
              background:    active ? C.gradientCTA : C.cardElevated,
              color:         active ? C.cream : C.muted,
              padding:       '7px 14px',
              fontSize:      13,
              fontWeight:    800,
              cursor:        'pointer',
              whiteSpace:    'nowrap',
              boxShadow:     active ? '0 3px 12px rgba(255,107,0,0.18)' : 'none',
            }}
          >
            {option.label}
          </motion.button>
        );
      })}
    </div>
  );
}
