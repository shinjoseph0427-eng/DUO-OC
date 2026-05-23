import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Lock, MapPin, Shield } from 'lucide-react';
import { C } from '../tokens';

const PREVIEW_DUOS = [
  {
    name:    'Ari & Lena',
    cities:  'Irvine · Newport',
    vibes:   ['Boba', 'Gym', 'Night out'],
    members: [
      { name: 'Ari',  bg: ['#2A1A1A', '#341E1E'] },
      { name: 'Lena', bg: ['#1A1A2A', '#1E1E34'] },
    ],
  },
  {
    name:    'Jae & Miles',
    cities:  'Fullerton',
    vibes:   ['Gym', 'Cars', 'Late night'],
    members: [
      { name: 'Jae',   bg: ['#1A2020', '#1E2A2A'] },
      { name: 'Miles', bg: ['#181A24', '#1A1C2E'] },
    ],
  },
  {
    name:    'Sophie & Mina',
    cities:  'Costa Mesa · Newport',
    vibes:   ['Coffee', 'Beach', 'Pilates'],
    members: [
      { name: 'Sophie', bg: ['#1E1E2A', '#22223A'] },
      { name: 'Mina',   bg: ['#1A2028', '#1C2430'] },
    ],
  },
  {
    name:    'Ryan & Kai',
    cities:  'Irvine',
    vibes:   ['UCI', 'Boba', 'Music'],
    members: [
      { name: 'Ryan', bg: ['#1A2018', '#1E2820'] },
      { name: 'Kai',  bg: ['#1C1A20', '#201824'] },
    ],
  },
  {
    name:    'Mia & Chloe',
    cities:  'Newport · Costa Mesa',
    vibes:   ['Beach', 'Coffee', 'Social'],
    members: [
      { name: 'Mia',   bg: ['#22181E', '#2A1A22'] },
      { name: 'Chloe', bg: ['#1E1822', '#241A28'] },
    ],
  },
  {
    name:    'Daniel & Chris',
    cities:  'Anaheim · Fullerton',
    vibes:   ['Gym', 'KBBQ', 'Cars'],
    members: [
      { name: 'Daniel', bg: ['#1A2018', '#1E2820'] },
      { name: 'Chris',  bg: ['#18201A', '#1A241E'] },
    ],
  },
];

const N = PREVIEW_DUOS.length;
const PORTRAIT_H = 188;
const SPRING = { type: 'spring', stiffness: 320, damping: 28, mass: 0.9 };

const item = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay },
});

