import { motion } from 'framer-motion';
import { C } from '../../tokens';

// Dark layered card with soft border and subtle top highlight.
// Set interactive=true to enable hover lift + tap press feedback.
export default function PremiumCard({
  children,
  interactive = false,
  onClick,
  style: styleOverride,
  ...props
}) {
  const base = {
    background:  '#1C1C1F',
    border:      '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    boxShadow:   'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 16px rgba(0,0,0,0.35)',
    overflow:    'hidden',
    ...styleOverride,
  };

  if (interactive) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={{ y: -2, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.5)' }}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{ cursor: onClick ? 'pointer' : 'default', ...base }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div style={base} {...props}>
      {children}
    </div>
  );
}
