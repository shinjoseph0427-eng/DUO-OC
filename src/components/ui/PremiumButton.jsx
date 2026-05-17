import { motion } from 'framer-motion';
import { C } from '../../tokens';

export default function PremiumButton({
  children,
  onClick,
  variant  = 'primary',
  fullWidth = false,
  disabled  = false,
  style     = {},
  loading   = false,
}) {
  const base = {
    display:       'inline-flex',
    alignItems:    'center',
    justifyContent:'center',
    borderRadius:  14,
    padding:       '15px 24px',
    fontSize:      15,
    fontWeight:    800,
    cursor:        disabled || loading ? 'not-allowed' : 'pointer',
    border:        'none',
    width:         fullWidth ? '100%' : undefined,
    position:      'relative',
    overflow:      'hidden',
    letterSpacing: '-0.2px',
    userSelect:    'none',
    opacity:       disabled || loading ? 0.55 : 1,
  };

  const variants = {
    primary: {
      background: C.gradientCTA,
      color:      '#fff',
      boxShadow:  '0 4px 20px rgba(245,158,11,0.25)',
    },
    ghost: {
      background: 'rgba(255,255,255,0.06)',
      border:     '0.5px solid rgba(255,255,255,0.1)',
      color:      C.white,
      boxShadow:  'none',
    },
    danger: {
      background: 'rgba(239,68,68,0.12)',
      border:     '0.5px solid rgba(239,68,68,0.25)',
      color:      '#EF4444',
      boxShadow:  'none',
    },
  };

  return (
    <motion.button
      type="button"
      onClick={!disabled && !loading ? onClick : undefined}
      whileTap={!disabled && !loading ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ ...base, ...(variants[variant] ?? variants.primary), ...style }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width:        16,
              height:       16,
              borderRadius: '50%',
              border:       '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              display:      'inline-block',
              animation:    'spin 0.7s linear infinite',
            }}
          />
          {children}
        </span>
      ) : children}
    </motion.button>
  );
}
