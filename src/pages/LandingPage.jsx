import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimation } from 'framer-motion';
import { X, Heart, Lock } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────
const ORANGE = '#FF5C00';
const BG     = '#FFFFFF';
const FONT_H = "'Bricolage Grotesque', system-ui, sans-serif";
const FONT_B = "'DM Sans', system-ui, sans-serif";

// ── Card data ────────────────────────────────────────────────────────────
const CARDS = [
  { letter: 'A', name: 'Ari',    location: 'Irvine · evenings',       tags: ['Coffee', 'Walks', 'Wed'],       bg: '#fff0e8' },
  { letter: 'J', name: 'Jae',    location: 'Fullerton · weekends',    tags: ['KBBQ', 'Late nights', 'Fri'],   bg: '#f0f5e8' },
  { letter: 'S', name: 'Sofia',  location: 'Costa Mesa · afternoons', tags: ['Boba', 'Art walks', 'Sun'],     bg: '#e8edf5' },
];

// ── Feature rows ─────────────────────────────────────────────────────────
const FEATURES = [
  {
    side: 'left',  letter: 'W',  cardBg: '#fff0e8',
    badgeLabel: 'Set week',      badgeSub: 'Days and times',
    tag: 'Your availability',
    heading: ['Pick your days.', 'Pick your times.'],
    body: 'Tell WEEKLY when you are free this week so your matches start with real overlap.',
  },
  {
    side: 'right', letter: 'O', cardBg: '#e8edf5',
    badgeLabel: 'Overlap',   badgeSub: 'Shared free time',
    tag: 'The match',
    heading: ['Find people whose', 'week lines up.'],
    body: 'See people who share at least one day and time with you, then choose who feels right.',
  },
  {
    side: 'left',  letter: 'OC', cardBg: '#f0f5e8',
    badgeLabel: 'OC only',     badgeSub: 'Real local plans',
    tag: 'Local',
    heading: ['Plans in OC.', 'Actual places.'],
    body: 'From Newport to Fullerton. Real spots, real times, real people around Orange County.',
  },
  {
    side: 'right', letter: 'Y', cardBg: '#f5e8f0',
    badgeLabel: 'Say yes', badgeSub: 'Requests first',
    tag: 'Chat',
    heading: ['Send a request.', 'Chat if both say yes.'],
    body: 'No cold DMs. Send a request, match when it is mutual, then keep the conversation going.',
  },
];

// ── Social proof avatars ──────────────────────────────────────────────────
const AVATARS = [
  { letter: 'A', bg: '#FDECEA', color: '#C0392B' },
  { letter: 'S', bg: '#EDE7F6', color: '#6A1B9A' },
  { letter: 'M', bg: '#E8F5E9', color: '#2E7D32' },
  { letter: 'J', bg: '#FFF8E1', color: '#F57F17' },
  { letter: 'R', bg: '#E3F2FD', color: '#1565C0' },
];

// ── Global CSS keyframes ──────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes lp-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.2; transform: scale(0.72); }
  }
  @keyframes lp-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .lp-pulse-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: ${ORANGE}; flex-shrink: 0;
    animation: lp-pulse 1.4s ease-in-out infinite;
    display: inline-block;
  }
  .lp-shimmer-sweep {
    position: absolute; inset: 0; pointer-events: none;
    border-radius: inherit;
    background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%);
    background-size: 200% 100%;
    animation: lp-shimmer 3s linear infinite;
    animation-delay: 2s;
  }
  .lp-hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: center;
    min-height: calc(100vh - 60px);
    padding: 60px 0;
  }
  .lp-feature-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: center;
    margin-bottom: 80px;
  }
  .lp-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    max-width: 1100px;
    margin: 0 auto;
  }
  @media (max-width: 860px) {
    .lp-hero-grid { grid-template-columns: 1fr; min-height: auto; padding: 40px 0; }
    .lp-card-col  { display: none !important; }
    .lp-feature-row { grid-template-columns: 1fr; gap: 24px; margin-bottom: 56px; }
    .lp-stats-grid  { grid-template-columns: 1fr; }
  }
  @media (max-width: 540px) {
    .lp-pad { padding-left: 20px !important; padding-right: 20px !important; }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────
function CTAButton({ label, onClick, style: extra = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        background: ORANGE, color: '#fff',
        fontFamily: FONT_H, fontWeight: 700, fontSize: 15,
        border: 'none', borderRadius: 9999,
        padding: '14px 36px', cursor: 'pointer',
        boxShadow: 'rgba(255,92,0,.28) 0 8px 24px',
        ...extra,
      }}
    >
      {label}
      <span className="lp-shimmer-sweep" aria-hidden="true" />
    </button>
  );
}

