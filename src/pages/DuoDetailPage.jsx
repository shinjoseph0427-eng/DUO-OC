import { motion } from 'framer-motion';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import InitialsAvatar from '../components/InitialsAvatar.jsx';
import SafeBadge from '../components/ui/SafeBadge.jsx';
import { staggerContainer, staggerItem } from '../lib/motion';

function InfoCard({ label, children, accentColor }) {
  return (
    <div
      style={{
        background:   C.cardElevated,
        border:       '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding:      '14px 16px',
        boxShadow:    'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <p
        style={{
          fontSize:      10,
          fontWeight:    700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color:         accentColor ?? C.muted,
          marginBottom:  8,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

export default function DuoDetailPage({ duo, go }) {
  if (!duo) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <TopBar showBack onBack={() => go('home')} title="Duo Profile" />
        <div style={{ padding: '72px 16px 0', textAlign: 'center' }}>
          <PremiumButton fullWidth onClick={() => go('home')}>Back to Home</PremiumButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <TopBar showBack onBack={() => go('home')} title="Duo Profile" />

      {/* Hero — InitialsAvatars side by side */}
      <div style={{ display: 'flex', height: 220, overflow: 'hidden', position: 'relative' }}>
        {duo.members.map((m, i) => {
          const bg = Array.isArray(duo.cardBg) ? duo.cardBg[i] : duo.cardBg;
          return (
            <div
              key={i}
              style={{
                flex:           1,
                background:     bg ?? C.cardDeep,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            10,
                position:       'relative',
                borderRight:    i === 0 ? '0.5px solid rgba(0,0,0,0.3)' : 'none',
              }}
            >
              <InitialsAvatar name={m.name} size={72} />
              <div style={{ textAlign: 'center', zIndex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0 }}>
                  {m.name}, {m.age}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{m.city}</p>
              </div>
              <div
                style={{
                  position:      'absolute',
                  bottom:        0, left: 0, right: 0,
                  height:        80,
                  background:    'linear-gradient(to bottom, transparent, rgba(0,0,0,0.5))',
                  pointerEvents: 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ padding: '20px 16px 40px' }}
      >
        {/* Name + badge */}
        <motion.div
          variants={staggerItem}
          style={{
            display:        'flex',
            alignItems:     'flex-start',
            justifyContent: 'space-between',
            marginBottom:   4,
            gap:            12,
          }}
        >
          <p
            style={{
              fontSize:      22,
              fontWeight:    800,
              letterSpacing: '-0.5px',
              color:         C.white,
              lineHeight:    1.2,
            }}
          >
            {duo.name}
          </p>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, paddingTop: 2 }}>
            <SafeBadge variant="public" />
          </div>
        </motion.div>

        <motion.p
          variants={staggerItem}
          style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}
        >
          {duo.cities} · {duo.ages}
        </motion.p>

        {/* Vibe pills */}
        <motion.div
          variants={staggerItem}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}
        >
          {duo.vibes.map((v) => (
            <span
              key={v}
              style={{
                background:   'rgba(245,158,11,0.1)',
                color:        C.amber,
                border:       '0.5px solid rgba(245,158,11,0.2)',
                borderRadius: 9999,
                padding:      '5px 12px',
                fontSize:     12,
                fontWeight:   600,
              }}
            >
              {v}
            </span>
          ))}
        </motion.div>

        {/* Looking for */}
        <motion.div variants={staggerItem} style={{ marginBottom: 10 }}>
          <InfoCard label="Looking for" accentColor={C.amber}>
            <p style={{ fontSize: 14, color: C.white, lineHeight: 1.5 }}>{duo.lookingFor}</p>
          </InfoCard>
        </motion.div>

        {/* OC Spots */}
        <motion.div variants={staggerItem} style={{ marginBottom: 24 }}>
          <InfoCard label="OC spots">
            <p style={{ fontSize: 14, color: C.white, lineHeight: 1.5 }}>
              {duo.spots.join(' · ')}
            </p>
          </InfoCard>
        </motion.div>

        <motion.p
          variants={staggerItem}
          style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}
        >
          First plans should be public.
          <br />
          Instagram unlocks only after both duos match.
        </motion.p>

        <motion.div variants={staggerItem} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PremiumButton fullWidth onClick={() => go('request', duo)}>
            Plan a 2v2 →
          </PremiumButton>
          <PremiumButton variant="ghost" fullWidth>
            Message Duo
          </PremiumButton>
        </motion.div>
      </motion.div>
    </div>
  );
}
