import { motion } from 'framer-motion';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { fadeUp } from '../lib/motion';

export default function PlaceholderPage({ go, title = 'Coming soon', activePage = 'home', onLogout }) {
  return (
    <div
      style={{
        minHeight:     '100vh',
        background:    C.bg,
        color:         C.white,
        display:       'flex',
        flexDirection: 'column',
      }}
    >
      <TopBar title={activePage === 'home' ? undefined : title} onLogout={onLogout} />

      <motion.main
        variants={fadeUp}
        initial="initial"
        animate="animate"
        style={{
          flex:           1,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          textAlign:      'center',
          padding:        '32px 20px 96px',
        }}
      >
        <div
          style={{
            width:          56,
            height:         56,
            borderRadius:   16,
            background:     '#17171A',
            border:         '0.5px solid rgba(255,255,255,0.08)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       24,
            marginBottom:   20,
          }}
        >
          🛠
        </div>
        <h1
          style={{
            fontSize:      24,
            fontWeight:    800,
            letterSpacing: '-0.5px',
            color:         C.white,
            margin:        '0 0 8px',
          }}
        >
          Almost there
        </h1>
        <p
          style={{
            color:      C.muted,
            fontSize:   14,
            lineHeight: 1.6,
            margin:     '0 0 28px',
            maxWidth:   240,
          }}
        >
          This feature is on its way.
        </p>
        <PremiumButton onClick={() => go('home')} style={{ minWidth: 200 }}>
          Back to Home
        </PremiumButton>
      </motion.main>
    </div>
  );
}
