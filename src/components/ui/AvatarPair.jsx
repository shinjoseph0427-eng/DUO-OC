import { C } from '../../tokens';

// Two overlapping circular avatars — supports emoji or initials.
export default function AvatarPair({ members, size = 36, gap = 10 }) {
  return (
    <div
      style={{
        position:   'relative',
        width:      size + gap,
        height:     size,
        flexShrink: 0,
      }}
    >
      {members.slice(0, 2).map((m, i) => (
        <div
          key={i}
          style={{
            position:       'absolute',
            left:           i * gap,
            top:            0,
            width:          size,
            height:         size,
            borderRadius:   '50%',
            background:     m.avatarBg ?? C.card,
            border:         `1.5px solid #08080A`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       size * 0.42,
            fontWeight:     800,
            color:          C.orange,
            zIndex:         2 - i,
          }}
        >
          {m.emoji ?? (m.name ? m.name[0] : '?')}
        </div>
      ))}
    </div>
  );
}
