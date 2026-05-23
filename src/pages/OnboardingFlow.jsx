import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Loader, MapPin, Navigation } from 'lucide-react';
import { C } from '../tokens';
import { createDuo } from '../lib/duos.js';
import { updateProfile, checkUsername } from '../lib/profile.js';
import { logError } from '../lib/logger.js';

const MAX_NAME_LENGTH = 80;
const MAX_CITY_LENGTH = 80;
const MAX_INSTAGRAM_LENGTH = 30;
const MAX_DUO_NAME_LENGTH = 100;
const MAX_SHORT_TEXT_LENGTH = 100;
const MAX_BIO_LENGTH = 120;

const schools = [
  'UCI','CSUF','Chapman','Fullerton College','Cypress College',
  'Orange Coast College','Other',
];

const intentOptions  = ['Hangout','Social','Dating','Friends'];
const vibeOptions    = ['ABG','Gym','Nights out','Beach','Boba','Coffee','Cars','Business','Content','Sports','Study','Music'];
const lookingForOpts = ['Chill 2v2','Make friends','Dating','Events'];

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const initialForm = {
  firstName: '', age: '', ageConfirm: false, school: '', gender: '',
  username: '', city: '', lat: null, lng: null,
  intent: [], vibes: [],
  partnerName: '', partnerContact: '', addDuoLater: false,
  duoName: '', lookingFor: [], ocSpots: '', bio: '', instagram: '',
};

const stepCopy = {
  1: ['You',               'Start with the basics. 18–25 only.'],
  2: ['Username & location', 'Claim your handle and set where you\'re based.'],
  3: ['Your vibe',         'Pick what kind of hangouts feel like you.'],
  4: ['Create your duo',   'Bring a friend now, or add them later.'],
  5: ['Duo profile',       'This is what other duos see before they plan a 2v2.'],
};

function cleanInstagram(v) { return v.trim().replace(/^@/, '').toLowerCase(); }

