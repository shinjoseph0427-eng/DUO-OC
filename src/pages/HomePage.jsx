import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Compass, MessageCircle, Plus, Users } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import HomieAcceptedCelebration from '../components/HomieAcceptedCelebration.jsx';
import { getNotifications, markAsRead } from '../lib/notifications.js';
import { getMyHomieRequests } from '../lib/homie.js';
import { getExploreDuos } from '../lib/duos.js';
import {
  getIncomingPlanRequests,
  getMyActivePlan,
  getMyHangouts,
  getOpenPlans,
  getWeeklyConfirmedCount,
  isPastHangoutTime,
} from '../lib/hangouts.js';
import { getConfirmedChatCount, getMyChats } from '../lib/messages.js';
import { isDuoRestricted } from '../lib/safety.js';
import { STORAGE_BASE_URL } from '../lib/constants.js';

const OC_LOCATIONS = [
  { url: `${STORAGE_BASE_URL}/app-assets/oc_01.jpg`, label: 'Irvine Spectrum' },
  { url: `${STORAGE_BASE_URL}/app-assets/oc_02.jpg`, label: 'Brea Mall' },
  { url: `${STORAGE_BASE_URL}/app-assets/oc_03.jpg`, label: 'Laguna Beach' },
  { url: `${STORAGE_BASE_URL}/app-assets/oc_04.jpg`, label: 'Huntington Beach Pier' },
  { url: `${STORAGE_BASE_URL}/app-assets/oc_05.jpg`, label: 'Newport Beach Pier' },
  { url: `${STORAGE_BASE_URL}/app-assets/oc_06.jpg`, label: 'Dana Point Harbor' },
];

const PASTEL_BG = ['#F5E6D3', '#D3E6F5', '#D3F5E0', '#F5D3E6', '#E6D3F5'];

const DATE_LABELS = {
  today:     'Today',
  tomorrow:  'Tomorrow',
  friday:    'This Friday',
  saturday:  'Saturday',
  sunday:    'This Sunday',
  next_week: 'Next week',
};

const TIME_LABELS = {
  morning:   'Morning',
  afternoon: 'Afternoon',
  evening:   'Evening',
  night:     'Night',
};

function formatPlanMeta(item) {
  if (!item) return '';
  return [
    item.vibe,
    DATE_LABELS[item.date] ?? item.date,
    TIME_LABELS[item.time_slot] ?? item.time_slot,
    item.place,
  ].filter(Boolean).join(' · ');
}

function pickOtherDuo(hangout, myDuoIds) {
  if (!hangout) return null;
  return myDuoIds.includes(hangout.duo_a_id) ? hangout.duo_b : hangout.duo_a;
}

function GlassCard({ children, glow = 'rgba(255,107,0,0.15)', style = {}, onClick }) {
  const Component = onClick ? motion.button : motion.div;
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.12 }}
      style={{
        width:        '100%',
        position:     'relative',
        overflow:     'hidden',
        borderRadius: 22,
        border:       `0.5px solid ${C.border}`,
        background:   C.gradientCafe,
        boxShadow:    `0 1px 4px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.07), 0 0 28px ${glow}`,
        color:        C.white,
        textAlign:    'left',
        cursor:       onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </Component>
  );
}

function StatPill({ value, label }) {
  return (
    <div
      style={{
        minWidth:     0,
        flex:         1,
        borderRadius: 16,
        border:       `0.5px solid ${C.brownBorder}`,
        background:   C.amberT08,
        padding:      '12px 10px',
      }}
    >
      <p style={{ fontSize: 20, fontWeight: 950, color: C.white, margin: '0 0 4px', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: 0, lineHeight: 1.25 }}>
        {label}
      </p>
    </div>
  );
}

function ActionButton({ children, onClick, variant = 'primary', Icon }) {
  const primary = variant === 'primary';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      style={{
        height:       46,
        borderRadius: 15,
        border:       primary ? 'none' : `0.5px solid ${C.border}`,
        background:   primary ? C.gradientCTA : 'rgba(17,17,17,0.05)',
        color:        primary ? C.cream : C.brown,
        fontSize:     14,
        fontWeight:   850,
        cursor:       'pointer',
        display:      'inline-flex',
        alignItems:   'center',
        justifyContent: 'center',
        gap:          8,
        padding:      '0 14px',
        boxShadow:    primary ? '0 12px 26px rgba(255,107,0,0.22)' : '0 8px 18px rgba(17,17,17,0.06)',
      }}
    >
      {Icon && <Icon size={16} strokeWidth={2.3} />}
      {children}
    </motion.button>
  );
}

