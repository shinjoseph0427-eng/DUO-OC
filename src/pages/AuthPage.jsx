import { useState } from 'react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';

export default function AuthPage({ go }) {
  const [name, setName]     = useState('');
  const [ig, setIg]         = useState('');
  const [nameFocus, setNameFocus] = useState(false);
  const [igFocus, setIgFocus]     = useState(false);

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
    marginBottom: 20,
    boxShadow:    focused ? '0 0 0 3px rgba(245,158,11,0.12)' : 'none',
    transition:   'border-color 0.15s, box-shadow 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <TopBar title="Join duo oc." />

      <div style={{ padding: '32px 16px' }}>
        <label
          style={{
            display:       'block',
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color:         C.muted,
            marginBottom:  8,
          }}
        >
          What's your name?
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setNameFocus(true)}
          onBlur={() => setNameFocus(false)}
          placeholder="First name"
          style={inputStyle(nameFocus)}
        />

        <label
          style={{
            display:       'block',
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color:         C.muted,
            marginBottom:  8,
          }}
        >
          Instagram @handle
        </label>
        <input
          type="text"
          value={ig}
          onChange={(e) => setIg(e.target.value.replace('@', ''))}
          onFocus={() => setIgFocus(true)}
          onBlur={() => setIgFocus(false)}
          placeholder="yourhandle"
          style={{ ...inputStyle(igFocus), marginBottom: 28 }}
        />

        <PremiumButton fullWidth disabled={!name || !ig} onClick={() => go('onboarding')}>
          Continue →
        </PremiumButton>

        <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 24 }}>
          18–25 only · OC only
        </p>
      </div>
    </div>
  );
}
