import { motion } from 'framer-motion';
import { Home, Search, Calendar, MessageCircle, User } from 'lucide-react';
import { C } from '../tokens';

const TABS = [
  { key: 'home',     label: 'Home',     Icon: Home           },
  { key: 'explore',  label: 'Explore',  Icon: Search         },
  { key: 'hangouts', label: 'Hangouts', Icon: Calendar       },
  { key: 'chat',     label: 'Chat',     Icon: MessageCircle  },
  { key: 'me',       label: 'Me',       Icon: User           },
];

export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav
      className="glass"
      style={{
        position:      'sticky',
        bottom:        0,
        zIndex:        100,
        borderTop:     '0.5px solid rgba(255,255,255,0.07)',
        display:       'flex',
        alignItems:    'stretch',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height:        'calc(64px + env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map((tab) => {
        const active = tab.key === activePage;

        return (
          <motion.button
            key={tab.key}
            type="button"
            aria-label={`Go to ${tab.label}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onNavigate?.(tab.key)}
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.1 }}
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            3,
              paddingTop:     8,
              cursor:         'pointer',
              position:       'relative',
            }}
          >
            {active && (
              <motion.div
                layoutId="nav-indicator"
                style={{
                  position:     'absolute',
                  top:          0,
                  left:         '50%',
                  transform:    'translateX(-50%)',
                  width:        20,
                  height:       2,
                  borderRadius: 999,
                  background:   C.gradientCTA,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}

            <tab.Icon
              size={22}
              strokeWidth={active ? 2.4 : 1.8}
              color={active ? C.amber : C.muted}
              style={{ transition: 'color 0.15s' }}
            />
            <span
              style={{
                fontSize:      10,
                fontWeight:    active ? 700 : 500,
                color:         active ? C.amber : C.muted,
                transition:    'color 0.15s',
                letterSpacing: '0.2px',
              }}
            >
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
