import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Check } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import InstagramButton from '../components/InstagramButton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { OC_SPOTS } from '../data/duos.js';
import {
  getMyHangouts, acceptHangout, declineHangout,
  getMyActivePlan, getIncomingPlanRequests,
  acceptPlanRequest, declinePlanRequest, cancelOpenPlan,
  isPastHangoutTime,
} from '../lib/hangouts.js';
import { createPostHangoutReview, getMyReviewsForHangouts } from '../lib/reviews.js';
import { blockDuo, reportDuo } from '../lib/safety.js';

const SECTION_LABEL = {
  fontSize:      10,
  fontWeight:    700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color:         C.muted,
};

const TIME_LABELS = {
  morning:   'Morning (10am–12pm)',
  afternoon: 'Afternoon (12pm–4pm)',
  evening:   'Evening (4pm–7pm)',
  night:     'Night (7pm–10pm)',
};

const DATE_LABELS = {
  today:     'Today',
  tomorrow:  'Tomorrow',
  friday:    'This Friday',
  saturday:  'Saturday',
  sunday:    'This Sunday',
  next_week: 'Next week',
};

const WOULD_HANG_OPTIONS = [
  { value: 'yes',   label: 'Yes'   },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no',    label: 'No'    },
];

const REVIEW_VIBE_OPTIONS = ['Easy', 'Fun', 'Respectful', 'Awkward', 'Not a fit'];

const SAFETY_REPORT_REASONS = ['Unsafe', 'Disrespectful', 'Harassment', 'Fake profile', 'Other'];

const REVIEW_LABEL = {
  fontSize:      10,
  fontWeight:    700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color:         C.muted,
  display:       'block',
  marginBottom:  10,
};

function SpotCard({ spot }) {
  return (
    <div
      style={{
        background:   spot.bg,
        border:       `0.5px solid ${C.border}`,
        borderRadius: 14,
        padding:      '14px 12px',
        minWidth:     90,
        textAlign:    'center',
        flexShrink:   0,
        cursor:       'pointer',
      }}
    >
      <p style={{ fontSize: 18, marginBottom: 6 }}>{spot.emoji}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.white, marginBottom: 2 }}>{spot.name}</p>
      <p style={{ fontSize: 10, color: C.muted }}>{spot.city}</p>
    </div>
  );
}

function HangoutMeta({ h }) {
  const dateLabel = DATE_LABELS[h.date] ?? h.date ?? '';
  const timeLabel = TIME_LABELS[h.time_slot] ?? h.time_slot ?? '';
  return (
    <>
      <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 8px' }}>
        {[h.vibe, dateLabel, timeLabel].filter(Boolean).join(' · ')}
      </p>
      {h.place && (
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>{h.place}</p>
      )}
    </>
  );
}

