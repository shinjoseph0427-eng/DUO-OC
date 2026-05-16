import { C, R } from '../tokens';

export default function Tag({
  children,
  selected = false,
  onClick,
  style: styleOverride,
}) {
  const interactive = typeof onClick === 'function';

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: selected ? C.orangeT12 : C.card,
    color: selected ? C.orange : C.gray,
    border: `0.5px solid ${selected ? C.orangeT40 : C.border}`,
    borderRadius: R.sm,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: interactive ? 'pointer' : 'default',
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    ...styleOverride,
  };

  if (interactive) {
    return (
      <button type="button" onClick={onClick} style={style}>
        {children}
      </button>
    );
  }
  return <span style={style}>{children}</span>;
}
