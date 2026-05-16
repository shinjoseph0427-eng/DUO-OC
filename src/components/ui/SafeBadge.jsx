import { C } from '../../tokens';

const CONFIG = {
  verified: {
    icon:   '✓',
    label:  'Verified',
    color:  C.green,
    bg:     'rgba(52,199,89,0.12)',
    border: 'rgba(52,199,89,0.3)',
  },
  public: {
    icon:   '⊙',
    label:  'Public first',
    color:  C.gray,
    bg:     'rgba(161,161,170,0.1)',
    border: 'rgba(161,161,170,0.2)',
  },
  match: {
    icon:   '→',
    label:  '2v2 ready',
    color:  C.orange,
    bg:     C.orangeT12,
    border: 'rgba(255,106,0,0.3)',
  },
  local: {
    icon:   '⊕',
    label:  'OC',
    color:  C.gray,
    bg:     'rgba(161,161,170,0.08)',
    border: 'rgba(161,161,170,0.15)',
  },
};

export default function SafeBadge({ variant = 'public', label: labelOverride, style: styleOverride }) {
  const cfg = CONFIG[variant] ?? CONFIG.public;
  const label = labelOverride ?? cfg.label;

  return (
    <span
      style={{
        display:     'inline-flex',
        alignItems:  'center',
        gap:         4,
        background:  cfg.bg,
        border:      `0.5px solid ${cfg.border}`,
        borderRadius: 999,
        padding:     '4px 9px',
        fontSize:    11,
        fontWeight:  700,
        color:       cfg.color,
        letterSpacing: '0.3px',
        flexShrink:  0,
        ...styleOverride,
      }}
    >
      <span style={{ fontSize: 10 }}>{cfg.icon}</span>
      {label}
    </span>
  );
}
