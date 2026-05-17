import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronRight, X } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import { DUOS } from '../data/duos.js';
import { getDiscoveryDuos } from '../lib/duos.js';

const PORTRAIT_H = 200;
const CARD_TRANSITION = { duration: 0.22, ease: [0.16, 1, 0.3, 1] };

function DeckCard({ duo }) {
  const tags = duo.vibes.slice(0, 2);
  const members = duo.members?.slice(0, 2) ?? [];

  return (
    <div
      style={{
        background:   C.cardElevated,
        border:       '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow:     'hidden',
        boxShadow:    '0 16px 52px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
        userSelect:   'none',
      }}
    >
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: C.gradientCTA }} />

      <div style={{ display: 'flex', height: PORTRAIT_H }}>
        {members.length > 0 ? members.map((m, i) => (
          <div
            key={i}
            style={{
              flex:           1,
              background:     duo.cardBg?.[i] ?? C.cardDeep,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              position:       'relative',
              borderRight:    i === 0 ? '0.5px solid rgba(0,0,0,0.35)' : 'none',
            }}
          >
            <span
              style={{
                fontSize:      60,
                fontWeight:    800,
                color:         'rgba(255,255,255,0.18)',
                letterSpacing: '-2px',
                lineHeight:    1,
                position:      'relative',
                zIndex:        1,
                userSelect:    'none',
              }}
            >
              {(m.name || '?')[0].toUpperCase()}
            </span>
            <div
              style={{
                position:      'absolute',
                inset:         0,
                background:    'linear-gradient(to bottom, transparent 28%, rgba(0,0,0,0.62) 100%)',
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                position:      'absolute',
                bottom:        14,
                left:          0,
                right:         0,
                textAlign:     'center',
                fontSize:      12,
                fontWeight:    700,
                color:         'rgba(255,255,255,0.78)',
                zIndex:        1,
                letterSpacing: '0.3px',
              }}
            >
              {m.name}
            </span>
          </div>
        )) : (
          <div
            style={{
              flex:           1,
              background:     C.cardDeep,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 800, color: 'rgba(255,255,255,0.12)' }}>
              DUO
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px 18px' }}>
        <p
          style={{
            fontSize:      18,
            fontWeight:    800,
            color:         C.white,
            marginBottom:  3,
            letterSpacing: '-0.4px',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
            whiteSpace:    'nowrap',
          }}
        >
          {duo.name}
        </p>
        <p
          style={{
            fontSize:     12,
            color:        C.muted,
            marginBottom: tags.length > 0 ? 12 : 0,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}
        >
          {[duo.ages, duo.cities].filter(Boolean).join(' · ')}
        </p>
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background:    'rgba(245,158,11,0.1)',
                  color:         C.amber,
                  borderRadius:  9999,
                  padding:       '4px 10px',
                  fontSize:      12,
                  fontWeight:    600,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PeekSliver({ duo }) {
  if (!duo) return null;
  const col0 = duo.cardBg?.[0] ?? '#222';
  const col1 = duo.cardBg?.[1] ?? col0;
  return (
    <div
      aria-hidden="true"
      style={{
        position:     'absolute',
        top:          '100%',
        left:         14, right: 14,
        height:       28,
        marginTop:    -5,
        borderRadius: '0 0 16px 16px',
        background:   `linear-gradient(to bottom, ${col0}88, ${col1}44)`,
        border:       '0.5px solid rgba(255,255,255,0.05)',
        borderTop:    'none',
        zIndex:       -1,
      }}
    />
  );
}

function DeckActions({ onPass, onView, onRequest }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 36 }}>
      <motion.button
        type="button"
        onClick={onPass}
        whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.1 }}
        aria-label="Pass this duo"
        style={{
          flexShrink:     0,
          width:          52,
          height:         52,
          borderRadius:   14,
          border:         '0.5px solid rgba(255,255,255,0.1)',
          background:     'transparent',
          color:          C.muted,
          cursor:         'pointer',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            2,
        }}
      >
        <X size={16} strokeWidth={2.2} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3px' }}>PASS</span>
      </motion.button>

      <motion.button
        type="button"
        onClick={onView}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
        style={{
          flex:         1,
          height:       52,
          borderRadius: 14,
          border:       '0.5px solid rgba(255,255,255,0.1)',
          background:   'rgba(255,255,255,0.05)',
          color:        C.white,
          fontSize:     14,
          fontWeight:   700,
          cursor:       'pointer',
        }}
      >
        View Duo
      </motion.button>

      <motion.button
        type="button"
        onClick={onRequest}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
        style={{
          flex:         1.3,
          height:       52,
          borderRadius: 14,
          border:       'none',
          background:   C.gradientCTA,
          color:        '#fff',
          fontSize:     14,
          fontWeight:   800,
          cursor:       'pointer',
          boxShadow:    '0 4px 16px rgba(245,158,11,0.25)',
        }}
      >
        Request 2v2
      </motion.button>
    </div>
  );
}

