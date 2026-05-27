import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { signUp, signIn } from '../lib/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlySignupError(err) {
  const msg = (err?.message ?? '').toLowerCase();
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already used')) {
    return 'This email is already registered. Log in instead?';
  }
  if (msg.includes('password') && (msg.includes('6') || msg.includes('weak') || msg.includes('short') || msg.includes('least'))) {
    return 'Your password needs to be at least 6 characters.';
  }
  return 'Something went wrong. Check your connection and try again.';
}

function friendlyLoginError(err) {
  const msg = (err?.message ?? '').toLowerCase();
  if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('not found') || msg.includes('wrong')) {
    return "We couldn't find an account with that email and password. Try again.";
  }
  return 'Something went wrong. Check your connection and try again.';
}

function FieldLabel({ children }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 8px' }}>
      {children}
    </p>
  );
}

function HelperText({ children }) {
  return (
    <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 24px', lineHeight: 1.4 }}>
      {children}
    </p>
  );
}

function ErrorBox({ children }) {
  return (
    <motion.div
      key={children}
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
    </motion.div>
  );
}

export default function AuthPage({ go, onLogin, initialMode = 'signup' }) {
  const [mode,       setMode]       = useState(initialMode);
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus,    setPwFocus]    = useState(false);

  const isSignup = mode === 'signup';

  const inputStyle = (focused) => ({
    width:        '100%',
    background:   C.cardElevated,
    border:       `0.5px solid ${focused ? C.amber : 'rgba(255,255,255,0.09)'}`,
    borderRadius: 14,
    padding:      '14px 16px',
    fontSize:     15,
    color:        C.white,
    outline:      'none',
    boxSizing:    'border-box',
    boxShadow:    focused ? `0 0 0 3px ${C.amberT14}` : 'none',
    transition:   'border-color 0.15s, box-shadow 0.15s',
  });

  const switchMode = (m) => { setMode(m); setError(''); };

  const handleSignUp = async () => {
    setError('');
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setError('Check your email address — it should look like name@gmail.com');
      return;
    }
    if (password.length < 6) {
      setError('Your password needs to be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      const user = await signUp(email.trim(), password);
      onLogin?.(user);
    } catch (err) {
      setError(friendlySignupError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Check your email address — it should look like name@gmail.com');
      return;
    }
    try {
      setLoading(true);
      const user = await signIn(email.trim(), password);
      onLogin?.(user);
    } catch (err) {
      setError(friendlyLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={() => go('landing')} onLogoClick={() => go('landing')} />

      <div style={{ padding: '32px 24px 80px' }}>
        <h1
          style={{
            fontSize:      28,
            fontWeight:    800,
            letterSpacing: '-0.8px',
            margin:        '0 0 8px',
            color:         C.white,
          }}
        >
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 36px', lineHeight: 1.5 }}>
          {isSignup ? 'It only takes a minute.' : 'Log in to continue.'}
        </p>

        {/* Email */}
        <div>
          <FieldLabel>Email address</FieldLabel>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
            placeholder="e.g. yourname@gmail.com"
            style={inputStyle(emailFocus)}
            autoComplete="email"
          />
          {isSignup && <HelperText>You will use this to log in.</HelperText>}
        </div>

        {/* Password */}
        <div style={{ marginTop: isSignup ? 0 : 20 }}>
          <FieldLabel>Password</FieldLabel>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPwFocus(true)}
              onBlur={() => setPwFocus(false)}
              onKeyDown={(e) => e.key === 'Enter' && (isSignup ? handleSignUp() : handleLogin())}
              placeholder="At least 6 characters"
              style={{ ...inputStyle(pwFocus), paddingRight: 52 }}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              style={{
                position:   'absolute',
                right:      14,
                top:        '50%',
                transform:  'translateY(-50%)',
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                padding:    4,
                display:    'flex',
                alignItems: 'center',
                color:      C.muted,
              }}
            >
              {showPw ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
            </button>
          </div>
          {isSignup && <HelperText>At least 6 characters. Keep it safe.</HelperText>}
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <div style={{ marginTop: error ? 0 : 8 }}>
          <PremiumButton fullWidth disabled={loading} onClick={isSignup ? handleSignUp : handleLogin}>
            {loading
              ? (isSignup ? 'Creating account…' : 'Logging in…')
              : (isSignup ? 'Create Account' : 'Log In')}
          </PremiumButton>
        </div>

        <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? 'login' : 'signup')}
            style={{
              background: 'none',
              border:     'none',
              color:      C.amber,
              fontWeight: 700,
              cursor:     'pointer',
              fontSize:   13,
            }}
          >
            {isSignup ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
