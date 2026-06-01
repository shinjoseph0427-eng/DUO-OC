import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Eye, MapPin, Pencil, Plus, Share2, ShieldAlert, Users } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import SafetyModal from '../components/SafetyModal.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { getMyActivePlan } from '../lib/hangouts.js';
import { isDuoRestricted, SAFETY_MESSAGES } from '../lib/safety.js';
import { leaveDuo } from '../lib/homie.js';
import { createInvite } from '../lib/invites.js';

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
        background:   C.greenT08,
        border:       `0.5px solid ${C.greenBorder}`,
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

function DuoCard({ duo, plan, restricted, loadingPlan, go, onShare, confirmLeaveId, setConfirmLeaveId, leavingDuoId, handleLeaveDuo }) {
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
        overflow:     'visible',
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
              background:     C.amberT08,
              border:         `0.5px solid ${C.brownBorder}`,
              display:        memberCount >= 2 ? 'flex' : 'none',
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
                  border:       `0.5px solid ${active ? C.greenBorder : C.border}`,
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
                  background:   C.amberT08,
                  border:       `0.5px solid ${C.brownBorder}`,
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

        {members.length > 0 && (
          <div style={{
            marginTop: 14,
            padding: '12px 13px',
            borderRadius: 12,
            border: `0.5px solid ${C.border}`,
            background: 'rgba(255,255,255,0.03)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: C.muted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              Duo members
            </p>
            <div style={{ display: 'grid', gap: 7 }}>
              {members.map((member) => {
                const name = member.profiles?.name ?? 'Member';
                const details = [
                  member.profiles?.city,
                  member.instagram || member.profiles?.instagram,
                ].filter(Boolean).join(' - ');
                return (
                  <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: C.amberT08,
                      border: `0.5px solid ${C.brownBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: C.amber,
                      fontSize: 12,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}>
                      {name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.white, margin: 0 }}>
                        {name}
                      </p>
                      {details && (
                        <p style={{ fontSize: 11, color: C.muted, margin: '1px 0 0' }}>
                          {details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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

        <div style={{ display: 'grid', gridTemplateColumns: memberCount >= 2 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, marginTop: 14 }}>
          <PremiumButton fullWidth variant="ghost" onClick={() => go('duo_detail', duo)} style={{ padding: '11px 10px', gap: 6, fontSize: 13 }}>
            <Eye size={14} strokeWidth={2.2} />
            View
          </PremiumButton>
          <button
            onClick={() => {
              if (memberCount >= 2) go('duo_room', duo);
            }}
            disabled={memberCount < 2}
            style={{
              padding:        '9px 0',
              borderRadius:   9,
              border:         `0.5px solid ${C.border}`,
              background:     C.cardElevated,
              fontSize:       12,
              fontWeight:     600,
              color:          memberCount >= 2 ? C.white : C.muted,
              cursor:         memberCount >= 2 ? 'pointer' : 'default',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            5,
            }}
          >
            💬 Room
          </button>
          <PremiumButton fullWidth variant="ghost" onClick={() => go('edit_duo_profile', duo)} style={{ padding: '11px 10px', gap: 6, fontSize: 13 }}>
            <Pencil size={14} strokeWidth={2.2} />
            Edit
          </PremiumButton>
        </div>

        <button
          onClick={() => onShare?.(duo)}
          style={{
            marginTop:      8,
            width:          '100%',
            padding:        '11px 0',
            borderRadius:   9,
            border:         `0.5px solid ${C.brownBorder}`,
            background:     C.amberT08,
            color:          C.amber,
            fontSize:       13,
            fontWeight:     700,
            cursor:         'pointer',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            7,
          }}
        >
          <Share2 size={15} strokeWidth={2.2} />
          카드 공유
        </button>

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

        {confirmLeaveId === duo.id ? (
          <div style={{
            marginTop:      10,
            padding:        '10px 12px',
            borderRadius:   10,
            background:     'rgba(220,38,38,0.08)',
            border:         '0.5px solid rgba(220,38,38,0.2)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            gap:            8,
          }}>
            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>
              Leave this duo?
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setConfirmLeaveId(null)}
                style={{
                  padding:      '6px 12px',
                  borderRadius: 7,
                  border:       `0.5px solid ${C.border}`,
                  background:   'transparent',
                  fontSize:     12,
                  color:        C.muted,
                  cursor:       'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleLeaveDuo(duo.id)}
                disabled={leavingDuoId === duo.id}
                style={{
                  padding:      '6px 12px',
                  borderRadius: 7,
                  border:       'none',
                  background:   '#ef4444',
                  fontSize:     12,
                  fontWeight:   600,
                  color:        '#fff',
                  cursor:       'pointer',
                  opacity:      leavingDuoId === duo.id ? 0.6 : 1,
                }}
              >
                {leavingDuoId === duo.id ? '...' : 'Leave'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLeaveId(duo.id)}
            style={{
              marginTop:    8,
              width:        '100%',
              padding:      '8px 0',
              borderRadius: 9,
              border:       '0.5px solid rgba(220,38,38,0.25)',
              background:   'transparent',
              fontSize:     12,
              color:        '#ef4444',
              cursor:       'pointer',
              opacity:      0.7,
            }}
          >
            Leave duo
          </button>
        )}
      </div>
    </motion.div>
  );
}

function MeUtilitySections({ go, onInvite, inviteLoading, onSafety, onLogout }) {
  const rows = [
    {
      label:     inviteLoading ? 'Generating link...' : 'Invite a friend',
      sub:       'Share a link — they join as your duo',
      onClick:   onInvite,
      active:    true,
      highlight: true,
    },
    {
      label: 'Edit profile',
      sub: 'Photos, bio, prompts',
      onClick: () => go('edit_profile'),
      active: true,
    },
    {
      label: 'Find a homie',
      sub: 'Browse duo partners near you',
      onClick: () => go('find_homie'),
      active: true,
    },
    {
      label: 'Safety',
      sub: 'Blocks and reports',
      onClick: () => onSafety?.(),
      active: true,
    },
    {
      label: 'Sign out',
      sub: 'Log out of this account',
      onClick: onLogout,
      active: Boolean(onLogout),
    },
  ];

  return (
    <div style={{
      margin: '8px 16px 0',
      border: `0.5px solid ${C.border}`,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {rows.map((row, i) => (
        <div
          key={row.label}
          onClick={row.onClick || undefined}
          style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            padding:         '14px 16px',
            borderBottom:    i < rows.length - 1 ? `0.5px solid ${C.border}` : 'none',
            background:      row.highlight ? C.amberT08 : C.cardElevated,
            cursor:          row.active ? 'pointer' : 'default',
            opacity:         row.active ? 1 : 0.45,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: row.highlight ? C.amber : C.white, marginBottom: 2 }}>
              {row.label}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {row.sub}
            </div>
          </div>
          {row.active && (
            <span style={{ fontSize: 16, color: row.highlight ? C.amber : C.muted }}>→</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MyDuoPage({ currentUser, profile, myDuo, myDuos = [], go, refreshMyDuo, showToast, onLogout }) {
  const duos = useMemo(() => {
    const list = myDuos?.length > 0 ? myDuos : (myDuo ? [myDuo] : []);
    return list.filter(Boolean).slice(0, 3);
  }, [myDuo, myDuos]);

  const [planMap,        setPlanMap]        = useState(new Map());
  const [restrictedMap,  setRestrictedMap]  = useState(new Map());
  const [loadingPlans,   setLoadingPlans]   = useState(false);
  const [leavingDuoId,   setLeavingDuoId]   = useState(null);
  const [confirmLeaveId, setConfirmLeaveId] = useState(null);
  const [inviteLoading,  setInviteLoading]  = useState(false);
  const [showSafety,     setShowSafety]     = useState(false);

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

  async function handleInvite() {
    if (!currentUser || inviteLoading) return;
    setInviteLoading(true);
    try {
      const token = await createInvite(currentUser.id);
      const url = `${window.location.origin}?invite=${token}`;

      if (navigator.share) {
        await navigator.share({
          title: 'Join me on DUO OC',
          text: 'Be my duo partner on DUO OC — 2v2 hangouts in Orange County.',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied!', 'success');
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        console.error('handleInvite error', e);
        showToast?.('Could not create invite link.', 'error');
      }
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleShareDuo(duo) {
    const url = `${window.location.origin}/duo/${duo.id}`;
    const shareData = { title: 'Duo OC', text: '우리 Duo OC 카드 봐봐 👀', url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        showToast?.('링크 복사됨', 'success');
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        await navigator.clipboard.writeText(url).catch(() => {});
        showToast?.('링크 복사됨', 'success');
      }
    }
  }

  async function handleLeaveDuo(duoId) {
    if (leavingDuoId) return;
    setLeavingDuoId(duoId);
    try {
      await leaveDuo(duoId);
      refreshMyDuo?.();
      setConfirmLeaveId(null);
      showToast?.('Left duo.', 'info');
    } catch (e) {
      console.error('leaveDuo error', e);
      showToast?.('Could not leave duo.', 'error');
    } finally {
      setLeavingDuoId(null);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar onLogoClick={() => go('home')} />
      <div style={{ padding: '22px 16px 104px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          My profile
        </p>
        <div style={{
          padding:       '20px 16px 16px',
          display:       'flex',
          alignItems:    'center',
          gap:           14,
          borderBottom:  `0.5px solid ${C.border}`,
          marginBottom:  8,
        }}>
          <div style={{
            width:          52,
            height:         52,
            borderRadius:   '50%',
            background:     profile?.photos?.[0] ? 'transparent' : C.amberT08,
            border:         `1.5px solid ${profile?.photos?.[0] ? C.border : C.brownBorder}`,
            overflow:       'hidden',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       20,
            fontWeight:     700,
            color:          C.amber,
            flexShrink:     0,
          }}>
            {profile?.photos?.[0] ? (
              <img
                src={profile.photos[0]}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              profile?.name?.[0]?.toUpperCase() || '?'
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 2 }}>
              {profile?.name || 'Your profile'}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {[profile?.city, profile?.age && `${profile.age}`, profile?.username && `@${profile.username}`].filter(Boolean).join(' - ') || 'Orange County'}
            </div>
          </div>

          <div
            onClick={() => go('edit_profile')}
            style={{
              padding:      '8px 14px',
              borderRadius: 10,
              border:       `0.5px solid ${C.border}`,
              background:   C.cardElevated,
              fontSize:     12,
              fontWeight:   600,
              color:        C.white,
              cursor:       'pointer',
            }}
          >
            Edit
          </div>
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
                background:     C.amberT08,
                border:         `0.5px solid ${C.brownBorder}`,
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
              Invite a homie to start a new Duo
            </PremiumButton>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                {duos.length === 1 ? 'My Duo' : 'My Duos'}
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
                  onShare={handleShareDuo}
                  confirmLeaveId={confirmLeaveId}
                  setConfirmLeaveId={setConfirmLeaveId}
                  leavingDuoId={leavingDuoId}
                  handleLeaveDuo={handleLeaveDuo}
                />
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              {duos.length < 3 ? (
                <>
                  <PremiumButton fullWidth variant="ghost" onClick={handleCreateDuo} style={{ gap: 7 }}>
                    <Plus size={15} strokeWidth={2.2} />
                    Invite a homie to start a new Duo
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

        <MeUtilitySections
          go={go}
          onInvite={handleInvite}
          inviteLoading={inviteLoading}
          onSafety={() => setShowSafety(true)}
          onLogout={onLogout}
        />
      </div>
      {showSafety && (
        <SafetyModal
          myDuo={duos[0]}
          onClose={() => setShowSafety(false)}
        />
      )}
    </div>
  );
}
