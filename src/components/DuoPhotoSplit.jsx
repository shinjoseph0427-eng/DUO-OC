import { AVATAR_GRADIENTS, C } from '../tokens';

function initialsFor(member, fallback = '?') {
  const name = member?.profiles?.name ?? fallback;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function PhotoHalf({ member, index, featured }) {
  const photo = member?.profiles?.photos?.[0] ?? member?.profiles?.avatar_url ?? null;
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    );
  }

  return (
    <div
      style={{
        width:          '100%',
        height:         '100%',
        background:     AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          C.cream,
      }}
    >
      <span style={{ fontSize: featured ? 48 : 32, fontWeight: 900, letterSpacing: 0 }}>
        {initialsFor(member)}
      </span>
    </div>
  );
}

export default function DuoPhotoSplit({ duo, featured = false }) {
  const members = duo?.duo_members ?? [];
  const first = members[0] ?? null;
  const second = members[1] ?? null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex' }}>
      <div style={{ width: '50%', height: '100%', overflow: 'hidden' }}>
        <PhotoHalf member={first} index={0} featured={featured} />
      </div>
      <div style={{ width: '50%', height: '100%', overflow: 'hidden' }}>
        <PhotoHalf member={second} index={1} featured={featured} />
      </div>
      <div
        style={{
          position:   'absolute',
          top:        0,
          bottom:     0,
          left:       '50%',
          width:      1,
          transform:  'translateX(-50%)',
          background: 'rgba(255,255,255,0.65)',
        }}
      />
    </div>
  );
}
