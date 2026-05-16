import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { C } from '../tokens';

const cities = [
  'Irvine','Newport Beach','Costa Mesa','Fullerton','Anaheim','Orange',
  'Tustin','Huntington Beach','Garden Grove','Buena Park','Cypress',
  'Brea','Yorba Linda','Other OC',
];

const schools = [
  'UCI','CSUF','Chapman','Fullerton College','Cypress College',
  'Orange Coast College','Other',
];

const intentOptions  = ['Hangout','Social','Dating','Friends'];
const vibeOptions    = ['ABG','Gym','Nights out','Beach','Boba','Coffee','Cars','Business','Content','Sports','Study','Music'];
const lookingForOpts = ['Chill 2v2','Make friends','Dating','Events'];

const initialForm = {
  firstName:'', age:'', ageConfirm:false, city:'', school:'',
  intent:[], vibes:[], partnerName:'', partnerContact:'',
  addDuoLater:false, duoName:'', lookingFor:[], ocSpots:'', bio:'', instagram:'',
};

const stepCopy = {
  1: ['You', 'Start with the basics. 18–25 OC only.'],
  2: ['Your vibe', 'Pick what kind of hangouts feel like you.'],
  3: ['Create your duo', 'Bring a friend now, or add them later.'],
  4: ['Duo profile', "This is what other duos see before they plan a 2v2."],
};

function cleanInstagram(v) {
  return v.trim().replace(/^@/, '').toLowerCase();
}

