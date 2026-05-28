import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, MoreHorizontal } from 'lucide-react';
import { C, AVATAR_GRADIENTS, F } from '../tokens';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import InitialsAvatar from '../components/InitialsAvatar.jsx';
import ReportModal from '../components/ReportModal.jsx';
import { staggerContainer, staggerItem } from '../lib/motion';
import { getMyActivePlan, isPastHangoutTime, requestToJoinPlan } from '../lib/hangouts.js';
import { getMyReviewsForHangouts } from '../lib/reviews.js';
import { isDuoRestricted, SAFETY_MESSAGES } from '../lib/safety.js';
import { supabase } from '../lib/supabaseClient.js';

const DATE_LABELS = {
  today:     'Today',
  tomorrow:  'Tomorrow',
  friday:    'This Friday',
  saturday:  'Saturday',
  sunday:    'This Sunday',
  next_week: 'Next week',
};

const TIME_LABELS = {
  morning:   'Morning (10am–12pm)',
  afternoon: 'Afternoon (12pm–4pm)',
  evening:   'Evening (4pm–7pm)',
  night:     'Night (7pm–10pm)',
};

function calcAge(profile) {
  if (profile?.birth_year) return new Date().getFullYear() - profile.birth_year;
  return profile?.age ?? null;
}

// Normalize duo data from both Supabase format and legacy static format
function normalizeMembers(duo) {
  if (duo.duo_members?.length) {
    return duo.duo_members.map((m) => ({
      name:    m.profiles?.name    ?? '?',
      age:     calcAge(m.profiles) ?? m.age ?? null,
      city:    m.profiles?.city    ?? null,
      photo:   m.profiles?.photos?.[0] ?? null,
      bio:     m.profiles?.bio    ?? null,
      promptQ: m.profiles?.prompt_q1 ?? null,
      promptA: m.profiles?.prompt_a1 ?? null,
    }));
  }
  // Legacy static format
  return (duo.members ?? []).map((m) => ({
    name:    m.name ?? '?',
    age:     m.age  ?? null,
    city:    m.city ?? null,
    photo:   null,
    bio:     null,
    promptQ: null,
    promptA: null,
  }));
}

function MemberPhoto({ member, index, height = '100%' }) {
  if (member.photo) {
    return (
      <img
        src={member.photo}
        alt={member.name}
        style={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
      />
    );
  }
  return (
    <div
      style={{
        width:          '100%',
        height,
        background:     AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: 64, fontWeight: 800, color: 'rgba(255,255,255,0.25)' }}>
        {(member.name || '?')[0].toUpperCase()}
      </span>
    </div>
  );
}

function PromptCard({ q, a, accent }) {
  if (!a) return null;
  return (
    <div
      style={{
        background:   accent ? C.amberT08 : C.cardElevated,
        border:       `0.5px solid ${accent ? 'rgba(255,107,0,0.15)' : C.border}`,
        borderRadius: 14,
        padding:      '14px 16px',
        marginTop:    12,
      }}
    >
      <p
        style={{
          fontSize:      11,
          fontWeight:    700,
          color:         accent ? C.amber : C.muted,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          margin:        '0 0 6px',
        }}
      >
        {q}
      </p>
      <p style={{ fontSize: 15, fontWeight: 700, color: C.white, lineHeight: 1.45, margin: 0 }}>
        {a}
      </p>
    </div>
  );
}

function MemberCard({ member, index }) {
  const age = member.age;

  return (
    <div
      style={{
        background:   C.cardElevated,
        border:       `0.5px solid ${C.border}`,
        borderRadius: 18,
        overflow:     'hidden',
        marginBottom: 12,
      }}
    >
      {/* Member photo strip */}
      <div style={{ height: 160, position: 'relative' }}>
        <MemberPhoto member={member} index={index} height={160} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.65) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 12, left: 14 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: C.cream, margin: 0 }}>
            {member.name}{age ? <span style={{ fontWeight: 400, fontSize: 15, marginLeft: 6 }}>{age}</span> : null}
          </p>
          {member.city && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={10} strokeWidth={2} />{member.city}
            </p>
          )}
        </div>
      </div>

      {/* Bio + prompt */}
      {(member.bio || member.promptA) && (
        <div style={{ padding: '14px 16px 16px' }}>
          {member.bio && (
            <p style={{ fontSize: 14, color: C.white, lineHeight: 1.6, margin: 0 }}>
              {member.bio}
            </p>
          )}
          <PromptCard q={member.promptQ} a={member.promptA} />
        </div>
      )}
    </div>
  );
}

