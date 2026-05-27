import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { C } from '../tokens';

export default function InstagramButton({ member, avatarBg }) {
  const [hover, setHover] = useState(false);

  return (
    <a
      href={`https://instagram.com/${member.ig}`}
      aria-label={`Open ${member.name}'s Instagram profile`}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        background:     hover ? C.cardDeep : C.cardElevated,
        border:         `0.5px solid ${C.border}`,
        borderRadius:   14,
        padding:        '14px 16px',
        textDecoration: 'none',
        marginBottom:   10,
        cursor:         'pointer',
        transition:     'background 0.15s',
      }}
    >
      <div
        style={{
          width:          40,
          height:         40,
          borderRadius:   12,
          background:     avatarBg ?? C.gradientCTA,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       15,
          fontWeight:     800,
          color:          '#fff',
          flexShrink:     0,
        }}
      >
        {(member.name || '?')[0].toUpperCase()}
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0 }}>
          {member.name}
        </p>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          @{member.ig}
        </p>
      </div>

      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          6,
          background:   C.amberT14,
          border:       `0.5px solid ${C.amberT35}`,
          borderRadius: 8,
          padding:      '7px 12px',
          flexShrink:   0,
        }}
      >
        <ExternalLink size={13} color={C.amber} strokeWidth={2} />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>Open</span>
      </div>
    </a>
  );
}
