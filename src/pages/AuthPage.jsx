import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { signUp, signIn } from '../lib/auth.js';

const OC_CITIES = [
  'Irvine', 'Newport Beach', 'Costa Mesa', 'Fullerton', 'Anaheim', 'Orange',
  'Tustin', 'Huntington Beach', 'Garden Grove', 'Buena Park', 'Cypress',
  'Brea', 'Yorba Linda', 'Other OC',
];

const LABEL = {
  display:       'block',
  fontSize:      10,
  fontWeight:    700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color:         C.muted,
  marginBottom:  8,
};

function Field({ label, children }) {
  return <div style={{ marginBottom: 16 }}><span style={LABEL}>{label}</span>{children}</div>;
}

function useInputStyle() {
  const [focused, setFocused] = useState('');
  const style = (field) => ({
    width:        '100%',
    background:   C.cardElevated,
    border:       `0.5px solid ${focused === field ? C.amber : 'rgba(255,255,255,0.09)'}`,
    borderRadius: 14,
    padding:      '14px 16px',
    fontSize:     15,
    color:        C.white,
    outline:      'none',
    boxSizing:    'border-box',
    boxShadow:    focused === field ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
    transition:   'border-color 0.15s, box-shadow 0.15s',
  });
  return { style, onFocus: (f) => setFocused(f), onBlur: () => setFocused('') };
}