function StackedAvatars({ members }) {
  const shown = (members ?? []).slice(0, 2);
  return (
    <div style={{ position: 'relative', width: 50, height: 32, flexShrink: 0 }}>
      {shown.map((m, i) => {
        const photo = m.profiles?.photos?.[0] ?? null;
        return (
          <div
            key={i}
            style={{
              position:     'absolute',
              left:         i * 18,
              top:          0,
              width:        32,
              height:       32,
              borderRadius: '50%',
              border:       '1.5px solid #F5F5F0',
              background:   PASTEL_BG[i % PASTEL_BG.length],
              overflow:     'hidden',
            }}
          >
            {photo && <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          </div>
        );
      })}
    </div>
  );
}

function LockIcon({ size = 11, color = '#BBBBBB' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SectionTitle({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 2px 10px' }}>
      <p style={{ fontSize: 11, fontWeight: 850, color: C.muted, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>
        {children}
      </p>
      {action && (
        <button
          type="button"
          onClick={onAction}
          style={{ background: 'none', border: 'none', color: C.brown, fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: 0, fontFamily: "'Archivo', 'Inter', system-ui, sans-serif", letterSpacing: '0.2px' }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

function DuoMiniCard({ duo, plan, restricted }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border:       `0.5px solid ${C.border}`,
        background:   C.bg2,
        padding:      13,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: 13,
            background: restricted ? 'rgba(17,17,17,0.06)' : C.amberT08,
            border: `0.5px solid ${restricted ? C.border : C.brownBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Users size={18} color={restricted ? C.muted : C.amber} strokeWidth={2.2} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 850, color: C.white, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {duo.name ?? 'Your Duo'}
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {restricted ? 'Not available right now' : plan ? 'Open plan live' : duo.city ?? 'Ready when you are'}
          </p>
        </div>
        <span style={{ borderRadius: 9999, padding: '4px 9px', fontSize: 11, fontWeight: 800, color: plan ? C.success : C.muted, background: plan ? C.greenT12 : 'rgba(17,17,17,0.05)' }}>
          {plan ? 'Open' : 'Ready'}
        </span>
      </div>
    </div>
  );
}

export default function HomePage({ go, onLogout, currentUser, profile, myDuo, myDuos = [], goBack, onOpenPlanRequest, showToast }) {
  const ownedDuos = useMemo(
    () => (myDuos.length > 0 ? myDuos : (myDuo ? [myDuo] : [])).filter(Boolean).slice(0, 3),
    [myDuo, myDuos],
  );
  const duoIds = useMemo(() => ownedDuos.map((duo) => duo.id).filter(Boolean), [ownedDuos]);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoFading, setPhotoFading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (OC_LOCATIONS.length < 2) return;
    const interval = setInterval(() => {
      setPhotoFading(true);
      setTimeout(() => {
        setPhotoIndex(i => (i + 1) % OC_LOCATIONS.length);
        setPhotoFading(false);
        setImgFailed(false);
      }, 600);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hangouts, setHangouts] = useState([]);
  const [planItems, setPlanItems] = useState([]);
  const [homieRequests, setHomieRequests] = useState([]);
  const [openPlans, setOpenPlans] = useState([]);
  const [chatCount, setChatCount] = useState(0);
  const [chatMap, setChatMap] = useState(new Map()); // hangoutId → chat row
  const [restrictedMap, setRestrictedMap] = useState(new Map());
  const [allDuos,          setAllDuos]          = useState([]);
  const [nearbyCount,      setNearbyCount]      = useState(null); // null=loading, false=error
  const [displayNearby,    setDisplayNearby]    = useState(0);
  const [weeklyMatchCount, setWeeklyMatchCount] = useState(null); // null=loading, false=error
  const [celebratePartner, setCelebratePartner] = useState(null);

  // Requester side of Problem 2: if a homie_accepted notification is waiting
  // unread, greet them with the same celebration the accepter saw, then mark
  // it read so it only fires once.
  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id) return () => { cancelled = true; };
    getNotifications(currentUser.id).then((notifs) => {
      if (cancelled) return;
      const accepted = (notifs ?? []).find((n) => n.type === 'homie_accepted' && !n.read);
      if (accepted) {
        setCelebratePartner(accepted.payload?.accepted_by_name ?? 'your new duo');
        markAsRead(accepted.id).catch(() => {});
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError('');

    const planFetch = duoIds.length > 0
      ? Promise.all(
          ownedDuos.map((duo) =>
            Promise.all([
              getMyActivePlan(duo.id).catch(() => null),
              getIncomingPlanRequests(duo.id).catch(() => []),
              isDuoRestricted(duo.id).catch(() => false),
            ]).then(([plan, requests, restricted]) => ({ duo, plan, requests, restricted })),
          ),
        )
      : Promise.resolve([]);

    Promise.all([
      duoIds.length > 0 ? getMyHangouts(duoIds).catch(() => []) : Promise.resolve([]),
      planFetch,
      getMyHomieRequests(currentUser.id).catch(() => []),
      getOpenPlans().catch(() => []),
      getConfirmedChatCount(currentUser.id).catch(() => 0),
      getExploreDuos(currentUser.id).catch(() => false),
      getWeeklyConfirmedCount().catch(() => false),
      getMyChats(currentUser.id).catch(() => []),
    ])
      .then(([nextHangouts, nextPlanItems, nextHomieRequests, nextOpenPlans, nextChatCount, nextAllDuos, nextWeeklyMatchCount, nextChats]) => {
        if (cancelled) return;
        setHangouts(nextHangouts ?? []);
        setPlanItems(nextPlanItems ?? []);
        setHomieRequests(nextHomieRequests ?? []);
        setOpenPlans(nextOpenPlans ?? []);
        setChatCount(nextChatCount ?? 0);
        setChatMap(new Map((nextChats ?? []).map((c) => [c.hangoutId, c])));
        setRestrictedMap(new Map((nextPlanItems ?? []).map((item) => [item.duo.id, item.restricted])));
        setAllDuos(nextAllDuos === false ? [] : (nextAllDuos ?? []));
        setNearbyCount(nextAllDuos === false ? false : (nextAllDuos ?? []).length);
        setWeeklyMatchCount(nextWeeklyMatchCount === false ? false : (nextWeeklyMatchCount ?? 0));
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Could not load Home.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentUser?.id, duoIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count-up: 0 → real nearby duo count once data loads, ease-out 600ms
  useEffect(() => {
    if (typeof nearbyCount !== 'number') return;
    setDisplayNearby(0);
    if (nearbyCount === 0) return;
    const DURATION = 600;
    const start    = Date.now();
    let rafId;
    const tick = () => {
      const p     = Math.min((Date.now() - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - p, 2);
      setDisplayNearby(Math.round(eased * nearbyCount));
      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [nearbyCount]);

  const myDuoIds = new Set(duoIds);
  const activeHangouts = hangouts.filter((h) => !isPastHangoutTime(h.date, h.time_slot, h.created_at));
  const confirmed  = activeHangouts.filter((h) => h.status === 'confirmed');
  const incoming   = activeHangouts.filter((h) => h.status === 'pending' && myDuoIds.has(h.duo_b_id));
  const outgoing   = activeHangouts.filter((h) => h.status === 'pending' && myDuoIds.has(h.duo_a_id));
  const countered  = activeHangouts.filter((h) => h.status === 'countered');
  const activeOwnPlans   = planItems.filter((item) => item.plan);
  const planRequestCount = planItems.reduce((sum, item) => sum + (item.requests?.length ?? 0), 0);
  const availableOpenPlans = openPlans.filter((plan) => !myDuoIds.has(plan.creator_duo_id));
  const canCreatePlan = ownedDuos.some((duo) => (duo.status ?? 'active') === 'active' && !restrictedMap.get(duo.id));

  const nearbyDuos = useMemo(
    () => allDuos.filter((d) => !myDuoIds.has(d.id)).slice(0, 3),
    [allDuos, myDuoIds],
  );
  const openPlanDuoIds = useMemo(
    () => new Set((openPlans ?? []).map((p) => p.creator_duo_id)),
    [openPlans],
  );

  const progressSteps = [
    { label: 'Complete profile', done: !!(profile?.name && profile?.birth_year) },
    { label: 'Create a duo',  done: !!myDuo },
    { label: 'First hangout',     done: confirmed.length > 0 },
  ];
  const progressCompleted  = progressSteps.filter((s) => s.done).length;
  const progressPct        = Math.round((progressCompleted / 3) * 100);
  const currentProgressIdx = progressSteps.findIndex((s) => !s.done);
  const allProgressDone    = progressCompleted === 3;

  const nextConfirmed   = confirmed[0]  ?? null;
  const nextIncoming    = incoming[0]   ?? null;
  const nextOutgoing    = outgoing[0]   ?? null;
  const nextOpenOwnPlan = activeOwnPlans[0]?.plan ?? null;

  const primary = (() => {
    if (ownedDuos.length === 0) {
      return {
        eyebrow: 'Next up',
        title:   'Find your duo partner',
        body:    'Find a homie first, then create a duo together.',
        cta:     'Find a homie',
        Icon:    Users,
        action:  () => go('find_homie'),
        glow:    'rgba(255,107,0,0.12)',
      };
    }
    if (homieRequests.length > 0) {
      return {
        eyebrow: 'Waiting',
        title:   'Homie request waiting',
        body:    homieRequests.length === 1 ? 'Someone wants to duo up with you.' : `${homieRequests.length} homie requests are waiting.`,
        cta:     'Review request',
        Icon:    Users,
        action:  () => go('homie_inbox'),
        glow:    'rgba(255,107,0,0.15)',
      };
    }
    if (incoming.length > 0 || planRequestCount > 0) {
      return {
        eyebrow: 'Requests',
        title:   'Requests waiting',
        body:    nextIncoming
          ? `${nextIncoming.duo_a?.name ?? 'A duo'} wants to hang.`
          : `${planRequestCount} request${planRequestCount === 1 ? '' : 's'} to join your plan.`,
        cta:    'Review requests',
        Icon:   Calendar,
        action: () => go('hangouts'),
        glow:   'rgba(255,107,0,0.15)',
      };
    }
    if (nextConfirmed) {
      return {
        eyebrow: 'Locked',
        title:   'You have a confirmed hangout',
        body:    `${pickOtherDuo(nextConfirmed, duoIds)?.name ?? 'A duo'} · ${formatPlanMeta(nextConfirmed)}`,
        cta:     'View hangout',
        Icon:    MessageCircle,
        action:  () => go('hangouts'),
        glow:    'rgba(255,107,0,0.15)',
      };
    }
    if (nextOpenOwnPlan) {
      return {
        eyebrow: 'Live',
        title:   'Your plan is open',
        body:    formatPlanMeta(nextOpenOwnPlan) || 'Another duo can request to join.',
        cta:     'View requests',
        Icon:    Calendar,
        action:  () => go('hangouts'),
        glow:    'rgba(255,107,0,0.12)',
      };
    }
    if (nextOutgoing) {
      return {
        eyebrow: 'Pending',
        title:   'Waiting on their duo',
        body:    `${nextOutgoing.duo_b?.name ?? 'A duo'} has your hangout request.`,
        cta:     'View hangouts',
        Icon:    Calendar,
        action:  () => go('hangouts'),
        glow:    'rgba(255,107,0,0.10)',
      };
    }
    return {
      eyebrow: 'Open night',
      title:   'Ready to hang?',
      body:    'Browse duos nearby and keep it low-pressure.',
      cta:     'Find a duo to hang with',
      Icon:    Compass,
      action:  () => go('explore'),
      glow:    'rgba(255,107,0,0.12)',
    };
  })();

  const greetingName = profile?.name?.split(' ')?.[0] ?? null;

  // Hero card display vars — derived from primary cascade + nextConfirmed
  const heroOtherDuo = nextConfirmed ? pickOtherDuo(nextConfirmed, duoIds) : null;
  const heroTitle = nextConfirmed
    ? (() => {
        const place = nextConfirmed.place ?? heroOtherDuo?.name ?? 'Hangout';
        const day   = DATE_LABELS[nextConfirmed.date] ?? nextConfirmed.date ?? '';
        return day ? `${place} · ${day}` : place;
      })()
    : primary.title;
  const heroMeta = nextConfirmed
    ? (() => {
        const time     = TIME_LABELS[nextConfirmed.time_slot] ?? nextConfirmed.time_slot ?? '';
        const withName = heroOtherDuo?.name ? `with ${heroOtherDuo.name}` : '';
        return [time, withName].filter(Boolean).join(' · ');
      })()
    : primary.body;
  const avatarNames = heroOtherDuo?.name
    ? heroOtherDuo.name.split(/\s*[&,]\s*/).filter(Boolean)
    : [];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      {celebratePartner && (
        <HomieAcceptedCelebration
          partnerName={celebratePartner}
          onGoToDuoCard={() => { setCelebratePartner(null); go('me'); }}
          onClose={() => setCelebratePartner(null)}
        />
      )}
      <TopBar
        onLogout={onLogout}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationBell
              currentUser={currentUser}
              go={go}
              onOpenPlanRequest={onOpenPlanRequest}
              showToast={showToast}
            />
          </div>
        }
      />

      <div style={{ padding: '0 0 80px', overflowY: 'auto' }}>


        {/* ── Greeting ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          style={{ padding: '20px 20px 18px' }}
        >
          <p style={{ fontSize: 28, fontWeight: 800, color: C.white, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            {greetingName ? `Hey, ${greetingName}` : 'Hey'}
          </p>
        </motion.div>

        {/* ── Solo explore entry ─────────────────────────────────────── */}
        <div style={{ padding: '0 16px' }}>
          <button
            type="button"
            onClick={() => go('solo_explore')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 16px',
              background: 'rgba(255,107,0,0.06)',
              border: '1px solid rgba(255,107,0,0.18)',
              borderRadius: 14,
              cursor: 'pointer',
              width: '100%',
              marginBottom: 12,
            }}
          >
            <div style={{ textAlign: 'left', flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#FF6B00', margin: 0 }}>Solo</p>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Find people nearby for 1:1</p>
            </div>
            <span style={{ color: '#FF6B00', fontSize: 18, fontWeight: 300 }}>›</span>
          </button>
        </div>

        {/* ── Homie request banner — unmissable, tap → inbox ─────────── */}
        {!loading && homieRequests.length > 0 && (
          <motion.button
            type="button"
            onClick={() => go('homie_inbox')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.22 }}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            14,
              width:          'calc(100% - 32px)',
              margin:         '0 16px 8px',
              padding:        '16px 18px',
              borderRadius:   18,
              border:         'none',
              background:     C.gradientCTA,
              color:          '#fff',
              cursor:         'pointer',
              textAlign:      'left',
              boxShadow:      '0 10px 30px rgba(255,107,0,0.32)',
            }}
          >
            <div style={{
              width:          44,
              height:         44,
              borderRadius:   14,
              background:     'rgba(255,255,255,0.2)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
            }}>
              <Users size={22} color="#fff" strokeWidth={2.4} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 900, margin: '0 0 2px', lineHeight: 1.15 }}>
                {homieRequests.length} homie request{homieRequests.length === 1 ? '' : 's'}
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'rgba(255,255,255,0.85)' }}>
                {homieRequests.length === 1
                  ? 'Someone wants to duo up with you'
                  : `${homieRequests.length} people want to duo up with you`}
              </p>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, flexShrink: 0, opacity: 0.9 }}>→</span>
          </motion.button>
        )}

        {loading ? (
          <div style={{ padding: '0 16px', display: 'grid', gap: 12 }}>
            <div className="shimmer" style={{ height: 220, borderRadius: 20, background: C.cardElevated }} />
          </div>
        ) : error ? (
          <div style={{ margin: '0 16px', borderRadius: 20, background: C.cardElevated, border: `0.5px solid ${C.border}`, padding: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: '0 0 4px' }}>Could not load Home</p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{error}</p>
          </div>
        ) : (
          <>
            {/* ── Hero card ─────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.04 }}
              style={{ padding: '0 16px' }}
            >
              <motion.button
                type="button"
                onClick={primary.action}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.12 }}
                style={{
                  width:        '100%',
                  background:   '#111111',
                  borderRadius: 20,
                  padding:      20,
                  border:       'none',
                  cursor:       'pointer',
                  textAlign:    'left',
                  boxSizing:    'border-box',
                  display:      'block',
                  position:     'relative',
                  overflow:     'hidden',
                }}
              >
                {OC_LOCATIONS.length > 0 && (
                  <>
                    {imgFailed ? (
                      <div style={{
                        position:     'absolute',
                        inset:        0,
                        borderRadius: 20,
                        background:   'linear-gradient(135deg, #1a1208 0%, #2d1a06 40%, #1a1208 100%)',
                        opacity:      photoFading ? 0 : 1,
                        transition:   'opacity 0.6s ease',
                      }} />
                    ) : (
                      <img
                        key={photoIndex}
                        src={OC_LOCATIONS[photoIndex]?.url}
                        alt=""
                        onError={() => setImgFailed(true)}
                        style={{
                          position:     'absolute',
                          inset:        0,
                          width:        '100%',
                          height:       '100%',
                          objectFit:    'cover',
                          borderRadius: 20,
                          opacity:      photoFading ? 0 : 0.5,
                          transition:   'opacity 0.6s ease',
                        }}
                      />
                    )}
                    <div style={{
                      position:   'absolute',
                      inset:      0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.82) 55%)',
                      borderRadius: 20,
                    }} />
                  </>
                )}

                <div style={{ position: 'relative', zIndex: 1 }}>
                {nextConfirmed && (
                  <p style={{
                    fontSize:      10,
                    fontWeight:    700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color:         'rgba(255,255,255,0.45)',
                    margin:        '0 0 10px',
                  }}>
                    COMING UP
                  </p>
                )}

                <p style={{
                  fontSize:      26,
                  fontWeight:    700,
                  color:         '#FFFFFF',
                  lineHeight:    1.1,
                  margin:        '0 0 8px',
                  letterSpacing: '-0.3px',
                }}>
                  {heroTitle}
                </p>

                <p style={{
                  fontSize:   12,
                  color:      'rgba(255,255,255,0.55)',
                  margin:     '0 0 16px',
                  lineHeight: 1.5,
                }}>
                  {heroMeta}
                </p>

                {nextConfirmed && avatarNames.length > 0 && (
                  <div style={{ display: 'flex', marginBottom: 16 }}>
                    {avatarNames.slice(0, 3).map((n, i) => (
                      <div
                        key={i}
                        style={{
                          width:          28,
                          height:         28,
                          borderRadius:   '50%',
                          background:     C.amber,
                          border:         '2px solid #111111',
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'center',
                          marginLeft:     i === 0 ? 0 : -8,
                          fontSize:       11,
                          fontWeight:     700,
                          color:          '#FFFFFF',
                          flexShrink:     0,
                        }}
                      >
                        {n[0]?.toUpperCase() ?? '?'}
                      </div>
                    ))}
                  </div>
                )}

                <span style={{
                  display:      'inline-block',
                  background:   C.amber,
                  color:        '#FFFFFF',
                  borderRadius: 10,
                  padding:      '8px 16px',
                  fontSize:     13,
                  fontWeight:   700,
                }}>
                  {primary.cta} →
                </span>

                {OC_LOCATIONS.length > 1 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
                    {OC_LOCATIONS.map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        style={{
                          width:      i === photoIndex ? 16 : 4,
                          height:     4,
                          borderRadius: 2,
                          background: i === photoIndex ? '#FF6B00' : 'rgba(255,255,255,0.35)',
                          transition: 'width 0.3s ease',
                          cursor:     'pointer',
                        }}
                      />
                    ))}
                  </div>
                )}
                </div>
              </motion.button>
            </motion.div>

            {/* ── This week's confirmed hangouts — pinned, chat deep-link ── */}
            {confirmed.length > 0 && (
              <div style={{ padding: '16px 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.white }}>
                    This week's confirmed Hangouts
                  </span>
                  <span onClick={() => go('chat')} style={{ fontSize: 13, color: C.amber, cursor: 'pointer' }}>
                    See all chats →
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {confirmed.slice(0, 3).map((h) => {
                    const otherDuo = pickOtherDuo(h, duoIds);
                    const chat = chatMap.get(h.id);
                    return (
                      <motion.button
                        key={h.id}
                        type="button"
                        onClick={() => (chat ? go('chat_thread', null, null, chat) : go('chat'))}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        style={{
                          display:      'flex',
                          alignItems:   'center',
                          gap:          12,
                          width:        '100%',
                          padding:      '13px 14px',
                          borderRadius: 14,
                          border:       `0.5px solid ${C.greenBorder}`,
                          background:   C.greenT08,
                          cursor:       'pointer',
                          textAlign:    'left',
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                          background: C.amberT08, border: `1px solid ${C.brownBorder}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 800, color: C.amber,
                        }}>
                          {(otherDuo?.name ?? '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {otherDuo?.name ?? 'Duo'}
                          </p>
                          <p style={{ fontSize: 12, color: C.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[DATE_LABELS[h.date] ?? h.date, TIME_LABELS[h.time_slot] ?? h.time_slot, h.place].filter(Boolean).join(' · ') || 'Chat room is open'}
                          </p>
                        </div>
                        <MessageCircle size={18} color={C.success} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Requests section ──────────────────────────────────── */}
            {incoming.length > 0 && nextIncoming && (
              <div style={{ padding: '16px 16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.white }}>
                    Requests · {incoming.length}
                  </span>
                  <span onClick={() => go('hangouts')} style={{ fontSize: 13, color: C.amber, cursor: 'pointer' }}>
                    See all →
                  </span>
                </div>

                <div style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          12,
                  padding:      '12px 14px',
                  borderRadius: 14,
                  border:       `0.5px solid ${C.border}`,
                  background:   C.bg2,
                }}>
                  <div style={{
                    width:          40,
                    height:         40,
                    borderRadius:   '50%',
                    background:     C.amberT08,
                    border:         `1px solid ${C.brownBorder}`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       14,
                    fontWeight:     700,
                    color:          C.amber,
                    flexShrink:     0,
                  }}>
                    {(nextIncoming.duo_a?.name ?? '?')[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 2 }}>
                      {nextIncoming.duo_a?.name ?? 'A duo'} wants to hang
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {nextIncoming.duo_a?.city || 'OC'}{nextIncoming.date ? ` · ${DATE_LABELS[nextIncoming.date] ?? nextIncoming.date}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => go('hangouts')}
                      style={{
                        padding:      '7px 12px',
                        borderRadius: 8,
                        border:       `0.5px solid ${C.border}`,
                        background:   'transparent',
                        fontSize:     12,
                        color:        C.muted,
                        cursor:       'pointer',
                      }}
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => go('hangouts')}
                      style={{
                        padding:      '7px 12px',
                        borderRadius: 8,
                        border:       'none',
                        background:   C.amber,
                        fontSize:     12,
                        fontWeight:   600,
                        color:        '#fff',
                        cursor:       'pointer',
                      }}
                    >
                      Accept
                    </button>
                  </div>
                </div>

                {incoming.length > 1 && (
                  <div
                    onClick={() => go('hangouts')}
                    style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8, cursor: 'pointer' }}
                  >
                    + {incoming.length - 1} more waiting
                  </div>
                )}
              </div>
            )}

            {/* ── Quick actions ─────────────────────────────────────── */}
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => go('explore')}
                  style={{
                    flex:         1,
                    padding:      '14px 0',
                    borderRadius: 12,
                    border:       `0.5px solid ${C.border}`,
                    background:   C.bg2,
                    fontSize:     13,
                    fontWeight:   600,
                    color:        C.white,
                    cursor:       'pointer',
                  }}
                >
                  Find duos
                </button>
                <button
                  type="button"
                  onClick={() => go('hangouts')}
                  style={{
                    flex:         1,
                    padding:      '14px 0',
                    borderRadius: 12,
                    border:       `0.5px solid ${C.border}`,
                    background:   C.bg2,
                    fontSize:     13,
                    fontWeight:   600,
                    color:        C.white,
                    cursor:       'pointer',
                  }}
                >
                  Hangouts
                </button>
                <button
                  type="button"
                  onClick={() => go('chat')}
                  style={{
                    flex:         1,
                    padding:      '14px 0',
                    borderRadius: 12,
                    border:       `0.5px solid ${C.border}`,
                    background:   C.bg2,
                    fontSize:     13,
                    fontWeight:   600,
                    color:        C.white,
                    cursor:       'pointer',
                  }}
                >
                  Chats
                </button>
              </div>
            </div>

            <div style={{ padding: '16px 16px 0' }}>
              <GlassCard glow="rgba(255,107,0,0.10)" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: C.amberT08,
                    border: `0.5px solid ${C.brownBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Calendar size={19} color={C.amber} strokeWidth={2.2} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 900, color: C.white }}>
                      This Week
                    </p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: C.muted }}>
                      Set your availability and find people whose week overlaps with yours.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                  <ActionButton onClick={() => go('weekly_card')} Icon={Calendar}>
                    Set week
                  </ActionButton>
                  <ActionButton onClick={() => go('weekly_explore')} variant="secondary" Icon={Compass}>
                    Explore
                  </ActionButton>
                </div>
              </GlassCard>
            </div>

            {/* ── Nearby duos ──────────────────────────────────────────── */}
            {nearbyDuos.length > 0 && (
              <div style={{ padding: '20px 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Nearby duos</span>
                  <button
                    type="button"
                    onClick={() => go('explore')}
                    style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: C.amber, cursor: 'pointer', padding: 0 }}
                  >
                    See all
                  </button>
                </div>
                <div style={{ background: C.cardElevated, borderRadius: 14, border: `0.5px solid ${C.border}` }}>
                  {nearbyDuos.map((duo, idx) => {
                    const members    = duo.duo_members ?? [];
                    const vibe       = duo.vibes?.[0] ?? null;
                    const city       = duo.city ?? members[0]?.profiles?.city ?? null;
                    const isNew      = duo.created_at && (Date.now() - new Date(duo.created_at)) / 86400000 < 14;
                    const hasOpenPlan = openPlanDuoIds.has(duo.id);
                    const dotDelay = (idx * 0.37) % 1.0;
                    return (
                      <motion.div
                        key={duo.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ duration: 0.3, delay: idx * 0.08, ease: 'easeOut' }}
                        onClick={() => go('duo_detail', duo)}
                        style={{
                          display:      'flex',
                          alignItems:   'center',
                          gap:          12,
                          padding:      '11px 14px',
                          cursor:       'pointer',
                          borderBottom: idx < nearbyDuos.length - 1 ? `0.5px solid ${C.border}` : 'none',
                        }}
                      >
                        <StackedAvatars members={members} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: C.white, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {duo.name}
                          </p>
                          <p style={{ fontSize: 12, color: C.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[vibe, city].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                          {hasOpenPlan ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <motion.div
                                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: dotDelay }}
                                style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }}
                              />
                              <span style={{ fontSize: 11, color: C.muted }}>Active</span>
                            </div>
                          ) : isNew ? (
                            <span style={{ fontSize: 10, fontWeight: 500, color: C.amber }}>NEW</span>
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Stats line ────────────────────────────────────────── */}
            {currentUser?.id && (nearbyCount !== false || weeklyMatchCount !== false) && (
              <p style={{ fontSize: 11, color: '#BBBBBB', padding: '12px 18px 4px', margin: 0, lineHeight: 1 }}>
                {nearbyCount !== false && (
                  <>
                    Nearby{' '}
                    <motion.span
                      initial={false}
                      animate={{ opacity: 1 }}
                      style={{ display: 'inline-block' }}
                    >
                      {nearbyCount === null ? '—' : displayNearby}
                    </motion.span>
                    {' '}teams
                  </>
                )}
                {nearbyCount !== false && weeklyMatchCount !== false && ' · '}
                {weeklyMatchCount !== false && (
                  <>This week {weeklyMatchCount === null ? '—' : weeklyMatchCount} matches</>
                )}
              </p>
            )}

            {/* ── Progress ─────────────────────────────────────────── */}
            {!allProgressDone && (
              <div style={{ padding: '8px 16px 0' }}>
                <div style={{ background: C.cardElevated, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: 18 }}>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 500, color: C.white, margin: '0 0 3px' }}>Getting started</p>
                      <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{progressCompleted} / 3</p>
                    </div>
                    <p style={{ fontSize: 32, fontWeight: 500, color: C.amber, margin: 0, lineHeight: 1 }}>
                      {progressPct}%
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 3, borderRadius: 99, background: C.border, marginBottom: 16, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 99, background: C.amber, transition: 'width 0.5s ease' }} />
                  </div>

                  {/* Steps */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: currentProgressIdx !== -1 ? 16 : 0 }}>
                    {progressSteps.map((step, i) => {
                      const isCurrent = i === currentProgressIdx;
                      const isLocked  = !step.done && i > currentProgressIdx;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {step.done ? (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke={C.cream} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          ) : isCurrent ? (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${C.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.amber }} />
                            </div>
                          ) : (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <LockIcon size={10} color={C.muted} />
                            </div>
                          )}
                          <span style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, color: isLocked ? C.muted : C.white }}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA — current step only */}
                  {currentProgressIdx === 1 && (
                    <motion.button
                      type="button"
                      onClick={() => go('find_homie')}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.1 }}
                      style={{ padding: '8px 18px', borderRadius: 9999, border: 'none', background: C.white, color: C.cream, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Find Homie
                    </motion.button>
                  )}
                  {currentProgressIdx === 2 && (
                    <motion.button
                      type="button"
                      onClick={() => go('explore')}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.1 }}
                      style={{ padding: '8px 18px', borderRadius: 9999, border: 'none', background: C.white, color: C.cream, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Explore
                    </motion.button>
                  )}
                </div>
              </div>
            )}

          </>
        )}

        {/* Footer */}
        <div style={{ padding: '24px 20px 0', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => go('privacy')}
            style={{
              background:  'none',
              border:      'none',
              color:       C.muted,
              fontSize:    12,
              cursor:      'pointer',
              padding:     '4px 0',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(17,17,17,0.25)',
            }}
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}
