// Shared Framer Motion variants for meet oc.
// Keep animations fast, tactile, and premium. No excessive bounce.
// Framer Motion v12 respects prefers-reduced-motion automatically.

const ease = [0.16, 1, 0.3, 1]; // custom ease-out-expo

export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.16, ease: 'easeIn' } },
};

export const cardVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.24, ease } },
};

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease } },
};

// Tactile tap for buttons
export const buttonTap = { whileTap: { scale: 0.97 } };

// Softer tap for pills
export const pillTap = { whileTap: { scale: 0.93 } };

// Match unlock moment — spring pop
export const matchBurst = {
  initial: { scale: 0.4, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', damping: 14, stiffness: 220, mass: 0.8 },
  },
};

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease } },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
};

export const messageVariants = {
  initial: { opacity: 0, y: 6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: 'easeOut' } },
};
