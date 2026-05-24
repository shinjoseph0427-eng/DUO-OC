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
            width: 38,
            height: 38,
            borderRadius: 13,
            background: restricted ? 'rgba(17,17,17,0.06)' : C.amberT08,
            border: `0.5px solid ${restricted ? C.border : C.brownBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
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
        <span
          style={{
            borderRadius: 9999,
            padding: '4px 9px',
            fontSize: 11,
            fontWeight: 800,
            color: plan ? C.success : C.muted,
            background: plan ? 'rgba(79,119,45,0.13)' : 'rgba(17,17,17,0.05)',
          }}
        >
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
  const confirmed = activeHangouts.filter((h) => h.status === 'confirmed');
  const incoming = activeHangouts.filter((h) => h.status === 'pending' && myDuoIds.has(h.duo_b_id));
  const outgoing = activeHangouts.filter((h) => h.status === 'pending' && myDuoIds.has(h.duo_a_id));
  const countered = activeHangouts.filter((h) => h.status === 'countered');
  const activeOwnPlans = planItems.filter((item) => item.plan);
  const planRequestCount = planItems.reduce((sum, item) => sum + (item.requests?.length ?? 0), 0);
  const pendingRequestCount = incoming.length + outgoing.length + countered.length + planRequestCount;
  const availableOpenPlans = openPlans.filter((plan) => !myDuoIds.has(plan.creator_duo_id));
  const canCreatePlan = ownedDuos.some((duo) => (duo.status ?? 'active') === 'active' && !restrictedMap.get(duo.id));

  const nextConfirmed = confirmed[0] ?? null;
  const nextIncoming = incoming[0] ?? null;
  const nextOutgoing = outgoing[0] ?? null;
  const nextOpenOwnPlan = activeOwnPlans[0]?.plan ?? null;

  const primary = (() => {
    if (ownedDuos.length === 0) {
      return {
        eyebrow: 'Next up',
        title: 'Start your duo',
        body: 'Find a homie first, then create a duo together.',
        cta: 'Find a homie',
        Icon: Users,
        action: () => go('find_homie'),
        glow: 'rgba(255,107,0,0.12)',
      };
    }
    if (homieRequests.length > 0) {
      return {
        eyebrow: 'Waiting',
        title: 'Homie request waiting',
        body: homieRequests.length === 1 ? 'Someone wants to duo up with you.' : `${homieRequests.length} homie requests are waiting.`,
        cta: 'Review request',
        Icon: Users,
        action: () => go('homie_inbox'),
        glow: 'rgba(255,107,0,0.15)',
      };
    }
    if (incoming.length > 0 || planRequestCount > 0) {
      return {
        eyebrow: 'Requests',
        title: 'Requests waiting',
        body: nextIncoming
          ? `${nextIncoming.duo_a?.name ?? 'A duo'} wants to hang.`
          : `${planRequestCount} request${planRequestCount === 1 ? '' : 's'} to join your plan.`,
        cta: 'Review requests',
        Icon: Calendar,
        action: () => go('hangouts'),
        glow: 'rgba(255,107,0,0.15)',
      };
    }
    if (nextConfirmed) {
      return {
        eyebrow: 'Locked',
        title: 'You have a confirmed hangout',
        body: `${pickOtherDuo(nextConfirmed, duoIds)?.name ?? 'A duo'} · ${formatPlanMeta(nextConfirmed)}`,
        cta: 'View hangout',
        Icon: MessageCircle,
        action: () => go('hangouts'),
        glow: 'rgba(255,107,0,0.15)',
      };
    }
    if (nextOpenOwnPlan) {
      return {
        eyebrow: 'Live',
        title: 'Your plan is open',
        body: formatPlanMeta(nextOpenOwnPlan) || 'Another duo can request to join.',
        cta: 'View requests',
        Icon: Calendar,
        action: () => go('hangouts'),
        glow: 'rgba(255,107,0,0.12)',
      };
    }
    if (nextOutgoing) {
      return {
        eyebrow: 'Pending',
        title: 'Waiting on their duo',
        body: `${nextOutgoing.duo_b?.name ?? 'A duo'} has your hangout request.`,
        cta: 'View hangouts',
        Icon: Calendar,
        action: () => go('hangouts'),
        glow: 'rgba(255,107,0,0.10)',
      };
    }
    return {
      eyebrow: 'Open night',
      title: 'Find a duo to meet',
      body: 'Browse duos nearby and keep it low-pressure.',
      cta: 'Explore duos',
      Icon: Compass,
      action: () => go('explore'),
      glow: 'rgba(255,107,0,0.12)',
    };
  })();

  const todayLine = [
    `${confirmed.length} confirmed`,
    `${pendingRequestCount} request${pendingRequestCount === 1 ? '' : 's'}`,
  ].join(' · ');
  const planLine = activeOwnPlans.length > 0
    ? activeOwnPlans.length === 1 ? 'Your plan is open' : `${activeOwnPlans.length} plans are open`
    : 'No plans yet';

  const greetingName = profile?.name?.split(' ')?.[0] ?? null;

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

      <div style={{ padding: '20px 16px 102px', overflow: 'hidden' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <GlassCard glow="rgba(255,107,0,0.15)" style={{ padding: 20, minHeight: 156 }}>
            <span style={{
              display: 'inline-block',
              fontSize: 11, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase',
              color: C.amber, background: C.amberT08, border: `1px solid ${C.brownBorder}`,
              borderRadius: 999, padding: '4px 10px', margin: '0 0 14px',
            }}>
              2v2 · No pressure
            </span>
            <h1 style={{ fontSize: 34, fontWeight: 950, color: C.white, letterSpacing: '-1px', lineHeight: 1.02, margin: '0 0 10px' }}>
              Make plans feel easy.
            </h1>
            <p style={{ fontSize: 15, color: C.muted, margin: 0, lineHeight: 1.55 }}>
              Find a duo, send a hangout, keep it light.
            </p>
          </GlassCard>
        </motion.div>

        {loading ? (
          <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
            <div className="shimmer" style={{ height: 120, borderRadius: 22, background: C.cardElevated }} />
            <div className="shimmer" style={{ height: 178, borderRadius: 22, background: C.cardElevated }} />
            <div className="shimmer" style={{ height: 92, borderRadius: 18, background: C.cardElevated }} />
          </div>
        ) : error ? (
          <GlassCard glow="rgba(239,68,68,0.16)" style={{ padding: 18, marginTop: 14 }}>
            <p style={{ fontSize: 16, fontWeight: 850, color: C.white, margin: '0 0 5px' }}>Could not load Home</p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>{error}</p>
          </GlassCard>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.04 }}>
              <GlassCard glow="rgba(255,107,0,0.10)" style={{ padding: 16, marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 850, color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 5px' }}>
                      {pendingRequestCount > 0 ? `Hangout requests · ${pendingRequestCount}` : 'Hangout requests'}
                    </p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: C.white, margin: '0 0 4px' }}>{todayLine}</p>
                    <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{planLine}</p>
                  </div>
                  <div style={{ width: 42, height: 42, borderRadius: 15, background: C.amberT08, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={19} color={C.amber} strokeWidth={2.2} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            <SectionTitle>Next up</SectionTitle>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.08 }}>
              <GlassCard glow={primary.glow} style={{ padding: 18 }} onClick={primary.action}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 17, background: C.amberT08, border: `0.5px solid ${C.brownBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <primary.Icon size={22} color={C.white} strokeWidth={2.2} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 850, color: C.amber, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>{primary.eyebrow}</p>
                    <p style={{ fontSize: 21, fontWeight: 950, color: C.white, margin: '0 0 6px', lineHeight: 1.12 }}>{primary.title}</p>
                    <p style={{ fontSize: 14, color: C.muted, margin: '0 0 15px', lineHeight: 1.45 }}>{primary.body}</p>
                    <ActionButton onClick={(e) => { e.stopPropagation(); primary.action(); }} Icon={primary.Icon}>
                      {primary.cta}
                    </ActionButton>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            <SectionTitle>Quick moves</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: canCreatePlan ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8 }}>
              <ActionButton variant="secondary" onClick={() => go('explore')} Icon={Compass}>Explore</ActionButton>
              {canCreatePlan && <ActionButton variant="secondary" onClick={() => go('create_plan')} Icon={Plus}>Create plan</ActionButton>}
              <ActionButton variant="secondary" onClick={() => go('hangouts')} Icon={Calendar}>Hangouts</ActionButton>
            </div>

            <SectionTitle action="Manage duos" onAction={() => go('me')}>My duos</SectionTitle>
            {ownedDuos.length === 0 ? (
              <GlassCard glow="rgba(255,107,0,0.12)" style={{ padding: 16 }} onClick={() => go('find_homie')}>
                <p style={{ fontSize: 16, fontWeight: 900, color: C.white, margin: '0 0 5px' }}>No duo yet.</p>
                <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px', lineHeight: 1.5 }}>Find a homie first, then create a duo together.</p>
                <ActionButton onClick={(e) => { e.stopPropagation(); go('find_homie'); }} Icon={Users}>Find a homie</ActionButton>
              </GlassCard>
            ) : (
              <div style={{ display: 'grid', gap: 9 }}>
                {ownedDuos.slice(0, 2).map((duo) => {
                  const item = planItems.find((entry) => entry.duo.id === duo.id);
                  return (
                    <DuoMiniCard
                      key={duo.id}
                      duo={duo}
                      plan={item?.plan ?? null}
                      restricted={item?.restricted ?? false}
                    />
                  );
                })}
              </div>
            )}

            <SectionTitle action="Browse open plans" onAction={() => go('explore')}>Open plans</SectionTitle>
            <GlassCard glow="rgba(255,107,0,0.10)" style={{ padding: 16 }} onClick={() => go('explore')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 18, fontWeight: 950, color: C.white, margin: '0 0 5px' }}>
                    {availableOpenPlans.length > 0 ? 'Open plans near you' : 'No open plans right now'}
                  </p>
                  <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.45 }}>
                    {availableOpenPlans.length > 0
                      ? `${availableOpenPlans.length} plan${availableOpenPlans.length === 1 ? '' : 's'} waiting for a duo.`
                      : 'Explore duos or create a plan to get momentum started.'}
                  </p>
                </div>
                <div style={{ minWidth: 48, height: 48, borderRadius: 17, background: C.amberT08, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Compass size={22} color={C.amber} strokeWidth={2.2} />
                </div>
              </div>
            </GlassCard>
          </>
        )}
      </div>
    </div>
  );
}
