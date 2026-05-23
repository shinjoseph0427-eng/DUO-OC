import { motion } from 'framer-motion';
import { ChevronLeft, LogOut } from 'lucide-react';
import { C } from '../tokens';

function Wordmark() {
  return (
    <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>
      <span className="gradient-text">duo oc.</span>
    </span>
  );
}

// 3-column layout: [back | spacer] [logo] [actions]
// title prop kept for backward compat but not rendered — logo always in center
export default function TopBar({ showBack = false, onBack, rightContent, onLogout, onLogoClick }) {
  return (
    <header
      className="glass"
      style={{
        position:     'sticky',
        top:          0,
        zIndex:       100,
        height:       56,
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        display:      'flex',
        alignItems:   'center',
        padding:      '0 12px',
        boxSizing:    'border-box',
      }}
    >
      {/* Left — back button or spacer */}
      <div style={{ width: 44, display: 'flex', alignItems: 'center' }}>
        {showBack && (
          <motion.button
            type="button"
            onClick={onBack}
            aria-label="Back"
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.1 }}
            style={{
              width:          36,
              height:         36,
              display:        'inline-flex',
              alignItems:     'center',
              justifyContent: 'center',
              borderRadius:   10,
              background:     'rgba(255,255,255,0.06)',
              border:         '0.5px solid rgba(255,255,255,0.08)',
              color:          C.white,
              cursor:         'pointer',
            }}
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </motion.button>
        )}
      </div>

      {/* Center — logo, always shown */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {onLogoClick ? (
          <motion.button
            type="button"
            onClick={onLogoClick}
            aria-label="Home"
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.1 }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
          >
            <Wordmark />
          </motion.button>
        ) : (
          <Wordmark />
        )}
      </div>

      {/* Right — actions */}
      <div style={{ width: 44, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        {rightContent}
        {onLogout && (
          <motion.button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.1 }}
            style={{
              width:          36,
              height:         36,
              display:        'inline-flex',
              alignItems:     'center',
              justifyContent: 'center',
              borderRadius:   10,
              background:     'rgba(255,255,255,0.04)',
              border:         '0.5px solid rgba(255,255,255,0.07)',
              cursor:         'pointer',
            }}
          >
            <LogOut size={16} color={C.muted} strokeWidth={2} />
          </motion.button>
        )}
      </div>
    </header>
  );
}
