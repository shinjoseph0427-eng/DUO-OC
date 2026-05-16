import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import Pill from '../components/ui/Pill.jsx';
import { staggerContainer, staggerItem } from '../lib/motion';

const VIBES = ['Boba', 'Coffee', 'Beach walk', 'Dinner', 'Gym', 'Night out', 'Anything'];
const WHENS = ['Tonight', 'Friday', 'Saturday', 'This weekend'];

export default function RequestTwoVTwo({ duo, go }) {
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [selectedWhen, setSelectedWhen] = useState(null);
  const [message, setMessage]           = useState('Down for a chill 2v2?');
  const [msgFocus, setMsgFocus]         = useState(false);
  const [sent, setSent]                 = useState(false);

  if (!duo) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <TopBar showBack onBack={() => go('home')} title="Plan 2v2" />
        <div style={{ padding: '72px 16px 0', textAlign: 'center' }}>
          <PremiumButton fullWidth onClick={() => go('home')}>Back to Home</PremiumButton>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <TopBar title="Request sent" />
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <div
            style={{
              width:          64,
              height:         64,
              borderRadius:   '50%',
              background:     C.gradientCTA,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              margin:         '0 auto 20px',
              boxShadow:      '0 8px 24px rgba(245,158,11,0.3)',
            }}
          >
            <span style={{ fontSize: 28 }}>✓</span>
          </div>
          <p style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 12, letterSpacing: '-0.5px' }}>
            Request sent!
          </p>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 32, lineHeight: 1.6 }}>
            We'll connect you with this duo soon.
          </p>
          <PremiumButton fullWidth onClick={() => go('home')}>Back to Home</PremiumButton>
        </div>
      </div>
    );
  }

  const canSend = Boolean(selectedVibe && selectedWhen);

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <TopBar showBack onBack={() => go('duo_detail', duo)} title="Plan 2v2" />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ padding: '20px 16px 48px' }}
      >
        {/* Duo mini card */}
        <motion.div
          variants={staggerItem}
          style={{
            background:   C.cardElevated,
            border:       '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding:      '12px 14px',
            display:      'flex',
            alignItems:   'center',
            gap:          12,
            marginBottom: 28,
            boxShadow:    'inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              width:          38,
              height:         38,
              borderRadius:   10,
              background:     C.gradientCTA,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       16,
              fontWeight:     800,
              color:          '#fff',
              flexShrink:     0,
            }}
          >
            {(duo.members?.[0]?.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {duo.name}
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{duo.cities}</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.amber, flexShrink: 0 }}>
            2v2
          </span>
        </motion.div>

        {/* Vibe */}
        <motion.div variants={staggerItem} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>
            Pick a vibe
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {VIBES.map((v) => (
              <Pill key={v} selected={selectedVibe === v} onClick={() => setSelectedVibe(v)}>{v}</Pill>
            ))}
          </div>
        </motion.div>

        {/* When */}
        <motion.div variants={staggerItem} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>
            When
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {WHENS.map((w) => (
              <Pill key={w} selected={selectedWhen === w} onClick={() => setSelectedWhen(w)}>{w}</Pill>
            ))}
          </div>
        </motion.div>

        {/* Message */}
        <motion.div variants={staggerItem} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>
            Message (optional)
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setMsgFocus(true)}
            onBlur={() => setMsgFocus(false)}
            style={{
              width:        '100%',
              background:   C.cardElevated,
              border:       `0.5px solid ${msgFocus ? C.amber : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 14,
              padding:      '12px 14px',
              color:        C.white,
              fontSize:     14,
              resize:       'none',
              height:       80,
              outline:      'none',
              display:      'block',
              boxSizing:    'border-box',
              boxShadow:    msgFocus ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
              transition:   'border-color 0.15s, box-shadow 0.15s',
            }}
          />
          <p style={{ fontSize: 11, color: C.muted, marginTop: 6, opacity: 0.6 }}>
            Match first. Instagram after.
          </p>
        </motion.div>

        {/* Plan preview */}
        <AnimatePresence>
          {canSend && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background:   C.cardElevated,
                border:       '0.5px solid rgba(255,255,255,0.09)',
                borderRadius: 16,
                padding:      '14px 16px',
                marginBottom: 20,
                boxShadow:    'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.amber, marginBottom: 10 }}>
                Your plan
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.muted, width: 40 }}>Vibe</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{selectedVibe}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.muted, width: 40 }}>When</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{selectedWhen}</span>
                </div>
                {message.trim() && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 12, color: C.muted, width: 40, paddingTop: 1 }}>Msg</span>
                    <span style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', lineHeight: 1.4, flex: 1 }}>
                      "{message}"
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={staggerItem}>
          <PremiumButton fullWidth disabled={!canSend} onClick={() => setSent(true)}>
            Send Request →
          </PremiumButton>
        </motion.div>
      </motion.div>
    </div>
  );
}
