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

export default function BottomNav({ activePage, onNavigate, badges = {} }) {
  return (
    <nav
      className="glass"
      style={{
        position:      'fixed',
        bottom:        0,
        left:          0,
        right:         0,
        zIndex:        100,
        borderTop:     '1px solid rgba(17,17,17,0.08)',
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
              paddingTop:     6,
              cursor:         'pointer',
              position:       'relative',
            }}
          >
            {/* Active indicator dot */}
            {active && (
              <motion.div
                layoutId="nav-indicator"
                style={{
                  position:     'absolute',
                  top:          0,
                  left:         '50%',
                  transform:    'translateX(-50%)',
                  width:        20,
                  height:       2.5,
                  borderRadius: 999,
                  background:   C.amber,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}

            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <tab.Icon
                size={22}
                strokeWidth={active ? 2.3 : 1.7}
                color={active ? C.amber : 'rgba(17,17,17,0.40)'}
                style={{ transition: 'color 0.15s' }}
              />
              {badges[tab.key] && (
                <div style={{
                  position: 'absolute', top: -2, right: -3,
                  width: 7, height: 7, borderRadius: '50%',
                  background: C.amber,
                  border: '1.5px solid #FAFAFA',
                }} />
              )}
            </div>

            <span style={{
              fontSize:      10,
              fontWeight:    active ? 700 : 500,
              color:         active ? C.amber : 'rgba(17,17,17,0.40)',
              transition:    'color 0.15s',
              letterSpacing: '0.1px',
            }}>
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
