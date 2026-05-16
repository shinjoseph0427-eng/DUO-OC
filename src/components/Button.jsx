import { useState } from 'react';
import { C, R } from '../tokens';

export default function Button({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  fullWidth = false,
  type = 'button',
  style: styleOverride,
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: R.lg,
    fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.4 : 1,
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const variants = {
    primary: {
      background: press ? C.orangeD : C.orange,
      color: C.white,
      padding: '15px 24px',
      fontSize: 15,
      fontWeight: 700,
      border: 'none',
    },
    ghost: {
      background: hover && !disabled ? C.card : 'transparent',
      color: C.gray,
      padding: '14px 24px',
      fontSize: 14,
      fontWeight: 600,
      border: `0.5px solid ${C.border}`,
    },
  };

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{ ...base, ...variants[variant], ...styleOverride }}
    >
      {children}
    </button>
  );
}
