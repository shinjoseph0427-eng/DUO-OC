import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Loader, Check, Navigation } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { getMyProfile, updateProfile, checkUsername } from '../lib/profile.js';
import { uploadPhoto, deletePhoto } from '../lib/upload.js';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const MAX_CITY_LENGTH = 80;
const MAX_INSTAGRAM_LENGTH = 30;
const MAX_BIO_LENGTH = 150;
const MAX_PROMPT_LENGTH = 100;

const PROMPT_OPTIONS = [
  "The way to win me over is…",
  "My ideal hangout looks like…",
  "You'll know we vibe if…",
  "I'm embarrassingly good at…",
  "Controversial opinion:",
  "Best duo activity we do:",
  "Ask me about…",
  "I'm looking for people who…",
];

const LABEL = {
  fontSize:      10,
  fontWeight:    700,
  color:         C.muted,
  letterSpacing: '1px',
  marginBottom:  8,
  textTransform: 'uppercase',
  display:       'block',
};

const INPUT = {
  background:   C.cardElevated,
  border:       '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: 14,
  padding:      '14px 16px',
  fontSize:     15,
  color:        C.white,
  width:        '100%',
  outline:      'none',
  boxSizing:    'border-box',
};

function PhotoSlot({ url, uploading, onAdd, onRemove }) {
  const ref = useRef(null);

  const base = {
    width:          '100%',
    height:         '100%',
    borderRadius:   12,
    overflow:       'hidden',
    background:     C.cardDeep,
    border:         `1.5px dashed ${C.border}`,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
    cursor:         'pointer',
  };

  if (uploading) {
    return (
      <div style={base}>
        <Loader size={20} color={C.muted} className="spin" />
      </div>
    );
  }

  if (url) {
    return (
      <div style={{ ...base, border: 'none', cursor: 'default' }}>
        <img src={url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            position:       'absolute',
            top:            6,
            right:          6,
            width:          26,
            height:         26,
            borderRadius:   '50%',
            background:     'rgba(0,0,0,0.65)',
            border:         'none',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
          }}
        >
          <X size={13} color="#fff" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      style={base}
      whileTap={{ scale: 0.97 }}
      onClick={() => ref.current?.click()}
    >
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) onAdd(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
        <Plus size={22} color={C.muted} strokeWidth={1.8} />
        <p style={{ fontSize: 11, color: C.muted, margin: '5px 0 0', letterSpacing: '0.5px' }}>
          Add photo
        </p>
      </div>
    </motion.div>
  );
}