function DeckEmpty({ onRestart }) {
  return (
    <div
      style={{
        background:   C.cardElevated,
        border:       '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        padding:      '44px 24px',
        textAlign:    'center',
      }}
    >
      <p
        style={{
          fontSize:      17,
          fontWeight:    800,
          color:         C.white,
          margin:        '0 0 8px',
          letterSpacing: '-0.3px',
        }}
      >
        All caught up.
      </p>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 24px', lineHeight: 1.55 }}>
        You've seen all duos for now.
        <br />
        Check back soon.
      </p>
      <motion.button
        type="button"
        onClick={onRestart}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
        style={{
          background:   'rgba(255,255,255,0.07)',
          border:       '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding:      '10px 22px',
          color:        C.white,
          fontSize:     14,
          fontWeight:   700,
          cursor:       'pointer',
        }}
      >
        Start over
      </motion.button>
    </div>
  );
}

function normalizeDuo(d) {
  const members = (d.duo_members ?? []).map((m) => ({
    name: m.profiles?.name ?? 'Member',
    age:  '',
    city: d.city ?? '',
  }));
  return {
    id:        d.id,
    name:      d.name,
    vibes:     Array.isArray(d.vibes) ? d.vibes : [],
    spots:     Array.isArray(d.spots) ? d.spots : [],
    lookingFor: d.looking_for ?? '',
    cities:    d.city ?? '',
    ages:      '',
    members:   members.length > 0 ? members : [{ name: d.name, age: '', city: '' }],
    cardBg:    null,
  };
}

export default function HomePage({ go, onLogout, currentUser }) {
  const [deckDuos, setDeckDuos] = useState([...DUOS]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    getDiscoveryDuos(currentUser.id)
      .then((duos) => {
        if (duos && duos.length > 0) setDeckDuos(duos.map(normalizeDuo));
      })
      .catch(() => {});
  }, [currentUser]);

  const isDeckDone   = currentIndex >= deckDuos.length;
  const currentDuo   = isDeckDone ? null : deckDuos[currentIndex];
  const nextDuo      = deckDuos[currentIndex + 1] ?? null;

  const handlePass    = () => setCurrentIndex((i) => Math.min(i + 1, deckDuos.length));
  const handleView    = () => currentDuo && go('duo_detail', currentDuo);
  const handleRequest = () => currentDuo && go('request', currentDuo);
  const handleRestart = () => setCurrentIndex(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <TopBar
        onLogout={onLogout}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.button
              type="button"
              aria-label="Notifications"
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
              <Bell size={17} color={C.muted} strokeWidth={1.8} />
            </motion.button>
            <div
              style={{
                width:        30,
                height:       30,
                borderRadius: '50%',
                background:   C.gradientCTA,
                flexShrink:   0,
              }}
            />
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        <div style={{ padding: '24px 16px 0' }}>
          <span
            style={{
              fontSize:      10,
              fontWeight:    700,
              letterSpacing: '1.2px',
              color:         C.muted,
              textTransform: 'uppercase',
              display:       'block',
              marginBottom:  10,
            }}
          >
            Discover duos
          </span>
          <h1
            style={{
              fontSize:      26,
              fontWeight:    800,
              letterSpacing: '-0.8px',
              color:         C.white,
              margin:        '0 0 4px',
            }}
          >
            Who's the next 2v2?
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px', lineHeight: 1.4 }}>
            One duo at a time. No pressure.
          </p>
        </div>

        {/* Find a Homie banner */}
        <div
          style={{
            background:     'rgba(245,158,11,0.07)',
            border:         '1px solid rgba(245,158,11,0.15)',
            borderRadius:   16,
            padding:        '14px 16px',
            margin:         '0 16px 16px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            gap:            12,
          }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0, marginBottom: 2 }}>
              No duo yet?
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
              Find a Homie to roll with
            </p>
          </div>
          <motion.button
            type="button"
            onClick={() => go('find_homie')}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              background:   C.gradientCTA,
              border:       'none',
              borderRadius: 10,
              padding:      '8px 16px',
              fontSize:     13,
              fontWeight:   700,
              color:        '#0A0A0F',
              cursor:       'pointer',
              flexShrink:   0,
            }}
          >
            Find →
          </motion.button>
        </div>

        <div style={{ padding: '0 16px' }}>
          {isDeckDone ? (
            <DeckEmpty onRestart={handleRestart} />
          ) : (
            <>
              <div style={{ position: 'relative', paddingBottom: 36 }}>
                <PeekSliver duo={nextDuo} />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    transition={CARD_TRANSITION}
                  >
                    <DeckCard duo={currentDuo} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <DeckActions
                onPass={handlePass}
                onView={handleView}
                onRequest={handleRequest}
              />
            </>
          )}
        </div>
      </div>

    </div>
  );
}
