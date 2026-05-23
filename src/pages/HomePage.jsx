import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Users, Heart, Inbox } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import SkeletonCard from '../components/SkeletonCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import { getDiscoveryDuos } from '../lib/duos.js';
import { recordSwipe, getSwipedDuoIds } from '../lib/swipes.js';
import { getBlockedDuoIds } from '../lib/safety.js';
import { getMyHomieRequests } from '../lib/homie.js';

const PORTRAIT_H = 210;
const AVATAR_GRADS = ['#1a1a2e', '#16213e', '#0f3460', '#533483'];

// ─── helpers ───────────────────────────────────────────────────────────────

function normalizeDuo(d) {
  const members = (d.duo_members ?? []).map((m) => ({
    name:   m.profiles?.name ?? 'Member',
    age:    '',
    city:   d.city ?? '',
    photos: [
      ...(m.profiles?.photos ?? []),
      ...(m.profiles?.avatar_url ? [m.profiles.avatar_url] : []),
    ],
  }));
  return {
    id:          d.id,
    name:        d.name,
    vibes:       Array.isArray(d.vibes) ? d.vibes : [],
    spots:       Array.isArray(d.spots) ? d.spots : [],
    lookingFor:  d.looking_for ?? '',
    cities:      d.city ?? '',
    ages:        '',
    members:     members.length > 0 ? members : [{ name: d.name, age: '', city: '', photos: [] }],
    cardBg:      null,
    duo_members: d.duo_members,
  };
}

// ─── MemberCell ───────────────────────────────────────────────────────────