function LandingDeckCard({ duo }) {
  return (
    <div
      style={{
        background:   C.bg2,
        border:       '0.5px solid rgba(255,255,255,0.09)',
        borderRadius: 24,
        overflow:     'hidden',
        boxShadow:    '0 20px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
        userSelect:   'none',
      }}
    >
      {/* Accent bar */}
      <div style={{ height: 3, background: C.gradientCTA }} />

      <div style={{ display: 'flex', height: PORTRAIT_H }}>
        {duo.members.map((m, i) => (
          <div
            key={i}
            style={{
              flex:           1,
              background:     `linear-gradient(160deg, ${m.bg[0]} 0%, ${m.bg[1]} 100%)`,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              position:       'relative',
              borderRight:    i === 0 ? '0.5px solid rgba(0,0,0,0.5)' : 'none',
            }}
          >
            <span
              style={{
                fontSize:      64,
                fontWeight:    800,
                color:         'rgba(255,255,255,0.15)',
                letterSpacing: '-2px',
                lineHeight:    1,
                position:      'relative',
                zIndex:        1,
              }}
            >
              {m.name[0].toUpperCase()}
            </span>
            <div
              style={{
                position:      'absolute',
                inset:         0,
                background:    'linear-gradient(to bottom, transparent 25%, rgba(0,0,0,0.64) 100%)',
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                position:      'absolute',
                bottom:        14,
                left:          0,
                right:         0,
                textAlign:     'center',
                fontSize:      12,
                fontWeight:    700,
                color:         'rgba(255,255,255,0.72)',
                zIndex:        1,
                letterSpacing: '0.3px',
              }}
            >
              {m.name}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          padding:        '13px 16px 15px',
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize:      16,
              fontWeight:    800,
              color:         C.white,
              margin:        '0 0 3px',
              letterSpacing: '-0.3px',
              overflow:      'hidden',
              textOverflow:  'ellipsis',
              whiteSpace:    'nowrap',
            }}
          >
            {duo.name}
          </p>
          <p
            style={{
              fontSize:     11,
              color:        C.muted,
              margin:       '0 0 10px',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}
          >
            {duo.cities}
          </p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {duo.vibes.slice(0, 3).map((v) => (
              <span
                key={v}
                style={{
                  background:    'rgba(245,158,11,0.1)',
                  color:         C.amber,
                  borderRadius:  9999,
                  padding:       '3px 9px',
                  fontSize:      11,
                  fontWeight:    600,
                }}
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            flexShrink:    0,
            background:    'rgba(245,158,11,0.1)',
            border:        '0.5px solid rgba(245,158,11,0.25)',
            borderRadius:  8,
            padding:       '4px 9px',
            fontSize:      10,
            fontWeight:    800,
            color:         C.amber,
            letterSpacing: '0.5px',
            marginTop:     1,
          }}
        >
          2v2
        </div>
      </div>
    </div>
  );
}

function StackShell({ duo }) {
  return (
    <div
      style={{
        background:   C.bg2,
        border:       '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: 24,
        overflow:     'hidden',
      }}
    >
      <div style={{ display: 'flex', height: PORTRAIT_H }}>
        {duo.members.map((m, i) => (
          <div
            key={i}
            style={{
              flex:        1,
              background:  `linear-gradient(160deg, ${m.bg[0]} 0%, ${m.bg[1]} 100%)`,
              borderRight: i === 0 ? '0.5px solid rgba(0,0,0,0.5)' : 'none',
            }}
          />
        ))}
      </div>
      <div style={{ height: 70, background: C.bg2 }} />
    </div>
  );
}

export default function LandingPage({ go }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const advance = () => setCurrentIndex((i) => (i + 1) % N);
  const next1 = PREVIEW_DUOS[(currentIndex + 1) % N];
  const next2 = PREVIEW_DUOS[(currentIndex + 2) % N];

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);

  return (
    <div
      style={{
        minHeight:     '100vh',
        background:    C.bg,
        color:         C.white,
        display:       'flex',
        flexDirection: 'column',
        padding:       '32px 20px 40px',
        boxSizing:     'border-box',
        position:      'relative',
        overflow:      'hidden',
      }}
    >
      {/* Dual background glows */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          top:           -120,
          left:          '50%',
          transform:     'translateX(-50%)',
          width:         560,
          height:        400,
          background:    'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex:        0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          bottom:        -80,
          right:         -80,
          width:         360,
          height:        360,
          background:    'radial-gradient(circle, rgba(244,114,182,0.03) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex:        0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Logo */}
        <motion.div
          {...item(0)}
          style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 36 }}
        >
          <span className="gradient-text">duo oc.</span>
        </motion.div>

        <motion.span
          {...item(0.05)}
          style={{
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '1.3px',
            color:         C.muted,
            textTransform: 'uppercase',
            display:       'block',
            marginBottom:  14,
          }}
        >
          Orange County · 18–25
        </motion.span>

        <motion.h1
          {...item(0.1)}
          style={{
            fontSize:      40,
            lineHeight:    1.0,
            margin:        '0 0 12px',
          }}
        >
          <span style={{ fontWeight: 900, letterSpacing: -2, color: C.white }}>2v2 hangouts.</span>
          <br />
          <span style={{ fontWeight: 300, letterSpacing: -1, color: C.muted }}>No pressure.</span>
        </motion.h1>

        <motion.p
          {...item(0.15)}
          style={{
            color:      C.muted,
            fontSize:   14,
            lineHeight: 1.6,
            margin:     '0 0 24px',
            maxWidth:   300,
          }}
        >
          Bring your friend, meet another duo, and make plans around OC.
        </motion.p>

        {/* Trust pills */}
        <motion.div {...item(0.2)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {[
            { Icon: Lock,   text: 'Instagram unlocked on match' },
            { Icon: MapPin, text: 'Orange County only' },
            { Icon: Shield, text: '18–25 only' },
          ].map(({ Icon, text }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 9999, padding: '6px 12px',
            }}>
              <Icon size={12} color={C.muted} strokeWidth={2} />
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </motion.div>

        {/* Card stack */}
        <motion.div {...item(0.25)} style={{ marginBottom: 10 }}>
          <div style={{ perspective: 1100, perspectiveOrigin: '50% 40%' }}>
            <div style={{ position: 'relative', paddingBottom: 42 }}>
              <div
                aria-hidden="true"
                style={{
                  position:        'absolute',
                  top:             0, left: 0, right: 0,
                  zIndex:          1,
                  opacity:         0.18,
                  transform:       'scale(0.88) translateY(38px)',
                  transformOrigin: 'center top',
                  pointerEvents:   'none',
                }}
              >
                <StackShell duo={next2} />
              </div>
              <div
                aria-hidden="true"
                style={{
                  position:        'absolute',
                  top:             0, left: 0, right: 0,
                  zIndex:          2,
                  opacity:         0.4,
                  transform:       'scale(0.94) translateY(20px)',
                  transformOrigin: 'center top',
                  pointerEvents:   'none',
                }}
              >
                <StackShell duo={next1} />
              </div>
              <div style={{ position: 'relative', zIndex: 3 }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentIndex}
                    style={{ x, rotate, cursor: 'pointer' }}
                    initial={{ opacity: 0, rotateY: 12, scale: 0.95 }}
                    animate={{ opacity: 1, rotateY: 0,  scale: 1    }}
                    exit={{    opacity: 0, rotateY: -14, scale: 0.96 }}
                    transition={SPRING}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.12}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -50 || info.velocity.x < -250) advance();
                    }}
                    onClick={advance}
                    whileTap={{ scale: 0.985 }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && advance()}
                    aria-label={`Preview: ${PREVIEW_DUOS[currentIndex].name}. Tap to see next.`}
                  >
                    <LandingDeckCard duo={PREVIEW_DUOS[currentIndex]} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
          <p
            style={{
              fontSize:      11,
              color:         'rgba(255,255,255,0.26)',
              textAlign:     'center',
              margin:        '8px 0 0',
              letterSpacing: '0.2px',
              userSelect:    'none',
            }}
          >
            Tap or swipe to discover another duo
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div {...item(0.3)} style={{ marginTop: 'auto', paddingTop: 32 }}>
          <motion.button
            type="button"
            onClick={() => go('auth')}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            style={{
              width:         '100%',
              height:        54,
              borderRadius:  16,
              border:        'none',
              background:    C.gradientCTA,
              color:         '#fff',
              fontSize:      16,
              fontWeight:    800,
              cursor:        'pointer',
              marginBottom:  10,
              letterSpacing: '-0.2px',
              boxShadow:     '0 4px 20px rgba(245,158,11,0.3)',
            }}
          >
            I'm new — Get Started
          </motion.button>

          <motion.button
            type="button"
            onClick={() => go('login')}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            style={{
              width:        '100%',
              height:       50,
              borderRadius: 16,
              border:       '0.5px solid rgba(255,255,255,0.1)',
              background:   'rgba(255,255,255,0.05)',
              color:        C.muted,
              fontSize:     15,
              fontWeight:   600,
              cursor:       'pointer',
              marginBottom: 24,
            }}
          >
            I already have an account — Log In
          </motion.button>

          <p
            style={{
              color:         C.muted,
              fontSize:      11,
              textAlign:     'center',
              letterSpacing: '0.3px',
              opacity:       0.55,
            }}
          >
            18–25 only · Orange County · Public places first
          </p>
        </motion.div>
      </div>
    </div>
  );
}
