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

export default function BottomNav({ activePage, onNavigate, badges = {}, pulseTab = null }) {
  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .bottom-nav-mobile { display: none !important; }
          .side-nav-desktop { display: flex !important; }
        }
        @media (max-width: 767px) {
          .side-nav-desktop { display: none !important; }
        }
        @keyframes navTabPulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,107,0,0.55); }
          70%  { box-shadow: 0 0 0 11px rgba(255,107,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,107,0,0); }
        }
      `}</style>

      <nav
        className="glass bottom-nav-mobile"
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
                {tab.key === pulseTab && (
                  <span
                    style={{
                      position:     'absolute',
                      top:          '50%',
                      left:         '50%',
                      transform:    'translate(-50%, -50%)',
                      width:        30,
                      height:       30,
                      borderRadius: '50%',
                      pointerEvents:'none',
                      animation:    'navTabPulse 1.6s ease-out infinite',
                    }}
                  />
                )}
                <tab.Icon
                  size={22}
                  strokeWidth={active ? 2.3 : 1.7}
                  color={tab.key === pulseTab ? C.amber : active ? C.amber : 'rgba(17,17,17,0.40)'}
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

      <nav
        className="side-nav-desktop"
        style={{
          display:       'none',
          flexDirection: 'column',
          width:         240,
          height:        '100vh',
          borderRight:   `0.5px solid ${C.border}`,
          background:    C.bg,
          padding:       '24px 16px',
          position:      'fixed',
          top:           0,
          left:          0,
          zIndex:        100,
          gap:           4,
        }}
      >
        <div
          style={{
            fontSize:     18,
            fontWeight:   800,
            color:        C.white,
            marginBottom: 32,
            paddingLeft:  12,
          }}
        >
          DUO OC
        </div>

        {TABS.map((tab) => {
          const active = tab.key === activePage;
          return (
            <button
              key={tab.key}
              type="button"
              aria-label={`Go to ${tab.label}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate?.(tab.key)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          12,
                padding:      '12px 14px',
                borderRadius: 12,
                cursor:       'pointer',
                background:   active ? C.amberT08 : 'transparent',
                color:        active ? C.amber : C.muted,
                fontWeight:   active ? 600 : 400,
                fontSize:     14,
                transition:   'background 0.15s',
              }}
            >
              <tab.Icon size={20} />
              <span>{tab.label}</span>
              {badges[tab.key] && (
                <span style={{ width: 7, height: 7, marginLeft: 'auto', borderRadius: '50%', background: C.amber }} />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