function MemberCell({ member, index, borderRight }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = member.photos ?? [];

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (photos.length > 1) setPhotoIdx((i) => (i + 1) % photos.length);
      }}
      style={{
        flex:        1,
        position:    'relative',
        overflow:    'hidden',
        borderRight: borderRight ? '0.5px solid rgba(0,0,0,0.35)' : 'none',
        cursor:      photos.length > 1 ? 'pointer' : 'default',
      }}
    >
      {photos.length > 0 ? (
        <img
          src={photos[photoIdx]}
          alt={member.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          draggable={false}
        />
      ) : (
        <div
          style={{
            width: '100%', height: '100%',
            background: AVATAR_GRADS[index % AVATAR_GRADS.length],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 60, fontWeight: 800, color: 'rgba(255,255,255,0.18)', userSelect: 'none', lineHeight: 1 }}>
            {(member.name || '?')[0].toUpperCase()}
          </span>
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65) 100%)', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', zIndex: 1, pointerEvents: 'none' }}>
        {member.name}
      </span>
      {photos.length > 1 && (
        <div style={{ position: 'absolute', top: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, zIndex: 2, pointerEvents: 'none' }}>
          {photos.map((_, di) => (
            <div key={di} style={{ width: di === photoIdx ? 14 : 5, height: 3, borderRadius: 9999, background: di === photoIdx ? '#fff' : 'rgba(255,255,255,0.35)', transition: 'width 0.2s ease' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DeckCard ─────────────────────────────────────────────────────────────

function DeckCard({ duo }) {
  const tags    = duo.vibes.slice(0, 2);
  const members = duo.members?.slice(0, 2) ?? [];

  return (
    <div style={{ background: C.cardElevated, border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 16px 52px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)', userSelect: 'none' }}>
      <div style={{ height: 3, background: C.gradientCTA }} />
      <div style={{ display: 'flex', height: PORTRAIT_H }}>
        {members.length > 0 ? members.map((m, i) => (
          <MemberCell key={i} member={m} index={i} borderRight={i === 0} />
        )) : (
          <div style={{ flex: 1, background: C.cardDeep, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: 'rgba(255,255,255,0.12)' }}>DUO</span>
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px 18px' }}>
        <p style={{ fontSize: 20, fontWeight: 900, color: C.white, marginBottom: 3, letterSpacing: '-0.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {duo.name}
        </p>
        <p style={{ fontSize: 11, fontWeight: 400, color: C.muted, marginBottom: tags.length > 0 ? 12 : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[duo.ages, duo.cities].filter(Boolean).join(' · ')}
        </p>
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <span key={tag} style={{ background: 'rgba(245,158,11,0.1)', color: C.amber, borderRadius: 9999, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PeekSliver ───────────────────────────────────────────────────────────

function PeekSliver({ duo }) {
  if (!duo) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', top: '100%', left: 14, right: 14, height: 28,
        marginTop: -5, borderRadius: '0 0 16px 16px',
        background: 'linear-gradient(to bottom, rgba(30,30,40,0.85), rgba(20,20,30,0.4))',
        border: '0.5px solid rgba(255,255,255,0.05)', borderTop: 'none', zIndex: -1,
      }}
    />
  );
}

// ─── DeckActions ──────────────────────────────────────────────────────────

function DeckActions({ onPass, onView, onRequest }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 36 }}>
      <motion.button type="button" onClick={onPass} whileTap={{ scale: 0.92 }} transition={{ duration: 0.1 }}
        aria-label="Pass" style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <X size={16} strokeWidth={2.2} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3px' }}>PASS</span>
      </motion.button>
      <motion.button type="button" onClick={onView} whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
        style={{ flex: 1, height: 52, borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: C.white, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        View Duo
      </motion.button>
      <motion.button type="button" onClick={onRequest} whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
        style={{ flex: 1.3, height: 52, borderRadius: 14, border: 'none', background: C.gradientCTA, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.25)' }}>
        Plan 2v2
      </motion.button>
    </div>
  );
}

// ─── MatchModal ───────────────────────────────────────────────────────────

function AvatarCluster({ members, offset }) {
  return (
    <div style={{ display: 'flex', gap: -8, position: 'relative' }}>
      {members.slice(0, 2).map((m, i) => {
        const photo = m.photos?.[0] ?? m.profiles?.photos?.[0] ?? m.profiles?.avatar_url ?? null;
        return (
          <motion.div
            key={i}
            initial={{ scale: 0, x: offset * (i === 0 ? -1 : 1) * 20 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 380, damping: 22 }}
            style={{
              width:         52,
              height:        52,
              borderRadius:  '50%',
              overflow:      'hidden',
              border:        '2.5px solid #0A0A0F',
              marginLeft:    i === 0 ? 0 : -12,
              background:    AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
              flexShrink:    0,
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
            }}
          >
            {photo ? (
              <img src={photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>
                {(m.name || '?')[0].toUpperCase()}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function MatchModal({ myDuo, matchedDuo, onPropose, onClose }) {
  const myMembers      = myDuo?.members      ?? myDuo?.duo_members      ?? [];
  const matchedMembers = matchedDuo?.members ?? matchedDuo?.duo_members ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         1000,
        background:     'rgba(0,0,0,0.88)',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        32,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ scale: 0.85, y: 20, opacity: 0 }}
        animate={{ scale: 1,    y: 0,  opacity: 1 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 320, damping: 26 }}
        style={{ position: 'relative', width: '100%', maxWidth: 340, textAlign: 'center' }}
      >
        {/* Avatar row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 28 }}>
          <AvatarCluster members={myMembers} offset={-1} />

          {/* Heart */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.4, 1] }}
            transition={{ delay: 0.4, duration: 0.5, times: [0, 0.6, 1] }}
          >
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #F472B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(245,158,11,0.5)' }}>
              <Heart size={20} fill="#fff" color="#fff" />
            </div>
          </motion.div>

          <AvatarCluster members={matchedMembers} offset={1} />
        </div>

        {/* Text */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-1px', margin: '0 0 8px', lineHeight: 1.1 }}
        >
          It's a Match!
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 36px', lineHeight: 1.5 }}
        >
          You and <strong style={{ color: '#fff' }}>{matchedDuo?.name ?? 'this duo'}</strong> both liked each other.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <motion.button
            type="button"
            onClick={onPropose}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', background: C.gradientCTA, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(245,158,11,0.35)' }}
          >
            Propose Hangout →
          </motion.button>
          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            style={{ width: '100%', height: 44, borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Keep Swiping
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────

export default function HomePage({ go, onLogout, currentUser, myDuo }) {
  const [deckDuos,     setDeckDuos]     = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [homieRequestCount, setHomieRequestCount] = useState(0);
  const [homieRequestsLoading, setHomieRequestsLoading] = useState(false);
  const [direction,    setDirection]    = useState(0);
  const [swiping,      setSwiping]      = useState(false);
  const [matchState,   setMatchState]   = useState(null); // { matchedDuo }

  const x       = useMotionValue(0);
  const rotate  = useTransform(x, [-200, 200], [-20, 20]);
  const passOpa = useTransform(x, [-120, -20], [1, 0]);
  const likeOpa = useTransform(x, [20,  120],  [0, 1]);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }

    const fetchDeck = async () => {
      try {
        const [rawDuos, swipedIds, blockedIds] = await Promise.all([
          getDiscoveryDuos(currentUser.id),
          myDuo?.id ? getSwipedDuoIds(myDuo.id)   : Promise.resolve([]),
          myDuo?.id ? getBlockedDuoIds(myDuo.id)  : Promise.resolve([]),
        ]);
        const excludeSet = new Set([...swipedIds, ...blockedIds]);
        const filtered   = (rawDuos ?? [])
          .filter((d) => !excludeSet.has(d.id))
          .map(normalizeDuo);
        setDeckDuos(filtered);
      } catch (err) {
        console.error('fetchDeck error:', err)
      }
      setLoading(false);
    };

    fetchDeck();
  }, [currentUser, myDuo?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id) {
      setHomieRequestCount(0);
      setHomieRequestsLoading(false);
      return () => { cancelled = true; };
    }

    setHomieRequestsLoading(true);
    getMyHomieRequests(currentUser.id)
      .then((requests) => {
        if (cancelled) return;
        setHomieRequestCount(requests.length);
      })
      .finally(() => {
        if (!cancelled) setHomieRequestsLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const isDeckDone  = currentIndex >= deckDuos.length;
  const currentDuo  = isDeckDone ? null : deckDuos[currentIndex];
  const nextDuo     = deckDuos[currentIndex + 1] ?? null;

  const advance = useCallback((dir) => {
    setDirection(dir);
    setCurrentIndex((i) => Math.min(i + 1, deckDuos.length));
    x.set(0);
  }, [deckDuos.length, x]);

  const handlePass = async () => {
    if (!currentDuo || swiping) return;
    if (myDuo?.id) {
      setSwiping(true);
      try { await recordSwipe({ fromDuoId: myDuo.id, toDuoId: currentDuo.id, direction: 'pass' }); }
      catch (_) {}
      setSwiping(false);
    }
    advance(-1);
  };

  const handleLike = async () => {
    if (!currentDuo || swiping) return;
    if (myDuo?.id) {
      setSwiping(true);
      try {
        const result = await recordSwipe({ fromDuoId: myDuo.id, toDuoId: currentDuo.id, direction: 'like' });
        if (result.matched) {
          setMatchState({ matchedDuo: { ...currentDuo, ...result.matchedDuo } });
          setSwiping(false);
          advance(1);
          return;
        }
      } catch (_) {}
      setSwiping(false);
    }
    advance(1);
  };

  const handleView    = () => currentDuo && go('duo_detail', currentDuo);
  const handleRequest = () => currentDuo && go('propose_hangout', currentDuo);
  const handleRestart = () => { setCurrentIndex(0); setDirection(0); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <TopBar
        onLogout={onLogout}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationBell currentUser={currentUser} go={go} />
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.gradientCTA, flexShrink: 0 }} />
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        <div style={{ padding: '24px 16px 0' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Discover duos
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px', color: C.white, margin: '0 0 20px' }}>
            Who's next.
          </h1>
        </div>

        {(homieRequestCount > 0 || homieRequestsLoading) && (
          <div style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.11), rgba(244,114,182,0.08))', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 16, padding: '14px 16px', margin: '0 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(245,158,11,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Inbox size={18} color={C.amber} strokeWidth={2.1} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: '0 0 2px' }}>
                  {homieRequestsLoading
                    ? 'Checking Homie requests'
                    : homieRequestCount === 1
                      ? 'You have a new Homie request'
                      : `You have ${homieRequestCount} Homie requests`}
                </p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                  Review who wants to duo up.
                </p>
              </div>
            </div>
            <motion.button
              type="button"
              onClick={() => go('homie_inbox')}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              disabled={homieRequestsLoading}
              style={{ background: C.gradientCTA, border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 800, color: '#0A0A0F', cursor: homieRequestsLoading ? 'default' : 'pointer', flexShrink: 0, opacity: homieRequestsLoading ? 0.65 : 1 }}
            >
              View Requests
            </motion.button>
          </div>
        )}

        {/* Find a Homie banner */}
        <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 16, padding: '14px 16px', margin: '0 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0, marginBottom: 2 }}>Flying solo?</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Find a Homie to roll with</p>
          </div>
          <motion.button
            type="button"
            onClick={() => go('find_homie')}
            whileTap={{ scale: 0.95 }} transition={{ duration: 0.1 }}
            style={{ background: C.gradientCTA, border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#0A0A0F', cursor: 'pointer', flexShrink: 0 }}
          >
            Find someone
          </motion.button>
        </div>

        <div style={{ padding: '0 16px' }}>
          {loading ? (
            <SkeletonCard />
          ) : isDeckDone ? (
            <EmptyState
              icon={Users}
              title="All caught up."
              subtitle="You've seen all duos for now. Check back soon."
              action={handleRestart}
              actionLabel="Start over"
            />
          ) : (
            <>
              <div style={{ position: 'relative', paddingBottom: 36 }}>
                <PeekSliver duo={nextDuo} />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentIndex}
                    style={{ x, rotate, position: 'relative' }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.7}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -80) handlePass();
                      else if (info.offset.x > 80) handleLike();
                      else x.set(0);
                    }}
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 320, damping: 30 } }}
                    exit={{ x: direction * 320, rotate: direction * 22, opacity: 0, transition: { duration: 0.28, ease: 'easeIn' } }}
                  >
                    {/* PASS overlay */}
                    <motion.div style={{ opacity: passOpa, position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#EF4444', border: '2px solid #EF4444', borderRadius: 6, padding: '3px 10px', display: 'block', transform: 'rotate(-12deg)' }}>PASS</span>
                    </motion.div>
                    {/* 2v2 overlay */}
                    <motion.div style={{ opacity: likeOpa, position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#10B981', border: '2px solid #10B981', borderRadius: 6, padding: '3px 10px', display: 'block', transform: 'rotate(12deg)' }}>2v2</span>
                    </motion.div>
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

      {/* Match modal */}
      <AnimatePresence>
        {matchState && (
          <MatchModal
            myDuo={myDuo}
            matchedDuo={matchState.matchedDuo}
            onPropose={() => {
              setMatchState(null);
              go('propose_hangout', matchState.matchedDuo);
            }}
            onClose={() => setMatchState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
