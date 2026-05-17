import { useState } from 'react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { signUp } from '../lib/auth.js';

const OC_CITIES = [
  'Irvine', 'Newport Beach', 'Costa Mesa', 'Fullerton', 'Anaheim', 'Orange',
  'Tustin', 'Huntington Beach', 'Garden Grove', 'Buena Park', 'Cypress',
  'Brea', 'Yorba Linda', 'Other OC',
];

export default function AuthPage({ go, onLogin }) {
  const [name, setName]         = useState('');
  const [age, setAge]           = useState('');
  const [city, setCity]         = useState('');
  const [instagram, setInstagram] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [focusedField, setFocusedField] = useState('');

  const inputStyle = (field) => ({
    width:        '100%',
    background:   C.cardElevated,
    border:       `0.5px solid ${focusedField === field ? C.amber : 'rgba(255,255,255,0.09)'}`,
    borderRadius: 14,
    padding:      '14px 16px',
    fontSize:     15,
    color:        C.white,
    outline:      'none',
    boxSizing:    'border-box',
    marginBottom: 16,
    boxShadow:    focusedField === field ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
    transition:   'border-color 0.15s, box-shadow 0.15s',
  });

  const labelStyle = {
    display:       'block',
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color:         C.muted,
    marginBottom:  8,
  };

  const handleSubmit = async () => {
    setError('');
    if (!name || !age || !city || !instagram || !email || !password) {
      setError('All fields are required.');
      return;
    }
    const n = Number(age);
    if (n < 18 || n > 25) {
      setError('You must be 18–25 to join.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      const user = await signUp(email, password, name, age, city, instagram);
      onLogin?.(user);
      go('onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <TopBar showBack onBack={() => go('landing')} title="Join duo oc." />

      <div style={{ padding: '24px 16px 48px' }}>

        {/* Name */}
        <label style={labelStyle}>First name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField('')}
          placeholder="Your first name"
          style={inputStyle('name')}
        />

        {/* Age */}
        <label style={labelStyle}>Age</label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          onFocus={() => setFocusedField('age')}
          onBlur={() => setFocusedField('')}
          placeholder="18–25"
          min="18"
          max="25"
          style={inputStyle('age')}
        />

        {/* City */}
        <label style={labelStyle}>City</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onFocus={() => setFocusedField('city')}
          onBlur={() => setFocusedField('')}
          style={{
            ...inputStyle('city'),
            appearance: 'none',
            WebkitAppearance: 'none',
            color: city ? C.white : C.muted,
          }}
        >
          <option value="">Select your city</option>
          {OC_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Instagram */}
        <label style={labelStyle}>Instagram @handle</label>
        <input
          type="text"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value.replace('@', ''))}
          onFocus={() => setFocusedField('instagram')}
          onBlur={() => setFocusedField('')}
          placeholder="yourhandle"
          style={inputStyle('instagram')}
        />

        {/* Email */}
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField('')}
          placeholder="you@email.com"
          style={inputStyle('email')}
        />

        {/* Password */}
        <label style={labelStyle}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField('')}
          placeholder="Min 6 characters"
          style={{ ...inputStyle('password'), marginBottom: 24 }}
        />

        {/* Error */}
        {error && (
          <p style={{
            fontSize:     13,
            color:        C.danger,
            marginBottom: 16,
            lineHeight:   1.5,
            background:   'rgba(239,68,68,0.08)',
            border:       '0.5px solid rgba(239,68,68,0.2)',
            borderRadius: 10,
            padding:      '10px 14px',
          }}>
            {error}
          </p>
        )}

        <PremiumButton
          fullWidth
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? 'Creating account...' : 'Continue →'}
        </PremiumButton>

        <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 20 }}>
          18–25 only · OC only
        </p>
      </div>
    </div>
  );
}
