import { AVATAR_GRADIENTS, C } from '../tokens';

function memberName(member, fallback = 'Member') {
  return member?.name ?? member?.profiles?.name ?? fallback;
}

function memberPhoto(member) {
  return member?.avatarUrl ?? member?.profiles?.photos?.[0] ?? null;
}

function initials(name) {
  return (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function Avatar({ member, index, size }) {
  const name = memberName(member);
  const photo = memberPhoto(member);
  const border = `2px solid ${C.bg2 ?? C.bg}`;

  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        draggable={false}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          border,
          background: C.cardElevated,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
        border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: C.cream,
        fontSize: Math.max(10, Math.round(size * 0.34)),
        fontWeight: 900,
        letterSpacing: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

export default function DuoAvatarStack({ members = [], size = 34, online = false }) {
  const safeMembers = members.length > 0 ? members.slice(0, 2) : [{ name: 'Duo' }, { name: 'OC' }];
  const offset = Math.round(size * 0.42);
  const width = size + offset;
  const height = size + offset;

  return (
    <div style={{ position: 'relative', width, height, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 0, left: 0 }}>
        <Avatar member={safeMembers[0]} index={0} size={size} />
      </div>
      <div style={{ position: 'absolute', top: offset, left: offset }}>
        <Avatar member={safeMembers[1] ?? safeMembers[0]} index={1} size={size} />
      </div>
      {online && (
        <span
          style={{
            position: 'absolute',
            left: 1,
            bottom: 1,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: C.success,
            border: `2px solid ${C.bg2 ?? C.bg}`,
          }}
        />
      )}
    </div>
  );
}
