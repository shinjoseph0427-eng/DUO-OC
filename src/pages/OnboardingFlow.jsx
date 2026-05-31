import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Users } from 'lucide-react';
import { C } from '../tokens';
import { createDuo } from '../lib/duos.js';
import { updateProfile } from '../lib/profile.js';
import { createInvite } from '../lib/invites.js';
import { uploadPhoto } from '../lib/upload.js';
import { logError } from '../lib/logger.js';

const VIBES = ['Coffee', 'Boba', 'Gym', 'Beach', 'Bowling', 'Food', 'Nightlife', 'Shopping', 'Drives', 'Games'];

// Steps: 1 = About you, 2 = Photos, 3 = Duo setup, 4 = Duo profile, 5 = Done
// Step 3 has no footer CTA; the choice buttons navigate directly.
// Step 5 has no footer CTA; finish actions are inside the body.

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

function VibePill({ selected, onClick, children }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.1 }}
      animate={{
        background:  selected ? C.amberT14 : C.cardElevated,
        borderColor: selected ? C.amberT35  : 'rgba(255,255,255,0.08)',
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

export default function OnboardingFlow({ go, currentUser, profile, myDuo, myDuos = [], onComplete, showToast }) {
  const hasDuo = Boolean(myDuo || myDuos.length > 0);
  const hasProfileBasics = Boolean(profile?.name && profile?.birth_year);
  const hasPendingInvite = typeof window !== 'undefined' && Boolean(sessionStorage.getItem('duo_oc_invite_token'));
  const [step,          setStep]          = useState(hasProfileBasics && !hasDuo ? 3 : 1);
  const [errors,        setErrors]        = useState({});
  const [loading,       setLoading]       = useState(false);
  const [photos,        setPhotos]        = useState([null, null, null]);
  const [uploadingIndex,setUploadingIndex]= useState(null);
  const [photoError,    setPhotoError]    = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSent,    setInviteSent]    = useState(false);
  const [inviteUrl,     setInviteUrl]     = useState('');

  const name      = useField('');
  const age       = useField('');
  const city      = useField('');
  const instagram = useField('');
  const duoName   = useField('');
  const partnerName    = useField('');
  const partnerContact = useField('');
  const [vibes, setVibes] = useState([]);

  useEffect(() => {
    if (!profile) return;
    name.set(profile.name ?? '');
    age.set(profile.birth_year ? String(new Date().getFullYear() - Number(profile.birth_year)) : '');
    city.set(profile.city ?? '');
    instagram.set(profile.instagram ?? '');
    const stored = profile.photos ?? [];
    setPhotos([stored[0] ?? null, stored[1] ?? null, stored[2] ?? null]);
    if (profile.name && profile.birth_year && !hasDuo) setStep(3);
  }, [profile, hasDuo]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleVibe = (v) => {
    setVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
    setErrors((e) => ({ ...e, vibes: undefined }));
  };

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
    photos:     photos.filter(Boolean),
    onboarding_complete: true,
  });

  // Step 1 → Step 2
  const handleNextFromStep1 = () => {
    if (validateStep1()) setStep(2);
  };

  // Step 2 solo path: save profile → Done
  const saveProfileBasics = () => updateProfile(currentUser.id, buildProfileUpdate());

  const handleCreateYourDuo = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      await saveProfileBasics();
      setStep(4);
    } catch (err) {
      logError('profile save error', err);
      showToast?.('Could not save your profile yet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPendingInvite = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      await saveProfileBasics();
      if (onComplete) {
        onComplete({ name: name.value.trim(), birth_year: new Date().getFullYear() - parseInt(age.value) });
      } else {
        go('me');
      }
    } catch (err) {
      logError('invite profile save error', err);
      showToast?.('Could not save your profile yet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 → Step 4 (duo path)
  const handleInviteFriend = () => setStep(4);

  // Step 4 → Done
  const handleCreateDuo = async () => {
    if (!validateStep3() || !currentUser) return;
    try {
      setLoading(true);
      await Promise.all([
        saveProfileBasics(),
        createDuo(currentUser.id, {
          name:       duoName.value.trim(),
          city:       city.value.trim() || '',
          vibes,
          spots:      [],
          lookingFor: '',
          instagram:  instagram.value.trim().replace(/^@/, '') || '',
        }),
      ]);
      showToast?.('Duo created!', 'success');
      setStep(5);
    } catch (err) {
      logError('create duo error', err);
      showToast?.('Could not create your Duo yet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 4 — generate an invite link for the partner, then show the waiting view.
  // The duo itself is only created once the partner accepts (createDuoWithMembers).
  const handleSendInvite = async () => {
    if (!currentUser || inviteLoading) return;
    setInviteLoading(true);
    try {
      const token = await createInvite(currentUser.id);
      const url = `${window.location.origin}?invite=${token}`;
      setInviteUrl(url);
      const shareText = partnerName.value.trim()
        ? `Hey ${partnerName.value.trim()}, be my duo partner on DUO OC.`
        : 'Be my duo partner on DUO OC.';
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Join me on DUO OC', text: shareText, url });
        } else {
          await navigator.clipboard.writeText(url);
          showToast?.('Invite link copied!', 'success');
        }
      } catch (shareErr) {
        if (shareErr?.name !== 'AbortError') {
          await navigator.clipboard.writeText(url).catch(() => {});
          showToast?.('Invite link copied!', 'success');
        }
      }
      setInviteSent(true);
    } catch (err) {
      logError('invite create error', err);
      showToast?.('Could not create invite link.', 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  // Done → Find Homie
  const handleInviteHomie = async () => {
    if (!currentUser || inviteLoading) return;
    setInviteLoading(true);
    try {
      const token = await createInvite(currentUser.id);
      const url = `${window.location.origin}?invite=${token}`;

      if (navigator.share) {
        await navigator.share({
          title: 'Join me on DUO OC',
          text: 'Be my duo partner on DUO OC.',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast?.('Invite link copied!', 'success');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        logError('invite create error', err);
        showToast?.('Could not create invite link.', 'error');
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const handleFindDuos = () => {
    if (onComplete) {
      onComplete({ name: name.value.trim(), birth_year: new Date().getFullYear() - parseInt(age.value) });
    } else {
      go('me');
    }
  };

  const back = () => {
    if (step === 1) { go('landing'); return; }
    if (step === 2) { setStep(1); return; }
    if (step === 3) { setStep(2); return; }
    if (step === 4) { setStep(3); return; }
  };

  // Progress: steps 1-4 = 25/50/75/100%, step 5 = 100%
  const progress = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;

  const stepLabel = step === 1
    ? 'Step 1 of 4 — About you'
    : step === 2
    ? 'Step 2 of 4 — Photos'
    : step === 3
    ? 'Step 3 of 4 - Duo setup'
    : step === 4
    ? 'Step 4 of 4 — Invite your homie'
    : null;

  const showBackBtn = step <= 4;
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
              <span className="gradient-text">DUO OC</span>
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
                Add photos so duos know who they're hanging with.
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
                  : 'Add photos so duos know who you are'}
              </div>

              {photoError && (
                <div style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                  {photoError}
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Duo setup ── */}
          {step === 3 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, margin: '0 0 10px' }}>
                {stepLabel}
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
                Set up your Duo
              </h1>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: '0 0 24px' }}>
                DUO OC is built around pairs. Create your Duo first, then invite your homie and meet another team for a 2v2 hangout.
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
                  How it works
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.65 }}>
                  Other duos find your Duo and propose a hangout. You both confirm and plans are made - no awkward one-on-ones.
                </p>
              </div>

              {/* Single path forward — duos are always built with a partner */}
              <motion.button
                type="button"
                onClick={hasPendingInvite ? handleJoinPendingInvite : handleCreateYourDuo}
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
                {loading ? 'Saving...' : hasPendingInvite ? 'Join your Duo' : 'Continue'}
              </motion.button>

              <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
                Next, invite your homie to form your Duo together.
              </p>
            </>
          )}

          {/* ── Step 4: Invite your homie ── */}
          {step === 4 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, margin: '0 0 10px' }}>
                {stepLabel}
              </p>

              {!inviteSent ? (
                <>
                  <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
                    Who's your duo partner?
                  </h1>
                  <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.5, margin: '0 0 28px' }}>
                    DUO OC is 2v2. Invite your homie to build your Duo Card together.
                  </p>

                  <FieldLabel>Partner's name</FieldLabel>
                  <TextInput
                    value={partnerName.value}
                    onChange={(e) => partnerName.set(e.target.value)}
                    onFocus={partnerName.onFocus}
                    onBlur={partnerName.onBlur}
                    focused={partnerName.focused}
                    placeholder="e.g. Miles"
                  />
                  <div style={{ height: 16 }} />
                  <FieldLabel>Their email or phone</FieldLabel>
                  <TextInput
                    value={partnerContact.value}
                    onChange={(e) => partnerContact.set(e.target.value)}
                    onFocus={partnerContact.onFocus}
                    onBlur={partnerContact.onBlur}
                    focused={partnerContact.focused}
                    placeholder="email@example.com or (000) 000-0000"
                  />
                  <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 24px', lineHeight: 1.5 }}>
                    We'll create a private invite link for you to send them.
                  </p>

                  <motion.button
                    type="button"
                    onClick={handleSendInvite}
                    disabled={inviteLoading}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      width: '100%', height: 58, borderRadius: 16, border: 'none',
                      background: C.gradientCTA, color: '#fff', fontSize: 16, fontWeight: 800,
                      cursor: inviteLoading ? 'not-allowed' : 'pointer',
                      boxShadow: `0 4px 20px ${C.amberT35}`, opacity: inviteLoading ? 0.6 : 1,
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {inviteLoading ? 'Creating link…' : 'Invite your homie'}
                  </motion.button>

                  <button
                    type="button"
                    onClick={handleFindDuos}
                    style={{
                      display: 'block', margin: '18px auto 0', background: 'none', border: 'none',
                      color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    Already sent the invite?
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%', background: C.amberT08,
                    border: `0.5px solid ${C.brownBorder}`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                  }}>
                    <Users size={32} color={C.amber} strokeWidth={2.2} />
                  </div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', margin: '0 0 10px' }}>
                    Waiting for your homie…
                  </h1>
                  <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '0 auto 24px', maxWidth: 300 }}>
                    {partnerName.value.trim()
                      ? `${partnerName.value.trim()} just needs to tap your invite link.`
                      : 'Your homie just needs to tap your invite link.'}{' '}
                    Your Duo is created the moment they accept.
                  </p>

                  <motion.button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(inviteUrl)
                        .then(() => showToast?.('Invite link copied!', 'success'))
                        .catch(() => {});
                    }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      width: '100%', height: 52, borderRadius: 16, border: '0.5px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.04)', color: C.white, fontSize: 15, fontWeight: 700,
                      cursor: 'pointer', marginBottom: 12,
                    }}
                  >
                    Copy invite link again
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleFindDuos}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      width: '100%', height: 58, borderRadius: 16, border: 'none',
                      background: C.gradientCTA, color: '#fff', fontSize: 16, fontWeight: 800,
                      cursor: 'pointer', boxShadow: `0 4px 20px ${C.amberT35}`,
                    }}
                  >
                    Done
                  </motion.button>
                </div>
              )}
            </>
          )}

          {/* ── Step 5: Done ── */}
          {step === 5 && (
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
                  boxShadow:      `0 8px 32px ${C.amberT35}`,
                }}
              >
                <Check size={34} color={C.cream} strokeWidth={2.5} />
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
                Your profile and Duo are ready. Invite your homie or start exploring OC.
              </p>

              <motion.button
                type="button"
                onClick={handleInviteHomie}
                disabled={inviteLoading}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                style={{
                  width:         '100%',
                  maxWidth:      320,
                  height:        54,
                  borderRadius:  16,
                  border:        '0.5px solid rgba(255,255,255,0.1)',
                  background:    'rgba(255,255,255,0.04)',
                  color:         inviteLoading ? C.muted : C.white,
                  fontSize:      15,
                  fontWeight:    700,
                  cursor:        inviteLoading ? 'not-allowed' : 'pointer',
                  marginBottom:  12,
                }}
              >
                {inviteLoading ? 'Creating link...' : 'Invite your homie'}
              </motion.button>

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
                  boxShadow:     `0 4px 24px ${C.amberT35}`,
                }}
              >
                Go to My Duo
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
