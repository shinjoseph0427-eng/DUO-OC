import { AVATAR_GRADIENTS } from '../tokens';

function getGradient(name, gradient) {
  if (gradient) return gradient;
  const idx = Math.abs(
    (name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  ) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export default function InitialsAvatar({ name = '?', gradient, size = 64 }) {
  const bg = getGradient(name, gradient);
  const radius = size < 48 ? 12 : 16;
  return (
    <div
      style={{
        width:           size,
        height:          size,
        borderRadius:    radius,
        background:      bg,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        fontSize:        Math.round(size * 0.35),
        fontWeight:      800,
        color:           'white',
        boxShadow:       '0 4px 12px rgba(0,0,0,0.3)',
        flexShrink:      0,
        letterSpacing:   '-0.5px',
      }}
    >
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}
