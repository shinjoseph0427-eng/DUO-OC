import { LogOut, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import { signOut } from '../lib/auth.js';

export default function MePage({ go, currentUser }) {
  const handleLogout = async () => {
    await signOut();
    go('landing');
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title="Me"
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.button
              type="button"
              aria-label="Edit profile"
              onClick={() => go('edit_profile')}
              whileTap={{ scale: 0.88 }}
              transition={{ duration: 0.1 }}
              style={{
                width:          34,
                height:         34,
                borderRadius:   10,
                background:     'rgba(255,255,255,0.06)',
                border:         '0.5px solid rgba(255,255,255,0.08)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                cursor:         'pointer',
              }}
            >
              <Pencil size={16} color={C.muted} strokeWidth={1.8} />
            </motion.button>
            <motion.button
              type="button"
              aria-label="Log out"
              onClick={handleLogout}
              whileTap={{ scale: 0.88 }}
              transition={{ duration: 0.1 }}
              style={{
                width:          34,
                height:         34,
                borderRadius:   10,
                background:     'rgba(255,255,255,0.06)',
                border:         '0.5px solid rgba(255,255,255,0.08)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                cursor:         'pointer',
              }}
            >
              <LogOut size={16} color={C.muted} strokeWidth={1.8} />
            </motion.button>
          </div>
        }
      />

      <div style={{ flex: 1, padding: '20px 16px' }}>
        <p
          style={{
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '1.1px',
            textTransform: 'uppercase',
            color:         C.muted,
            margin:        '0 0 10px',
          }}
        >
          My Duo
        </p>
        <div
          style={{
            background:   C.cardElevated,
            borderLeft:   `3px solid ${C.amber}`,
            borderRadius: 12,
            padding:      16,
            marginBottom: 28,
          }}
        >
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            Your duo profile will appear here after joining.
          </p>
        </div>

        <p
          style={{
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '1.1px',
            textTransform: 'uppercase',
            color:         C.muted,
            margin:        '0 0 10px',
          }}
        >
          Matches
        </p>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
          No matches yet. Start browsing duos!
        </p>
      </div>

    </div>
  );
}