function Label({ children }) {
  return (
    <label
      style={{
        fontSize: 10, fontWeight: 700, color: C.muted,
        letterSpacing: '1px', marginBottom: 8, textTransform: 'uppercase', display: 'block',
      }}
    >
      {children}
    </label>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return (
    <div style={{ fontSize: 12, color: C.danger, marginTop: -8, marginBottom: 12, lineHeight: 1.4 }}>
      {children}
    </div>
  );
}

function TextField({ label, error, style, onFocus, onBlur, suffix, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ position: 'relative' }}>
        <input
          {...props}
          aria-label={props['aria-label'] ?? label}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={{
            background:   C.cardElevated,
            border:       `0.5px solid ${error ? C.danger : focused ? C.amber : 'rgba(255,255,255,0.09)'}`,
            borderRadius: 14,
            padding:      suffix ? '14px 44px 14px 16px' : '14px 16px',
            fontSize:     15,
            color:        C.white,
            width:        '100%',
            outline:      'none',
            marginBottom: error ? 10 : 16,
            boxSizing:    'border-box',
            boxShadow:    focused ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
            transition:   'border-color 0.15s, box-shadow 0.15s',
            ...style,
          }}
        />
        {suffix && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-56%)' }}>
            {suffix}
          </div>
        )}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function SelectField({ label, value, onChange, options, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: C.cardElevated,
          border: `0.5px solid ${error ? C.danger : focused ? C.amber : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 14, padding: '14px 16px', fontSize: 15,
          color: value ? C.white : C.muted, width: '100%', outline: 'none',
          marginBottom: 16, boxSizing: 'border-box', appearance: 'none', WebkitAppearance: 'none',
          transition: 'border-color 0.15s',
        }}
      >
        <option value="">Select one</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function TextAreaField({ label, error, value, onChange, maxLength }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        aria-label={label} value={value} onChange={onChange} maxLength={maxLength}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} rows={4}
        style={{
          background: C.cardElevated,
          border: `0.5px solid ${error ? C.danger : focused ? C.amber : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 14, padding: '14px 16px', fontSize: 15, color: C.white,
          width: '100%', outline: 'none', marginBottom: 6, resize: 'none',
          boxSizing: 'border-box', boxShadow: focused ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      />
      <div style={{ color: C.muted, fontSize: 12, textAlign: 'right', marginBottom: 12 }}>
        {value.length}/{maxLength}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function VibeOption({ selected, children, onClick }) {
  return (
    <motion.button
      type="button" onClick={onClick} aria-pressed={selected}
      whileTap={{ scale: 0.92 }} transition={{ duration: 0.1 }}
      animate={{
        background:  selected ? 'rgba(245,158,11,0.14)' : C.cardElevated,
        borderColor: selected ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.08)',
        color:       selected ? C.amber : C.muted,
      }}
      style={{ border: '0.5px solid', borderRadius: 9999, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
    >
      {children}
    </motion.button>
  );
}

function PillGroup({ options, selected, onToggle, error }) {
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {options.map((o) => (
          <VibeOption key={o} selected={selected.includes(o)} onClick={() => onToggle(o)}>
            {o}
          </VibeOption>
        ))}
      </div>
      <FieldError>{error}</FieldError>
    </>
  );
}

// Username status badge
function UsernameBadge({ status }) {
  if (status === 'checking') return <Loader size={15} color={C.muted} style={{ animation: 'spin 0.8s linear infinite' }} />;
  if (status === 'available') return <Check size={15} color={C.success} strokeWidth={2.5} />;
  if (status === 'taken') return <span style={{ fontSize: 13, color: C.danger, fontWeight: 700 }}>✕</span>;
  return null;
}

function UsernameStatusText({ status }) {
  if (status === 'available') return <p style={{ fontSize: 12, color: C.success, margin: '-8px 0 14px' }}>Available ✓</p>;
  if (status === 'taken') return <p style={{ fontSize: 12, color: C.danger, margin: '-8px 0 14px' }}>Already taken</p>;
  return null;
}

export default function OnboardingFlow({ go, currentUser, onComplete }) {
  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState(initialForm);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState(''); // '' | 'checking' | 'available' | 'taken'
  const debRef = useRef(null);

  // Location state
  const [locMode, setLocMode] = useState('idle'); // 'idle' | 'requesting' | 'success' | 'denied' | 'manual'

  const [title, subtitle] = stepCopy[step];

  const update = (field, value) => {
    setForm((c) => ({ ...c, [field]: value }));
    setErrors((c) => ({ ...c, [field]: undefined }));
  };

  const toggleArray = (field, value, max) => {
    setForm((c) => {
      const exists = c[field].includes(value);
      const next   = exists
        ? c[field].filter((i) => i !== value)
        : max && c[field].length >= max ? c[field] : [...c[field], value];
      return { ...c, [field]: next };
    });
    setErrors((c) => ({ ...c, [field]: undefined }));
  };

  const handleUsernameChange = (raw) => {
    const v = raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    update('username', v);
    setUsernameStatus('');
    clearTimeout(debRef.current);
    if (!USERNAME_RE.test(v)) return;
    setUsernameStatus('checking');
    debRef.current = setTimeout(async () => {
      const available = await checkUsername(v, currentUser?.id);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);
  };

  const handleUseLocation = () => {
    setLocMode('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        update('lat', lat);
        update('lng', lng);
        setLocMode('success');
      },
      () => setLocMode('denied'),
    );
  };

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      const n = Number(form.age);
      if (!form.firstName.trim())   errs.firstName  = 'First name is required.';
      if (!form.gender)             errs.gender     = 'Select one.';
      if (!form.age)                errs.age        = 'Age is required.';
      else if (!Number.isFinite(n)) errs.age        = 'Enter a valid age.';
      else if (n < 18 || n > 25)    errs.age        = 'You must be 18–25 to join.';
      if (!form.ageConfirm)         errs.ageConfirm = 'Confirm that you are 18 or older.';
      if (!form.school)             errs.school     = 'School is required.';
    }
    if (s === 2) {
      if (!form.username.trim()) {
        errs.username = 'Username is required.';
      } else if (!USERNAME_RE.test(form.username)) {
        errs.username = 'Letters, numbers, underscores only (3-20 chars).';
      } else if (usernameStatus === 'taken') {
        errs.username = 'This username is already taken.';
      } else if (usernameStatus === 'checking') {
        errs.username = 'Still checking availability…';
      } else if (usernameStatus !== 'available') {
        errs.username = 'Checking username availability…';
      }
      if (form.city.length > MAX_CITY_LENGTH) errs.city = 'City must be 80 characters or less.';
    }
    if (s === 3) {
      if (form.intent.length < 1) errs.intent = 'Pick at least one intent.';
      if (form.vibes.length  < 1) errs.vibes  = 'Pick at least one vibe.';
      if (form.vibes.length  > 5) errs.vibes  = 'Choose up to 5 vibes.';
    }
    if (s === 5) {
      if (!form.duoName.trim())           errs.duoName    = 'Duo name is required.';
      if (form.duoName.length > MAX_DUO_NAME_LENGTH) errs.duoName = 'Duo name must be 100 characters or less.';
      if (form.lookingFor.length < 1)     errs.lookingFor = 'Pick at least one option.';
      if (!form.ocSpots.trim())           errs.ocSpots    = 'Favorite OC spots are required.';
      if (form.ocSpots.length > MAX_SHORT_TEXT_LENGTH) errs.ocSpots = 'Favorite OC spots must be 100 characters or less.';
      if (form.bio.length > MAX_BIO_LENGTH)          errs.bio        = 'Bio must be 120 characters or less.';
      if (!form.instagram.trim())         errs.instagram  = 'Instagram is required.';
      else if (form.instagram.length > MAX_INSTAGRAM_LENGTH) errs.instagram = 'Instagram must be 30 characters or less.';
      else if (/\s/.test(form.instagram)) errs.instagram  = 'Instagram handle cannot contain spaces.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const TOTAL = 5;
  const back = () => { if (step > 1) setStep((s) => s - 1); else go('landing'); };

  const next = async () => {
    if (!validateStep(step)) return;
    if (step === TOTAL) {
      if (currentUser) {
        try {
          setLoading(true);
          await Promise.all([
            createDuo(currentUser.id, {
              name:       form.duoName,
              city:       form.city,
              vibes:      form.vibes,
              spots:      form.ocSpots.split(',').map((s) => s.trim()).filter(Boolean),
              lookingFor: form.lookingFor.join(', '),
              instagram:  form.instagram,
            }),
            updateProfile(currentUser.id, {
              name:       form.firstName,
              gender:     form.gender,
              birth_year: new Date().getFullYear() - parseInt(form.age),
              username:   form.username.toLowerCase(),
              city:       form.city || null,
              lat:        form.lat  ?? null,
              lng:        form.lng  ?? null,
            }),
          ]);
          try {
            await updateProfile(currentUser.id, { onboarding_complete: true });
          } catch (err) {
            logError('onboarding_complete update failed', err);
          }
          if (onComplete) {
            onComplete({
              name:       form.firstName,
              birth_year: new Date().getFullYear() - parseInt(form.age),
            });
          } else {
            go('home');
          }
          return;
        } catch (err) {
          logError('finish error:', err);
          return;
        } finally {
          setLoading(false);
        }
      }
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white, paddingBottom: 32 }}>
      {/* Header */}
      <header
        className="glass"
        style={{
          height: 56, borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', padding: '0 16px',
          position: 'sticky', top: 0, zIndex: 100, boxSizing: 'border-box', gap: 8,
        }}
      >
        <motion.button
          type="button" onClick={back} aria-label="Back"
          whileTap={{ scale: 0.88 }} transition={{ duration: 0.1 }}
          style={{
            width: 36, height: 36, border: '0.5px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.06)', borderRadius: 10, color: C.white,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
        </motion.button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>
          Create profile
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: C.muted, fontSize: 12 }}>{step}/{TOTAL}</span>
          <motion.button
            type="button" onClick={() => go('home')} whileTap={{ scale: 0.95 }} transition={{ duration: 0.1 }}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }}
          >
            Skip →
          </motion.button>
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          animate={{ width: `${(step / TOTAL) * 100}%` }}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          style={{ height: '100%', background: C.gradientCTA, borderRadius: '0 2px 2px 0' }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.main
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ padding: '24px 16px 120px' }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 8px' }}>
            {title}
          </h1>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>
            {subtitle}
          </p>

          {/* ── Step 1: Basics ── */}
          {step === 1 && (
            <>
              <TextField
                label="First name"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value.slice(0, MAX_NAME_LENGTH))}
                maxLength={MAX_NAME_LENGTH}
                error={errors.firstName}
              />
              <div style={{ marginBottom: 16 }}>
                <Label>I am</Label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Male', 'Female', 'Other'].map((g) => (
                    <VibeOption key={g} selected={form.gender === g} onClick={() => update('gender', g)}>
                      {g}
                    </VibeOption>
                  ))}
                </div>
                <FieldError>{errors.gender}</FieldError>
              </div>
              <TextField
                label="Age" type="number"
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
                error={errors.age}
              />
              <motion.button
                type="button"
                aria-pressed={form.ageConfirm}
                aria-label="Confirm I am 18 or older"
                onClick={() => update('ageConfirm', !form.ageConfirm)}
                whileTap={{ scale: 0.98 }} transition={{ duration: 0.1 }}
                style={{
                  background: C.cardElevated,
                  border: `0.5px solid ${errors.ageConfirm ? C.danger : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 14, padding: 14, display: 'flex', gap: 10,
                  alignItems: 'center', width: '100%', color: C.white, fontSize: 14,
                  marginBottom: 16, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: 18, height: 18, borderRadius: 5,
                    border: `1.5px solid ${form.ageConfirm ? C.amber : 'rgba(255,255,255,0.2)'}`,
                    background: form.ageConfirm ? C.amber : 'transparent', flexShrink: 0,
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {form.ageConfirm && <span style={{ fontSize: 11, color: '#fff', fontWeight: 800 }}>✓</span>}
                </span>
                I confirm I am 18 or older.
              </motion.button>
              <FieldError>{errors.ageConfirm}</FieldError>
              <SelectField
                label="School"
                value={form.school}
                onChange={(e) => update('school', e.target.value)}
                options={schools}
                error={errors.school}
              />
            </>
          )}

          {/* ── Step 2: Username + Location ── */}
          {step === 2 && (
            <>
              {/* Username */}
              <div style={{ marginBottom: 4 }}>
                <Label>Username</Label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute', left: 16, top: '50%', transform: 'translateY(-56%)',
                      color: C.muted, fontSize: 15, userSelect: 'none',
                    }}
                  >
                    @
                  </span>
                  <input
                    value={form.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="yourhandle"
                    aria-label="Username"
                    style={{
                      background: C.cardElevated,
                      border: `0.5px solid ${
                        errors.username   ? C.danger :
                        usernameStatus === 'available' ? C.success :
                        usernameStatus === 'taken'     ? C.danger :
                        'rgba(255,255,255,0.09)'
                      }`,
                      borderRadius: 14, padding: '14px 44px 14px 32px', fontSize: 15,
                      color: C.white, width: '100%', outline: 'none',
                      marginBottom: errors.username ? 10 : 8,
                      boxSizing: 'border-box', transition: 'border-color 0.15s',
                    }}
                  />
                  <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-56%)' }}>
                    <UsernameBadge status={usernameStatus} />
                  </div>
                </div>
                {errors.username ? (
                  <FieldError>{errors.username}</FieldError>
                ) : (
                  <UsernameStatusText status={usernameStatus} />
                )}
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 24px', lineHeight: 1.5 }}>
                  Letters, numbers, underscores. 3–20 characters.
                </p>
              </div>

              {/* Location */}
              <Label>Location</Label>

              {locMode === 'idle' && (
                <motion.button
                  type="button"
                  onClick={handleUseLocation}
                  whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 14,
                    background: 'rgba(245,158,11,0.08)',
                    border: '0.5px solid rgba(245,158,11,0.25)',
                    color: C.amber, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <Navigation size={16} strokeWidth={2} />
                  Use my location
                </motion.button>
              )}

              {locMode === 'requesting' && (
                <div
                  style={{
                    padding: '14px 16px', borderRadius: 14, background: C.cardElevated,
                    border: '0.5px solid rgba(255,255,255,0.08)', display: 'flex',
                    alignItems: 'center', gap: 10, marginBottom: 12, color: C.muted, fontSize: 14,
                  }}
                >
                  <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                  Requesting location…
                </div>
              )}

              {locMode === 'success' && (
                <div
                  style={{
                    padding: '12px 14px', borderRadius: 14,
                    background: 'rgba(16,185,129,0.08)',
                    border: '0.5px solid rgba(16,185,129,0.25)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 12, color: C.success, fontSize: 13,
                  }}
                >
                  <Check size={14} strokeWidth={2.5} />
                  Location saved. Add your city manually so people know your area.
                </div>
              )}

              {locMode === 'denied' && (
                <div
                  style={{
                    padding: '12px 14px', borderRadius: 14,
                    background: 'rgba(239,68,68,0.07)',
                    border: '0.5px solid rgba(239,68,68,0.2)',
                    marginBottom: 12, color: C.danger, fontSize: 13, lineHeight: 1.5,
                  }}
                >
                  Location access denied. Enter your city below.
                </div>
              )}

              {/* Manual city input (always shown after success/denied, or as fallback) */}
              {(locMode === 'success' || locMode === 'denied' || locMode === 'manual') && (
                <div style={{ marginTop: locMode === 'success' ? 0 : 0 }}>
                  <Label>City</Label>
                  <input
                    value={form.city}
                    onChange={(e) => update('city', e.target.value.slice(0, MAX_CITY_LENGTH))}
                    placeholder="e.g. Irvine, Newport Beach…"
                    aria-label="City"
                    maxLength={MAX_CITY_LENGTH}
                    style={{
                      background: C.cardElevated,
                      border: '0.5px solid rgba(255,255,255,0.09)',
                      borderRadius: 14, padding: '14px 16px', fontSize: 15,
                      color: C.white, width: '100%', outline: 'none',
                      marginBottom: 16, boxSizing: 'border-box',
                    }}
                  />
                  <FieldError>{errors.city}</FieldError>
                </div>
              )}

              {locMode === 'idle' && (
                <button
                  type="button"
                  onClick={() => setLocMode('manual')}
                  style={{
                    background: 'none', border: 'none', color: C.muted,
                    fontSize: 13, cursor: 'pointer', padding: '4px 0', display: 'block',
                  }}
                >
                  Enter city manually →
                </button>
              )}

              <button
                type="button"
                onClick={() => { update('city', ''); update('lat', null); update('lng', null); setLocMode('idle'); }}
                style={{
                  background: 'none', border: 'none', color: C.muted,
                  fontSize: 12, cursor: 'pointer', padding: '8px 0', display: 'block', marginTop: 4,
                }}
              >
                Skip location for now
              </button>
            </>
          )}

          {/* ── Step 3: Vibes ── */}
          {step === 3 && (
            <>
              <Label>Intent</Label>
              <PillGroup options={intentOptions} selected={form.intent} onToggle={(v) => toggleArray('intent', v)} error={errors.intent} />
              <Label>Vibes</Label>
              <div style={{ color: C.muted, fontSize: 12, margin: '-2px 0 12px' }}>Choose up to 5.</div>
              <PillGroup options={vibeOptions} selected={form.vibes} onToggle={(v) => toggleArray('vibes', v, 5)} error={errors.vibes} />
            </>
          )}

          {/* ── Step 4: Duo partner ── */}
          {step === 4 && (
            <>
              <TextField label="Partner name" value={form.partnerName} onChange={(e) => update('partnerName', e.target.value.slice(0, MAX_NAME_LENGTH))} maxLength={MAX_NAME_LENGTH} />
              <TextField label="Partner contact" placeholder="Phone or Instagram" value={form.partnerContact} onChange={(e) => update('partnerContact', e.target.value.slice(0, MAX_SHORT_TEXT_LENGTH))} maxLength={MAX_SHORT_TEXT_LENGTH} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>or</div>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              </div>
              <VibeOption selected={form.addDuoLater} onClick={() => update('addDuoLater', !form.addDuoLater)}>
                Add duo later
              </VibeOption>
            </>
          )}

          {/* ── Step 5: Duo profile ── */}
          {step === 5 && (
            <>
              <TextField
                label="Duo name"
                placeholder={form.firstName ? `${form.firstName} & friend` : ''}
                value={form.duoName}
                onChange={(e) => update('duoName', e.target.value.slice(0, MAX_DUO_NAME_LENGTH))}
                maxLength={MAX_DUO_NAME_LENGTH}
                error={errors.duoName}
              />
              <Label>Looking for</Label>
              <PillGroup options={lookingForOpts} selected={form.lookingFor} onToggle={(v) => toggleArray('lookingFor', v)} error={errors.lookingFor} />
              <TextField label="OC spots" placeholder="Irvine Spectrum, Boba, Newport" value={form.ocSpots} onChange={(e) => update('ocSpots', e.target.value.slice(0, MAX_SHORT_TEXT_LENGTH))} maxLength={MAX_SHORT_TEXT_LENGTH} error={errors.ocSpots} />
              <TextAreaField label="Bio" value={form.bio} onChange={(e) => update('bio', e.target.value.slice(0, MAX_BIO_LENGTH))} maxLength={MAX_BIO_LENGTH} error={errors.bio} />
              <TextField
                label="Instagram"
                placeholder="@yourhandle"
                value={form.instagram ? `@${form.instagram}` : ''}
                onChange={(e) => update('instagram', cleanInstagram(e.target.value).slice(0, MAX_INSTAGRAM_LENGTH))}
                maxLength={MAX_INSTAGRAM_LENGTH + 1}
                error={errors.instagram}
              />
              <p style={{ color: C.muted, fontSize: 12, marginTop: -10, lineHeight: 1.5 }}>
                Instagram unlocks only after a match.
              </p>
            </>
          )}
        </motion.main>
      </AnimatePresence>

      {/* Footer */}
      <footer
        className="glass"
        style={{ position: 'sticky', bottom: 0, padding: '12px 16px 20px', borderTop: '0.5px solid rgba(255,255,255,0.07)', boxSizing: 'border-box' }}
      >
        <motion.button
          type="button" onClick={next} whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
          style={{
            width: '100%', height: 54, borderRadius: 16, border: 'none',
            background: C.gradientCTA, color: '#fff', fontSize: 16, fontWeight: 800,
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(245,158,11,0.25)',
          }}
        >
          {loading ? 'Creating duo…' : step < TOTAL ? 'Next' : 'Finish profile'}
        </motion.button>
        {step > 1 && (
          <motion.button
            type="button" onClick={back} whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
            style={{ width: '100%', height: 44, border: 'none', background: 'transparent', color: C.muted, fontSize: 14, fontWeight: 600, marginTop: 8, cursor: 'pointer' }}
          >
            Back
          </motion.button>
        )}
      </footer>
    </div>
  );
}
