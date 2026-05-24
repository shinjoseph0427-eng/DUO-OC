import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Eye, Lock, MapPin, Pencil, Plus, ShieldAlert, SlidersHorizontal, UserCircle, Users } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { getMyActivePlan } from '../lib/hangouts.js';
import { isDuoRestricted, SAFETY_MESSAGES } from '../lib/safety.js';

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

function statusLabel(status) {
  if (!status) return 'Active';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function DuoPlanSummary({ plan }) {
  if (!plan) return null;
  const meta = [
    plan.vibe,
    DATE_LABELS[plan.date] ?? plan.date,
    TIME_LABELS[plan.time_slot] ?? plan.time_slot,
    plan.place,
  ].filter(Boolean);

  return (
    <div
      style={{
        background:   'rgba(79,119,45,0.07)',
        border:       '0.5px solid rgba(79,119,45,0.22)',
        borderRadius: 12,
        padding:      '11px 13px',
        marginTop:    12,
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 800, color: C.success, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
        Open plan
      </p>
      <p style={{ fontSize: 13, color: C.white, fontWeight: 700, margin: 0, lineHeight: 1.45 }}>
        {meta.join(' - ')}
      </p>
      {plan.message && (
        <p style={{ fontSize: 12, color: C.muted, margin: '5px 0 0', lineHeight: 1.45 }}>
          {plan.message}
        </p>
      )}
    </div>
  );
}

function DuoCard({ duo, plan, restricted, loadingPlan, go }) {
  const members = duo.duo_members ?? [];
  const memberCount = members.length || 1;
  const tags = Array.isArray(duo.vibes) ? duo.vibes.filter(Boolean).slice(0, 4) : [];
  const active = (duo.status ?? 'active') === 'active';
  const canCreatePlan = active && !restricted && !plan;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        background:   C.cardElevated,
        border:       `0.5px solid ${C.border}`,
        borderRadius: 16,
        overflow:     'hidden',
      }}
    >
      <div style={{ height: 3, background: restricted ? 'rgba(255,255,255,0.14)' : C.gradientCTA }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              width:          46,
              height:         46,
              borderRadius:   12,
              background:     'rgba(245,158,11,0.10)',
              border:         '0.5px solid rgba(245,158,11,0.22)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
            }}
          >
            <Users size={21} color={restricted ? C.muted : C.amber} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 900, color: C.white, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {duo.name ?? 'Your Duo'}
                </p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.45 }}>
                  {[duo.city, `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`].filter(Boolean).join(' - ')}
                </p>
              </div>
              <span
                style={{
                  background:   active ? 'rgba(255,107,0,0.08)' : 'rgba(255,255,255,0.06)',
                  border:       `0.5px solid ${active ? 'rgba(79,119,45,0.22)' : C.border}`,
                  color:        active ? C.success : C.muted,
                  borderRadius: 9999,
                  padding:      '4px 9px',
                  fontSize:     11,
                  fontWeight:   800,
                  flexShrink:   0,
                }}
              >
                {statusLabel(duo.status)}
              </span>
            </div>
          </div>
        </div>

        {duo.duo_bio && (
          <p style={{ fontSize: 14, color: 'rgba(245,245,248,0.78)', lineHeight: 1.55, margin: '13px 0 0' }}>
            {duo.duo_bio}
          </p>
        )}

        {duo.city && (
          <p style={{ fontSize: 12, color: C.muted, margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={12} strokeWidth={2} />
            {duo.city}
          </p>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 13 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background:   'rgba(245,158,11,0.10)',
                  border:       '0.5px solid rgba(245,158,11,0.22)',
                  color:        C.amber,
                  borderRadius: 9999,
                  padding:      '4px 10px',
                  fontSize:     12,
                  fontWeight:   700,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {restricted && (
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              background:   'rgba(255,255,255,0.05)',
              border:       `0.5px solid ${C.border}`,
              borderRadius: 12,
              padding:      '10px 12px',
              marginTop:    12,
            }}
          >
            <ShieldAlert size={14} color={C.muted} strokeWidth={2} />
            <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.45 }}>
              {SAFETY_MESSAGES.restrictedDuo}
            </p>
          </div>
        )}

        {loadingPlan ? (
          <div className="shimmer" style={{ height: 58, borderRadius: 12, background: C.cardDeep, marginTop: 12 }} />
        ) : (
          <DuoPlanSummary plan={plan} />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          <PremiumButton fullWidth variant="ghost" onClick={() => go('duo_detail', duo)} style={{ padding: '11px 10px', gap: 6, fontSize: 13 }}>
            <Eye size={14} strokeWidth={2.2} />
            View
          </PremiumButton>
          <PremiumButton fullWidth variant="ghost" onClick={() => go('edit_duo_profile', duo)} style={{ padding: '11px 10px', gap: 6, fontSize: 13 }}>
            <Pencil size={14} strokeWidth={2.2} />
            Edit
          </PremiumButton>
        </div>

        <div style={{ marginTop: 8 }}>
          {plan ? (
            <PremiumButton fullWidth onClick={() => go('hangouts')} style={{ padding: '12px 12px', gap: 7, fontSize: 14 }}>
              <Calendar size={15} strokeWidth={2.2} />
              View plan
            </PremiumButton>
          ) : (
            <PremiumButton
              fullWidth
              disabled={!canCreatePlan}
              onClick={() => go('create_plan', duo)}
              style={{ padding: '12px 12px', gap: 7, fontSize: 14 }}
            >
              <Plus size={15} strokeWidth={2.2} />
              Create plan
            </PremiumButton>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MeUtilitySections({ go }) {
  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
      {[
        { label: 'Profile', sub: 'Edit your personal profile.', Icon: UserCircle, onClick: () => go('edit_profile') },
        { label: 'Safety', sub: 'Blocks and reports live here soon.', Icon: Lock },
        { label: 'Settings', sub: 'Account settings coming soon.', Icon: SlidersHorizontal },
      ].map(({ label, sub, Icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={!onClick}
          style={{
            width:        '100%',
            display:      'flex',
            alignItems:   'center',
            gap:          12,
            background:   C.cardElevated,
            border:       `0.5px solid ${C.border}`,
            borderRadius: 14,
            padding:      '13px 14px',
            textAlign:    'left',
            cursor:       onClick ? 'pointer' : 'default',
            opacity:      onClick ? 1 : 0.72,
          }}
        >
          <Icon size={18} color={onClick ? C.amber : C.muted} strokeWidth={2} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: '0 0 2px' }}>
              {label}
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
              {sub}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function MyDuoPage({ currentUser, profile, myDuo, myDuos = [], go, goBack, refreshMyDuo }) {
  const duos = useMemo(() => {
    const list = myDuos?.length > 0 ? myDuos : (myDuo ? [myDuo] : []);
    return list.filter(Boolean).slice(0, 3);
  }, [myDuo, myDuos]);

  const [planMap,       setPlanMap]       = useState(new Map());
  const [restrictedMap, setRestrictedMap] = useState(new Map());
  const [loadingPlans,  setLoadingPlans]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (duos.length === 0) {
      setPlanMap(new Map());
      setRestrictedMap(new Map());
      setLoadingPlans(false);
      return () => { cancelled = true; };
    }

    setLoadingPlans(true);
    Promise.all(
      duos.map((duo) =>
        Promise.all([
          getMyActivePlan(duo.id).catch(() => null),
          isDuoRestricted(duo.id).catch(() => false),
        ]).then(([plan, restricted]) => ({ id: duo.id, plan, restricted })),
      ),
    ).then((items) => {
      if (cancelled) return;
      setPlanMap(new Map(items.map((item) => [item.id, item.plan])));
      setRestrictedMap(new Map(items.map((item) => [item.id, item.restricted])));
    }).finally(() => {
      if (!cancelled) setLoadingPlans(false);
    });

    return () => { cancelled = true; };
  }, [duos]);

  const handleCreateDuo = () => {
    refreshMyDuo?.();
    go('find_homie');
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar onLogoClick={() => go('home')} />
      <div style={{ padding: '22px 16px 104px' }}>
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 28, fontWeight: 900, color: C.white, letterSpacing: '-0.7px', margin: '0 0 6px' }}>
            Me
          </p>
          <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.55 }}>
            Manage your profile, duos, and safety.
          </p>
          {profile?.name && (
            <p style={{ fontSize: 12, color: 'rgba(245,245,248,0.45)', margin: '8px 0 0' }}>
              Signed in as {profile.name}
            </p>
          )}
        </div>

        {duos.length === 0 ? (
          <div
            style={{
              background:   C.cardElevated,
              border:       `0.5px solid ${C.border}`,
              borderRadius: 16,
              padding:      '24px 18px',
              textAlign:    'center',
            }}
          >
            <div
              style={{
                width:          54,
                height:         54,
                borderRadius:   14,
                background:     'rgba(245,158,11,0.10)',
                border:         '0.5px solid rgba(245,158,11,0.22)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                margin:         '0 auto 14px',
              }}
            >
              <Users size={24} color={C.amber} strokeWidth={2.2} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: C.white, margin: '0 0 6px' }}>
              You don't have a duo yet.
            </p>
            <p style={{ fontSize: 14, color: C.muted, margin: '0 0 18px', lineHeight: 1.55 }}>
              Find a homie first, then create a duo together.
            </p>
            <PremiumButton fullWidth onClick={handleCreateDuo}>
              Find a homie
            </PremiumButton>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                My Duos
              </p>
              <span
                style={{
                  background:   'rgba(255,255,255,0.06)',
                  border:       `0.5px solid ${C.border}`,
                  borderRadius: 9999,
                  color:        C.amber,
                  fontSize:     12,
                  fontWeight:   800,
                  padding:      '5px 10px',
                }}
              >
                {duos.length}/3
              </span>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {duos.map((duo) => (
                <DuoCard
                  key={duo.id}
                  duo={duo}
                  plan={planMap.get(duo.id) ?? null}
                  restricted={restrictedMap.get(duo.id) ?? false}
                  loadingPlan={loadingPlans}
                  go={go}
                />
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              {duos.length < 3 ? (
                <>
                  <PremiumButton fullWidth variant="ghost" onClick={handleCreateDuo} style={{ gap: 7 }}>
                    <Plus size={15} strokeWidth={2.2} />
                    Create another duo
                  </PremiumButton>
                  <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 1.45, margin: '8px 0 0' }}>
                    Start by finding or inviting a homie.
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                  You can create up to 3 duos.
                </p>
              )}
            </div>
          </>
        )}

        <MeUtilitySections go={go} />
      </div>
    </div>
  );
}
