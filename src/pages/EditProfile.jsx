import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import InitialsAvatar from '../components/InitialsAvatar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { getMyProfile } from '../lib/profile.js';
import { supabase } from '../lib/supabaseClient.js';

const cities = [
  'Irvine', 'Newport Beach', 'Costa Mesa', 'Fullerton', 'Anaheim', 'Orange',
  'Tustin', 'Huntington Beach', 'Garden Grove', 'Buena Park', 'Cypress',
  'Brea', 'Yorba Linda', 'Other OC',
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

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <span style={LABEL}>{label}</span>
      {children}
    </div>
  );
}

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

export default function EditProfile({ currentUser, go }) {
  const [name,      setName]      = useState('');
  const [age,       setAge]       = useState('');
  const [city,      setCity]      = useState('');
  const [instagram, setInstagram] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    getMyProfile(currentUser.id).then((p) => {
      if (!p) return;
      setName(p.name || '');
      setAge(p.age || '');
      setCity(p.city || '');
      setInstagram(p.instagram || '');
    });
  }, [currentUser]);

  const handleSave = async () => {
    try {
      setLoading(true);
      await supabase
        .from('profiles')
        .update({
          name,
          age:       parseInt(age),
          city,
          instagram: instagram.replace('@', ''),
        })
        .eq('id', currentUser.id);
      setSaved(true);
      setTimeout(() => go('me'), 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={() => go('me')} title="Edit Profile" />

      <div style={{ padding: '24px 16px 100px' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <InitialsAvatar name={name || 'Me'} size={80} />
        </div>

        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Name"
            style={INPUT}
          />
        </Field>

        <Field label="Age">
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            aria-label="Age"
            style={INPUT}
          />
        </Field>

        <Field label="City">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="City"
            style={{
              ...INPUT,
              appearance:       'none',
              WebkitAppearance: 'none',
              color:            city ? C.white : C.muted,
            }}
          >
            <option value="">Select city</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Instagram">
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position:   'absolute',
                left:       16,
                top:        '50%',
                transform:  'translateY(-50%)',
                color:      C.muted,
                fontSize:   15,
                userSelect: 'none',
              }}
            >
              @
            </span>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value.replace('@', ''))}
              aria-label="Instagram handle"
              style={{ ...INPUT, paddingLeft: 30 }}
            />
          </div>
        </Field>

        <motion.div style={{ marginTop: 8 }}>
          <PremiumButton
            fullWidth
            onClick={handleSave}
            disabled={loading || saved}
            style={{
              opacity: loading ? 0.7 : 1,
              color:   saved ? '#10B981' : undefined,
            }}
          >
            {saved ? 'Saved ✓' : loading ? 'Saving…' : 'Save Changes'}
          </PremiumButton>
        </motion.div>
      </div>
    </div>
  );
}
