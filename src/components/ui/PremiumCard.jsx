import { motion } from 'framer-motion';

// Clean white card with soft shadow.
export default function PremiumCard({
  children,
  interactive = false,
  onClick,
  style: styleOverride,
  ...props
}) {
  const base = {
    background:   '#FFFFFF',
    border:       '1px solid rgba(17,17,17,0.08)',
    borderRadius: 20,
    boxShadow:    '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
    overflow:     'hidden',
    ...styleOverride,
  };

  if (interactive) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={{ y: -2, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
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
