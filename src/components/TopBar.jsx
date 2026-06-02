import { motion } from 'framer-motion';
import { ChevronLeft, LogOut } from 'lucide-react';
import { C } from '../tokens';

function Wordmark() {
  return (
    <span style={{
      fontSize:      20,
      fontWeight:    900,
      letterSpacing: '-0.5px',
      lineHeight:    1,
      fontFamily:    "'Satoshi', 'Inter', system-ui, sans-serif",
    }}>
      <span className="gradient-text">WEEKLY</span>
    </span>
  );
}

export default function TopBar({ showBack = false, onBack, rightContent, onLogout, onLogoClick }) {
  return (
    <header
      className="glass"
      style={{
        position:     'sticky',
        top:          0,
        zIndex:       100,
        height:       56,
        borderBottom: '1px solid rgba(17,17,17,0.08)',
        display:      'flex',
        alignItems:   'center',
        padding:      '0 12px',
        boxSizing:    'border-box',
      }}
    >
      {/* Left */}
      <div style={{ width: 44, display: 'flex', alignItems: 'center' }}>
        {showBack && (
          <motion.button
            type="button"
            onClick={onBack}
            aria-label="Back"
            whileTap={{ scale: 0.90 }}
            transition={{ duration: 0.1 }}
            style={{
              width: 36, height: 36,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 10,
              background: 'rgba(17,17,17,0.05)',
              border: '1px solid rgba(17,17,17,0.08)',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={20} color="#111111" strokeWidth={2.2} />
          </motion.button>
        )}
      </div>

      {/* Center */}
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
        ) : <Wordmark />}
      </div>

      {/* Right */}
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
              width: 36, height: 36,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 10,
              background: 'rgba(17,17,17,0.05)',
              border: '1px solid rgba(17,17,17,0.08)',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} color="rgba(17,17,17,0.55)" strokeWidth={2} />
          </motion.button>
        )}
      </div>
    </header>
  );
}
