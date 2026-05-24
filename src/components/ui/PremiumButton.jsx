import { motion } from 'framer-motion';
import { C } from '../../tokens';

export default function PremiumButton({
  children,
  onClick,
  variant   = 'primary',
  fullWidth = false,
  disabled  = false,
  style     = {},
  loading   = false,
}) {
  const base = {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   14,
    padding:        '14px 24px',
    fontSize:       15,
    fontWeight:     700,
    cursor:         disabled || loading ? 'not-allowed' : 'pointer',
    border:         'none',
    width:          fullWidth ? '100%' : undefined,
    position:       'relative',
    overflow:       'hidden',
    letterSpacing:  '-0.1px',
    userSelect:     'none',
    opacity:        disabled || loading ? 0.45 : 1,
  };

  const variants = {
    primary: {
      background: C.gradientCTA,
      color:      '#FFFFFF',
      boxShadow:  '0 4px 16px rgba(255,107,0,0.30)',
    },
    ghost: {
      background: '#FFFFFF',
      border:     '1px solid rgba(17,17,17,0.12)',
      color:      '#111111',
      boxShadow:  '0 1px 4px rgba(0,0,0,0.06)',
    },
    danger: {
      background: 'rgba(239,68,68,0.08)',
      border:     '1px solid rgba(239,68,68,0.22)',
      color:      C.danger,
      boxShadow:  'none',
    },
  };

  return (
    <motion.button
      type="button"
      onClick={!disabled && !loading ? onClick : undefined}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{ ...base, ...(variants[variant] ?? variants.primary), ...style }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 15, height: 15, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.25)',
            borderTopColor: '#FFFFFF',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }} />
          {children}
        </span>
      ) : children}
    </motion.button>
  );
}
