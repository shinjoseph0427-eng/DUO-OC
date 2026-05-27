import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import InitialsAvatar from './InitialsAvatar';

function getAvatarGradient(name, index) {
  const base = Math.abs(
    (name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  );
  return AVATAR_GRADIENTS[(base + index) % AVATAR_GRADIENTS.length];
}

export default function DuoBoxCard({ duo, size = 'regular', onPress }) {
  const featured = size === 'featured';
  const avatarSz = featured ? 52 : 44;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onPress?.(duo)}
      onKeyDown={(e) => e.key === 'Enter' && onPress?.(duo)}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.975 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="card-glow"
      style={{
        background:   C.cardElevated,
        border:       `0.5px solid ${C.border}`,
        borderRadius: 20,
        overflow:     'hidden',
        cursor:       'pointer',
        userSelect:   'none',
      }}
    >
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: C.gradientCTA }} />

      {/* Portrait panels */}
      <div style={{ display: 'flex', height: featured ? 130 : 100, position: 'relative' }}>
        {duo.members.map((m, i) => (
          <div
            key={i}
            style={{
              flex:           1,
              background:     getAvatarGradient(m.name, i),
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              position:       'relative',
              borderRight:    i === 0 ? '0.5px solid rgba(0,0,0,0.3)' : 'none',
            }}
          >
            <span
              style={{
                fontSize:      featured ? 52 : 40,
                fontWeight:    800,
                color:         'rgba(255,255,255,0.22)',
                letterSpacing: '-2px',
                lineHeight:    1,
                position:      'relative',
                zIndex:        1,
              }}
            >
              {(m.name || '?')[0].toUpperCase()}
            </span>
            <div
              style={{
                position:      'absolute',
                inset:         0,
                background:    'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.5) 100%)',
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                position:      'absolute',
                bottom:        8,
                left:          0,
                right:         0,
                textAlign:     'center',
                fontSize:      10,
                fontWeight:    700,
                color:         'rgba(255,255,255,0.75)',
                zIndex:        1,
                letterSpacing: '0.3px',
              }}
            >
              {m.name}
            </span>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <p
          style={{
            fontSize:     14,
            fontWeight:   700,
            color:        C.white,
            marginBottom: 2,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}
        >
          {duo.name}
        </p>
        <p
          style={{
            fontSize:     11,
            color:        C.muted,
            marginBottom: 8,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}
        >
          {duo.ages} · {duo.cities}
        </p>

        {/* Vibe tags */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {duo.vibes.slice(0, 2).map((tag) => (
            <span
              key={tag}
              style={{
                background:    C.amberT08,
                color:         C.amber,
                borderRadius:  9999,
                padding:       '3px 9px',
                fontSize:      11,
                fontWeight:    600,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA row */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize:      12,
              fontWeight:    700,
              background:    C.gradientCTA,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
              backgroundClip:       'text',
            }}
          >
            Plan 2v2
          </span>
          <ArrowRight size={14} color={C.amber} strokeWidth={2.2} />
        </div>
      </div>
    </motion.div>
  );
}
