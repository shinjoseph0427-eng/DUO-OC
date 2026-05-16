import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { C } from '../tokens';

function Wordmark() {
  return (
    <span
      style={{
        fontSize:      20,
        fontWeight:    800,
        letterSpacing: '-0.5px',
        lineHeight:    1,
      }}
    >
      <span className="gradient-text">duo oc.</span>
    </span>
  );
}

export default function TopBar({ showBack = false, onBack, title, rightContent }) {
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
        justifyContent: 'space-between',
        padding:      '0 16px',
        boxSizing:    'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {showBack ? (
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
              marginLeft:     -4,
              cursor:         'pointer',
            }}
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </motion.button>
        ) : (
          <Wordmark />
        )}
        {title && (
          <span
            style={{
              fontSize:     15,
              fontWeight:   700,
              color:        C.white,
              marginLeft:   showBack ? 6 : 12,
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}
          >
            {title}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {rightContent}
      </div>
    </header>
  );
}
