import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { C } from '../tokens';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import InstagramButton from '../components/InstagramButton.jsx';
import { matchBurst, fadeUp, staggerContainer, staggerItem } from '../lib/motion';

function initial(name = '') {
  return name.trim()[0]?.toUpperCase() ?? '?';
}

export default function MatchScreen({ duo, requestData = {}, go }) {
  if (!duo) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <header
          className="glass"
          style={{
            height:       56,
            borderBottom: '0.5px solid rgba(255,255,255,0.07)',
            padding:      '0 16px',
            display:      'flex',
            alignItems:   'center',
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 800 }}>
            <span className="gradient-text">duo oc.</span>
          </span>
        </header>
        <div style={{ padding: '72px 16px 0', textAlign: 'center' }}>
          <PremiumButton fullWidth onClick={() => go('home')}>Back to Home</PremiumButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <header
        className="glass"
        style={{
          height:       56,
          borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          padding:      '0 16px',
          display:      'flex',
          alignItems:   'center',
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
          <span className="gradient-text">duo oc.</span>
        </span>
      </header>

      <div style={{ padding: '40px 16px 48px', textAlign: 'center' }}>
        {/* Check circle */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 28 }}>
          <div
            style={{
              position:      'absolute',
              inset:         '-40px',
              borderRadius:  '50%',
              background:    'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <motion.div
            variants={matchBurst}
            initial="initial"
            animate="animate"
            style={{
              width:          72,
              height:         72,
              borderRadius:   '50%',
              background:     C.gradientCTA,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              position:       'relative',
              zIndex:         1,
              boxShadow:      '0 8px 32px rgba(245,158,11,0.4)',
            }}
          >
            <Check size={34} color="#fff" strokeWidth={2.5} />
          </motion.div>
        </div>

        <motion.div variants={fadeUp} initial="initial" animate="animate" style={{ marginBottom: 6 }}>
          <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', color: C.white }}>
            2v2 Matched!
          </p>
        </motion.div>

        <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.08 }} style={{ marginBottom: 6 }}>
          {requestData.vibe && requestData.when && (
            <p style={{ fontSize: 14, color: C.muted }}>{requestData.vibe} · {requestData.when}</p>
          )}
        </motion.div>

        <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.14 }} style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, maxWidth: 240, margin: '0 auto' }}>
            Instagram unlocked.
            <br />
            Say hi. Keep it respectful.
          </p>
        </motion.div>

        {/* Match card */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.18 }}
          style={{
            background:   C.cardElevated,
            border:       '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            overflow:     'hidden',
            marginBottom: 20,
            textAlign:    'left',
            boxShadow:    'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Accent bar */}
          <div style={{ height: 3, background: C.gradientCTA }} />

          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
              Your 2v2
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: 0 }}>{duo.name}</p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              {duo.cities}{duo.vibes?.length ? ' · ' + duo.vibes.slice(0, 2).join(' · ') : ''}
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            transition={{ delayChildren: 0.28, staggerChildren: 0.1 }}
            style={{ padding: '14px 16px' }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.amber, marginBottom: 12 }}>
              Instagram unlocked
            </p>
            {duo.members.map((m, i) => (
              <motion.div key={m.name} variants={staggerItem}>
                {m.ig ? (
                  <InstagramButton member={m} avatarBg={duo.cardBg?.[i] ?? duo.cardBg?.[0] ?? C.cardDeep} />
                ) : (
                  <div
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          10,
                      background:   C.cardDeep,
                      border:       `0.5px solid ${C.border}`,
                      borderRadius: 14,
                      padding:      '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width:          40,
                        height:         40,
                        borderRadius:   12,
                        background:     C.gradientCTA,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        fontSize:       15,
                        fontWeight:     800,
                        color:          '#fff',
                        flexShrink:     0,
                      }}
                    >
                      {initial(m.name)}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0 }}>{m.name}</p>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>No Instagram set</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.32 }}>
          <PremiumButton fullWidth onClick={() => go('home')}>Back to Home</PremiumButton>
        </motion.div>
      </div>
    </div>
  );
}
