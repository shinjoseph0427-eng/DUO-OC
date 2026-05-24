import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { C } from '../tokens';
import { popIn } from '../lib/motion.js';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { createPlan, getMyActivePlan } from '../lib/hangouts.js';
import { logError } from '../lib/logger.js';
import { isDuoRestricted, SAFETY_MESSAGES } from '../lib/safety.js';

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

const OC_PLACES = [
  'Irvine Spectrum', 'Diamond Jamboree', 'Anaheim Packing House',
  'Downtown Fullerton', 'Balboa Island', 'Huntington Beach Pier',
  'Portola Coffee Lab', 'The CAMP Costa Mesa', 'Fashion Island', 'Pacific City HB',
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

export default function CreatePlanPage({ currentUser, myDuo, myDuos: myDuosProp = [], selectedDuo: selectedDuoProp = null, go, goBack }) {
  // Eligible duos: prefer the myDuos prop; fall back to [myDuo] for single-duo callers
  const eligibleDuos = myDuosProp.length > 0 ? myDuosProp : (myDuo ? [myDuo] : []);

  const [selectedDuoId, setSelectedDuoId] = useState(() => selectedDuoProp?.id ?? eligibleDuos[0]?.id ?? null);
  const [date,        setDate]        = useState(null);
  const [timeSlot,    setTimeSlot]    = useState(null);
  const [place,       setPlace]       = useState(null);
  const [vibe,        setVibe]        = useState(null);
  const [message,     setMessage]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [checking,    setChecking]    = useState(true);
  const [hasExisting, setHasExisting] = useState(false);
  const [isRestricted,setIsRestricted]= useState(false);
  const [sent,        setSent]        = useState(false);
  const [error,       setError]       = useState('');

  // Sync selectedDuoId when eligibleDuos arrives (e.g. if props populate late)
  useEffect(() => {
    if (selectedDuoProp?.id && eligibleDuos.some((duo) => duo.id === selectedDuoProp.id)) {
      setSelectedDuoId(selectedDuoProp.id);
      return;
    }
    if (!selectedDuoId && eligibleDuos.length > 0) {
      setSelectedDuoId(eligibleDuos[0].id);
    }
  }, [eligibleDuos, selectedDuoId, selectedDuoProp?.id]);

  const selectedDuo = eligibleDuos.find((d) => d.id === selectedDuoId) ?? eligibleDuos[0] ?? null;

  // Check for existing open plan whenever selected duo changes
  useEffect(() => {
    if (!selectedDuo?.id) { setChecking(false); return; }
    setChecking(true);
    setHasExisting(false);
    setIsRestricted(false);
    Promise.all([
      getMyActivePlan(selectedDuo.id).catch(() => null),
      isDuoRestricted(selectedDuo.id).catch(() => false),
    ])
      .then(([plan, restricted]) => {
        setHasExisting(!!plan);
        setIsRestricted(restricted);
      })
      .catch(() => {
        setHasExisting(false);
        setIsRestricted(false);
      })
      .finally(() => setChecking(false));
  }, [selectedDuo?.id]);

  if (eligibleDuos.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
        <TopBar showBack onBack={goBack} onLogoClick={() => go('home')} />
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 8px' }}>
            You need a duo before making plans.
          </p>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px' }}>
            Find a homie first, then create a duo together.
          </p>
          <PremiumButton fullWidth onClick={() => go('find_homie')}>Find a homie</PremiumButton>
        </div>
      </div>
    );
  }

  // Single-duo: show full-page gate while checking or when plan exists
  if (eligibleDuos.length === 1) {
    if (checking) {
      return <div style={{ minHeight: '100vh', background: C.bg }} />;
    }
    if (isRestricted) {
      return (
        <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
          <TopBar showBack onBack={goBack} onLogoClick={() => go('home')} />
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 8px' }}>
              {SAFETY_MESSAGES.restrictedOwnDuo}
            </p>
            <PremiumButton fullWidth onClick={() => go('hangouts')}>Back to Hangouts</PremiumButton>
          </div>
        </div>
      );
    }
    if (hasExisting) {
      return (
        <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
          <TopBar showBack onBack={goBack} onLogoClick={() => go('home')} />
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 8px' }}>
              This duo already has an open plan.
            </p>
            <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px', lineHeight: 1.6 }}>
              Each duo can have one open plan at a time.
            </p>
            <PremiumButton fullWidth onClick={() => go('hangouts')}>View in Hangouts</PremiumButton>
          </div>
        </div>
      );
    }
  }

  const cleanMessage = message.trim();
  const canSubmit =
    selectedDuo?.id &&
    !hasExisting &&
    !isRestricted &&
    vibe &&
    date &&
    timeSlot &&
    (!place || place.length <= MAX_PLACE_LENGTH) &&
    cleanMessage.length <= MAX_MESSAGE_LENGTH &&
    !loading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setError('');
    try {
      setLoading(true);
      await createPlan({
        creatorDuoId: selectedDuo.id,
        vibe,
        date,
        timeSlot,
        place,
        message: cleanMessage,
      });
      setSent(true);
    } catch (err) {
      console.error('create plan failed:', err);
      logError('create plan failed', err);
      setError(err?.message === SAFETY_MESSAGES.restrictedDuo ? 'This duo cannot create new plans right now.' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
        <TopBar showBack onBack={goBack} onLogoClick={() => go('home')} />
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
            Plan posted.
          </motion.p>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
            Other duos can now request to join your plan.
          </p>
          <div style={{ marginTop: 16, width: '100%', maxWidth: 280 }}>
            <PremiumButton fullWidth onClick={() => go('hangouts')}>
              View in Hangouts
            </PremiumButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={goBack} onLogoClick={() => go('home')} />

      <div style={{ padding: '20px 16px 100px' }}>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          Create an open plan
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px', lineHeight: 1.5 }}>
          Post your plan so another duo can request to join.
        </p>

        {/* CREATE PLAN AS — only shown when user has multiple duos */}
        {eligibleDuos.length > 1 && (
          <div style={{ marginBottom: 28 }}>
            <span style={LABEL_STYLE}>Create plan as</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {eligibleDuos.map((d) => (
                <motion.button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDuoId(d.id)}
                  whileTap={{ scale: 0.93 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    background:   selectedDuo?.id === d.id ? C.gradientCTA : C.cardElevated,
                    border:       '0.5px solid ' + (selectedDuo?.id === d.id ? 'transparent' : C.border),
                    borderRadius: 9999,
                    padding:      '9px 16px',
                    fontSize:     13,
                    fontWeight:   600,
                    color:        selectedDuo?.id === d.id ? C.cream : C.muted,
                    cursor:       'pointer',
                  }}
                >
                  {d.name}
                </motion.button>
              ))}
            </div>
            {/* Inline existing-plan gate for multi-duo */}
            {!checking && isRestricted && (
              <div
                style={{
                  marginTop:    12,
                  background:   'rgba(162,59,42,0.08)',
                  border:       '0.5px solid rgba(162,59,42,0.2)',
                  borderRadius: 12,
                  padding:      '12px 14px',
                }}
              >
                <p style={{ fontSize: 13, color: C.danger, fontWeight: 600, margin: 0 }}>
                  This duo cannot create new plans right now.
                </p>
              </div>
            )}
            {!checking && !isRestricted && hasExisting && (
              <div
                style={{
                  marginTop:    12,
                  background:   'rgba(162,59,42,0.08)',
                  border:       '0.5px solid rgba(162,59,42,0.2)',
                  borderRadius: 12,
                  padding:      '12px 14px',
                }}
              >
                <p style={{ fontSize: 13, color: C.danger, fontWeight: 600, margin: '0 0 2px' }}>
                  This duo already has an open plan.
                </p>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 10px' }}>
                  Each duo can have one open plan at a time.
                </p>
                <motion.button
                  type="button"
                  onClick={() => go('hangouts')}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    background:   C.cardElevated,
                    border:       `0.5px solid ${C.border}`,
                    borderRadius: 8,
                    padding:      '7px 14px',
                    fontSize:     12,
                    fontWeight:   600,
                    color:        C.white,
                    cursor:       'pointer',
                  }}
                >
                  View in Hangouts
                </motion.button>
              </div>
            )}
          </div>
        )}

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
                background:   vibe === v ? C.gradientCTA : C.cardElevated,
                border:       '0.5px solid ' + (vibe === v ? 'transparent' : C.border),
                borderRadius: 9999,
                padding:      '9px 16px',
                fontSize:     13,
                fontWeight:   600,
                color:        vibe === v ? C.cream : C.muted,
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
                background:   date === d.value ? 'rgba(255,107,0,0.12)' : C.cardElevated,
                border:       '0.5px solid ' + (date === d.value ? 'rgba(255,107,0,0.45)' : C.border),
                borderRadius: 12,
                padding:      '12px 8px',
                textAlign:    'center',
                fontSize:     14,
                fontWeight:   600,
                color:        date === d.value ? C.amber : C.muted,
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
                background:   timeSlot === t.value ? 'rgba(255,107,0,0.12)' : C.cardElevated,
                border:       '0.5px solid ' + (timeSlot === t.value ? 'rgba(255,107,0,0.45)' : C.border),
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
                  color:      timeSlot === t.value ? C.amber : C.white,
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
          }}
        >
          {OC_PLACES.map((p) => (
            <motion.button
              key={p}
              type="button"
              onClick={() => setPlace(place === p ? null : p)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                background:   place === p ? C.gradientCTA : C.cardElevated,
                border:       '0.5px solid ' + (place === p ? 'transparent' : C.border),
                borderRadius: 9999,
                padding:      '8px 16px',
                fontSize:     13,
                fontWeight:   500,
                color:        place === p ? C.cream : C.muted,
                cursor:       'pointer',
                flexShrink:   0,
                whiteSpace:   'nowrap',
              }}
            >
              {p}
            </motion.button>
          ))}
        </div>

        {/* MESSAGE */}
        <span style={LABEL_STYLE}>Message (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          placeholder="Looking for a chill 2v2 this weekend!"
          maxLength={MAX_MESSAGE_LENGTH}
          rows={3}
          style={{
            width:        '100%',
            background:   C.cardElevated,
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

        <PremiumButton fullWidth onClick={handleCreate} disabled={!canSubmit}>
          {loading ? 'Posting…' : 'Post plan →'}
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