// ── Card face (shared by front + back cards) ──────────────────────────────
function CardFace({ card, bg }) {
  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 28,
      background: bg || card.bg || '#fff0e8',
      position: 'relative', overflow: 'hidden', userSelect: 'none',
    }}>
      {/* Giant faded initial */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -56%)',
        fontFamily: FONT_H, fontWeight: 800, fontSize: 120,
        color: 'rgba(0,0,0,0.05)',
        lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
      }}>
        {card.letter}
      </div>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
        borderRadius: '0 0 28px 28px', pointerEvents: 'none',
      }} />
      {/* Info */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 24px' }}>
        <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 18, color: '#fff', marginBottom: 4, lineHeight: 1.2 }}>
          {card.name}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>
          {card.location}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {card.tags.map(tag => (
            <span key={tag} style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              border: '0.5px solid rgba(255,255,255,0.25)',
              borderRadius: 9999, padding: '4px 10px',
              fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 500,
            }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Swipeable front card ──────────────────────────────────────────────────
const SwipeCard = forwardRef(function SwipeCard({ card, onSwiped }, ref) {
  const controls   = useAnimation();
  const x          = useMotionValue(0);
  const rotateVal  = useMotionValue(0);
  const [label, setLabel] = useState(null); // 'duo' | 'nope' | null

  // Keep rotation in sync with drag x
  useEffect(() => {
    const unsub = x.on('change', v => rotateVal.set(v * 0.07));
    return unsub;
  }, [x, rotateVal]);

  // Expose swipe(dir) to parent for Pass/Like buttons
  useImperativeHandle(ref, () => ({
    swipe: async (dir) => {
      setLabel(dir > 0 ? 'duo' : 'nope');
      await controls.start({ x: dir * 680, opacity: 0, transition: { duration: 0.38, ease: 'easeIn' } });
      onSwiped();
    },
  }), [controls, onSwiped]);

  const handleDrag = () => {
    const curr = x.get();
    if (curr > 28)       setLabel('duo');
    else if (curr < -28) setLabel('nope');
    else                 setLabel(null);
  };

  const handleDragEnd = async (_, info) => {
    if (Math.abs(info.offset.x) > 90) {
      const dir = info.offset.x > 0 ? 1 : -1;
      setLabel(dir > 0 ? 'duo' : 'nope');
      await controls.start({ x: dir * 680, opacity: 0, transition: { duration: 0.38, ease: 'easeIn' } });
      onSwiped();
    } else {
      await controls.start({ x: 0, transition: { type: 'spring', stiffness: 420, damping: 32 } });
      rotateVal.set(0);
      setLabel(null);
    }
  };

  return (
    <motion.div
      style={{ x, rotate: rotateVal, position: 'absolute', inset: 0, zIndex: 3, cursor: 'grab', touchAction: 'none' }}
      animate={controls}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
    >
      {/* YES label */}
      <AnimatePresence>
        {label === 'duo' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', top: 28, left: 20, zIndex: 20,
              transform: 'rotate(-14deg)',
              background: '#4cd964', color: '#fff',
              fontFamily: FONT_H, fontWeight: 800, fontSize: 20,
              padding: '5px 14px', borderRadius: 8,
              border: '2.5px solid rgba(255,255,255,0.7)', letterSpacing: 2,
            }}
          >YES</motion.div>
        )}
      </AnimatePresence>

      {/* NOPE label */}
      <AnimatePresence>
        {label === 'nope' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', top: 28, right: 20, zIndex: 20,
              transform: 'rotate(14deg)',
              background: '#e24b4a', color: '#fff',
              fontFamily: FONT_H, fontWeight: 800, fontSize: 20,
              padding: '5px 14px', borderRadius: 8,
              border: '2.5px solid rgba(255,255,255,0.7)', letterSpacing: 2,
            }}
          >NOPE</motion.div>
        )}
      </AnimatePresence>

      <CardFace card={card} />
    </motion.div>
  );
});

// ── Lock overlay (appears after swipe) ────────────────────────────────────
function LockOverlay({ onSignUp }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 10, borderRadius: 28,
        background: BG,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 28, textAlign: 'center',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%', background: '#fff5f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
      }}>
        <Lock size={22} color={ORANGE} strokeWidth={2.2} />
      </div>
      <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 17, color: '#111', marginBottom: 8 }}>
        Sign up to keep swiping
      </div>
      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 22, lineHeight: 1.5 }}>
        There are people in OC whose week can line up with yours.
      </div>
      <CTAButton label="Get started" onClick={onSignUp} />
    </motion.div>
  );
}

