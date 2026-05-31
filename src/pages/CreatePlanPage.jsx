import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import Calendar from '../components/Calendar.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import { createPlan, getMyActivePlan, formatPlanDateLabel } from '../lib/hangouts.js';
import { logError } from '../lib/logger.js';
import { isDuoRestricted, SAFETY_MESSAGES } from '../lib/safety.js';

const ACCENT = C.amber; // #FF6B00 — matches the rest of the app
const HEAD_FONT = "'Bricolage Grotesque', 'Inter', system-ui, sans-serif";
const BODY_FONT = "'DM Sans', 'Inter', system-ui, sans-serif";

const MAX_PLACE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 200;

const VIBES = ['Boba', 'Coffee', 'Beach', 'Dinner', 'Gym', 'Night out', 'Chill walk'];

const TIME_SLOTS = [
  { label: 'Morning',   sub: '10am – 12pm', value: 'morning'   },
  { label: 'Afternoon', sub: '12pm – 4pm',  value: 'afternoon' },
  { label: 'Evening',   sub: '4pm – 7pm',   value: 'evening'   },
  { label: 'Night',     sub: '7pm – 10pm',  value: 'night'     },
];

const LABEL_STYLE = {
  fontSize:      10,
  fontWeight:    700,
  letterSpacing: '1.1px',
  textTransform: 'uppercase',
  color:         C.muted,
  display:       'block',
  marginBottom:  10,
  fontFamily:    BODY_FONT,
};

function duoMemberNames(duo) {
  const names = (duo?.duo_members ?? [])
    .map((m) => m?.profiles?.name)
    .filter(Boolean)
    .slice(0, 2);
  return names.length > 0 ? names.join(' & ') : (duo?.name ?? 'Your duo');
}

