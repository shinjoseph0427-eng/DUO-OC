import { motion } from 'framer-motion';
import { C } from '../../tokens';

export default function Pill({ children, selected = false, onClick, style: styleOverride }) {
  const interactive = typeof onClick === 'function';

  return (
    <motion.button
      type="button"
      onClick={interactive ? onClick : undefined}
      aria-pressed={selected}
      whileTap={interactive ? { scale: 0.93 } : {}}
      transition={{ duration: 0.1 }}
      animate={{
        background:  selected ? C.amberT14 : C.cardElevated,
        borderColor: selected ? C.amberT35  : 'rgba(255,255,255,0.08)',
        color:       selected ? C.amber                  : C.muted,
      }}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        border:         '0.5px solid',
        borderRadius:   9999,
        padding:        '9px 16px',
        fontSize:       13,
        fontWeight:     600,
        cursor:         interactive ? 'pointer' : 'default',
        userSelect:     'none',
        whiteSpace:     'nowrap',
        ...styleOverride,
      }}
    >
      {children}
    </motion.button>
  );
}