export default function AuthPage({ go, onLogin, initialMode = 'signup' }) {
  const [mode, setMode] = useState(initialMode);

  // signup fields
  const [name,       setName]       = useState('');
  const [age,        setAge]        = useState('');
  const [city,       setCity]       = useState('');
  const [instagram,  setInstagram]  = useState('');
  const [gender,     setGender]     = useState('');
  const [ageConfirm, setAgeConfirm] = useState(false);

  // shared fields
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const { style: iStyle, onFocus, onBlur } = useInputStyle();

  const switchMode = (m) => {
    setMode(m);
    setError('');
  };

  const handleSignUp = async () => {
    setError('');
    if (!name || !age || !city || !instagram || !email || !password || !gender) {
      setError('All fields are required.');
      return;
    }
    const n = Number(age);
    if (n < 18 || n > 25) { setError('You must be 18–25 to join.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (!ageConfirm) { setError('Please confirm you are 18 or older.'); return; }
    try {
      setLoading(true);
      const user = await signUp(email, password, name, age, city, instagram, gender);
      onLogin?.(user);
      go('onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    try {
      setLoading(true);
      const user = await signIn(email, password);
      onLogin?.(user);
      go('home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={() => go('landing')} />

      <div style={{ padding: '40px 24px 80px' }}>

        {/* Mode tabs */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 9999, padding: 4, display: 'flex', marginBottom: 32, position: 'relative' }}>
          {['signup', 'login'].map((m) => (
            <button key={m} type="button" onClick={() => switchMode(m)}
              style={{ flex:1, height:40, borderRadius:9999, border:'none', background:'transparent',
                       color: mode===m ? '#0A0A0F' : C.muted, fontSize:14, fontWeight:700, cursor:'pointer',
                       position:'relative', zIndex:1 }}>
              {mode===m && (
                <motion.div layoutId="auth-tab-bg"
                  style={{ position:'absolute', inset:0, borderRadius:9999, background:C.gradientCTA, zIndex:-1 }}
                  transition={{ type:'spring', stiffness:400, damping:30 }}
                />
              )}
              {m === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
          ))}
        </div>

        {/* ── SIGN UP ── */}
        {mode === 'signup' && (
          <>
            <Field label="First name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => onFocus('name')}
                onBlur={onBlur}
                placeholder="Your first name"
                style={iStyle('name')}
              />
            </Field>

            {/* Gender pills */}
            <Field label="I am">
              <div style={{ display: 'flex', gap: 8 }}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <motion.button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    whileTap={{ scale: 0.93 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      flex:         1,
                      height:       44,
                      borderRadius: 12,
                      border:       '0.5px solid ' + (gender === g ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)'),
                      background:   gender === g ? 'rgba(245,158,11,0.14)' : C.cardElevated,
                      color:        gender === g ? C.amber : C.muted,
                      fontSize:     14,
                      fontWeight:   600,
                      cursor:       'pointer',
                    }}
                  >
                    {g}
                  </motion.button>
                ))}
              </div>
            </Field>

            <Field label="Age">
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                onFocus={() => onFocus('age')}
                onBlur={onBlur}
                placeholder="18–25"
                min="18" max="25"
                style={iStyle('age')}
              />
            </Field>

            <Field label="City">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onFocus={() => onFocus('city')}
                onBlur={onBlur}
                style={{
                  ...iStyle('city'),
                  appearance: 'none', WebkitAppearance: 'none',
                  color: city ? C.white : C.muted,
                }}
              >
                <option value="">Select your city</option>
                {OC_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Instagram @handle">
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value.replace('@', ''))}
                onFocus={() => onFocus('instagram')}
                onBlur={onBlur}
                placeholder="yourhandle"
                style={iStyle('instagram')}
              />
            </Field>

            {/* Instagram privacy notice */}
            <div
              style={{
                background:   'rgba(245,158,11,0.08)',
                border:       '0.5px solid rgba(245,158,11,0.2)',
                borderRadius: 12,
                padding:      '12px 14px',
                marginBottom: 16,
                display:      'flex',
                alignItems:   'center',
                gap:          10,
              }}
            >
              <Lock size={14} color={C.amber} strokeWidth={2} style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: C.amber, margin: 0, lineHeight: 1.4 }}>
                Instagram stays private until you match.
              </p>
            </div>

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => onFocus('email')}
                onBlur={onBlur}
                placeholder="you@email.com"
                style={iStyle('email')}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => onFocus('password')}
                onBlur={onBlur}
                placeholder="Min 6 characters"
                style={iStyle('password')}
              />
            </Field>

            {/* Age confirm */}
            <motion.button
              type="button"
              onClick={() => setAgeConfirm((v) => !v)}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          10,
                width:        '100%',
                background:   C.cardElevated,
                border:       '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding:      14,
                color:        C.white,
                fontSize:     14,
                marginBottom: 24,
                cursor:       'pointer',
                textAlign:    'left',
              }}
            >
              <span
                style={{
                  width:          18,
                  height:         18,
                  borderRadius:   5,
                  border:         `1.5px solid ${ageConfirm ? C.amber : 'rgba(255,255,255,0.2)'}`,
                  background:     ageConfirm ? C.amber : 'transparent',
                  flexShrink:     0,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  transition:     'all 0.15s',
                }}
              >
                {ageConfirm && <span style={{ fontSize: 11, color: '#fff', fontWeight: 800 }}>✓</span>}
              </span>
              I confirm I am 18 or older.
            </motion.button>

            {error && <ErrorBox>{error}</ErrorBox>}

            <PremiumButton fullWidth disabled={loading} onClick={handleSignUp}>
              {loading ? 'Creating account…' : 'Create Account →'}
            </PremiumButton>

            <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 20 }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', color: C.amber, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
              >
                Log in →
              </button>
            </p>
          </>
        )}

        {/* ── LOG IN ── */}
        {mode === 'login' && (
          <>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => onFocus('email')}
                onBlur={onBlur}
                placeholder="you@email.com"
                style={iStyle('email')}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => onFocus('password')}
                onBlur={onBlur}
                placeholder="Your password"
                style={{ ...iStyle('password'), marginBottom: 24 }}
              />
            </Field>

            {error && <ErrorBox>{error}</ErrorBox>}

            <PremiumButton fullWidth disabled={loading} onClick={handleLogin}>
              {loading ? 'Logging in…' : 'Log In →'}
            </PremiumButton>

            <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 20 }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                style={{ background: 'none', border: 'none', color: C.amber, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
              >
                Sign up →
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ children }) {
  return (
    <motion.p
      animate={{ x: [0, -8, 8, -6, 6, -3, 3, 0] }}
      transition={{ duration: 0.45 }}
      style={{
        fontSize:     13,
        color:        '#EF4444',
        marginBottom: 16,
        lineHeight:   1.5,
        background:   'rgba(239,68,68,0.08)',
        border:       '0.5px solid rgba(239,68,68,0.2)',
        borderRadius: 10,
        padding:      '10px 14px',
      }}
    >
      {children}
    </motion.p>
  );
}
