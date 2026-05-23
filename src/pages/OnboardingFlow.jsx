import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check } from 'lucide-react';
import { C } from '../tokens';
import { createDuo } from '../lib/duos.js';
import { updateProfile } from '../lib/profile.js';
import { logError } from '../lib/logger.js';

const VIBES = ['Coffee', 'Boba', 'Gym', 'Beach', 'Bowling', 'Food', 'Nightlife', 'Shopping', 'Drives', 'Games'];

const initialForm = {
  name:      '',
  age:       '',
  city:      '',
  instagram: '',
  duoName:   '',
  vibes:     [],
};

// Steps: 1 = About you, 2 = Friend?, 3 = Duo profile, 4 = Done
// Step 2 has no footer CTA — the choice buttons navigate directly.
// Step 4 has no footer CTA — the "Find Duos" button is inside the body.

function FieldLabel({ children }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 8px' }}>
      {children}
    </p>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p style={{ fontSize: 12, color: C.danger, margin: '-4px 0 14px', lineHeight: 1.4 }}>
      {children}
    </p>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', prefix, error, focused, onFocus, onBlur }) {
  return (
    <div style={{ position: 'relative', marginBottom: error ? 6 : 16 }}>
      {prefix && (
        <span
          style={{
            position:  'absolute',
            left:      16,
            top:       '50%',
            transform: 'translateY(-50%)',
            color:     C.muted,
            fontSize:  15,
            userSelect:'none',
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        style={{
          width:        '100%',
          background:   C.cardElevated,
          border:       `0.5px solid ${error ? C.danger : focused ? C.amber : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 14,
          padding:      prefix ? '14px 16px 14px 30px' : '14px 16px',
          fontSize:     15,
          color:        C.white,
          outline:      'none',
          boxSizing:    'border-box',
          boxShadow:    focused ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
          transition:   'border-color 0.15s, box-shadow 0.15s',
        }}
      />
    </div>
  );
}

function VibePill({ selected, onClick, children }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.1 }}
      animate={{
        background:  selected ? 'rgba(245,158,11,0.14)' : C.cardElevated,
        borderColor: selected ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)',
        color:       selected ? C.amber : C.muted,
      }}
      style={{
        border:     '0.5px solid',
        borderRadius: 9999,
        padding:    '9px 16px',
        fontSize:   13,
        fontWeight: 600,
        cursor:     'pointer',
        userSelect: 'none',
      }}
    >
      {children}
    </motion.button>
  );
}

function useField(initial = '') {
  const [value,   setValue]   = useState(initial);
  const [focused, setFocused] = useState(false);
  return {
    value,
    set:     setValue,
    focused,
    onFocus: () => setFocused(true),
    onBlur:  () => setFocused(false),
  };
}

export default function OnboardingFlow({ go, currentUser, onComplete }) {
  const [step,    setStep]    = useState(1);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const name      = useField('');
  const age       = useField('');
  const city      = useField('');
  const instagram = useField('');
  const duoName   = useField('');
  const [vibes, setVibes] = useState([]);

  const toggleVibe = (v) => {
    setVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
    setErrors((e) => ({ ...e, vibes: undefined }));
  };

  const clearErr = (field) => setErrors((e) => ({ ...e, [field]: undefined }));

  // Validate step 1 fields
  const validateStep1 = () => {
    const errs = {};
    if (!name.value.trim())      errs.name = 'Your first name is required.';
    if (!age.value)              errs.age  = 'Your age is required.';
    else {
      const n = Number(age.value);
      if (!Number.isFinite(n) || n < 18 || n > 25) errs.age = 'You must be between 18 and 25 to join.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validate step 3 fields
  const validateStep3 = () => {
    const errs = {};
    if (!duoName.value.trim()) errs.duoName = 'Give your duo a name.';
    if (vibes.length < 1)      errs.vibes   = 'Pick at least one vibe.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildProfileUpdate = () => ({
    name:       name.value.trim(),
    birth_year: new Date().getFullYear() - parseInt(age.value),
    city:       city.value.trim() || null,
    instagram:  instagram.value.trim().replace(/^@/, '') || null,
    onboarding_complete: true,
  });

  // Step 1 → Step 2
  const handleNextFromStep1 = () => {
    if (validateStep1()) setStep(2);
  };

  // Step 2 solo path: save profile → Done
  const handleSolo = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      await updateProfile(currentUser.id, buildProfileUpdate());
      if (onComplete) {
        onComplete({ name: name.value.trim(), birth_year: new Date().getFullYear() - parseInt(age.value) });
      } else {
        go('home');
      }
    } catch (err) {
      logError('solo save error', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → Step 3 (duo path)
  const handleInviteFriend = () => setStep(3);

  // Step 3 → Done
  const handleCreateDuo = async () => {
    if (!validateStep3() || !currentUser) return;
    try {
      setLoading(true);
      await Promise.all([
        updateProfile(currentUser.id, buildProfileUpdate()),
        createDuo(currentUser.id, {
          name:       duoName.value.trim(),
          city:       city.value.trim() || '',
          vibes,
          spots:      [],
          lookingFor: '',
          instagram:  instagram.value.trim().replace(/^@/, '') || '',
        }),
      ]);
      setStep(4);
    } catch (err) {
      logError('create duo error', err);
    } finally {
      setLoading(false);
    }
  };

  // Done → Home
  const handleFindDuos = () => {
    if (onComplete) {
      onComplete({ name: name.value.trim(), birth_year: new Date().getFullYear() - parseInt(age.value) });
    } else {
      go('home');
    }
  };

  const back = () => {
    if (step === 1) { go('landing'); return; }
    if (step === 2) { setStep(1); return; }
    if (step === 3) { setStep(2); return; }
  };

  // Progress: steps 1-3 = 33/66/100%, step 4 = 100%
  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  const stepLabel = step === 1
    ? 'Step 1 of 3 — About you'
    : step === 2
    ? 'Step 2 of 3 — Got a friend?'
    : step === 3
    ? 'Step 3 of 3 — Duo profile'
    : null;

  const showBackBtn = step <= 3;
  const showFooterCTA = step === 1 || step === 3;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white, paddingBottom: 32 }}>

      {/* Header */}
      {step < 4 && (
        <header
          className="glass"
          style={{
            height:      56,
            borderBottom:'0.5px solid rgba(255,255,255,0.07)',
            display:     'flex',
            alignItems:  'center',
            padding:     '0 16px',
            position:    'sticky',
            top:         0,
            zIndex:      100,
            boxSizing:   'border-box',
            gap:         8,
          }}
        >
          {showBackBtn ? (
            <motion.button
              type="button"
              onClick={back}
              aria-label="Back"
              whileTap={{ scale: 0.88 }}
              transition={{ duration: 0.1 }}
              style={{
                width:          36,
                height:         36,
                border:         '0.5px solid rgba(255,255,255,0.08)',
                background:     'rgba(255,255,255,0.06)',
                borderRadius:   10,
                color:          C.white,
                cursor:         'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={20} strokeWidth={2.2} />
            </motion.button>
          ) : (
            <div style={{ width: 36 }} />
          )}

          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span className="gradient-text">duo oc.</span>
            </span>
          </div>

          <div style={{ width: 36 }} />
        </header>
      )}

      {/* Progress bar (steps 1-3 only) */}
      {step < 4 && (
        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            style={{ height: '100%', background: C.gradientCTA, borderRadius: '0 2px 2px 0' }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.main
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ padding: '28px 20px 140px' }}
        >

          {/* ── Step 1: About you ── */}
          {step === 1 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, margin: '0 0 10px' }}>
                {stepLabel}
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
                About you
              </h1>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: '0 0 28px' }}>
                Tell us a little about yourself.
              </p>

              <FieldLabel>First name</FieldLabel>
              <TextInput
                value={name.value}
                onChange={(e) => { name.set(e.target.value); clearErr('name'); }}
                onFocus={name.onFocus}
                onBlur={name.onBlur}
                focused={name.focused}
                placeholder="Your first name"
                error={errors.name}
              />
              <FieldError>{errors.name}</FieldError>

              <FieldLabel>Age</FieldLabel>
              <TextInput
                type="number"
                value={age.value}
                onChange={(e) => { age.set(e.target.value); clearErr('age'); }}
                onFocus={age.onFocus}
                onBlur={age.onBlur}
                focused={age.focused}
                placeholder="18 – 25"
                error={errors.age}
              />
              <FieldError>{errors.age}</FieldError>

              <FieldLabel>City <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span></FieldLabel>
              <TextInput
                value={city.value}
                onChange={(e) => city.set(e.target.value)}
                onFocus={city.onFocus}
                onBlur={city.onBlur}
                focused={city.focused}
                placeholder="e.g. Irvine, Newport Beach"
              />

              <FieldLabel>Instagram <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span></FieldLabel>
              <TextInput
                value={instagram.value}
                onChange={(e) => instagram.set(e.target.value)}
                onFocus={instagram.onFocus}
                onBlur={instagram.onBlur}
                focused={instagram.focused}
                placeholder="yourhandle"
                prefix="@"
              />
              <p style={{ fontSize: 12, color: C.muted, margin: '-8px 0 0', lineHeight: 1.4 }}>
                Only shared with a duo after you both match.
              </p>
            </>
          )}

          {/* ── Step 2: Got a friend? ── */}
          {step === 2 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, margin: '0 0 10px' }}>
                {stepLabel}
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
                Got a friend?
              </h1>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>
                duo oc. is built around pairs. You and a friend make a team, then you meet another team for a 2v2 hangout.
              </p>

              {/* Explainer box */}
              <div
                style={{
                  background:   'rgba(245,158,11,0.06)',
                  border:       '0.5px solid rgba(245,158,11,0.18)',
                  borderRadius: 16,
                  padding:      '16px 18px',
                  marginBottom: 32,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 6px' }}>
                  How it works
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.65 }}>
                  Create a duo with a friend. Other duos find you and propose a hangout. You both confirm and plans are made — no awkward one-on-ones.
                </p>
              </div>

              {/* Choice buttons */}
              <motion.button
                type="button"
                onClick={handleInviteFriend}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                style={{
                  width:        '100%',
                  height:       58,
                  borderRadius: 16,
                  border:       'none',
                  background:   C.gradientCTA,
                  color:        '#fff',
                  fontSize:     16,
                  fontWeight:   800,
                  cursor:       'pointer',
                  marginBottom: 12,
                  letterSpacing:'-0.2px',
                  boxShadow:    '0 4px 20px rgba(245,158,11,0.28)',
                }}
              >
                I have a friend in mind
              </motion.button>

              <motion.button
                type="button"
                onClick={handleSolo}
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                style={{
                  width:        '100%',
                  height:       52,
                  borderRadius: 16,
                  border:       '0.5px solid rgba(255,255,255,0.1)',
                  background:   'rgba(255,255,255,0.04)',
                  color:        loading ? C.muted : C.white,
                  fontSize:     15,
                  fontWeight:   600,
                  cursor:       loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Saving…' : 'Start on my own for now'}
              </motion.button>

              <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
                You can add a friend later from your profile.
              </p>
            </>
          )}

          {/* ── Step 3: Duo profile ── */}
          {step === 3 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, margin: '0 0 10px' }}>
                {stepLabel}
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
                Create your duo
              </h1>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: '0 0 28px' }}>
                This is what other duos see when browsing. Keep it simple.
              </p>

              <FieldLabel>Duo name</FieldLabel>
              <TextInput
                value={duoName.value}
                onChange={(e) => { duoName.set(e.target.value); clearErr('duoName'); }}
                onFocus={duoName.onFocus}
                onBlur={duoName.onBlur}
                focused={duoName.focused}
                placeholder={name.value ? `${name.value.trim()} & friend` : 'e.g. Jae & Miles'}
                error={errors.duoName}
              />
              <FieldError>{errors.duoName}</FieldError>

              <FieldLabel>Vibes</FieldLabel>
              <p style={{ fontSize: 12, color: C.muted, margin: '-4px 0 14px', lineHeight: 1.4 }}>
                Pick everything that sounds like you.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {VIBES.map((v) => (
                  <VibePill key={v} selected={vibes.includes(v)} onClick={() => toggleVibe(v)}>
                    {v}
                  </VibePill>
                ))}
              </div>
              <FieldError>{errors.vibes}</FieldError>
            </>
          )}

          {/* ── Step 4: Done ── */}
          {step === 4 && (
            <div
              style={{
                minHeight:      'calc(100vh - 64px)',
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                textAlign:      'center',
                padding:        '0 8px',
              }}
            >
              {/* Check circle */}
              <div
                style={{
                  width:          72,
                  height:         72,
                  borderRadius:   '50%',
                  background:     C.gradientCTA,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  marginBottom:   28,
                  boxShadow:      '0 8px 32px rgba(245,158,11,0.32)',
                }}
              >
                <Check size={34} color="#fff" strokeWidth={2.5} />
              </div>

              <h1
                style={{
                  fontSize:      32,
                  fontWeight:    800,
                  letterSpacing: '-1px',
                  margin:        '0 0 12px',
                  color:         C.white,
                }}
              >
                You are all set.
              </h1>
              <p
                style={{
                  fontSize:    15,
                  color:       C.muted,
                  lineHeight:  1.6,
                  margin:      '0 0 48px',
                  maxWidth:    260,
                }}
              >
                Your profile is ready. Start finding duos around OC.
              </p>

              <motion.button
                type="button"
                onClick={handleFindDuos}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                style={{
                  width:         '100%',
                  maxWidth:      320,
                  height:        58,
                  borderRadius:  16,
                  border:        'none',
                  background:    C.gradientCTA,
                  color:         '#fff',
                  fontSize:      17,
                  fontWeight:    800,
                  cursor:        'pointer',
                  letterSpacing: '-0.2px',
                  boxShadow:     '0 4px 24px rgba(245,158,11,0.3)',
                }}
              >
                Find Duos
              </motion.button>
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      {/* Sticky footer CTA (steps 1 and 3 only) */}
      {showFooterCTA && (
        <footer
          className="glass"
          style={{
            position:    'fixed',
            bottom:      0,
            left:        0,
            right:       0,
            padding:     '12px 20px 28px',
            borderTop:   '0.5px solid rgba(255,255,255,0.07)',
            boxSizing:   'border-box',
          }}
        >
          <motion.button
            type="button"
            onClick={step === 1 ? handleNextFromStep1 : handleCreateDuo}
            disabled={loading}
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
              cursor:        loading ? 'not-allowed' : 'pointer',
              boxShadow:     '0 4px 20px rgba(245,158,11,0.25)',
              opacity:       loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating duo…' : step === 1 ? 'Next' : 'Create Duo'}
          </motion.button>
        </footer>
      )}
    </div>
  );
}
