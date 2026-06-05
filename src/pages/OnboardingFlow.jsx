import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { C } from '../tokens';
import { updateProfile } from '../lib/profile.js';
import { uploadPhoto } from '../lib/upload.js';
import { logError } from '../lib/logger.js';

// Steps: 1 = About you, 2 = Photos, 3 = WEEKLY start.

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
          boxShadow:    focused ? `0 0 0 3px ${C.amberT14}` : 'none',
          transition:   'border-color 0.15s, box-shadow 0.15s',
        }}
      />
    </div>
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

export default function OnboardingFlow({ go, currentUser, profile, onComplete, showToast }) {
  const hasProfileBasics = Boolean(profile?.name && profile?.birth_year);
  const [step,          setStep]          = useState(hasProfileBasics ? 3 : 1);
  const [errors,        setErrors]        = useState({});
  const [loading,       setLoading]       = useState(false);
  const [photos,        setPhotos]        = useState([null, null, null]);
  const [uploadingIndex,setUploadingIndex]= useState(null);
  const [photoError,    setPhotoError]    = useState('');

  const name      = useField('');
  const age       = useField('');
  const city      = useField('');
  const instagram = useField('');

  useEffect(() => {
    if (!profile) return;
    name.set(profile.name ?? '');
    age.set(profile.birth_year ? String(new Date().getFullYear() - Number(profile.birth_year)) : '');
    city.set(profile.city ?? '');
    instagram.set(profile.instagram ?? '');
    const stored = profile.photos ?? [];
    setPhotos([stored[0] ?? null, stored[1] ?? null, stored[2] ?? null]);
    if (profile.name && profile.birth_year) setStep(3);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearErr = (field) => setErrors((e) => ({ ...e, [field]: undefined }));

  async function handlePhotoAdd(index, file) {
    setUploadingIndex(index);
    setPhotoError('');
    try {
      const url = await uploadPhoto(currentUser.id, file);
      setPhotos(prev => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
    } catch (e) {
      setPhotoError(e.message ?? 'Upload failed. Try again.');
    } finally {
      setUploadingIndex(null);
    }
  }

  const filledPhotos = photos.filter(Boolean);

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

  const buildProfileUpdate = () => ({
    name:       name.value.trim(),
    birth_year: new Date().getFullYear() - parseInt(age.value),
    city:       city.value.trim() || null,
    instagram:  instagram.value.trim().replace(/^@/, '') || null,
    photos:     photos.filter(Boolean),
    onboarding_complete: true,
  });

  // Step 1 → Step 2
  const handleNextFromStep1 = () => {
    if (validateStep1()) setStep(2);
  };

  // Step 2 solo path: save profile → Done
  const saveProfileBasics = () => updateProfile(currentUser.id, buildProfileUpdate());

  const handleStartWeekly = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      await saveProfileBasics();
      if (onComplete) {
        onComplete({ name: name.value.trim(), birth_year: new Date().getFullYear() - parseInt(age.value) });
      } else {
        go('home');
      }
    } catch (err) {
      logError('profile save error', err);
      showToast?.('Could not save your profile yet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const back = () => {
    if (step === 1) { go('landing'); return; }
    if (step === 2) { setStep(1); return; }
    if (step === 3) { setStep(2); return; }
  };

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  const stepLabel = step === 1
    ? 'Step 1 of 3 — Profile'
    : step === 2
    ? 'Step 2 of 3 — Photos'
    : step === 3
    ? 'Step 3 of 3 - Start WEEKLY'
    : null;

  const showBackBtn = step <= 3;
  const showFooterCTA = step === 1 || step === 2;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white, paddingBottom: 32 }}>

      {/* Header */}
      {step < 5 && (
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
              <span className="gradient-text">WEEKLY</span>
            </span>
          </div>

          <div style={{ width: 36 }} />
        </header>
      )}

      {/* Progress bar (steps 1-3 only) */}
      {step < 5 && (
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
                Set up your profile
              </h1>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: '0 0 28px' }}>
                Tell us a little about yourself so matches know who they are meeting.
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

              <FieldLabel>Area <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span></FieldLabel>
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
                Optional. You control what you share after you match.
              </p>
            </>
          )}

          {/* ── Step 2: Photos ── */}
          {step === 2 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, margin: '0 0 10px' }}>
                {stepLabel}
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
                Add your photos
              </h1>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.5 }}>
                Add photos so people can recognize who they are matching with.
              </p>

              <div style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap:                 10,
                marginBottom:        16,
              }}>
                {[0, 1, 2].map(i => (
                  <label key={i} style={{
                    aspectRatio:    '3/4',
                    borderRadius:   14,
                    border:         `0.5px solid ${photos[i] ? C.amber : C.border}`,
                    background:     photos[i] ? 'transparent' : C.cardElevated,
                    overflow:       'hidden',
                    cursor:         uploadingIndex === i ? 'wait' : 'pointer',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    position:       'relative',
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploadingIndex !== null}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoAdd(i, file);
                        e.target.value = '';
                      }}
                    />
                    {photos[i] ? (
                      <img
                        src={photos[i]}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : uploadingIndex === i ? (
                      <div style={{ fontSize: 11, color: C.muted }}>Uploading...</div>
                    ) : (
                      <div style={{ fontSize: 24, color: C.muted, opacity: 0.4 }}>+</div>
                    )}
                  </label>
                ))}
              </div>

              <div style={{
                fontSize:   12,
                color:      C.muted,
                textAlign:  'center',
                marginBottom: 8,
              }}>
                {filledPhotos.length > 0
                  ? `${filledPhotos.length} photo${filledPhotos.length > 1 ? 's' : ''} added`
                  : 'Add photos so people know who you are'}
              </div>

              {photoError && (
                <div style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                  {photoError}
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Start WEEKLY ── */}
          {step === 3 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, margin: '0 0 10px' }}>
                {stepLabel}
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
                Start with your week
              </h1>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>
                Set when you are free, find people whose week overlaps with yours, and send a request when it feels right.
              </p>

              {/* Explainer box */}
              <div
                style={{
                  background:   C.amberT08,
                  border:       `0.5px solid ${C.amberT22}`,
                  borderRadius: 16,
                  padding:      '16px 18px',
                  marginBottom: 32,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 6px' }}>
                  How WEEKLY works
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.65 }}>
                  Pick your days and times. Browse overlap. Send a request. Chat if you both say yes.
                </p>
              </div>

              {/* Default path: save profile and enter the WEEKLY app */}
              <motion.button
                type="button"
                onClick={handleStartWeekly}
                disabled={loading}
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
                  cursor:       loading ? 'not-allowed' : 'pointer',
                  letterSpacing:'-0.2px',
                  boxShadow:    `0 4px 20px ${C.amberT35}`,
                  opacity:      loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Saving...' : 'Finish setup'}
              </motion.button>

              <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
                You can set your week from Home right after this.
              </p>
            </>
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
            onClick={
              step === 1 ? handleNextFromStep1
              : () => setStep(3)
            }
            disabled={
              loading ||
              (step === 2 && uploadingIndex !== null)
            }
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
              cursor:        (loading || (step === 2 && uploadingIndex !== null)) ? 'not-allowed' : 'pointer',
              boxShadow:     `0 4px 20px ${C.amberT35}`,
              opacity:       (loading || (step === 2 && uploadingIndex !== null)) ? 0.5 : 1,
            }}
          >
            {loading
              ? 'Saving…'
              : step === 1 ? 'Next'
              : 'Continue →'}
          </motion.button>
        </footer>
      )}
    </div>
  );
}
