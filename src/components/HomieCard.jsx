import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { C } from '../tokens';
import InitialsAvatar from './InitialsAvatar.jsx';

export default function HomieCard({ homie, go }) {
  const photo = homie?.photos?.[0] ?? null;
  const name = homie?.name ?? 'Anonymous';
  const details = [homie?.age, homie?.city].filter(Boolean).join(' · ');

  return (
    <motion.button
      type="button"
      onClick={() => go('homie_profile', homie)}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      style={{
        width: '100%',
        minHeight: 260,
        background: C.cardElevated,
        border: `0.5px solid ${C.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 142, background: C.cardDeep, position: 'relative' }}>
        {photo ? (
          <img
            src={photo}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <InitialsAvatar name={name} size={74} />
          </div>
        )}
      </div>

      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: C.white, margin: '0 0 4px', lineHeight: 1.2 }}>
          {name}
        </p>
        {details && (
          <p
            style={{
              fontSize: 12,
              color: C.muted,
              margin: '0 0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              lineHeight: 1.35,
            }}
          >
            {homie?.city && <MapPin size={11} strokeWidth={2} />}
            {details}
          </p>
        )}
        {homie?.bio && (
          <p
            style={{
              fontSize: 13,
              color: 'rgba(245,245,248,0.78)',
              margin: 0,
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {homie.bio}
          </p>
        )}
      </div>
    </motion.button>
  );
}
