import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Compass, MessageCircle, Plus, Users } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import { getMyHomieRequests } from '../lib/homie.js';
import {
  getIncomingPlanRequests,
  getMyActivePlan,
  getMyHangouts,
  getOpenPlans,
  isPastHangoutTime,
} from '../lib/hangouts.js';
import { getConfirmedChatCount } from '../lib/messages.js';
import { isDuoRestricted } from '../lib/safety.js';

const OC_LOCATIONS = [
  { url: '/oc_01.jpg', label: 'Irvine Spectrum' },
  { url: '/oc_02.jpg', label: 'Brea Mall' },
  { url: '/oc_03.jpg', label: 'Laguna Beach' },
  { url: '/oc_04.jpg', label: 'Huntington Beach Pier' },
  { url: '/oc_05.jpg', label: 'Newport Beach Pier' },
  { url: '/oc_06.jpg', label: 'Dana Point Harbor' },
  { url: '/oc_07.jpg', label: 'Downtown Fullerton' },
];

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
        <span style={{ borderRadius: 9999, padding: '4px 9px', fontSize: 11, fontWeight: 800, color: plan ? C.success : C.muted, background: plan ? 'rgba(79,119,45,0.13)' : 'rgba(17,17,17,0.05)' }}>
          {plan ? 'Open' : 'Ready'}
        </span>
      </div>
    </div>
  );
}

export default function HomePage({ go, onLogout, currentUser, profile, myDuo, myDuos = [] }) {
  const ownedDuos = useMemo(
    () => (myDuos.length > 0 ? myDuos : (myDuo ? [myDuo] : [])).filter(Boolean).slice(0, 3),
    [myDuo, myDuos],
  );
  const duoIds = useMemo(() => ownedDuos.map((duo) => duo.id).filter(Boolean), [ownedDuos]);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoFading, setPhotoFading] = useState(false);

  useEffect(() => {
    if (OC_LOCATIONS.length < 2) return;
    const interval = setInterval(() => {
      setPhotoFading(true);
      setTimeout(() => {
        setPhotoIndex(i => (i + 1) % OC_LOCATIONS.length);
        setPhotoFading(false);
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
  const [restrictedMap, setRestrictedMap] = useState(new Map());

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
    ])
      .then(([nextHangouts, nextPlanItems, nextHomieRequests, nextOpenPlans, nextChatCount]) => {
        if (cancelled) return;
        setHangouts(nextHangouts ?? []);
        setPlanItems(nextPlanItems ?? []);
        setHomieRequests(nextHomieRequests ?? []);
        setOpenPlans(nextOpenPlans ?? []);
        setChatCount(nextChatCount ?? 0);
        setRestrictedMap(new Map((nextPlanItems ?? []).map((item) => [item.duo.id, item.restricted])));
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Could not load Home.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentUser?.id, duoIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const nextConfirmed   = confirmed[0]  ?? null;
  const nextIncoming    = incoming[0]   ?? null;
  const nextOutgoing    = outgoing[0]   ?? null;
  const nextOpenOwnPlan = activeOwnPlans[0]?.plan ?? null;

  const primary = (() => {
    if (ownedDuos.length === 0) {
      return {
        eyebrow: 'Next up',
        title:   'Start your duo',
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
      title:   'Find a duo to meet',
      body:    'Browse duos nearby and keep it low-pressure.',
      cta:     'Explore duos',
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
      <TopBar
        onLogout={onLogout}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationBell currentUser={currentUser} go={go} />
          </div>
        }
      />

      <div style={{ padding: '0 0 102px', overflow: 'hidden' }}>

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
                    <img
                      key={photoIndex}
                      src={OC_LOCATIONS[photoIndex]?.url}
                      alt=""
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

            {/* ── Requests section ──────────────────────────────────── */}
            {incoming.length > 0 && nextIncoming && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.1 }}
                style={{ padding: '20px 16px 0' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: C.white, margin: 0 }}>
                    Requests · {incoming.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => go('hangouts')}
                    style={{
                      background: 'none',
                      border:     'none',
                      color:      C.amber,
                      fontSize:   13,
                      fontWeight: 700,
                      cursor:     'pointer',
                      padding:    0,
                    }}
                  >
                    See all →
                  </button>
                </div>

                <div style={{
                  background:   C.cardElevated,
                  border:       `0.5px solid ${C.border}`,
                  borderRadius: 16,
                  padding:      14,
                  display:      'flex',
                  alignItems:   'center',
                  gap:          12,
                }}>
                  <div style={{
                    width:          32,
                    height:         32,
                    borderRadius:   '50%',
                    background:     C.amber,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                    fontSize:       13,
                    fontWeight:     700,
                    color:          '#FFFFFF',
                  }}>
                    {(nextIncoming.duo_a?.name ?? '?')[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nextIncoming.duo_a?.name ?? 'A duo'}
                    </p>
                    <p style={{ fontSize: 12, color: C.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[nextIncoming.duo_a?.city, DATE_LABELS[nextIncoming.date] ?? nextIncoming.date].filter(Boolean).join(' · ') || 'Wants to hang'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => go('hangouts')}
                      style={{
                        height:       32,
                        padding:      '0 12px',
                        borderRadius: 8,
                        border:       `0.5px solid ${C.border}`,
                        background:   'transparent',
                        color:        C.muted,
                        fontSize:     12,
                        fontWeight:   600,
                        cursor:       'pointer',
                      }}
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => go('hangouts')}
                      style={{
                        height:       32,
                        padding:      '0 12px',
                        borderRadius: 8,
                        border:       'none',
                        background:   C.amber,
                        color:        '#FFFFFF',
                        fontSize:     12,
                        fontWeight:   700,
                        cursor:       'pointer',
                      }}
                    >
                      Accept
                    </button>
                  </div>
                </div>

                {incoming.length > 1 && (
                  <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0', paddingLeft: 2 }}>
                    · and {incoming.length - 1} more
                  </p>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