function Label({ children }) {
  return (
    <label
      style={{
        fontSize:      10,
        fontWeight:    700,
        color:         C.muted,
        letterSpacing: '1px',
        marginBottom:  8,
        textTransform: 'uppercase',
        display:       'block',
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

function TextField({ label, error, style, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <input
        {...props}
        aria-label={props['aria-label'] ?? label}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{
          background:   C.cardElevated,
          border:       `0.5px solid ${error ? C.danger : focused ? C.amber : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 14,
          padding:      '14px 16px',
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
          background:       C.cardElevated,
          border:           `0.5px solid ${error ? C.danger : focused ? C.amber : 'rgba(255,255,255,0.09)'}`,
          borderRadius:     14,
          padding:          '14px 16px',
          fontSize:         15,
          color:            value ? C.white : C.muted,
          width:            '100%',
          outline:          'none',
          marginBottom:     16,
          boxSizing:        'border-box',
          appearance:       'none',
          WebkitAppearance: 'none',
          transition:       'border-color 0.15s',
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
        aria-label={label}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={4}
        style={{
          background:   C.cardElevated,
          border:       `0.5px solid ${error ? C.danger : focused ? C.amber : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 14,
          padding:      '14px 16px',
          fontSize:     15,
          color:        C.white,
          width:        '100%',
          outline:      'none',
          marginBottom: 6,
          resize:       'none',
          boxSizing:    'border-box',
          boxShadow:    focused ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
          transition:   'border-color 0.15s, box-shadow 0.15s',
        }}
      />
      <div style={{ color: C.muted, fontSize: 12, textAlign: 'right', marginBottom: 12 }}>
        {value.length}/120
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function VibeOption({ selected, children, onClick }) {
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
        color:       selected ? C.amber                  : C.muted,
      }}
      style={{
        border:       '0.5px solid',
        borderRadius: 9999,
        padding:      '9px 16px',
        fontSize:     13,
        fontWeight:   600,
        cursor:       'pointer',
        userSelect:   'none',
      }}
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

export default function OnboardingFlow({ go }) {
  const [step, setStep]     = useState(1);
  const [form, setForm]     = useState(initialForm);
  const [errors, setErrors] = useState({});

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

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      const n = Number(form.age);
      if (!form.firstName.trim())  errs.firstName  = 'First name is required.';
      if (!form.age)               errs.age        = 'Age is required.';
      else if (!Number.isFinite(n)) errs.age       = 'Enter a valid age.';
      else if (n < 18 || n > 25)   errs.age        = 'You must be 18–25 to join.';
      if (!form.ageConfirm)        errs.ageConfirm = 'Confirm that you are 18 or older.';
      if (!form.city)              errs.city       = 'City is required.';
      if (!form.school)            errs.school     = 'School is required.';
    }
    if (s === 2) {
      if (form.intent.length < 1) errs.intent = 'Pick at least one intent.';
      if (form.vibes.length  < 1) errs.vibes  = 'Pick at least one vibe.';
      if (form.vibes.length  > 5) errs.vibes  = 'Choose up to 5 vibes.';
    }
    if (s === 4) {
      if (!form.duoName.trim())           errs.duoName    = 'Duo name is required.';
      if (form.lookingFor.length < 1)     errs.lookingFor = 'Pick at least one option.';
      if (!form.ocSpots.trim())           errs.ocSpots    = 'Favorite OC spots are required.';
      if (form.bio.length > 120)          errs.bio        = 'Bio must be 120 characters or less.';
      if (!form.instagram.trim())         errs.instagram  = 'Instagram is required.';
      else if (/\s/.test(form.instagram)) errs.instagram  = 'Instagram handle cannot contain spaces.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const back = () => { if (step > 1) setStep((s) => s - 1); else go('landing'); };
  const next = () => {
    if (!validateStep(step)) return;
    if (step === 4) { go('home'); return; }
    setStep((s) => s + 1);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white, paddingBottom: 32 }}>
      {/* Header */}
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
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>
          Create profile
        </div>
        <div style={{ width: 36, color: C.muted, fontSize: 12, textAlign: 'right' }}>
          {step}/4
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          animate={{ width: `${(step / 4) * 100}%` }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: '100%', background: C.gradientCTA, borderRadius: '0 2px 2px 0' }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.main
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ padding: '24px 16px 120px' }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 8px' }}>
            {title}
          </h1>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>
            {subtitle}
          </p>

          {step === 1 && (
            <>
              <TextField
                label="First name"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                error={errors.firstName}
              />
              <TextField
                label="Age"
                type="number"
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
                error={errors.age}
              />
              <motion.button
                type="button"
                aria-pressed={form.ageConfirm}
                aria-label="Confirm I am 18 or older"
                onClick={() => update('ageConfirm', !form.ageConfirm)}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
                style={{
                  background:   C.cardElevated,
                  border:       `0.5px solid ${errors.ageConfirm ? C.danger : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 14,
                  padding:      14,
                  display:      'flex',
                  gap:          10,
                  alignItems:   'center',
                  width:        '100%',
                  color:        C.white,
                  fontSize:     14,
                  marginBottom: 16,
                  cursor:       'pointer',
                  textAlign:    'left',
                }}
              >
                <span
                  style={{
                    width:          18,
                    height:         18,
                    borderRadius:   5,
                    border:         `1.5px solid ${form.ageConfirm ? C.amber : 'rgba(255,255,255,0.2)'}`,
                    background:     form.ageConfirm ? C.amber : 'transparent',
                    flexShrink:     0,
                    transition:     'all 0.15s',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                  }}
                >
                  {form.ageConfirm && <span style={{ fontSize: 11, color: '#fff', fontWeight: 800 }}>✓</span>}
                </span>
                I confirm I am 18 or older.
              </motion.button>
              <FieldError>{errors.ageConfirm}</FieldError>
              <SelectField label="City" value={form.city} onChange={(e) => update('city', e.target.value)} options={cities} error={errors.city} />
              <SelectField label="School" value={form.school} onChange={(e) => update('school', e.target.value)} options={schools} error={errors.school} />
            </>
          )}

          {step === 2 && (
            <>
              <Label>Intent</Label>
              <PillGroup options={intentOptions} selected={form.intent} onToggle={(v) => toggleArray('intent', v)} error={errors.intent} />
              <Label>Vibes</Label>
              <div style={{ color: C.muted, fontSize: 12, margin: '-2px 0 12px' }}>Choose up to 5.</div>
              <PillGroup options={vibeOptions} selected={form.vibes} onToggle={(v) => toggleArray('vibes', v, 5)} error={errors.vibes} />
            </>
          )}

          {step === 3 && (
            <>
              <TextField label="Partner name" value={form.partnerName} onChange={(e) => update('partnerName', e.target.value)} />
              <TextField label="Partner contact" placeholder="Phone or Instagram" value={form.partnerContact} onChange={(e) => update('partnerContact', e.target.value)} />
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

          {step === 4 && (
            <>
              <TextField
                label="Duo name"
                placeholder={form.firstName ? `${form.firstName} & friend` : ''}
                value={form.duoName}
                onChange={(e) => update('duoName', e.target.value)}
                error={errors.duoName}
              />
              <Label>Looking for</Label>
              <PillGroup options={lookingForOpts} selected={form.lookingFor} onToggle={(v) => toggleArray('lookingFor', v)} error={errors.lookingFor} />
              <TextField label="OC spots" placeholder="Irvine Spectrum, Boba, Newport" value={form.ocSpots} onChange={(e) => update('ocSpots', e.target.value)} error={errors.ocSpots} />
              <TextAreaField label="Bio" value={form.bio} onChange={(e) => update('bio', e.target.value)} maxLength={120} error={errors.bio} />
              <TextField
                label="Instagram"
                placeholder="@yourhandle"
                value={form.instagram ? `@${form.instagram}` : ''}
                onChange={(e) => update('instagram', cleanInstagram(e.target.value))}
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
        style={{
          position:  'sticky',
          bottom:    0,
          padding:   '12px 16px 20px',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          boxSizing: 'border-box',
        }}
      >
        <motion.button
          type="button"
          onClick={next}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
          style={{
            width:        '100%',
            height:       54,
            borderRadius: 16,
            border:       'none',
            background:   C.gradientCTA,
            color:        '#fff',
            fontSize:     16,
            fontWeight:   800,
            cursor:       'pointer',
            boxShadow:    '0 4px 20px rgba(245,158,11,0.25)',
          }}
        >
          {step < 4 ? 'Next' : 'Finish profile'}
        </motion.button>
        {step > 1 && (
          <motion.button
            type="button"
            onClick={back}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            style={{
              width:      '100%',
              height:     44,
              border:     'none',
              background: 'transparent',
              color:      C.muted,
              fontSize:   14,
              fontWeight: 600,
              marginTop:  8,
              cursor:     'pointer',
            }}
          >
            Back
          </motion.button>
        )}
      </footer>
    </div>
  );
}