// ── Card stack (right column) ─────────────────────────────────────────────
function CardStack({ onSignUp }) {
  const [locked, setLocked] = useState(false);
  const cardRef = useRef(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {/* 300 × 420 stack */}
      <div style={{ position: 'relative', width: 300, height: 420 }}>
        {/* Back card 2 */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          transform: 'rotate(7deg) translateY(12px) scale(0.94)',
          transformOrigin: 'center bottom',
        }}>
          <CardFace card={CARDS[2]} />
        </div>
        {/* Back card 1 */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          transform: 'rotate(-4deg) translateY(6px) scale(0.97)',
          transformOrigin: 'center bottom',
        }}>
          <CardFace card={CARDS[1]} />
        </div>
        {/* Front card or lock overlay */}
        {!locked
          ? <SwipeCard ref={cardRef} card={CARDS[0]} onSwiped={() => setLocked(true)} />
          : <LockOverlay onSignUp={onSignUp} />
        }
      </div>

      {/* Pass / Like buttons */}
      {!locked && (
        <div style={{ display: 'flex', gap: 16 }}>
          <motion.button
            type="button" aria-label="Pass"
            onClick={() => cardRef.current?.swipe(-1)}
            whileTap={{ scale: 0.88 }}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: BG, border: '1px solid #eee',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={20} color="#e24b4a" strokeWidth={2.5} />
          </motion.button>
          <motion.button
            type="button" aria-label="Like"
            onClick={() => cardRef.current?.swipe(1)}
            whileTap={{ scale: 0.88 }}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: BG, border: '1px solid #eee',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Heart size={20} color={ORANGE} strokeWidth={2.5} />
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ── Feature row (alternating) ─────────────────────────────────────────────
function FeatureRow({ feat }) {
  const isLeft = feat.side === 'left';

  const Visual = (
    <div style={{
      background: feat.cardBg, borderRadius: 24,
      aspectRatio: '4/3', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 96, color: 'rgba(0,0,0,0.07)', userSelect: 'none', lineHeight: 1 }}>
        {feat.letter}
      </div>
      {/* Floating badge */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20,
        background: BG, borderRadius: 14,
        padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ORANGE, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 12, color: '#111', lineHeight: 1.2 }}>
            {feat.badgeLabel}
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{feat.badgeSub}</div>
        </div>
      </div>
    </div>
  );

  const Copy = (
    <div style={{ padding: '0 8px' }}>
      <div style={{
        display: 'inline-block',
        background: '#fff5f0', border: '1px solid rgba(255,92,0,0.2)',
        borderRadius: 9999, padding: '4px 12px',
        fontSize: 11, fontWeight: 500, color: ORANGE, marginBottom: 16,
      }}>
        {feat.tag}
      </div>
      <h3 style={{
        fontFamily: FONT_H, fontWeight: 800, fontSize: 30, letterSpacing: -1.2,
        color: '#111', lineHeight: 1.15, margin: '0 0 16px',
      }}>
        {feat.heading[0]}<br />{feat.heading[1]}
      </h3>
      <p style={{ fontFamily: FONT_B, fontSize: 14, fontWeight: 300, color: '#aaa', lineHeight: 1.85, margin: 0 }}>
        {feat.body}
      </p>
    </div>
  );

  return (
    <div className="lp-feature-row">
      {isLeft ? Visual : Copy}
      {isLeft ? Copy : Visual}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────
function ToastContent() {
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      style={{
        position: 'fixed', bottom: 28,
        left: '50%', x: '-50%',
        zIndex: 100, pointerEvents: 'none',
      }}
    >
      <div style={{
        background: BG, border: '1px solid #eee', borderRadius: 9999,
        padding: '11px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#fff5f0', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ORANGE }} />
        </div>
        <span style={{ fontFamily: FONT_B, fontSize: 13, color: '#111' }}>
          <strong style={{ fontWeight: 500 }}>Brianna</strong> just joined WEEKLY
        </span>
      </div>
    </motion.div>
  );
}

function Toast() {
  const [show, setShow] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShow(true),  3500);
    const t2 = setTimeout(() => setGone(true),  9000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <AnimatePresence>
      {show && !gone && <ToastContent />}
    </AnimatePresence>
  );
}

// ── Main landing page ─────────────────────────────────────────────────────
export default function LandingPage({ go }) {
  const [inviterName, setInviterName] = useState(null);

  // Preserve invite-link flow
  useEffect(() => {
    const token = sessionStorage.getItem('duo_oc_invite_token');
    if (!token) return;
    import('../lib/invites.js').then(({ getInviteByToken }) => {
      getInviteByToken(token).then(invite => {
        if (invite?.profiles?.name) setInviterName(invite.profiles.name);
      });
    });
  }, []);

  const PAD = { maxWidth: 1100, margin: '0 auto', padding: '0 48px' };

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div style={{ background: BG, color: '#111', minHeight: '100vh', fontFamily: FONT_B }}>

        {/* ── Invite banner ── */}
        {inviterName && (
          <div style={{ background: '#fff5f0', borderBottom: '1px solid rgba(255,92,0,0.15)', padding: '12px 24px', textAlign: 'center' }}>
            <span style={{ fontFamily: FONT_B, fontSize: 13, color: ORANGE, fontWeight: 500 }}>
              {inviterName} invited you to join WEEKLY
            </span>
          </div>
        )}

        {/* ── Nav ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 50, height: 60,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #f2f2f2',
        }}>
          <div style={{ ...PAD, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 20, color: ORANGE, letterSpacing: -0.3 }}>
              WEEKLY
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ fontFamily: FONT_B, fontSize: 13, color: '#bbb', fontWeight: 400 }}>
                18 – 25 · OC only
              </span>
              <button
                type="button"
                onClick={() => go('login')}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff5f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = BG; }}
                style={{
                  fontFamily: FONT_H, fontWeight: 700, fontSize: 13,
                  color: ORANGE, background: BG,
                  border: '1.5px solid #ffd4ba', borderRadius: 9999,
                  padding: '7px 18px', cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                Log in
              </button>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="lp-pad" style={PAD}>
          <div className="lp-hero-grid">

            {/* Left — copy */}
            <div>
              {/* Live pill badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#fff5f0', border: '1px solid #ffd4ba',
                borderRadius: 9999, padding: '6px 14px',
                fontSize: 12, color: ORANGE, fontWeight: 500, marginBottom: 28,
              }}>
                <span className="lp-pulse-dot" aria-hidden="true" />
                Orange County · 18 – 25
              </div>

              {/* H1 */}
              <h1 style={{
                fontFamily: FONT_H, fontWeight: 800, fontSize: 62,
                letterSpacing: -3.5, lineHeight: 0.9, color: '#111', margin: '0 0 24px',
              }}>
                Set<br />your <span style={{ color: ORANGE }}>week.</span><br />
                <span style={{ color: '#ddd' }}>Meet your overlap.</span>
              </h1>

              {/* Subtext */}
              <p style={{ fontFamily: FONT_B, fontSize: 15, fontWeight: 300, color: '#aaa', lineHeight: 1.7, margin: '0 0 32px', maxWidth: 360 }}>
                Find people whose week overlaps with yours. Send a request, then chat if you both say yes.
              </p>

              {/* Primary CTA */}
              <div style={{ marginBottom: 14 }}>
                <CTAButton label="Set my week" onClick={() => go('auth')} />
              </div>

              {/* Secondary */}
              <button
                type="button"
                onClick={() => go('login')}
                style={{ fontFamily: FONT_B, background: 'none', border: 'none', color: '#bbb', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 32, display: 'block' }}
              >
                Already have an account
              </button>

              {/* Social proof */}
              <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex' }}>
                  {AVATARS.map((av, i) => (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: av.bg, color: av.color,
                      border: '2px solid #fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginLeft: i === 0 ? 0 : -8,
                      fontFamily: FONT_H, fontWeight: 800, fontSize: 10,
                      position: 'relative', zIndex: AVATARS.length - i,
                    }}>
                      {av.letter}
                    </div>
                  ))}
                </div>
                <span style={{ fontFamily: FONT_B, fontSize: 12, color: '#bbb' }}>
                  847 weekly matches · 22 new today
                </span>
              </div>
            </div>

            {/* Right — card stack (hidden on mobile) */}
            <div className="lp-card-col" style={{ display: 'flex', justifyContent: 'center' }}>
              <CardStack onSignUp={() => go('auth')} />
            </div>

          </div>
        </section>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: '#f5f5f5', margin: '0 48px' }} />

        {/* ── Features ── */}
        <section className="lp-pad" style={{ ...PAD, paddingTop: 100, paddingBottom: 20 }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 500, color: ORANGE, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16 }}>
              How it works
            </div>
            <h2 style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 42, letterSpacing: -2, lineHeight: 1.1, color: '#111', margin: 0, maxWidth: 560 }}>
              Designed to make meeting people{' '}
              <span style={{ color: ORANGE }}>actually fun.</span>
            </h2>
          </div>
          {FEATURES.map((feat, i) => <FeatureRow key={i} feat={feat} />)}
        </section>

        {/* ── Stats strip ── */}
        <section style={{ borderTop: '1px solid #f5f5f5', borderBottom: '1px solid #f5f5f5' }}>
          <div className="lp-stats-grid">
            {[
              {
                display: <><span style={{ color: '#111' }}>847</span><span style={{ color: ORANGE }}>+</span></>,
                label: 'Weekly matches',
              },
              {
                display: <><span style={{ color: ORANGE }}>1</span><span style={{ color: '#111' }}>:</span><span style={{ color: ORANGE }}>1</span></>,
                label: 'Requests before chat',
              },
              {
                display: <><span style={{ color: '#111' }}>0</span><span style={{ color: ORANGE }}>%</span></>,
                label: 'Cold DMs',
              },
            ].map((stat, i) => (
              <div key={i} style={{
                padding: '40px 36px', textAlign: 'center',
                borderLeft: i > 0 ? '1px solid #f5f5f5' : 'none',
              }}>
                <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 52, letterSpacing: -3, lineHeight: 1, marginBottom: 8 }}>
                  {stat.display}
                </div>
                <div style={{ fontFamily: FONT_B, fontSize: 13, fontWeight: 400, color: '#bbb' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA section ── */}
        <section className="lp-pad" style={{ ...PAD, paddingTop: 100, paddingBottom: 100, textAlign: 'center' }}>
          <h2 style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 52, letterSpacing: -2.5, lineHeight: 0.95, color: '#111', margin: '0 0 20px' }}>
            Your week can line up<br />
            with someone <span style={{ color: ORANGE }}>right now.</span>
          </h2>
          <p style={{ fontFamily: FONT_B, fontSize: 15, fontWeight: 300, color: '#bbb', margin: '0 0 36px' }}>
            Set your availability to see who overlaps.
          </p>
          <div style={{ marginBottom: 20 }}>
            <CTAButton label="Set my week" onClick={() => go('auth')} />
          </div>
          <div style={{ marginBottom: 32 }}>
            <button
              type="button"
              onClick={() => go('login')}
              style={{ fontFamily: FONT_B, background: 'none', border: 'none', color: '#bbb', fontSize: 13, cursor: 'pointer', padding: 0 }}
            >
              Already have an account?{' '}
              <span style={{ textDecoration: 'underline' }}>Log in</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {['Set your week', 'OC only', '18-25', 'Chat if both say yes'].map((item, i) => (
              <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {i > 0 && <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#ddd', display: 'inline-block' }} />}
                <span style={{ fontFamily: FONT_B, fontSize: 12, color: '#ccc' }}>{item}</span>
              </span>
            ))}
          </div>
        </section>

        {/* ── SEO FAQ ── */}
        <section className="lp-pad" style={{ maxWidth: 720, margin: '0 auto', padding: '60px 48px 80px', borderTop: '1px solid #f5f5f5' }}>
          <p style={{ fontFamily: FONT_B, fontSize: 10, fontWeight: 500, color: '#ccc', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 24 }}>
            About WEEKLY
          </p>
          {[
            { q: 'What is WEEKLY?', a: 'WEEKLY helps people in Orange County meet through shared availability. Set your week, find people whose days and times overlap with yours, and send a request.' },
            { q: 'Is WEEKLY a dating app?', a: "WEEKLY is a social discovery app for low-pressure 1:1 connections. You only chat when both people say yes." },
            { q: 'Who is WEEKLY for?', a: 'WEEKLY is for young adults aged 18-25 in Orange County who want to meet new people around real availability.' },
            { q: 'How does WEEKLY work?', a: 'Pick the days and times you are free, browse people with overlapping weeks, send a request, and chat if it is mutual.' },
            { q: 'Where does WEEKLY work?', a: 'WEEKLY is built for Orange County, including Irvine, Fullerton, Anaheim, Costa Mesa, Huntington Beach, Newport Beach, and nearby OC communities.' },
            { q: 'What should I search to find WEEKLY?', a: 'People can find WEEKLY by searching WEEKLY, OC social app, Orange County social app, weekly matches, or meet new people in Orange County.' },
          ].map(({ q, a }, i) => (
            <details key={i} style={{ borderBottom: '1px solid #f5f5f5', padding: '14px 0' }}>
              <summary style={{ fontFamily: FONT_B, fontSize: 13, fontWeight: 500, color: '#999', cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
              <p style={{ fontFamily: FONT_B, fontSize: 13, color: '#bbb', lineHeight: 1.65, margin: '8px 0 0', fontWeight: 300 }}>{a}</p>
            </details>
          ))}
        </section>

      </div>

      {/* ── Toast ── */}
      <Toast />
    </>
  );
}