export default function HangoutsPage({ currentUser, myDuo, myDuos: myDuosProp = [], go, onLogout, showToast }) {
  // Fall back to [myDuo] if prop not yet populated (e.g. older callers)
  const myDuos = myDuosProp.length > 0 ? myDuosProp : (myDuo ? [myDuo] : []);

  const [hangouts,          setHangouts]          = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [acceptedHangout,   setAcceptedHangout]   = useState(null);
  // planData: [{ duo, plan: {...}|null, requests: [...] }]
  const [planData,          setPlanData]          = useState([]);
  const [planLoading,       setPlanLoading]       = useState(false);
  const [acceptedPlanReqId, setAcceptedPlanReqId] = useState(null);
  // Reviews
  const [reviewMap,           setReviewMap]           = useState(new Map()); // hangoutId → review
  const [reviewingHangoutId,  setReviewingHangoutId]  = useState(null);
  const [reviewForm,          setReviewForm]          = useState({ wouldHangAgain: null, vibe: null, note: '', safetyFlag: false });
  const [reviewLoading,       setReviewLoading]       = useState(false);
  // Safety follow-up (shown after safetyFlag review is submitted)
  const [safetyFollowUp,     setSafetyFollowUp]     = useState(null); // null | { hangoutId, reviewedDuoId, reviewedDuoName, reviewerDuoId }
  const [safetyBlockState,   setSafetyBlockState]   = useState('idle'); // 'idle' | 'blocking' | 'blocked'
  const [safetyReportState,  setSafetyReportState]  = useState('hidden'); // 'hidden' | 'form' | 'submitting' | 'done'
  const [safetyReportReason, setSafetyReportReason] = useState(null);
  const [safetyReportNote,   setSafetyReportNote]   = useState('');

  const load = useCallback(() => {
    if (!currentUser) { setLoading(false); return; }
    const ids = myDuos.map((d) => d.id).filter(Boolean);
    if (ids.length === 0) { setLoading(false); return; }
    getMyHangouts(ids).then((data) => {
      const list = data ?? [];
      setHangouts(list);
      setLoading(false);
      // Load reviews for past confirmed hangouts
      const pastIds = list
        .filter((h) => h.status === 'confirmed' && isPastHangoutTime(h.date, h.time_slot, h.created_at))
        .map((h) => h.id);
      if (pastIds.length > 0) {
        getMyReviewsForHangouts(pastIds, ids)
          .then((reviews) => setReviewMap(new Map(reviews.map((r) => [r.hangout_id, r]))))
          .catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, [currentUser, myDuos]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlan = useCallback(() => {
    if (!myDuos.length) return;
    setPlanLoading(true);
    Promise.all(
      myDuos.map((duo) =>
        Promise.all([
          getMyActivePlan(duo.id),
          getIncomingPlanRequests(duo.id),
        ])
          .then(([plan, reqs]) => ({ duo, plan: plan ?? null, requests: reqs ?? [] }))
          .catch(() => ({ duo, plan: null, requests: [] })),
      ),
    ).then((results) => {
      setPlanData(results);
    }).finally(() => setPlanLoading(false));
  }, [myDuos]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPlan(); }, [loadPlan]);

  const handleAccept = async (id) => {
    try {
      await acceptHangout(id, currentUser?.id);
      setAcceptedHangout(id);
      load();
    } catch (err) {
      showToast?.(err?.message ?? 'Could not accept hangout.', 'error');
    }
  };

  const handleDecline = async (id) => {
    try {
      await declineHangout(id, currentUser?.id);
      load();
    } catch (err) {
      showToast?.(err?.message ?? 'Could not decline hangout.', 'error');
    }
  };

  const handleAcceptPlanRequest = async (reqId) => {
    try {
      await acceptPlanRequest(reqId, currentUser?.id);
      setAcceptedPlanReqId(reqId);
      loadPlan();
      load();
    } catch (err) {
      showToast?.(err?.message ?? 'Could not accept request.', 'error');
    }
  };

  const handleDeclinePlanRequest = async (reqId) => {
    try {
      await declinePlanRequest(reqId, currentUser?.id);
      loadPlan();
    } catch (err) {
      showToast?.(err?.message ?? 'Could not decline request.', 'error');
    }
  };

  const handleCancelPlan = async (planId) => {
    if (!planId) return;
    if (!window.confirm('Cancel your open plan? Pending requests to join will be notified.')) return;
    try {
      await cancelOpenPlan(planId, currentUser?.id);
      loadPlan();
    } catch (err) {
      showToast?.(err?.message ?? 'Could not cancel plan.', 'error');
    }
  };

  // Reset review form when switching which hangout is being reviewed
  useEffect(() => {
    setReviewForm({ wouldHangAgain: null, vibe: null, note: '', safetyFlag: false });
  }, [reviewingHangoutId]);

  // Reset safety state when follow-up target changes
  useEffect(() => {
    setSafetyBlockState('idle');
    setSafetyReportState('hidden');
    setSafetyReportReason(null);
    setSafetyReportNote('');
  }, [safetyFollowUp?.hangoutId]);

  const handleSubmitReview = async (hangout) => {
    if (reviewLoading) return;
    const reviewerDuoId = myDuos.find((d) => d.id === hangout.duo_a_id || d.id === hangout.duo_b_id)?.id;
    const reviewedDuoId = reviewerDuoId === hangout.duo_a_id ? hangout.duo_b_id : hangout.duo_a_id;
    if (!reviewerDuoId || !reviewedDuoId || reviewerDuoId === reviewedDuoId) return;
    setReviewLoading(true);
    try {
      const flagged = reviewForm.safetyFlag;
      const review = await createPostHangoutReview({
        hangoutId:       hangout.id,
        reviewerUserId:  currentUser.id,
        reviewerDuoId,
        reviewedDuoId,
        wouldHangAgain:  reviewForm.wouldHangAgain,
        vibe:            reviewForm.vibe,
        note:            reviewForm.note.trim() || null,
        safetyFlag:      flagged,
      });
      setReviewMap((prev) => new Map(prev).set(hangout.id, review));
      if (flagged) {
        const otherDuo = myDuoIds.includes(hangout.duo_a_id) ? hangout.duo_b : hangout.duo_a;
        setSafetyFollowUp({
          hangoutId:       hangout.id,
          reviewedDuoId,
          reviewedDuoName: otherDuo?.name ?? 'This duo',
          reviewerDuoId,
        });
      }
      setReviewingHangoutId(null);
    } catch (err) {
      showToast?.(err?.message ?? 'Could not save review.', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSafetyBlock = async () => {
    if (!safetyFollowUp || safetyBlockState !== 'idle') return;
    setSafetyBlockState('blocking');
    try {
      await blockDuo({ blockerDuoId: safetyFollowUp.reviewerDuoId, blockedDuoId: safetyFollowUp.reviewedDuoId });
      setSafetyBlockState('blocked');
    } catch (err) {
      showToast?.(err?.message ?? 'Could not block duo.', 'error');
      setSafetyBlockState('idle');
    }
  };

  const handleSafetyReport = async () => {
    if (!safetyFollowUp || !safetyReportReason || safetyReportState === 'submitting') return;
    setSafetyReportState('submitting');
    try {
      await reportDuo({
        reporterUserId: currentUser.id,
        reportedDuoId:  safetyFollowUp.reviewedDuoId,
        reason:         safetyReportReason,
        detail:         safetyReportNote.trim() || null,
      });
      setSafetyReportState('done');
    } catch (err) {
      showToast?.(err?.message ?? 'Could not submit report.', 'error');
      setSafetyReportState('form');
    }
  };

  const myDuoIds       = myDuos.map((d) => d.id);
  const activePlanItems = planData.filter((item) => item.plan !== null);
  const totalPlanReqs   = planData.reduce((sum, item) => sum + item.requests.length, 0);
  const planSectionLabel = myDuos.length > 1 ? 'My Plans' : 'My Plan';

  const incoming      = hangouts.filter((h) => h.status === 'pending'   && myDuoIds.includes(h.duo_b_id)  && !isPastHangoutTime(h.date, h.time_slot, h.created_at));
  const outgoing      = hangouts.filter((h) => h.status === 'pending'   && myDuoIds.includes(h.duo_a_id)  && !isPastHangoutTime(h.date, h.time_slot, h.created_at));
  const countered     = hangouts.filter((h) => h.status === 'countered' && myDuoIds.includes(h.duo_a_id)  && !isPastHangoutTime(h.date, h.time_slot, h.created_at));
  const confirmed     = hangouts.filter((h) => h.status === 'confirmed'                                    && !isPastHangoutTime(h.date, h.time_slot, h.created_at));
  const pastConfirmed = hangouts.filter((h) => h.status === 'confirmed'                                    &&  isPastHangoutTime(h.date, h.time_slot, h.created_at));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <TopBar onLogout={onLogout} onLogoClick={() => go('home')} />

      <div style={{ flex: 1, padding: '20px 16px', paddingBottom: 80, overflowY: 'auto' }}>

        {loading ? (
          <p style={{ fontSize: 14, color: C.muted, textAlign: 'center', padding: '40px 0' }}>
            Loading…
          </p>
        ) : (
          <>
            {/* ACCEPT SUCCESS BANNER */}
            <AnimatePresence>
              {acceptedHangout && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                  style={{
                    background:   C.greenT08,
                    border:       '0.5px solid rgba(79,119,45,0.28)',
                    borderRadius: 16,
                    padding:      '16px',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                    <div
                      style={{
                        width:          40,
                        height:         40,
                        borderRadius:   '50%',
                        background:     'rgba(79,119,45,0.18)',
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        flexShrink:     0,
                      }}
                    >
                      <Check size={20} color={C.success} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 800, color: C.white, margin: 0 }}>Hangout confirmed!</p>
                      <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>Your 2v2 chat is ready.</p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => go('chat')}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      width:        '100%',
                      background:   C.gradientCTA,
                      color:        '#fff',
                      border:       'none',
                      borderRadius: 11,
                      padding:      '11px 0',
                      fontSize:     13,
                      fontWeight:   700,
                      cursor:       'pointer',
                      boxShadow:    '0 2px 12px rgba(255,107,0,0.15)',
                    }}
                  >
                    Open chat
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* INCOMING PENDING */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={SECTION_LABEL}>Pending</p>
              {incoming.length > 0 && (
                <span
                  style={{
                    background:   'rgba(255,107,0,0.10)',
                    color:        C.amber,
                    borderRadius: 9999,
                    padding:      '2px 10px',
                    fontSize:     11,
                    fontWeight:   700,
                  }}
                >
                  {incoming.length}
                </span>
              )}
            </div>

            {hangouts.length === 0 && (
              <EmptyState
                icon={Calendar}
                title="Quiet in here — send the first one."
                subtitle="Explore duos or create an open plan to start."
                style={{ marginBottom: 24 }}
              />
            )}

            {incoming.length === 0 && outgoing.length === 0 && hangouts.length > 0 && (
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
                No active hangout requests.
              </p>
            )}

            {incoming.map((h) => (
              <div
                key={h.id}
                style={{
                  background:   C.cardElevated,
                  borderLeft:   `3px solid ${C.amber}`,
                  borderRight:  `0.5px solid ${C.border}`,
                  borderTop:    `0.5px solid ${C.border}`,
                  borderBottom: `0.5px solid ${C.border}`,
                  borderRadius: 14,
                  padding:      '14px 16px',
                  marginBottom: 10,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 2px' }}>
                  Hangout request
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: '0 0 4px' }}>
                  {h.duo_a?.name ?? 'A duo'} wants to hang out.
                </p>
                <HangoutMeta h={h} />
                {h.message && (
                  <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', margin: '0 0 12px' }}>
                    "{h.message}"
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button
                    type="button"
                    onClick={() => handleAccept(h.id)}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      flex:         1,
                      background:   C.gradientCTA,
                      color:        '#fff',
                      border:       'none',
                      borderRadius: 10,
                      padding:      10,
                      fontSize:     13,
                      fontWeight:   700,
                      cursor:       'pointer',
                      boxShadow:    '0 2px 12px rgba(255,107,0,0.15)',
                    }}
                  >
                    Accept
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => handleDecline(h.id)}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      flex:         1,
                      background:   'transparent',
                      color:        C.muted,
                      border:       `0.5px solid ${C.border}`,
                      borderRadius: 10,
                      padding:      10,
                      fontSize:     13,
                      fontWeight:   700,
                      cursor:       'pointer',
                    }}
                  >
                    Decline
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => go('counter_hangout', null, null, null, h)}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      flex:         1,
                      background:   'transparent',
                      color:        C.olive,
                      border:       `0.5px solid ${C.greenBorder}`,
                      borderRadius: 10,
                      padding:      10,
                      fontSize:     13,
                      fontWeight:   700,
                      cursor:       'pointer',
                    }}
                  >
                    Counter
                  </motion.button>
                </div>
              </div>
            ))}

            {/* OUTGOING PENDING */}
            {outgoing.length > 0 && (
              <>
                <p style={{ ...SECTION_LABEL, marginTop: 20, marginBottom: 12 }}>Sent</p>
                {outgoing.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      background:   C.cardElevated,
                      borderLeft:   `3px solid rgba(255,107,0,0.22)`,
                      borderRight:  `0.5px solid ${C.border}`,
                      borderTop:    `0.5px solid ${C.border}`,
                      borderBottom: `0.5px solid ${C.border}`,
                      borderRadius: 14,
                      padding:      '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0 }}>
                      Waiting for reply…
                    </p>
                    <HangoutMeta h={h} />
                  </div>
                ))}
              </>
            )}

            {/* COUNTERED */}
            {countered.length > 0 && (
              <>
                <p style={{ ...SECTION_LABEL, marginTop: 20, marginBottom: 12 }}>New time</p>
                {countered.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      background:   C.cardElevated,
                      borderLeft:   `3px solid ${C.olive}`,
                      borderRight:  `0.5px solid ${C.border}`,
                      borderTop:    `0.5px solid ${C.border}`,
                      borderBottom: `0.5px solid ${C.border}`,
                      borderRadius: 14,
                      padding:      '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <p style={{ fontSize: 12, color: C.olive, fontWeight: 700, margin: '0 0 4px' }}>
                      ↩ New time proposed
                    </p>
                    <HangoutMeta h={h} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <motion.button
                        type="button"
                        onClick={() => handleAccept(h.id)}
                        whileTap={{ scale: 0.96 }}
                        transition={{ duration: 0.1 }}
                        style={{
                          flex: 1, background: C.gradientCTA, color: C.cream,
                          border: 'none', borderRadius: 10, padding: 10,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Accept
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => handleDecline(h.id)}
                        whileTap={{ scale: 0.96 }}
                        transition={{ duration: 0.1 }}
                        style={{
                          flex: 1, background: 'transparent', color: C.muted,
                          border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 10,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Decline
                      </motion.button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* CONFIRMED */}
            <div style={{ marginBottom: 12, marginTop: 28 }}>
              <p style={SECTION_LABEL}>Confirmed</p>
            </div>

            {confirmed.length === 0 && (
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
                Nothing locked in yet.
              </p>
            )}

            {confirmed.map((h) => {
              const otherDuo = myDuoIds.includes(h.duo_a_id) ? h.duo_b : h.duo_a;
              const members  = otherDuo?.duo_members ?? [];
              return (
                <div
                  key={h.id}
                  style={{
                    background:      C.gradientCafe,
                    borderLeft:      `3px solid ${C.success}`,
                    border:          `0.5px solid ${C.border}`,
                    borderLeftWidth: 3,
                    borderLeftColor: C.success,
                    borderRadius:    16,
                    padding:         20,
                    marginBottom:    12,
                  }}
                >
                  <span
                    style={{
                      display:      'inline-block',
                      background:   C.greenT12,
                      color:        C.success,
                      borderRadius: 9999,
                      padding:      '4px 12px',
                      fontSize:     12,
                      fontWeight:   600,
                      marginBottom: 12,
                    }}
                  >
                    Confirmed hangout
                  </span>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 4px' }}>
                    {otherDuo?.name ?? 'Duo'}
                  </p>
                  <HangoutMeta h={h} />
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 12 }}>
                    <p
                      style={{
                        fontSize:      11,
                        fontWeight:    700,
                        color:         C.muted,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        marginBottom:  10,
                      }}
                    >
                      Connect on Instagram
                    </p>
                    {members.length === 0 ? (
                      <p style={{ fontSize: 14, color: C.muted }}>Instagram not added yet.</p>
                    ) : (
                      members.map((member, idx) => (
                        member.instagram || member.profiles?.instagram ? (
                          <InstagramButton
                            key={idx}
                            member={{
                              name: member.profiles?.name ?? 'Member',
                              ig:   member.instagram || member.profiles?.instagram || '',
                            }}
                            avatarBg={AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]}
                          />
                        ) : (
                          <p key={idx} style={{ fontSize: 14, color: C.muted }}>
                            Instagram not added yet.
                          </p>
                        )
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {/* PAST HANGOUTS */}
            {pastConfirmed.length > 0 && (
              <>
                <div style={{ marginBottom: 6, marginTop: 28 }}>
                  <p style={SECTION_LABEL}>Past hangouts</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 12px' }}>
                    Hangouts that already passed.
                  </p>
                </div>
                {pastConfirmed.map((h) => {
                  const otherDuo        = myDuoIds.includes(h.duo_a_id) ? h.duo_b : h.duo_a;
                  const existingReview  = reviewMap.get(h.id);
                  const isReviewing     = reviewingHangoutId === h.id;
                  const canSubmitReview = reviewForm.wouldHangAgain !== null && !reviewLoading;

                  return (
                    <div key={h.id} style={{ marginBottom: 10 }}>
                      {/* Past card */}
                      <div
                        style={{
                          background:   C.cardElevated,
                          border:       `0.5px solid ${C.border}`,
                          borderLeft:   `3px solid ${C.border}`,
                          borderRadius: isReviewing ? '16px 16px 0 0' : 16,
                          padding:      20,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span
                            style={{
                              display:      'inline-block',
                              background:   'rgba(17,17,17,0.05)',
                              color:        C.muted,
                              borderRadius: 9999,
                              padding:      '4px 12px',
                              fontSize:     12,
                              fontWeight:   600,
                            }}
                          >
                            Past
                          </span>
                          {existingReview ? (
                            <span
                              style={{
                                fontSize:   11,
                                fontWeight: 600,
                                color:      C.muted,
                                display:    'flex',
                                alignItems: 'center',
                                gap:        4,
                              }}
                            >
                              <Check size={11} strokeWidth={2.5} color={C.muted} />
                              Reviewed
                            </span>
                          ) : (
                            <motion.button
                              type="button"
                              onClick={() => setReviewingHangoutId(isReviewing ? null : h.id)}
                              whileTap={{ scale: 0.94 }}
                              transition={{ duration: 0.1 }}
                              style={{
                                background:   isReviewing ? 'rgba(255,107,0,0.15)' : 'rgba(17,17,17,0.04)',
                                border:       `0.5px solid ${isReviewing ? 'rgba(255,107,0,0.22)' : C.border}`,
                                borderRadius: 9999,
                                padding:      '5px 12px',
                                fontSize:     12,
                                fontWeight:   600,
                                color:        isReviewing ? C.amber : C.muted,
                                cursor:       'pointer',
                              }}
                            >
                              {isReviewing ? 'Cancel' : 'How was it?'}
                            </motion.button>
                          )}
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: '0 0 4px' }}>
                          {otherDuo?.name ?? 'Duo'}
                        </p>
                        <HangoutMeta h={h} />
                      </div>

                      {/* Safety follow-up card */}
                      <AnimatePresence>
                        {safetyFollowUp?.hangoutId === h.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{
                              background:   'rgba(162,59,42,0.06)',
                              border:       '0.5px solid rgba(162,59,42,0.2)',
                              borderRadius: 14,
                              padding:      '18px 20px',
                              marginTop:    8,
                            }}
                          >
                            {safetyBlockState === 'blocked' ? (
                              <p style={{ fontSize: 14, color: C.danger, fontWeight: 600, margin: 0 }}>
                                Blocked. You won't see this duo in Explore.
                              </p>
                            ) : safetyReportState === 'done' ? (
                              <p style={{ fontSize: 14, color: C.muted, fontWeight: 600, margin: 0 }}>
                                Report submitted.
                              </p>
                            ) : (
                              <>
                                <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 14px' }}>
                                  Want to block or report {safetyFollowUp.reviewedDuoName}?
                                </p>

                                {safetyReportState === 'hidden' && (
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <motion.button
                                      type="button"
                                      onClick={handleSafetyBlock}
                                      disabled={safetyBlockState === 'blocking'}
                                      whileTap={{ scale: 0.94 }}
                                      transition={{ duration: 0.1 }}
                                      style={{
                                        flex:         1,
                                        background:   'rgba(162,59,42,0.1)',
                                        border:       '0.5px solid rgba(162,59,42,0.3)',
                                        borderRadius: 10,
                                        padding:      '10px 0',
                                        fontSize:     13,
                                        fontWeight:   700,
                                        color:        C.danger,
                                        cursor:       safetyBlockState === 'blocking' ? 'wait' : 'pointer',
                                      }}
                                    >
                                      {safetyBlockState === 'blocking' ? 'Blocking…' : 'Block duo'}
                                    </motion.button>
                                    <motion.button
                                      type="button"
                                      onClick={() => setSafetyReportState('form')}
                                      whileTap={{ scale: 0.94 }}
                                      transition={{ duration: 0.1 }}
                                      style={{
                                        flex:         1,
                                        background:   'rgba(17,17,17,0.04)',
                                        border:       `0.5px solid ${C.border}`,
                                        borderRadius: 10,
                                        padding:      '10px 0',
                                        fontSize:     13,
                                        fontWeight:   700,
                                        color:        C.muted,
                                        cursor:       'pointer',
                                      }}
                                    >
                                      Report
                                    </motion.button>
                                    <motion.button
                                      type="button"
                                      onClick={() => setSafetyFollowUp(null)}
                                      whileTap={{ scale: 0.94 }}
                                      transition={{ duration: 0.1 }}
                                      style={{
                                        flex:         1,
                                        background:   'transparent',
                                        border:       'none',
                                        borderRadius: 10,
                                        padding:      '10px 0',
                                        fontSize:     13,
                                        fontWeight:   600,
                                        color:        C.muted,
                                        cursor:       'pointer',
                                      }}
                                    >
                                      Not now
                                    </motion.button>
                                  </div>
                                )}

                                {safetyReportState === 'form' && (
                                  <div>
                                    <span style={{ ...REVIEW_LABEL, marginBottom: 12 }}>What happened?</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                      {SAFETY_REPORT_REASONS.map((r) => (
                                        <motion.button
                                          key={r}
                                          type="button"
                                          onClick={() => setSafetyReportReason(safetyReportReason === r ? null : r)}
                                          whileTap={{ scale: 0.93 }}
                                          transition={{ duration: 0.1 }}
                                          style={{
                                            background:   safetyReportReason === r ? 'rgba(162,59,42,0.14)' : 'rgba(17,17,17,0.04)',
                                            border:       `0.5px solid ${safetyReportReason === r ? 'rgba(162,59,42,0.4)' : 'rgba(242,242,240,0.14)'}`,
                                            borderRadius: 9999,
                                            padding:      '7px 14px',
                                            fontSize:     13,
                                            fontWeight:   600,
                                            color:        safetyReportReason === r ? C.danger : C.muted,
                                            cursor:       'pointer',
                                          }}
                                        >
                                          {r}
                                        </motion.button>
                                      ))}
                                    </div>
                                    <textarea
                                      value={safetyReportNote}
                                      onChange={(e) => setSafetyReportNote(e.target.value.slice(0, 500))}
                                      placeholder="Optional note…"
                                      rows={2}
                                      style={{
                                        width:        '100%',
                                        background:   'rgba(17,17,17,0.04)',
                                        border:       '0.5px solid rgba(242,242,240,0.14)',
                                        borderRadius: 12,
                                        padding:      12,
                                        color:        C.white,
                                        fontSize:     13,
                                        resize:       'none',
                                        outline:      'none',
                                        boxSizing:    'border-box',
                                        marginBottom: 14,
                                      }}
                                    />
                                    <motion.button
                                      type="button"
                                      disabled={!safetyReportReason || safetyReportState === 'submitting'}
                                      onClick={handleSafetyReport}
                                      whileTap={{ scale: safetyReportReason ? 0.97 : 1 }}
                                      transition={{ duration: 0.1 }}
                                      style={{
                                        width:        '100%',
                                        background:   safetyReportReason ? 'rgba(162,59,42,0.12)' : 'rgba(17,17,17,0.04)',
                                        border:       `0.5px solid ${safetyReportReason ? 'rgba(162,59,42,0.35)' : C.border}`,
                                        borderRadius: 11,
                                        padding:      '11px 0',
                                        fontSize:     14,
                                        fontWeight:   700,
                                        color:        safetyReportReason ? C.danger : C.muted,
                                        cursor:       safetyReportReason ? 'pointer' : 'not-allowed',
                                      }}
                                    >
                                      {safetyReportState === 'submitting' ? 'Submitting…' : 'Submit report'}
                                    </motion.button>
                                  </div>
                                )}
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Inline review form */}
                      <AnimatePresence>
                        {isReviewing && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            style={{
                              background:   C.cardDeep,
                              border:       `0.5px solid ${C.border}`,
                              borderTop:    'none',
                              borderRadius: '0 0 16px 16px',
                              padding:      '20px 20px 24px',
                            }}
                          >
                            <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: '0 0 4px' }}>
                              How was the hangout?
                            </p>
                            <p style={{ fontSize: 12, color: C.muted, margin: '0 0 22px', lineHeight: 1.5 }}>
                              Keep it simple. This helps improve future matches.
                            </p>

                            {/* Q1: Would you hang again? */}
                            <span style={REVIEW_LABEL}>Would you hang out again?</span>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
                              {WOULD_HANG_OPTIONS.map(({ value, label }) => (
                                <motion.button
                                  key={value}
                                  type="button"
                                  onClick={() => setReviewForm((f) => ({ ...f, wouldHangAgain: value }))}
                                  whileTap={{ scale: 0.93 }}
                                  transition={{ duration: 0.1 }}
                                  style={{
                                    flex:         1,
                                    background:   reviewForm.wouldHangAgain === value ? C.gradientCTA : 'rgba(17,17,17,0.04)',
                                    border:       `0.5px solid ${reviewForm.wouldHangAgain === value ? 'transparent' : 'rgba(242,242,240,0.14)'}`,
                                    borderRadius: 10,
                                    padding:      '10px 0',
                                    fontSize:     13,
                                    fontWeight:   700,
                                    color:        reviewForm.wouldHangAgain === value ? C.cream : C.muted,
                                    cursor:       'pointer',
                                  }}
                                >
                                  {label}
                                </motion.button>
                              ))}
                            </div>

                            {/* Q2: Vibe */}
                            <span style={REVIEW_LABEL}>Pick the vibe</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
                              {REVIEW_VIBE_OPTIONS.map((v) => (
                                <motion.button
                                  key={v}
                                  type="button"
                                  onClick={() => setReviewForm((f) => ({ ...f, vibe: f.vibe === v ? null : v }))}
                                  whileTap={{ scale: 0.93 }}
                                  transition={{ duration: 0.1 }}
                                  style={{
                                    background:   reviewForm.vibe === v ? 'rgba(255,107,0,0.12)' : 'rgba(17,17,17,0.04)',
                                    border:       `0.5px solid ${reviewForm.vibe === v ? 'rgba(255,107,0,0.35)' : 'rgba(242,242,240,0.14)'}`,
                                    borderRadius: 9999,
                                    padding:      '7px 14px',
                                    fontSize:     13,
                                    fontWeight:   600,
                                    color:        reviewForm.vibe === v ? C.amber : C.muted,
                                    cursor:       'pointer',
                                  }}
                                >
                                  {v}
                                </motion.button>
                              ))}
                            </div>

                            {/* Q3: Note */}
                            <span style={REVIEW_LABEL}>Anything to remember? (optional)</span>
                            <textarea
                              value={reviewForm.note}
                              onChange={(e) => setReviewForm((f) => ({ ...f, note: e.target.value.slice(0, 300) }))}
                              placeholder="Short note for yourself…"
                              rows={2}
                              style={{
                                width:        '100%',
                                background:   'rgba(17,17,17,0.04)',
                                border:       '0.5px solid rgba(242,242,240,0.14)',
                                borderRadius: 12,
                                padding:      12,
                                color:        C.white,
                                fontSize:     13,
                                resize:       'none',
                                outline:      'none',
                                boxSizing:    'border-box',
                                marginBottom: 16,
                              }}
                            />

                            {/* Safety flag */}
                            <label
                              style={{
                                display:      'flex',
                                alignItems:   'center',
                                gap:          10,
                                cursor:       'pointer',
                                padding:      '10px 12px',
                                background:   reviewForm.safetyFlag ? 'rgba(162,59,42,0.08)' : 'rgba(242,242,240,0.03)',
                                border:       `0.5px solid ${reviewForm.safetyFlag ? 'rgba(162,59,42,0.25)' : C.border}`,
                                borderRadius: 10,
                                marginBottom: 20,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={reviewForm.safetyFlag}
                                onChange={(e) => setReviewForm((f) => ({ ...f, safetyFlag: e.target.checked }))}
                                style={{ accentColor: C.danger, width: 15, height: 15, flexShrink: 0 }}
                              />
                              <span style={{ fontSize: 13, color: reviewForm.safetyFlag ? C.danger : C.muted }}>
                                Something felt unsafe
                              </span>
                            </label>

                            {/* Submit */}
                            <motion.button
                              type="button"
                              disabled={!canSubmitReview}
                              onClick={() => handleSubmitReview(h)}
                              whileTap={{ scale: canSubmitReview ? 0.97 : 1 }}
                              transition={{ duration: 0.1 }}
                              style={{
                                width:        '100%',
                                background:   canSubmitReview ? C.gradientCTA : 'rgba(17,17,17,0.04)',
                                color:        canSubmitReview ? '#fff' : C.muted,
                                border:       'none',
                                borderRadius: 11,
                                padding:      '12px 0',
                                fontSize:     14,
                                fontWeight:   700,
                                cursor:       canSubmitReview ? 'pointer' : 'not-allowed',
                                boxShadow:    canSubmitReview ? '0 2px 12px rgba(255,107,0,0.15)' : 'none',
                              }}
                            >
                              {reviewLoading ? 'Saving…' : 'Save review'}
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </>
            )}

            {/* MY PLANS */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 28 }}>
              <p style={SECTION_LABEL}>{planSectionLabel}</p>
              {totalPlanReqs > 0 && (
                <span
                  style={{
                    background:   C.greenT12,
                    color:        C.success,
                    borderRadius: 9999,
                    padding:      '2px 10px',
                    fontSize:     11,
                    fontWeight:   700,
                  }}
                >
                  {totalPlanReqs}
                </span>
              )}
            </div>

            {planLoading ? (
              <div className="shimmer" style={{ height: 80, borderRadius: 14, background: C.cardDeep, marginBottom: 20 }} />
            ) : activePlanItems.length > 0 ? (
              <>
                {/* Plan-matched success banner */}
                <AnimatePresence>
                  {acceptedPlanReqId && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                      style={{
                        background:   C.greenT08,
                        border:       '0.5px solid rgba(79,119,45,0.28)',
                        borderRadius: 14,
                        padding:      '14px 16px',
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                        <div
                          style={{
                            width:          36,
                            height:         36,
                            borderRadius:   '50%',
                            background:     'rgba(79,119,45,0.18)',
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            flexShrink:     0,
                          }}
                        >
                          <Check size={18} color={C.success} strokeWidth={2.5} />
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: 0 }}>Plan matched.</p>
                          <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>A confirmed hangout was created.</p>
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => go('chat')}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.1 }}
                        style={{
                          width:        '100%',
                          background:   C.gradientCTA,
                          color:        '#fff',
                          border:       'none',
                          borderRadius: 11,
                          padding:      '10px 0',
                          fontSize:     13,
                          fontWeight:   700,
                          cursor:       'pointer',
                          boxShadow:    '0 2px 12px rgba(255,107,0,0.15)',
                        }}
                      >
                        Open chat
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {activePlanItems.map(({ duo: planDuo, plan, requests }) => (
                  <div key={plan.id} style={{ marginBottom: 20 }}>
                    {/* Duo label — only shown when user has multiple duos */}
                    {myDuos.length > 1 && (
                      <p
                        style={{
                          fontSize:      11,
                          fontWeight:    700,
                          color:         C.muted,
                          letterSpacing: '0.6px',
                          textTransform: 'uppercase',
                          marginBottom:  6,
                        }}
                      >
                        {planDuo.name}
                      </p>
                    )}

                    {/* Plan card */}
                    <div
                      style={{
                        background:   C.cardElevated,
                        borderLeft:   `3px solid ${C.success}`,
                        borderRight:  `0.5px solid ${C.border}`,
                        borderTop:    `0.5px solid ${C.border}`,
                        borderBottom: `0.5px solid ${C.border}`,
                        borderRadius: 14,
                        padding:      '14px 16px',
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0 }}>Your open plan</p>
                        <span
                          style={{
                            background:   C.greenT12,
                            color:        C.success,
                            borderRadius: 9999,
                            padding:      '2px 10px',
                            fontSize:     11,
                            fontWeight:   600,
                          }}
                        >
                          Open
                        </span>
                      </div>
                      <HangoutMeta h={plan} />
                      {plan.message && (
                        <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', margin: '-4px 0 8px' }}>
                          "{plan.message}"
                        </p>
                      )}
                      <motion.button
                        type="button"
                        onClick={() => handleCancelPlan(plan.id)}
                        whileTap={{ scale: 0.96 }}
                        transition={{ duration: 0.1 }}
                        style={{
                          background:   'transparent',
                          color:        C.muted,
                          border:       `0.5px solid ${C.border}`,
                          borderRadius: 10,
                          padding:      '8px 14px',
                          fontSize:     12,
                          fontWeight:   600,
                          cursor:       'pointer',
                        }}
                      >
                        Cancel plan
                      </motion.button>
                    </div>

                    {/* Incoming requests to join this plan */}
                    {requests.length > 0 ? (
                      <>
                        <p style={{ ...SECTION_LABEL, marginBottom: 10 }}>
                          {myDuos.length > 1 ? `Requests for ${planDuo.name}` : 'Requests to join'}
                        </p>
                        {requests.map((req) => (
                          <div
                            key={req.id}
                            style={{
                              background:   C.cardElevated,
                              border:       `0.5px solid ${C.border}`,
                              borderRadius: 14,
                              padding:      '14px 16px',
                              marginBottom: 10,
                            }}
                          >
                            <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 2px' }}>
                              {req.requester_duo?.name ?? 'A duo'}
                            </p>
                            {req.requester_duo?.city && (
                              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 6px' }}>
                                {req.requester_duo.city}
                              </p>
                            )}
                            {req.message && (
                              <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', margin: '0 0 12px' }}>
                                "{req.message}"
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <motion.button
                                type="button"
                                onClick={() => handleAcceptPlanRequest(req.id)}
                                whileTap={{ scale: 0.96 }}
                                transition={{ duration: 0.1 }}
                                style={{
                                  flex:         1,
                                  background:   C.gradientCTA,
                                  color:        '#fff',
                                  border:       'none',
                                  borderRadius: 10,
                                  padding:      10,
                                  fontSize:     13,
                                  fontWeight:   700,
                                  cursor:       'pointer',
                                  boxShadow:    '0 2px 12px rgba(255,107,0,0.15)',
                                }}
                              >
                                Accept
                              </motion.button>
                              <motion.button
                                type="button"
                                onClick={() => handleDeclinePlanRequest(req.id)}
                                whileTap={{ scale: 0.96 }}
                                transition={{ duration: 0.1 }}
                                style={{
                                  flex:         1,
                                  background:   'transparent',
                                  color:        C.muted,
                                  border:       `0.5px solid ${C.border}`,
                                  borderRadius: 10,
                                  padding:      10,
                                  fontSize:     13,
                                  fontWeight:   700,
                                  cursor:       'pointer',
                                }}
                              >
                                Decline
                              </motion.button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
                        No requests to join yet.
                      </p>
                    )}
                  </div>
                ))}
              </>
            ) : myDuos.length === 0 ? (
              <div
                style={{
                  background:   C.cardElevated,
                  border:       `0.5px solid ${C.border}`,
                  borderRadius: 14,
                  padding:      '16px',
                  marginBottom: 24,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 4px' }}>
                  You need a duo before making plans.
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
                  Find a homie first, then create a duo together.
                </p>
                <motion.button
                  type="button"
                  onClick={() => go('find_homie')}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    width:        '100%',
                    background:   C.gradientCTA,
                    color:        '#fff',
                    border:       'none',
                    borderRadius: 11,
                    padding:      '11px 0',
                    fontSize:     13,
                    fontWeight:   700,
                    cursor:       'pointer',
                    boxShadow:    '0 2px 12px rgba(255,107,0,0.15)',
                  }}
                >
                  Find a homie
                </motion.button>
              </div>
            ) : (
              <div
                style={{
                  background:   C.cardElevated,
                  border:       `0.5px solid ${C.border}`,
                  borderRadius: 14,
                  padding:      '16px',
                  marginBottom: 24,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 4px' }}>
                  Create an open plan
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
                  Post a plan so another duo can request to join.
                </p>
                <motion.button
                  type="button"
                  onClick={() => go('create_plan')}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    width:        '100%',
                    background:   C.gradientCTA,
                    color:        '#fff',
                    border:       'none',
                    borderRadius: 11,
                    padding:      '11px 0',
                    fontSize:     13,
                    fontWeight:   700,
                    cursor:       'pointer',
                    boxShadow:    '0 2px 12px rgba(255,107,0,0.15)',
                  }}
                >
                  Create plan →
                </motion.button>
              </div>
            )}

            {/* OC SPOTS */}
            <div style={{ marginBottom: 12, marginTop: 28 }}>
              <p style={SECTION_LABEL}>OC Spots</p>
            </div>
            <div
              className="no-scrollbar"
              style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}
            >
              {OC_SPOTS.map((spot) => <SpotCard key={spot.id} spot={spot} />)}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
