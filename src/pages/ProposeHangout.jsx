import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { C } from '../tokens';
import { popIn } from '../lib/motion.js';
import TopBar from '../components/TopBar.jsx';
import InitialsAvatar from '../components/InitialsAvatar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { proposeHangout } from '../lib/hangouts.js';
import { logError } from '../lib/logger.js';
import { OC_SPOTS } from '../data/duos.js';

const MAX_PLACE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 200;

const DATES = [
  { label: 'Today',       value: 'today'     },
  { label: 'Tomorrow',    value: 'tomorrow'  },
  { label: 'This Friday', value: 'friday'    },
  { label: 'Saturday',    value: 'saturday'  },
  { label: 'This Sunday', value: 'sunday'    },
  { label: 'Next week',   value: 'next_week' },
];

const TIME_SLOTS = [
  { label: 'Morning',   sub: '10am – 12pm', value: 'morning'   },
  { label: 'Afternoon', sub: '12pm – 4pm',  value: 'afternoon' },
  { label: 'Evening',   sub: '4pm – 7pm',   value: 'evening'   },
  { label: 'Night',     sub: '7pm – 10pm',  value: 'night'     },
];

const VIBES = ['Boba', 'Coffee', 'Beach', 'Dinner', 'Gym', 'Night out', 'Chill walk'];

const LABEL_STYLE = {
  fontSize:      10,
  fontWeight:    700,
  letterSpacing: '1.1px',
  textTransform: 'uppercase',
  color:         C.muted,
  display:       'block',
  marginBottom:  10,
};