export default function CreatePlanPage({ currentUser, myDuo, myDuos: myDuosProp = [], selectedDuo: selectedDuoProp = null, go, goBack }) {
  const eligibleDuos = myDuosProp.length > 0 ? myDuosProp : (myDuo ? [myDuo] : []);

  const [selectedDuoId, setSelectedDuoId] = useState(() => selectedDuoProp?.id ?? eligibleDuos[0]?.id ?? null);
  const [step,        setStep]        = useState(1);
  const [direction,   setDirection]   = useState(1);
  const [vibe,        setVibe]        = useState(null);
  const [date,        setDate]        = useState(null);   // 'YYYY-MM-DD'
  const [timeSlot,    setTimeSlot]    = useState(null);
  const [location,    setLocation]    = useState(null);   // { name, lat, lng } | null
  const [message,     setMessage]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [checking,    setChecking]    = useState(true);
  const [hasExisting, setHasExisting] = useState(false);
  const [isRestricted,setIsRestricted]= useState(false);
  const [error,       setError]       = useState('');

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

  // ─── Full-page gates (preserved from the original) ──────────────────────────
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
  const planBlocked = !selectedDuo?.id || hasExisting || isRestricted;

  const step1Valid = Boolean(vibe && date && timeSlot);
  const canSubmit =
    !planBlocked &&
    step1Valid &&
    (!location?.name || location.name.length <= MAX_PLACE_LENGTH) &&
    cleanMessage.length <= MAX_MESSAGE_LENGTH &&
    !loading;

  const goToStep = (next) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    window.scrollTo(0, 0);
  };

  const handleNext = () => {
    if (step === 1 && !step1Valid) return;
    goToStep(Math.min(step + 1, 3));
  };

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
        place:   location?.name ?? null,
        message: cleanMessage,
      });
      confetti({
        colors: ['#FF5C00', '#FFa060', '#ffffff'],
        particleCount: 120,
        spread: 80,
        origin: { y: 0.7 },
      });
      setTimeout(() => go('hangouts'), 600);
    } catch (err) {
      console.error('create plan failed:', err);
      logError('create plan failed', err);
      setError(err?.message === SAFETY_MESSAGES.restrictedDuo ? 'This duo cannot create new plans right now.' : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // ─── Progress dots ──────────────────────────────────────────────────────────
  const ProgressDots = () => (
    <div style={{
      position: 'sticky', top: 56, zIndex: 50,
      background: C.bg,
      display: 'flex', justifyContent: 'center', gap: 10,
      padding: '16px 0 14px',
    }}>
      {[1, 2, 3].map((n) => {
        const done = n < step;
        const active = n === step;
        return (
          <div
            key={n}
            style={{
              width: active ? 26 : 18, height: 18,
              borderRadius: 9999,
              background: done || active ? ACCENT : 'rgba(17,17,17,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          >
            {done && <Check size={11} color="#fff" strokeWidth={3} />}
          </div>
        );
      })}
    </div>
  );

  const slide = {
    initial: (dir) => ({ opacity: 0, x: dir * 60 }),
    animate: { opacity: 1, x: 0 },
    exit:    (dir) => ({ opacity: 0, x: dir * -60 }),
  };

  const chipRow = (items, selected, onSelect, getKey, getLabel) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it) => {
        const key = getKey(it);
        const active = selected === key;
        return (
          <motion.button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            whileTap={{ scale: 0.93 }}
            transition={{ duration: 0.1 }}
            style={{
              background:   active ? ACCENT : C.cardElevated,
              border:       `1px solid ${active ? 'transparent' : '#eee'}`,
              borderRadius: 100,
              padding:      '9px 16px',
              fontSize:     13,
              fontWeight:   600,
              fontFamily:   BODY_FONT,
              color:        active ? '#fff' : C.muted,
              cursor:       'pointer',
            }}
          >
            {getLabel(it)}
          </motion.button>
        );
      })}
    </div>
  );

  // ─── Step content ───────────────────────────────────────────────────────────
  const Step1 = (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: HEAD_FONT, color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        What & when
      </h1>
      <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px', lineHeight: 1.5, fontFamily: BODY_FONT }}>
        Post your plan so another duo can request to join.
      </p>

      {eligibleDuos.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <span style={LABEL_STYLE}>Create plan as</span>
          {chipRow(eligibleDuos, selectedDuo?.id, setSelectedDuoId, (d) => d.id, (d) => d.name)}
          {!checking && (isRestricted || hasExisting) && (
            <div style={{
              marginTop: 12, background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.18)', borderRadius: 12, padding: '12px 14px',
            }}>
              <p style={{ fontSize: 13, color: C.danger, fontWeight: 600, margin: 0 }}>
                {isRestricted ? 'This duo cannot create new plans right now.' : 'This duo already has an open plan.'}
              </p>
            </div>
          )}
        </div>
      )}

      <span style={LABEL_STYLE}>What's the plan</span>
      <div style={{ marginBottom: 24 }}>
        {chipRow(VIBES, vibe, setVibe, (v) => v, (v) => v)}
      </div>

      <span style={LABEL_STYLE}>When</span>
      <div style={{ marginBottom: 24 }}>
        <Calendar value={date} onChange={setDate} />
      </div>

      <span style={LABEL_STYLE}>What time</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {TIME_SLOTS.map((t) => {
          const active = timeSlot === t.value;
          return (
            <motion.button
              key={t.value}
              type="button"
              onClick={() => setTimeSlot(t.value)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                background:   active ? 'rgba(255,107,0,0.12)' : C.cardElevated,
                border:       `1px solid ${active ? 'rgba(255,107,0,0.45)' : '#eee'}`,
                borderRadius: 16,
                padding:      '14px 12px',
                textAlign:    'left',
                cursor:       'pointer',
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 700, fontFamily: BODY_FONT, color: active ? ACCENT : C.text, margin: '0 0 3px' }}>
                {t.label}
              </p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0, fontFamily: BODY_FONT }}>{t.sub}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const Step2 = (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: HEAD_FONT, color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        Where should you meet?
      </h1>
      <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px', lineHeight: 1.5, fontFamily: BODY_FONT }}>
        We found spots nearby — pick one, or leave it open.
      </p>
      <LocationPicker activity={vibe} value={location} onChange={setLocation} />
    </div>
  );

  const Step3 = (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: HEAD_FONT, color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        Final touch
      </h1>
      <p style={{ fontSize: 14, color: C.muted, margin: '0 0 20px', lineHeight: 1.5, fontFamily: BODY_FONT }}>
        Add a note, then post your plan.
      </p>

      <span style={LABEL_STYLE}>Message (optional)</span>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
        placeholder="Looking for a chill 2v2 this weekend!"
        maxLength={MAX_MESSAGE_LENGTH}
        rows={3}
        style={{
          width: '100%', background: C.cardElevated,
          border: '1px solid #eee', borderRadius: 16, padding: 14,
          color: C.text, fontSize: 14, fontFamily: BODY_FONT,
          resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 20,
        }}
      />

      {/* Live preview card */}
      <PlanPreview
        vibe={vibe}
        date={date}
        timeSlot={timeSlot}
        locationName={location?.name}
        duoName={duoMemberNames(selectedDuo)}
      />

      {error && (
        <p style={{
          fontSize: 13, color: C.danger, marginTop: 16, lineHeight: 1.5,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
          borderRadius: 12, padding: '10px 14px', fontFamily: BODY_FONT,
        }}>
          {error}
        </p>
      )}
    </div>
  );

  const steps = { 1: Step1, 2: Step2, 3: Step3 };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: BODY_FONT }}>
      <TopBar showBack onBack={step > 1 ? () => goToStep(step - 1) : goBack} onLogoClick={() => go('home')} />
      <ProgressDots />

      <div style={{ padding: '8px 16px 170px', overflowX: 'hidden' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slide}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed CTA — floats above the global BottomNav */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 64, zIndex: 90,
        padding: '12px 16px 16px',
        background: 'linear-gradient(to top, #fff 62%, rgba(255,255,255,0))',
      }}>
        <div style={{ maxWidth: 448, margin: '0 auto' }}>
          {step < 3 ? (
            <>
              <PremiumButton
                fullWidth
                onClick={handleNext}
                disabled={planBlocked || (step === 1 && !step1Valid)}
              >
                Next →
              </PremiumButton>
              {step === 1 && !step1Valid && (
                <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8, fontFamily: BODY_FONT }}>
                  Pick a vibe, date, and time to continue.
                </p>
              )}
            </>
          ) : (
            <PremiumButton fullWidth onClick={handleCreate} disabled={!canSubmit}>
              {loading ? 'Posting…' : 'Post plan →'}
            </PremiumButton>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Live event-card preview (Step 3) ─────────────────────────────────────────
function PlanPreview({ vibe, date, timeSlot, locationName, duoName }) {
  const timeRange = TIME_SLOTS.find((t) => t.value === timeSlot)?.sub ?? null;
  const dateLabel = formatPlanDateLabel(date);
  return (
    <div style={{
      borderTop:    `3px solid ${ACCENT}`,
      border:       '1px solid #eee',
      borderTopColor: ACCENT,
      borderRadius: 16,
      padding:      20,
      background:   '#fff',
      boxShadow:    '0 4px 16px rgba(17,17,17,0.05)',
    }}>
      <span style={{
        display: 'inline-block',
        background: ACCENT, color: '#fff',
        borderRadius: 100, padding: '5px 12px',
        fontSize: 12, fontWeight: 700, fontFamily: BODY_FONT,
        marginBottom: 14,
      }}>
        {vibe ?? 'Hangout'}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {dateLabel && <Row label="When" value={`${dateLabel}${timeRange ? ` · ${timeRange}` : ''}`} />}
        {!dateLabel && timeRange && <Row label="When" value={timeRange} />}
        <Row label="Where" value={locationName || 'Open to anywhere'} />
        <Row label="Who" value={duoName} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: BODY_FONT }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.text, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}
