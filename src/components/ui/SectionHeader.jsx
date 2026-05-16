import { C, F } from '../../tokens';

// Editorial section label with optional right-side action.
export default function SectionHeader({ label, action, style: styleOverride }) {
  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 16px',
        marginBottom:   12,
        ...styleOverride,
      }}
    >
      <span
        style={{
          fontSize:      11,
          fontWeight:    700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color:         C.gray,
        }}
      >
        {label}
      </span>
      {action && (
        <span
          style={{
            fontSize:   12,
            fontWeight: 600,
            color:      C.orange,
            cursor:     'pointer',
          }}
        >
          {action}
        </span>
      )}
    </div>
  );
}
