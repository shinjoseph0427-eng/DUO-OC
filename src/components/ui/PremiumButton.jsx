import { motion } from 'framer-motion';
import { C } from '../../tokens';

const VARIANTS = {
  primary: (disabled) => ({
    background:   disabled ? '#2A2A32' : C.gradientCTA,
    color:        disabled ? C.muted   : '#fff',
    border:       'none',
    padding:      '15px 24px',
    fontSize:     15,
    fontWeight:   700,
    cursor:       disabled ? 'not-allowed' : 'pointer',
    opacity:      1,
    boxShadow:    disabled ? 'none' : '0 4px 20px rgba(245,158,11,0.25)',
  }),
  secondary: (disabled) => ({
    background:   'rgba(255,255,255,0.06)',
    color:        disabled ? C.muted : C.white,
    border:       '0.5px solid rgba(255,255,255,0.1)',
    padding:      '14px 24px',
    fontSize:     15,
    fontWeight:   600,
    cursor:       disabled ? 'not-allowed' : 'pointer',
    opacity:      disabled ? 0.5 : 1,
  }),
  ghost: (disabled) => ({
    background:   'transparent',
    color:        disabled ? C.muted : C.muted,
    border:       '0.5px solid rgba(255,255,255,0.1)',
    padding:      '14px 24px',
    fontSize:     14,
    fontWeight:   600,
    cursor:       disabled ? 'not-allowed' : 'pointer',
    opacity:      disabled ? 0.4 : 1,
  }),
  danger: (disabled) => ({
    background:   'rgba(239,68,68,0.12)',
    color:        C.danger,
    border:       '0.5px solid rgba(239,68,68,0.3)',
    padding:      '14px 24px',
    fontSize:     14,
    fontWeight:   600,
    cursor:       disabled ? 'not-allowed' : 'pointer',
    opacity:      disabled ? 0.4 : 1,
  }),
};

export default function PremiumButton({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  fullWidth = false,
  type = 'button',
  style: styleOverride,
}) {
  const variantStyle = VARIANTS[variant]?.(disabled) ?? VARIANTS.primary(disabled);

  return (
    <motion.button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ duration: 0.1 }}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            8,
        borderRadius:   16,
        userSelect:     'none',
        whiteSpace:     'nowrap',
        width:          fullWidth ? '100%' : 'auto',
        transition:     'opacity 0.15s',
        ...variantStyle,
        ...styleOverride,
      }}
    >
      {children}
    </motion.button>
  );
}
