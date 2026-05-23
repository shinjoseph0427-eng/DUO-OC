import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Loader } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { getMyDuo, updateDuo } from '../lib/duos.js';
import { uploadPhoto, deletePhoto } from '../lib/upload.js';

const MAX_DUO_TEXT_LENGTH = 200;
const MAX_DUO_PROMPT_LENGTH = 100;

const DUO_PROMPT_OPTIONS = [
  "Our signature move is…",
  "You know we vibe if…",
  "The best night out with us ends with…",
  "We're the duo that…",
  "Our group chat name should be…",
  "We met because…",
  "Two truths and a lie about us:",
  "We're looking for duos who…",
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
        <img src={url} alt="Duo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

export default function EditDuoProfile({ currentUser, myDuo: myDuoProp, go, goBack, showToast }) {
  const [duo,       setDuo]       = useState(myDuoProp ?? null);
  const [photos,    setPhotos]    = useState([null, null, null]);
  const [uploading, setUploading] = useState([false, false, false]);
  const [duoBio,    setDuoBio]    = useState('');
  const [howWeMet,  setHowWeMet]  = useState('');
  const [promptQ,   setPromptQ]   = useState(DUO_PROMPT_OPTIONS[0]);
  const [promptA,   setPromptA]   = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const source = myDuoProp ?? null;
    if (source) {
      loadFromDuo(source);
    } else {
      getMyDuo(currentUser.id).then((d) => {
        if (d) { setDuo(d); loadFromDuo(d); }
      });
    }
  }, [currentUser]);

  function loadFromDuo(d) {
    setDuo(d);
    const stored = d.duo_photos ?? [];
    setPhotos([stored[0] ?? null, stored[1] ?? null, stored[2] ?? null]);
    setDuoBio(d.duo_bio ?? '');
    setHowWeMet(d.how_we_met ?? '');
    setPromptQ(d.duo_prompt_q || DUO_PROMPT_OPTIONS[0]);
    setPromptA(d.duo_prompt_a ?? '');
  }

  const setUpl = (index, val) =>
    setUploading((prev) => { const n = [...prev]; n[index] = val; return n; });

  const handlePhotoAdd = async (index, file) => {
    if (!duo?.id) return;
    setUpl(index, true);
    try {
      const url = await uploadPhoto(`duo_${duo.id}`, file);
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

  const handleSave = async () => {
    if (!duo?.id) { showToast?.('No duo found', 'error'); return; }
    if (duoBio.trim().length > MAX_DUO_TEXT_LENGTH || howWeMet.trim().length > MAX_DUO_TEXT_LENGTH) {
      showToast?.('Duo text must be 200 characters or less', 'error'); return;
    }
    if (promptA.trim().length > MAX_DUO_PROMPT_LENGTH) {
      showToast?.('Prompt answer must be 100 characters or less', 'error'); return;
    }
    try {
      setSaving(true);
      await updateDuo(duo.id, {
        duo_photos:   photos.filter(Boolean),
        duo_bio:      duoBio.trim()   || null,
        how_we_met:   howWeMet.trim() || null,
        duo_prompt_q: promptQ         || null,
        duo_prompt_a: promptA.trim()  || null,
      });
      showToast?.('Duo profile updated ✓', 'success');
      goBack();
    } catch {
      showToast?.('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={goBack} title="Edit Duo Profile" />

      <div style={{ padding: '24px 16px 100px' }}>

        {/* ── Duo Photos ──────────────────────────── */}
        <span style={LABEL}>Duo Photos</span>
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

        {/* ── How We Met ──────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <span style={LABEL}>How we met</span>
          <div style={{ position: 'relative' }}>
            <textarea
              value={howWeMet}
              onChange={(e) => setHowWeMet(e.target.value.slice(0, MAX_DUO_TEXT_LENGTH))}
              placeholder="We met at a volleyball pickup game and immediately started roasting each other…"
              maxLength={MAX_DUO_TEXT_LENGTH}
              rows={3}
              style={{ ...INPUT, resize: 'none', lineHeight: 1.6, paddingBottom: 28 }}
            />
            <span
              style={{
                position: 'absolute',
                bottom:   10,
                right:    14,
                fontSize: 11,
                color:    howWeMet.length >= MAX_DUO_TEXT_LENGTH - 20 ? C.amber : C.muted,
              }}
            >
              {howWeMet.length}/{MAX_DUO_TEXT_LENGTH}
            </span>
          </div>
        </div>

        {/* ── Duo Bio ─────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <span style={LABEL}>Duo Bio</span>
          <div style={{ position: 'relative' }}>
            <textarea
              value={duoBio}
              onChange={(e) => setDuoBio(e.target.value.slice(0, MAX_DUO_TEXT_LENGTH))}
              placeholder="We're the type of duo that turns a quick coffee into a 4-hour hang…"
              maxLength={MAX_DUO_TEXT_LENGTH}
              rows={3}
              style={{ ...INPUT, resize: 'none', lineHeight: 1.6, paddingBottom: 28 }}
            />
            <span
              style={{
                position: 'absolute',
                bottom:   10,
                right:    14,
                fontSize: 11,
                color:    duoBio.length >= MAX_DUO_TEXT_LENGTH - 20 ? C.amber : C.muted,
              }}
            >
              {duoBio.length}/{MAX_DUO_TEXT_LENGTH}
            </span>
          </div>
        </div>

        {/* ── Duo Prompt ──────────────────────────── */}
        <div
          style={{
            background:   C.cardElevated,
            border:       `0.5px solid ${C.border}`,
            borderRadius: 16,
            padding:      16,
            marginBottom: 16,
          }}
        >
          <span style={{ ...LABEL, marginBottom: 10 }}>Duo Prompt</span>
          <select
            value={promptQ}
            onChange={(e) => setPromptQ(e.target.value)}
            style={{
              ...INPUT,
              appearance:       'none',
              WebkitAppearance: 'none',
              marginBottom:     12,
              fontSize:         13,
              color:            C.muted,
            }}
          >
            {DUO_PROMPT_OPTIONS.map((o) => (
              <option key={o} value={o} style={{ background: C.bg2 }}>{o}</option>
            ))}
          </select>
          <div style={{ position: 'relative' }}>
            <input
              value={promptA}
              onChange={(e) => setPromptA(e.target.value.slice(0, MAX_DUO_PROMPT_LENGTH))}
              placeholder="Be specific and a little unhinged."
              maxLength={MAX_DUO_PROMPT_LENGTH}
              style={{ ...INPUT, fontSize: 14, paddingRight: 52 }}
            />
            <span
              style={{
                position:  'absolute',
                right:     12,
                top:       '50%',
                transform: 'translateY(-50%)',
                fontSize:  11,
                color:     promptA.length >= MAX_DUO_PROMPT_LENGTH - 10 ? C.amber : C.muted,
              }}
            >
              {promptA.length}/{MAX_DUO_PROMPT_LENGTH}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <PremiumButton fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Duo Profile'}
          </PremiumButton>
        </div>
      </div>
    </div>
  );
}