export default function DuoDetailPage({ duo, go, goBack, onLogout, currentUser, myDuo, myDuos: myDuosProp, showToast }) {
  const allMyDuos = myDuosProp?.length > 0 ? myDuosProp : (myDuo ? [myDuo] : []);

  const [reportOpen,             setReportOpen]             = useState(false);
  const [openPlan,               setOpenPlan]               = useState(null);
  const [planLoading,            setPlanLoading]            = useState(false);
  const [joinState,              setJoinState]              = useState(null); // null | 'loading' | 'sent' | 'duplicate' | 'error'
  const [joinError,              setJoinError]              = useState('');
  const [selectedRequesterDuoId, setSelectedRequesterDuoId] = useState(null);
  const [duoRestricted,          setDuoRestricted]          = useState(false);
  const [hasHungOutBefore,       setHasHungOutBefore]       = useState(false);
  const [pastVibe,               setPastVibe]               = useState(null);

  useEffect(() => {
    if (!duo?.id) return;
    setPlanLoading(true);
    Promise.all([
      getMyActivePlan(duo.id).catch(() => null),
      isDuoRestricted(duo.id).catch(() => false),
    ])
      .then(([plan, restricted]) => {
        setOpenPlan(plan);
        setDuoRestricted(restricted);
      })
      .catch(() => {
        setOpenPlan(null);
        setDuoRestricted(false);
      })
      .finally(() => setPlanLoading(false));
  }, [duo?.id]);

  useEffect(() => {
    let cancelled = false;
    setHasHungOutBefore(false);
    setPastVibe(null);
    if (!myDuo?.id || !duo?.id || myDuo.id === duo.id) {
      return () => { cancelled = true; };
    }

    supabase
      .from('hangouts')
      .select('id, date, time_slot, created_at')
      .eq('status', 'confirmed')
      .or(
        `and(duo_a_id.eq.${myDuo.id},duo_b_id.eq.${duo.id}),` +
        `and(duo_a_id.eq.${duo.id},duo_b_id.eq.${myDuo.id})`,
      )
      .then(async ({ data }) => {
        if (cancelled) return;
        const pastHangout = (data ?? []).find((hangout) =>
          isPastHangoutTime(hangout.date, hangout.time_slot, hangout.created_at));
        if (!pastHangout) return;

        setHasHungOutBefore(true);
        const reviews = await getMyReviewsForHangouts([pastHangout.id], [myDuo.id]);
        if (!cancelled) setPastVibe(reviews?.[0]?.vibe ?? null);
      });

    return () => { cancelled = true; };
  }, [myDuo?.id, duo?.id]);

  // Duos that can send a join request: user's duos excluding the viewed duo
  const eligibleRequesters = allMyDuos.filter((d) => d?.id && d.id !== duo?.id);
  const requesterDuoId = selectedRequesterDuoId ?? eligibleRequesters[0]?.id ?? null;

  const handleJoinRequest = async () => {
    if (!requesterDuoId || !openPlan?.id || joinState === 'loading') return;
    setJoinState('loading');
    setJoinError('');
    try {
      await requestToJoinPlan({
        planId:          openPlan.id,
        requesterDuoId:  requesterDuoId,
        message:         "We'd like to join your plan.",
      });
      setJoinState('sent');
    } catch (err) {
      if (err?.code === '23505' || err?.message?.toLowerCase().includes('duplicate')) {
        setJoinState('duplicate');
      } else {
        setJoinState('error');
        setJoinError(err?.message === SAFETY_MESSAGES.restrictedDuo ? SAFETY_MESSAGES.restrictedDuo : 'Something went wrong. Please try again.');
      }
    }
  };

  if (!duo || duo.status === 'dissolved' || duo.status === 'archived') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          textAlign: 'center',
          gap: 12,
        }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: C.white,
          }}>
            This duo is no longer active
          </div>
          <div style={{
            fontSize: 13,
            color: C.muted,
            marginBottom: 8,
          }}>
            The duo has been dissolved.
          </div>
          <button
            onClick={() => go('explore')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: C.amber,
              color: C.white,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Find duos &rarr;
          </button>
        </div>
      </div>
    );
  }

  // True when the viewed duo is one of the current user's own duos.
  const myDuoIdSet = new Set(allMyDuos.map((d) => d?.id).filter(Boolean));
  const isOwnDuo =
    myDuoIdSet.has(duo.id) ||
    (duo.duo_members ?? []).some((m) => m.user_id === currentUser?.id);

  const members   = normalizeMembers(duo);
  const heroPhoto = duo.duo_photos?.[0] ?? null;
  const vibes     = duo.vibes ?? [];

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>

      {/* ── Hero ─────────────────────────────────── */}
      <div style={{ position: 'relative', height: '55vh', minHeight: 300 }}>
        {heroPhoto ? (
          <img
            src={heroPhoto}
            alt={duo.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          /* Split member layout */
          <div style={{ display: 'flex', height: '100%' }}>
            {members.slice(0, 2).map((m, i) => (
              <div key={i} style={{ flex: 1, position: 'relative', borderRight: i === 0 ? '0.5px solid rgba(0,0,0,0.4)' : 'none' }}>
                <MemberPhoto member={m} index={i} height="100%" />
              </div>
            ))}
            {members.length === 0 && (
              <div style={{ flex: 1, background: C.cardDeep }} />
            )}
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />

        {/* Back button */}
        <motion.button
          type="button"
          aria-label="Back"
          onClick={() => go('home')}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          style={{
            position:       'absolute',
            top:            14,
            left:           14,
            width:          38,
            height:         38,
            borderRadius:   11,
            background:     'rgba(0,0,0,0.45)',
            border:         '0.5px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
          }}
        >
          <ChevronLeft size={20} color={C.cream} strokeWidth={2.2} />
        </motion.button>

        {/* Logo — clickable to home */}
        <motion.button
          type="button"
          aria-label="Home"
          onClick={() => go('home')}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.1 }}
          style={{
            position:       'absolute',
            top:            14,
            left:           '50%',
            transform:      'translateX(-50%)',
            background:     'rgba(0,0,0,0.35)',
            border:         '0.5px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            borderRadius:   10,
            padding:        '6px 14px',
            cursor:         'pointer',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px' }}>
            <span className="gradient-text">DUO OC</span>
          </span>
        </motion.button>

        {/* More button */}
        <motion.button
          type="button"
          aria-label="More options"
          onClick={() => setReportOpen(true)}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          style={{
            position:       'absolute',
            top:            14,
            right:          14,
            width:          38,
            height:         38,
            borderRadius:   11,
            background:     'rgba(0,0,0,0.45)',
            border:         '0.5px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
          }}
        >
          <MoreHorizontal size={18} color={C.cream} strokeWidth={2} />
        </motion.button>

        {/* Duo name + members */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
          <p style={{ ...F.h2, color: C.cream, margin: '0 0 4px', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
            {duo.name}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            {members.map((m) => [m.name, m.age].filter(Boolean).join(', ')).join(' · ')}
          </p>
        </div>
      </div>

      {/* ── Content ──────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ padding: '20px 16px 100px' }}
      >
        {hasHungOutBefore && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 20,
            background: C.greenT08,
            border: `0.5px solid ${C.greenBorder}`,
            fontSize: 11,
            fontWeight: 500,
            color: C.success,
            marginBottom: 10,
          }}>
            ✓ You've hung out before
            {pastVibe ? ` · ${pastVibe}` : ''}
          </div>
        )}

        {duo.city && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: C.muted,
            marginBottom: 8,
          }}>
            <MapPin size={11} />
            {duo.city}
          </div>
        )}

        {/* Vibe pills */}
        {vibes.length > 0 && (
          <motion.div variants={staggerItem} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {vibes.map((v) => (
              <span
                key={v}
                style={{
                  background:   'rgba(255,107,0,0.10)',
                  color:        C.amber,
                  border:       '0.5px solid rgba(255,107,0,0.15)',
                  borderRadius: 9999,
                  padding:      '5px 12px',
                  fontSize:     12,
                  fontWeight:   600,
                }}
              >
                {v}
              </span>
            ))}
          </motion.div>
        )}

        {/* Member cards */}
        {members.map((m, i) => (
          <motion.div key={i} variants={staggerItem}>
            <MemberCard member={m} index={i} />
          </motion.div>
        ))}

        {/* Duo Story */}
        {(duo.how_we_met || duo.duo_bio) && (
          <motion.div
            variants={staggerItem}
            style={{
              background:   C.cardElevated,
              border:       `0.5px solid ${C.border}`,
              borderRadius: 18,
              padding:      '18px 18px',
              marginBottom: 12,
            }}
          >
            {duo.how_we_met && (
              <>
                <p
                  style={{
                    fontSize:      11,
                    fontWeight:    700,
                    color:         C.muted,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    margin:        '0 0 8px',
                  }}
                >
                  How we met
                </p>
                <p style={{ fontSize: 15, color: C.white, lineHeight: 1.6, margin: duo.duo_bio ? '0 0 16px' : 0 }}>
                  {duo.how_we_met}
                </p>
              </>
            )}
            {duo.duo_bio && (
              <p style={{ fontSize: 15, color: C.white, lineHeight: 1.6, margin: 0 }}>
                {duo.duo_bio}
              </p>
            )}
          </motion.div>
        )}

        {/* Duo Prompt */}
        {duo.duo_prompt_q && duo.duo_prompt_a && (
          <motion.div variants={staggerItem} style={{ marginBottom: 12 }}>
            <PromptCard q={duo.duo_prompt_q} a={duo.duo_prompt_a} accent />
          </motion.div>
        )}

        {/* Safety note */}
        <motion.p
          variants={staggerItem}
          style={{ fontSize: 12, color: C.muted, textAlign: 'center', margin: '20px 0', lineHeight: 1.6 }}
        >
          First plans should be public.
          <br />
          Instagram unlocks only after both duos confirm.
        </motion.p>

        {/* CTA — hidden when viewing an own duo */}
        {!isOwnDuo && (
          <motion.div variants={staggerItem}>
            {planLoading ? (
              <div className="shimmer" style={{ height: 52, borderRadius: 14, background: C.cardDeep }} />
            ) : duoRestricted ? (
              <div
                style={{
                  background:   C.cardElevated,
                  border:       `0.5px solid ${C.border}`,
                  borderRadius: 14,
                  padding:      '14px 16px',
                  textAlign:    'center',
                }}
              >
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                  {SAFETY_MESSAGES.restrictedDuo}
                </p>
              </div>
            ) : openPlan ? (
              <>
                {/* Plan detail card */}
                <div
                  style={{
                    background:   'rgba(255,107,0,0.08)',
                    border:       `0.5px solid ${C.greenBorder}`,
                    borderRadius: 14,
                    padding:      '14px 16px',
                    marginBottom: 14,
                  }}
                >
                  <p
                    style={{
                      fontSize:      10,
                      fontWeight:    700,
                      color:         C.moss,
                      letterSpacing: '0.9px',
                      textTransform: 'uppercase',
                      margin:        '0 0 8px',
                    }}
                  >
                    Open plan
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.white, margin: '0 0 4px', lineHeight: 1.4 }}>
                    {[openPlan.vibe, DATE_LABELS[openPlan.date], TIME_LABELS[openPlan.time_slot]].filter(Boolean).join(' · ')}
                  </p>
                  {openPlan.place && (
                    <p style={{ fontSize: 13, color: C.muted, margin: '2px 0 0' }}>
                      📍 {openPlan.place}
                    </p>
                  )}
                  {openPlan.message && (
                    <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', margin: '8px 0 0', lineHeight: 1.5 }}>
                      "{openPlan.message}"
                    </p>
                  )}
                </div>
                <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', margin: '0 0 12px', lineHeight: 1.6 }}>
                  They already posted a plan. Request to join instead of sending a new hangout request.
                </p>
                {/* Request as selector — only when user has multiple eligible duos */}
                {eligibleRequesters.length > 1 && joinState !== 'sent' && joinState !== 'duplicate' && (
                  <div style={{ marginBottom: 12 }}>
                    <p
                      style={{
                        fontSize:      10,
                        fontWeight:    700,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        color:         C.muted,
                        margin:        '0 0 8px',
                      }}
                    >
                      Request as
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {eligibleRequesters.map((d) => (
                        <motion.button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedRequesterDuoId(d.id)}
                          whileTap={{ scale: 0.93 }}
                          transition={{ duration: 0.1 }}
                          style={{
                            background:   requesterDuoId === d.id ? C.gradientCTA : C.cardElevated,
                            border:       '0.5px solid ' + (requesterDuoId === d.id ? 'transparent' : C.border),
                            borderRadius: 9999,
                            padding:      '8px 14px',
                            fontSize:     13,
                            fontWeight:   600,
                            color:        requesterDuoId === d.id ? C.cream : C.muted,
                            cursor:       'pointer',
                          }}
                        >
                          {d.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
                {joinState === 'sent' ? (
                  <div
                    style={{
                      background:   C.greenT08,
                      border:       `0.5px solid ${C.greenBorder}`,
                      borderRadius: 14,
                      padding:      '14px 16px',
                      textAlign:    'center',
                    }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.success, margin: 0 }}>
                      Request sent.
                    </p>
                  </div>
                ) : joinState === 'duplicate' ? (
                  <div
                    style={{
                      background:   C.cardElevated,
                      border:       `0.5px solid ${C.border}`,
                      borderRadius: 14,
                      padding:      '14px 16px',
                      textAlign:    'center',
                    }}
                  >
                    <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                      You already requested to join this plan.
                    </p>
                  </div>
                ) : (
                  <>
                    {eligibleRequesters.length === 0 ? (
                      <>
                        <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', margin: '0 0 10px' }}>
                          You need a duo before making plans.
                        </p>
                        <PremiumButton fullWidth variant="ghost" onClick={() => go('find_homie')}>
                          Find a homie
                        </PremiumButton>
                      </>
                    ) : (
                      <PremiumButton
                        fullWidth
                        disabled={joinState === 'loading' || !requesterDuoId}
                        onClick={handleJoinRequest}
                      >
                        {joinState === 'loading' ? 'Sending…' : 'Request to join plan →'}
                      </PremiumButton>
                    )}
                    {joinState === 'error' && joinError && (
                      <p style={{ fontSize: 13, color: C.danger, textAlign: 'center', marginTop: 10 }}>
                        {joinError}
                      </p>
                    )}
                  </>
                )}
              </>
            ) : (
              <PremiumButton fullWidth onClick={() => go('propose_hangout', duo)}>
                Send hangout request →
              </PremiumButton>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Report / Block modal */}
      <AnimatePresence>
        {reportOpen && (
          <ReportModal
            reporterUserId={currentUser?.id}
            reportedDuoId={duo.id}
            reportedDuoName={duo.name}
            blockerDuoId={myDuo?.id}
            onClose={() => setReportOpen(false)}
            onBlocked={() => { setReportOpen(false); go('explore'); }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