export default function EditProfile({ currentUser, go, goBack, showToast }) {
  const [name,      setName]      = useState('');
  const [username,  setUsername]  = useState('');
  const [instagram, setInstagram] = useState('');
  const [bio,       setBio]       = useState('');
  const [city,      setCity]      = useState('');
  const [locState,  setLocState]  = useState('idle'); // 'idle' | 'requesting' | 'success' | 'denied'
  const [lat,       setLat]       = useState(null);
  const [lng,       setLng]       = useState(null);
  const [photos,    setPhotos]    = useState([null, null, null]);
  const [uploading, setUploading] = useState([false, false, false]);
  const [prompts,   setPrompts]   = useState([
    { q: PROMPT_OPTIONS[0], a: '' },
    { q: PROMPT_OPTIONS[2], a: '' },
  ]);
  const [saving,          setSaving]          = useState(false);
  const [usernameStatus,  setUsernameStatus]  = useState(''); // '' | 'checking' | 'available' | 'taken'
  const debRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    getMyProfile(currentUser.id).then((p) => {
      if (!p) return;
      setName(p.name || '');
      setUsername(p.username || '');
      setInstagram(p.instagram || '');
      setBio(p.bio || '');
      setCity(p.city || '');
      setLat(p.lat ?? null);
      setLng(p.lng ?? null);
      const stored = p.photos ?? [];
      setPhotos([stored[0] ?? null, stored[1] ?? null, stored[2] ?? null]);
      setPrompts([
        { q: p.prompt_q1 || PROMPT_OPTIONS[0], a: p.prompt_a1 || '' },
        { q: p.prompt_q2 || PROMPT_OPTIONS[2], a: p.prompt_a2 || '' },
      ]);
    });
  }, [currentUser]);

  const handleUsernameChange = (raw) => {
    const v = raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    setUsername(v);
    setUsernameStatus('');
    clearTimeout(debRef.current);
    if (!USERNAME_RE.test(v)) return;
    setUsernameStatus('checking');
    debRef.current = setTimeout(async () => {
      const available = await checkUsername(v, currentUser?.id);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);
  };

  const handleUpdateLocation = () => {
    setLocState('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: newLat, longitude: newLng } = pos.coords;
        setLat(newLat);
        setLng(newLng);
        setLocState('success');
        showToast?.('Location saved. Add your city manually so people know your area.', 'success');
      },
      () => {
        setLocState('denied');
        showToast?.('Location access denied', 'error');
      },
    );
  };

  const setUpl = (index, val) =>
    setUploading((prev) => { const n = [...prev]; n[index] = val; return n; });

  const handlePhotoAdd = async (index, file) => {
    setUpl(index, true);
    try {
      const url = await uploadPhoto(currentUser.id, file);
      setPhotos((prev) => { const n = [...prev]; n[index] = url; return n; });
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setUpl(index, false);
    }
  };

  const handlePhotoRemove = (index) => {
    const url = photos[index];
    setPhotos((prev) => { const n = [...prev]; n[index] = null; return n; });
    if (url) deletePhoto(url).catch(() => {});
  };

  const setPromptField = (index, field, value) =>
    setPrompts((prev) => {
      const n = [...prev];
      n[index] = { ...n[index], [field]: value };
      return n;
    });

  const handleSave = async () => {
    if (!name.trim()) { showToast?.('Name is required', 'error'); return; }
    if (username && !USERNAME_RE.test(username)) {
      showToast?.('Invalid username format', 'error'); return;
    }
    if (username && usernameStatus === 'taken') {
      showToast?.('Username already taken', 'error'); return;
    }
    if (username && usernameStatus === 'checking') {
      showToast?.('Still checking username…', 'error'); return;
    }
    if (city.trim().length > MAX_CITY_LENGTH) {
      showToast?.('City must be 80 characters or less', 'error'); return;
    }
    if (instagram.replace('@', '').trim().length > MAX_INSTAGRAM_LENGTH) {
      showToast?.('Instagram must be 30 characters or less', 'error'); return;
    }
    if (bio.trim().length > MAX_BIO_LENGTH) {
      showToast?.('Bio must be 150 characters or less', 'error'); return;
    }
    if (prompts.some((p) => p.a.trim().length > MAX_PROMPT_LENGTH)) {
      showToast?.('Prompt answers must be 100 characters or less', 'error'); return;
    }
    try {
      setSaving(true);
      await updateProfile(currentUser.id, {
        name:      name.trim(),
        username:  username ? username.toLowerCase() : null,
        instagram: instagram.replace('@', '').trim(),
        bio:       bio.trim() || null,
        city:      city.trim() || null,
        lat:       lat ?? null,
        lng:       lng ?? null,
        photos:    photos.filter(Boolean),
        prompt_q1: prompts[0].q || null,
        prompt_a1: prompts[0].a.trim() || null,
        prompt_q2: prompts[1].q || null,
        prompt_a2: prompts[1].a.trim() || null,
      });
      showToast?.('Profile updated ✓', 'success');
      goBack();
    } catch {
      showToast?.('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={goBack} title="Edit Profile" />

      <div style={{ padding: '24px 16px 100px' }}>

        {/* ── Photos ─────────────────────────────── */}
        <span style={LABEL}>Photos</span>
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: '2fr 1fr',
            gridTemplateRows:    '152px 152px',
            gap:                 6,
            marginBottom:        28,
          }}
        >
          <div style={{ gridRow: '1 / 3' }}>
            <PhotoSlot
              url={photos[0]}
              uploading={uploading[0]}
              onAdd={(f) => handlePhotoAdd(0, f)}
              onRemove={() => handlePhotoRemove(0)}
            />
          </div>
          <PhotoSlot
            url={photos[1]}
            uploading={uploading[1]}
            onAdd={(f) => handlePhotoAdd(1, f)}
            onRemove={() => handlePhotoRemove(1)}
          />
          <PhotoSlot
            url={photos[2]}
            uploading={uploading[2]}
            onAdd={(f) => handlePhotoAdd(2, f)}
            onRemove={() => handlePhotoRemove(2)}
          />
        </div>

        {/* ── Name ───────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <span style={LABEL}>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Name"
            style={INPUT}
          />
        </div>

        {/* ── Username ────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <span style={LABEL}>Username</span>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                color: C.muted, fontSize: 15, userSelect: 'none',
              }}
            >
              @
            </span>
            <input
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="yourhandle"
              aria-label="Username"
              style={{
                ...INPUT,
                paddingLeft: 30,
                paddingRight: 40,
                border: `0.5px solid ${
                  usernameStatus === 'available' ? C.success :
                  usernameStatus === 'taken'     ? C.danger :
                  'rgba(255,255,255,0.09)'
                }`,
              }}
            />
            <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
              {usernameStatus === 'checking'  && <Loader  size={14} color={C.muted} style={{ animation: 'spin 0.8s linear infinite' }} />}
              {usernameStatus === 'available' && <Check   size={14} color={C.success} strokeWidth={2.5} />}
              {usernameStatus === 'taken'     && <span style={{ fontSize: 13, color: C.danger, fontWeight: 700 }}>✕</span>}
            </div>
          </div>
          {usernameStatus === 'available' && <p style={{ fontSize: 12, color: C.success, margin: '4px 0 0' }}>Available ✓</p>}
          {usernameStatus === 'taken'     && <p style={{ fontSize: 12, color: C.danger,  margin: '4px 0 0' }}>Already taken</p>}
        </div>

        {/* ── City + GPS ──────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <span style={LABEL}>City</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value.slice(0, MAX_CITY_LENGTH))}
            placeholder="Irvine, Newport Beach…"
            aria-label="City"
            maxLength={MAX_CITY_LENGTH}
            style={INPUT}
          />
          <motion.button
            type="button"
            onClick={handleUpdateLocation}
            disabled={locState === 'requesting'}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 12, marginTop: -8,
              background: 'rgba(245,158,11,0.07)',
              border: '0.5px solid rgba(245,158,11,0.2)',
              color: locState === 'success' ? C.success : C.amber,
              fontSize: 13, fontWeight: 600, cursor: locState === 'requesting' ? 'default' : 'pointer',
            }}
          >
            {locState === 'requesting'
              ? <><Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Detecting…</>
              : locState === 'success'
              ? <><Check size={13} strokeWidth={2.5} /> Location updated</>
              : <><Navigation size={13} strokeWidth={2} /> Update location</>
            }
          </motion.button>
        </div>

        {/* ── Instagram ──────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <span style={LABEL}>Instagram</span>
          <div style={{ position: 'relative' }}>
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
              @
            </span>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace('@', '').slice(0, MAX_INSTAGRAM_LENGTH))}
              aria-label="Instagram handle"
              maxLength={MAX_INSTAGRAM_LENGTH}
              style={{ ...INPUT, paddingLeft: 30 }}
            />
          </div>
        </div>

        {/* ── Bio ────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <span style={LABEL}>Bio</span>
          <div style={{ position: 'relative' }}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
              placeholder="The most niche thing about me is…"
              maxLength={MAX_BIO_LENGTH}
              rows={3}
              style={{ ...INPUT, resize: 'none', lineHeight: 1.6, paddingBottom: 28 }}
            />
            <span
              style={{
                position: 'absolute',
                bottom:   10,
                right:    14,
                fontSize: 11,
                color:    bio.length >= MAX_BIO_LENGTH - 10 ? C.amber : C.muted,
              }}
            >
              {bio.length}/{MAX_BIO_LENGTH}
            </span>
          </div>
        </div>

        {/* ── Prompts ────────────────────────────── */}
        {prompts.map((prompt, i) => (
          <div
            key={i}
            style={{
              background:   C.cardElevated,
              border:       `0.5px solid ${C.border}`,
              borderRadius: 16,
              padding:      16,
              marginBottom: 16,
            }}
          >
            <span style={{ ...LABEL, marginBottom: 10 }}>Prompt {i + 1}</span>
            <select
              value={prompt.q}
              onChange={(e) => setPromptField(i, 'q', e.target.value)}
              style={{
                ...INPUT,
                appearance:       'none',
                WebkitAppearance: 'none',
                marginBottom:     12,
                fontSize:         13,
                color:            C.muted,
              }}
            >
              {PROMPT_OPTIONS.map((o) => (
                <option key={o} value={o} style={{ background: C.bg2 }}>{o}</option>
              ))}
            </select>
            <div style={{ position: 'relative' }}>
              <input
                value={prompt.a}
                onChange={(e) => setPromptField(i, 'a', e.target.value.slice(0, MAX_PROMPT_LENGTH))}
                placeholder="Be specific — 'I love hiking' is boring. 'I cry at every summit attempt' is not."
                maxLength={MAX_PROMPT_LENGTH}
                style={{ ...INPUT, fontSize: 14, paddingRight: 52 }}
              />
              <span
                style={{
                  position: 'absolute',
                  right:    12,
                  top:      '50%',
                  transform:'translateY(-50%)',
                  fontSize: 11,
                  color:    prompt.a.length >= MAX_PROMPT_LENGTH - 10 ? C.amber : C.muted,
                }}
              >
                {prompt.a.length}/{MAX_PROMPT_LENGTH}
              </span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 8 }}>
          <PremiumButton fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </PremiumButton>
        </div>
      </div>
    </div>
  );
}