export default function ProposeHangout({ currentUser, duo, myDuo, go, goBack }) {
  const [date,     setDate]     = useState(null);
  const [timeSlot, setTimeSlot] = useState(null);
  const [place,    setPlace]    = useState(null);
  const [vibe,     setVibe]     = useState(null);
  const [message,  setMessage]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [timeConflict, setTimeConflict] = useState(false);
  const [error,    setError]    = useState('');

  // ── Fix 4: duo null guard ────────────────────────────────────────────────
  if (!duo) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
        <TopBar showBack onBack={() => go('home')} onLogoClick={() => go('home')} />
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 8px' }}>
            Something went wrong.
          </p>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px', lineHeight: 1.6 }}>
            Please go back and try again.
          </p>
          <PremiumButton fullWidth onClick={() => go('home')}>Go Back</PremiumButton>
        </div>
      </div>
    );
  }

  // ── Fix 1: myDuo null guard ──────────────────────────────────────────────
  if (!myDuo) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
        <TopBar showBack onBack={() => go('home')} onLogoClick={() => go('home')} />
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 8px' }}>
            You need a duo before making plans.
          </p>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px', lineHeight: 1.6 }}>
            Find a homie first, then create a duo together.
          </p>
          <PremiumButton fullWidth onClick={() => go('find_homie')}>Find a homie</PremiumButton>
        </div>
      </div>
    );
  }

  const cleanMessage = message.trim();

  // ── Fix 2: place is optional — removed from canSubmit ───────────────────
  const canSubmit =
    vibe &&
    date &&
    timeSlot &&
    (!place || place.length <= MAX_PLACE_LENGTH) &&
    cleanMessage.length <= MAX_MESSAGE_LENGTH &&
    !loading;

  const handlePropose = async () => {
    if (!canSubmit) return;
    setError('');
    try {
      setLoading(true);
      const res = await proposeHangout({
        fromDuoId:  myDuo.id,
        toDuoId:    duo.id,
        proposedBy: currentUser.id,
        date, timeSlot, place, vibe,
        message: cleanMessage,
      });
      setAlreadyRequested(Boolean(res?.alreadySent));
      setTimeConflict(Boolean(res?.timeConflict));
      setSent(true);
    } catch (err) {
      // ── Fix 3: visible error instead of silent catch ─────────────────────
      console.error('propose hangout failed:', err);
      logError('propose hangout failed', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
        <TopBar showBack onBack={() => go('home')} onLogoClick={() => go('home')} />
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '80px 32px',
            textAlign:      'center',
            gap:            16,
          }}
        >
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <motion.div
              variants={popIn} initial="initial" animate="animate"
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: C.gradientCTA,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Check size={32} color={C.cream} strokeWidth={2.5} />
            </motion.div>
            <div className="pulse-ring" style={{
              position: 'absolute', inset: -12,
              borderRadius: '50%', border: '1.5px solid rgba(255,107,0,0.22)',
              pointerEvents: 'none',
            }} />
          </div>
          <motion.p variants={popIn} initial="initial" animate="animate"
            style={{ fontSize: 36, fontWeight: 900, color: C.white, letterSpacing: -1, margin: '0 0 8px' }}>
            {timeConflict ? 'Time conflict!' : alreadyRequested ? 'Already requested!' : 'Request sent!'}
          </motion.p>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
            {timeConflict
              ? 'Your duo already has a hangout at that time. Pick a different time.'
              : alreadyRequested
                ? `You already have a pending hangout with ${duo.name}.`
                : `We'll let you know when ${duo.name} responds.`}
          </p>
          <div style={{ marginTop: 16, width: '100%', maxWidth: 280 }}>
            <PremiumButton fullWidth onClick={() => go('home')}>
              Back to Home
            </PremiumButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={() => go('home')} onLogoClick={() => go('home')} />

      <div style={{ padding: '20px 16px 100px' }}>

        {/* Page title */}
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          Send a hangout request
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 20px', lineHeight: 1.5 }}>
          Pick the vibe, time, and place for a low-pressure 2v2 hangout.
        </p>

        {/* Opponent duo mini-card */}
        <div
          style={{
            background:   C.amberT08,
            border:       '1px solid rgba(255,107,0,0.12)',
            borderRadius: 16,
            padding:      '14px 16px',
            marginBottom: 24,
            display:      'flex',
            alignItems:   'center',
            gap:          12,
          }}
        >
          <InitialsAvatar name={duo.name} size={40} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0, marginBottom: 2 }}>
              {duo.name}
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
              {duo.cities ?? duo.city ?? ''}
            </p>
          </div>
        </div>

        {/* VIBE */}
        <span style={LABEL_STYLE}>What's the plan</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {VIBES.map((v) => (
            <motion.button
              key={v}
              type="button"
              onClick={() => setVibe(v)}
              whileTap={{ scale: 0.93 }}
              transition={{ duration: 0.1 }}
              style={{
                background:   vibe === v ? C.gradientCTA : 'rgba(17,17,17,0.05)',
                border:       '0.5px solid ' + (vibe === v ? 'transparent' : C.border),
                borderRadius: 9999,
                padding:      '9px 16px',
                fontSize:     13,
                fontWeight:   600,
                color:        vibe === v ? C.cream : C.brown,
                cursor:       'pointer',
              }}
            >
              {v}
            </motion.button>
          ))}
        </div>

        {/* DATE */}
        <span style={LABEL_STYLE}>When</span>
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 8,
            marginBottom:        24,
          }}
        >
          {DATES.map((d) => (
            <motion.button
              key={d.value}
              type="button"
              onClick={() => setDate(d.value)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                background:   date === d.value ? C.amberT08 : 'rgba(17,17,17,0.05)',
                border:       '0.5px solid ' + (date === d.value ? C.greenBorder : C.border),
                borderRadius: 12,
                padding:      '12px 8px',
                textAlign:    'center',
                fontSize:     14,
                fontWeight:   600,
                color:        date === d.value ? C.greenDeep : C.muted,
                cursor:       'pointer',
              }}
            >
              {d.label}
            </motion.button>
          ))}
        </div>

        {/* TIME SLOT */}
        <span style={LABEL_STYLE}>What time</span>
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap:                 8,
            marginBottom:        24,
          }}
        >
          {TIME_SLOTS.map((t) => (
            <motion.button
              key={t.value}
              type="button"
              onClick={() => setTimeSlot(t.value)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                background:   timeSlot === t.value ? C.amberT08 : 'rgba(17,17,17,0.05)',
                border:       '0.5px solid ' + (timeSlot === t.value ? C.greenBorder : C.border),
                borderRadius: 12,
                padding:      '14px 12px',
                textAlign:    'left',
                cursor:       'pointer',
              }}
            >
              <p
                style={{
                  fontSize:   14,
                  fontWeight: 700,
                  color:      timeSlot === t.value ? C.greenDeep : C.white,
                  margin:     '0 0 3px',
                }}
              >
                {t.label}
              </p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{t.sub}</p>
            </motion.button>
          ))}
        </div>

        {/* PLACE — optional */}
        <span style={LABEL_STYLE}>Where? (optional)</span>
        <p style={{ fontSize: 11, color: C.muted, margin: '-6px 0 10px', lineHeight: 1.4 }}>
          Leave blank if you're open to anywhere.
        </p>
        <div
          className="no-scrollbar"
          style={{
            display:       'flex',
            gap:           8,
            overflowX:     'auto',
            marginBottom:  24,
            paddingBottom: 4,
            scrollbarWidth: 'none',
          }}
        >
          {OC_SPOTS.map((spot) => (
            <motion.button
              key={spot.id}
              type="button"
              onClick={() => setPlace(place === spot.name ? null : spot.name)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                background:   place === spot.name ? C.amberT08 : 'rgba(17,17,17,0.05)',
                border:       '0.5px solid ' + (place === spot.name ? C.brownBorder : C.border),
                borderRadius: 9999,
                padding:      '8px 16px',
                fontSize:     13,
                fontWeight:   500,
                color:        place === spot.name ? C.amber : C.brown,
                cursor:       'pointer',
                flexShrink:   0,
                whiteSpace:   'nowrap',
              }}
            >
              {spot.emoji} {spot.name}
            </motion.button>
          ))}
        </div>

        {/* MESSAGE */}
        <span style={LABEL_STYLE}>Message (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          placeholder="Down for a chill 2v2 this weekend?"
          maxLength={MAX_MESSAGE_LENGTH}
          rows={3}
          style={{
            width:        '100%',
            background:   'rgba(17,17,17,0.05)',
            border:       `0.5px solid ${C.border}`,
            borderRadius: 14,
            padding:      14,
            color:        C.white,
            fontSize:     14,
            resize:       'none',
            outline:      'none',
            boxSizing:    'border-box',
            marginBottom: 20,
          }}
        />

        {/* Error message */}
        {error && (
          <p style={{
            fontSize:     13,
            color:        C.danger,
            marginBottom: 12,
            lineHeight:   1.5,
            background:   'rgba(162,59,42,0.08)',
            border:       '0.5px solid rgba(162,59,42,0.2)',
            borderRadius: 10,
            padding:      '10px 14px',
          }}>
            {error}
          </p>
        )}

        {/* CTA */}
        <PremiumButton
          fullWidth
          onClick={handlePropose}
          disabled={!canSubmit}
        >
          {loading ? 'Sending…' : 'Send the invite →'}
        </PremiumButton>

        {(!vibe || !date || !timeSlot) && (
          <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 10 }}>
            Pick a vibe, date, and time to continue.
          </p>
        )}
      </div>
    </div>
  );
}
