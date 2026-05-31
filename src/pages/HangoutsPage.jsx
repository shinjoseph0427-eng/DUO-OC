import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Check } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import InstagramButton from '../components/InstagramButton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import HangoutCard from '../components/HangoutCard.jsx';
import HangoutRequestCard from '../components/HangoutRequestCard.jsx';
import { OC_SPOTS } from '../data/duos.js';
import {
  getMyHangouts, acceptHangout, declineHangout,
  getMyActivePlan, getIncomingPlanRequests,
  acceptPlanRequest, declinePlanRequest, cancelOpenPlan,
  approveHangoutInternal,
  isPastHangoutTime, formatPlanDateLabel,
} from '../lib/hangouts.js';
import { getMyChats } from '../lib/messages.js';
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
      <p style={{ fontSize: 11, fontWeight: 700, color: C.text ?? '#111111', marginBottom: 2 }}>{spot.name}</p>
      <p style={{ fontSize: 10, color: C.muted }}>{spot.city}</p>
    </div>
  );
}

function HangoutMeta({ h }) {
  const dateLabel = DATE_LABELS[h.date] ?? formatPlanDateLabel(h.date) ?? '';
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

function IncomingCard({ h, go, onAccept, onDecline }) {
  const [accepted,  setAccepted]  = useState(false);
  const [accepting, setAccepting] = useState(false);

  const expiryHours = h.created_at
    ? (Date.now() - new Date(h.created_at)) / 3600000
    : 0;

  const handleLocal = async () => {
    if (accepting || accepted) return;
    setAccepting(true);
    const success = await onAccept(h.id);
    setAccepting(false);
    if (success) {
      setAccepted(true);
      setTimeout(() => go('chat'), 1500);
    }
  };

  return (
    <HangoutRequestCard
      duo={h.duo_a}
      item={h}
      statusLabel="Incoming"
      title={`${h.duo_a?.name ?? 'A duo'} wants to hang`}
      message={h.message}
      busy={accepting}
    >
      {expiryHours > 48 && (
        <div style={{ fontSize: 11, color: C.amber, marginTop: 3, marginBottom: 8 }}>
          Sent 2+ days ago
        </div>
      )}
      {accepted ? (
        <p style={{ fontSize: 13, color: C.success, fontWeight: 700, marginTop: 8 }}>
          It's on! Chat is now open.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button
            type="button"
            onClick={handleLocal}
            disabled={accepting}
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
              cursor:       accepting ? 'wait' : 'pointer',
              opacity:      accepting ? 0.7 : 1,
              boxShadow:    '0 2px 12px rgba(255,107,0,0.15)',
            }}
          >
            {accepting ? 'Accepting…' : 'Accept'}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onDecline(h.id)}
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
            Pass
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
      )}
    </HangoutRequestCard>
  );
}

export default function HangoutsPage({ currentUser, myDuo, myDuos: myDuosProp = [], go, onLogout, showToast }) {
  // Fall back to [myDuo] if prop not yet populated (e.g. older callers).
  // Memoized so the reference is stable across renders — otherwise load/loadPlan
  // (which depend on it) get a new identity each render and loop forever.
  const myDuos = useMemo(
    () => (myDuosProp.length > 0 ? myDuosProp : (myDuo ? [myDuo] : [])),
    [myDuosProp, myDuo],
  );

  const [hangouts,          setHangouts]          = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [activeTab,         setActiveTab]         = useState('upcoming');
  const [chatMap,           setChatMap]           = useState(new Map());
  // planData: [{ duo, plan: {...}|null, requests: [...] }]
  const [planData,          setPlanData]          = useState([]);
  const [planLoading,       setPlanLoading]       = useState(false);
  const [acceptedPlanReqId, setAcceptedPlanReqId] = useState(null);
  const [busyPlanReqId,     setBusyPlanReqId]     = useState(null);
  const [confirmCancelId,   setConfirmCancelId]   = useState(null);
  const [busyApprovalId,    setBusyApprovalId]    = useState(null);
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

  // Stable list of duo ids (array for render use) + a string key for effect deps.
  // The key changes only when the actual ids change, so load/loadPlan don't
  // re-run when the parent hands us a new-but-equivalent myDuos array.
  const myDuoIds    = useMemo(() => myDuos.map((d) => d?.id).filter(Boolean), [myDuos]);
  const myDuoIdsKey = useMemo(() => myDuoIds.join(','), [myDuoIds]);

  const load = useCallback(() => {
    if (!currentUser) { setLoading(false); return; }
    const ids = myDuoIds;
    setLoading(true);
    Promise.all([
      getMyHangouts(ids),
      getMyChats(currentUser.id).catch(() => []),
    ]).then(([data, chats]) => {
      const list = data ?? [];
      setHangouts(list);
      setChatMap(new Map((chats ?? []).map((chat) => [chat.hangoutId, chat])));
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
  }, [currentUser, myDuoIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlan = useCallback(() => {
    if (!myDuos.length) {
      setPlanData([]);
      setPlanLoading(false);
      return;
    }
    setPlanLoading(true);
    Promise.all(
      myDuos.filter((duo) => duo?.id).map((duo) =>
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
  }, [myDuoIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPlan(); }, [loadPlan]);

  const handleAccept = async (id) => {
    try {
      await acceptHangout(id, currentUser?.id);
      load();
      return true;
    } catch (err) {
      showToast?.(err?.message ?? 'Could not accept hangout.', 'error');
      return false;
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

  const handlePartnerApproval = async (hangoutId, approve) => {
    if (busyApprovalId) return;
    setBusyApprovalId(hangoutId);
    try {
      const res = await approveHangoutInternal(hangoutId, currentUser?.id, approve);
      load();
      if (!approve) showToast?.('Declined. Your partner was notified.', 'info');
      else if (res?.sent) showToast?.('Sent to the other duo!', 'success');
      else showToast?.('You’re in — waiting on your partner.', 'success');
    } catch (err) {
      showToast?.(err?.message ?? 'Could not update.', 'error');
    } finally {
      setBusyApprovalId(null);
    }
  };

  const handleAcceptPlanRequest = async (reqId) => {
    if (busyPlanReqId) return;
    setBusyPlanReqId(reqId);
    try {
      await acceptPlanRequest(reqId, currentUser?.id);
      setAcceptedPlanReqId(reqId);
      loadPlan();
      load();
    } catch (err) {
      showToast?.(err?.message ?? 'Could not accept request.', 'error');
    } finally {
      setBusyPlanReqId(null);
    }
  };

  const handleDeclinePlanRequest = async (reqId) => {
    if (busyPlanReqId) return;
    setBusyPlanReqId(reqId);
    try {
      await declinePlanRequest(reqId, currentUser?.id);
      loadPlan();
    } catch (err) {
      showToast?.(err?.message ?? 'Could not decline request.', 'error');
    } finally {
      setBusyPlanReqId(null);
    }
  };

  const handleCancelPlan = async (planId) => {
    if (!planId) return;
    try {
      await cancelOpenPlan(planId, currentUser?.id);
      loadPlan();
    } catch (err) {
      showToast?.(err?.message ?? 'Could not cancel plan.', 'error');
    }
  };

  const handleOpenChat = (hangoutId) => {
    const chat = chatMap.get(hangoutId);
    if (!chat) {
      showToast?.('Chat will be available soon.', 'info');
      return;
    }
    go('chat_thread', null, null, chat);
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

  const activePlanItems = planData.filter((item) => item.plan !== null);
  const totalPlanReqs   = planData.reduce((sum, item) => sum + item.requests.length, 0);
  const planSectionLabel = myDuos.length > 1 ? 'My Plans' : 'My Plan';

  const incoming      = hangouts.filter((h) => h.status === 'pending'   && myDuoIds.includes(h.duo_b_id)  && !isPastHangoutTime(h.date, h.time_slot, h.created_at));
  const outgoing      = hangouts.filter((h) => h.status === 'pending'   && myDuoIds.includes(h.duo_a_id)  && !isPastHangoutTime(h.date, h.time_slot, h.created_at));
  const countered     = hangouts.filter((h) => h.status === 'countered' && myDuoIds.includes(h.duo_a_id)  && !isPastHangoutTime(h.date, h.time_slot, h.created_at));
  const confirmed     = hangouts.filter((h) => h.status === 'confirmed'                                    && !isPastHangoutTime(h.date, h.time_slot, h.created_at));
  const pastConfirmed = hangouts.filter((h) => h.status === 'confirmed'                                    &&  isPastHangoutTime(h.date, h.time_slot, h.created_at));
  // Cancelled hangouts surface in Upcoming with a red badge, but only for 7
  // days after they were created — older ones drop off the list.
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const cancelled     = hangouts.filter((h) => h.status === 'cancelled' && (Date.now() - new Date(h.created_at ?? 0).getTime()) < SEVEN_DAYS_MS);
  // Proposals from my own duo that are waiting on MY internal approval (I'm the
  // partner who hasn't voted yet). The proposer themselves is filtered out.
  const partnerApprovals = hangouts.filter((h) =>
    h.status === 'pending_internal' &&
    myDuoIds.includes(h.duo_a_id) &&
    !(h.proposer_approved_by ?? []).includes(currentUser?.id),
  );
  const requestCount  = incoming.length + outgoing.length + countered.length + totalPlanReqs;
  const tabItems = [
    { key: 'upcoming', label: 'Upcoming', count: confirmed.length + activePlanItems.length },
    { key: 'requests', label: 'Requests', count: requestCount + partnerApprovals.length },
    { key: 'past',     label: 'Past',     count: pastConfirmed.length },
  ];

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
            <div style={{
              display:      'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap:          6,
              background:   C.cardElevated,
              border:       `0.5px solid ${C.border}`,
              borderRadius: 14,
              padding:      4,
              marginBottom: 18,
            }}>
              {tabItems.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      minWidth:     0,
                      border:       'none',
                      borderRadius: 10,
                      background:   active ? C.amberT08 : 'transparent',
                      color:        active ? C.white : C.muted,
                      padding:      '9px 4px',
                      fontSize:     12,
                      fontWeight:   800,
                      cursor:       'pointer',
                    }}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span style={{ marginLeft: 5, color: active ? C.amber : C.muted, fontWeight: 900 }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* PARTNER INTERNAL APPROVAL */}
            {activeTab === 'requests' && partnerApprovals.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <p style={{ ...SECTION_LABEL, marginBottom: 12 }}>Your partner wants to hang out</p>
                {partnerApprovals.map((h) => {
                  const proposerName  = h.duo_a?.duo_members?.find((m) => m.user_id === h.proposed_by)?.profiles?.name ?? 'Your partner';
                  const targetDuoName = h.duo_b?.name ?? 'another duo';
                  const busy          = busyApprovalId === h.id;
                  return (
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
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 2px' }}>
                        {proposerName} wants to hang out with {targetDuoName}
                      </p>
                      <HangoutMeta h={h} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <motion.button
                          type="button"
                          onClick={() => handlePartnerApproval(h.id, true)}
                          disabled={busy}
                          whileTap={{ scale: 0.96 }}
                          transition={{ duration: 0.1 }}
                          style={{
                            flex: 1, background: C.gradientCTA, color: '#fff',
                            border: 'none', borderRadius: 10, padding: 10,
                            fontSize: 13, fontWeight: 700,
                            cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1,
                            boxShadow: '0 2px 12px rgba(255,107,0,0.15)',
                          }}
                        >
                          {busy ? 'Working…' : "Yes, I'm in ✓"}
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => handlePartnerApproval(h.id, false)}
                          disabled={busy}
                          whileTap={{ scale: 0.96 }}
                          transition={{ duration: 0.1 }}
                          style={{
                            flex: 1, background: 'transparent', color: C.muted,
                            border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 10,
                            fontSize: 13, fontWeight: 700,
                            cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.65 : 1,
                          }}
                        >
                          No thanks ✗
                        </motion.button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* INCOMING PENDING */}
            {activeTab === 'requests' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={SECTION_LABEL}>Pending</p>
              {requestCount > 0 && (
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
                  {requestCount}
                </span>
              )}
            </div>
            )}

            {activeTab === 'upcoming' && confirmed.length === 0 && activePlanItems.length === 0 && (
              <EmptyState
                icon={Calendar}
                title="No hangouts yet."
                subtitle="Find a Duo to get started."
                action={() => go('explore')}
                actionLabel="Explore"
                style={{ marginBottom: 24 }}
              />
            )}

            {activeTab === 'requests' && requestCount === 0 && partnerApprovals.length === 0 && activePlanItems.length === 0 && (
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
                No active hangout or plan requests.
              </p>
            )}

            {activeTab === 'requests' && incoming.map((h) => (
              <IncomingCard
                key={h.id}
                h={h}
                go={go}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            ))}

            {/* OUTGOING PENDING */}
            {activeTab === 'requests' && outgoing.length > 0 && (
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
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.white,
                      marginBottom: 2,
                    }}>
                      {h.duo_b?.name ?? 'Sent request'}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0 }}>
                      Waiting for reply…
                    </p>
                    <HangoutMeta h={h} />
                  </div>
                ))}
              </>
            )}

            {/* COUNTERED */}
            {activeTab === 'requests' && countered.length > 0 && (
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
            {activeTab === 'upcoming' && (
              <div style={{ marginBottom: 12, marginTop: 8 }}>
                <p style={SECTION_LABEL}>Confirmed hangouts</p>
              </div>
            )}

            {activeTab === 'upcoming' && confirmed.length === 0 && activePlanItems.length > 0 && (
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
                No confirmed hangouts yet. Accepted plan requests will appear here.
              </p>
            )}

            {activeTab === 'upcoming' && confirmed.map((h) => {
              const otherDuo = myDuoIds.includes(h.duo_a_id) ? h.duo_b : h.duo_a;
              const members  = otherDuo?.duo_members ?? [];
              return (
                <HangoutCard
                  key={h.id}
                  duo={otherDuo}
                  item={h}
                  status="confirmed"
                  title={otherDuo?.name ?? 'Duo'}
                  chatAvailable={chatMap.has(h.id)}
                  onOpenChat={() => handleOpenChat(h.id)}
                >
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 12 }}>
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
                </HangoutCard>
              );
            })}

            {/* CANCELLED (recent) */}
            {activeTab === 'upcoming' && cancelled.length > 0 && (
              <>
                <p style={{ ...SECTION_LABEL, marginTop: 20, marginBottom: 12 }}>Cancelled</p>
                {cancelled.map((h) => {
                  const otherDuo = myDuoIds.includes(h.duo_a_id) ? h.duo_b : h.duo_a;
                  return (
                    <div
                      key={h.id}
                      style={{
                        background:   C.cardElevated,
                        borderLeft:   `3px solid ${C.danger}`,
                        borderRight:  `0.5px solid ${C.border}`,
                        borderTop:    `0.5px solid ${C.border}`,
                        borderBottom: `0.5px solid ${C.border}`,
                        borderRadius: 14,
                        padding:      '14px 16px',
                        marginBottom: 10,
                        opacity:      0.85,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>
                          {otherDuo?.name ?? 'Duo'}
                        </span>
                        <span style={{
                          background:   'rgba(220,38,38,0.12)',
                          color:        C.danger,
                          borderRadius: 9999,
                          padding:      '2px 10px',
                          fontSize:     11,
                          fontWeight:   700,
                        }}>
                          Cancelled
                        </span>
                      </div>
                      <HangoutMeta h={h} />
                    </div>
                  );
                })}
              </>
            )}

            {/* PAST HANGOUTS */}
            {activeTab === 'past' && pastConfirmed.length === 0 && (
              <EmptyState
                icon={Calendar}
                title="No past hangouts yet."
                subtitle="After a confirmed hangout time passes, it will move here."
                style={{ marginBottom: 24 }}
              />
            )}

            {activeTab === 'past' && pastConfirmed.length > 0 && (
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
                      <HangoutCard
                        duo={otherDuo}
                        item={h}
                        status="done"
                        title={otherDuo?.name ?? 'Duo'}
                        calmer
                      >
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                          {existingReview ? (
                            <span
                              style={{
                                fontSize:   11,
                                fontWeight: 700,
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
                                padding:      '6px 12px',
                                fontSize:     12,
                                fontWeight:   700,
                                color:        isReviewing ? C.amber : C.muted,
                                cursor:       'pointer',
                              }}
                            >
                              {isReviewing ? 'Cancel' : 'How was it?'}
                            </motion.button>
                          )}
                        </div>
                      </HangoutCard>

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
            {(activeTab === 'upcoming' || activeTab === 'requests') && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 28 }}>
              <p style={SECTION_LABEL}>{activeTab === 'requests' ? 'Plan join requests' : planSectionLabel}</p>
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
            )}

            {(activeTab === 'upcoming' || activeTab === 'requests') && planLoading ? (
              <div className="shimmer" style={{ height: 80, borderRadius: 14, background: C.cardDeep, marginBottom: 20 }} />
            ) : (activeTab === 'upcoming' || activeTab === 'requests') && activePlanItems.length > 0 ? (
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
                        border:       `0.5px solid ${C.greenBorder}`,
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
                            background:     C.greenT12,
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
                    {activeTab === 'upcoming' && (
                    <HangoutCard
                      duo={planDuo}
                      item={plan}
                      status="open"
                      title="Your open plan"
                      subtitle="Waiting for another duo"
                    >
                      {confirmCancelId === plan.id ? (
                        <div style={{
                          marginTop: 8,
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: 'rgba(220,38,38,0.08)',
                          border: '0.5px solid rgba(220,38,38,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}>
                          <span style={{
                            fontSize: 12,
                            color: C.danger,
                            fontWeight: 500,
                          }}>
                            Cancel this plan?
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => setConfirmCancelId(null)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 7,
                                border: `0.5px solid ${C.border}`,
                                background: 'transparent',
                                fontSize: 12,
                                color: C.muted,
                                cursor: 'pointer',
                              }}
                            >
                              Keep it
                            </button>
                            <button
                              onClick={() => {
                                setConfirmCancelId(null);
                                handleCancelPlan(plan.id);
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 7,
                                border: 'none',
                                background: C.danger,
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.cream,
                                cursor: 'pointer',
                              }}
                            >
                              Cancel plan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCancelId(plan.id)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            border: `0.5px solid ${C.border}`,
                            background: 'transparent',
                            fontSize: 12,
                            color: C.muted,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel plan
                        </button>
                      )}
                    </HangoutCard>
                    )}

                    {/* Incoming requests to join this plan */}
                    {activeTab === 'requests' && requests.length > 0 ? (
                      <>
                        <p style={{ ...SECTION_LABEL, marginBottom: 10 }}>
                          {myDuos.length > 1 ? `Requests for ${planDuo.name}` : 'Requests to join'}
                        </p>
                        {requests.map((req) => (
                          <HangoutRequestCard
                            key={req.id}
                            duo={req.requester_duo}
                            item={req.plan ?? plan}
                            statusLabel="Request"
                            title={`${req.requester_duo?.name ?? 'A duo'} wants to join`}
                            message={req.message}
                            busy={busyPlanReqId === req.id}
                          >
                            <div style={{ display: 'flex', gap: 8 }}>
                              <motion.button
                                type="button"
                                onClick={() => handleAcceptPlanRequest(req.id)}
                                disabled={busyPlanReqId === req.id}
                                whileTap={{ scale: 0.96 }}
                                transition={{ duration: 0.1 }}
                                style={{
                                  flex:         1,
                                  background:   busyPlanReqId === req.id ? C.muted : C.gradientCTA,
                                  color:        '#fff',
                                  border:       'none',
                                  borderRadius: 10,
                                  padding:      10,
                                  fontSize:     13,
                                  fontWeight:   700,
                                  cursor:       busyPlanReqId === req.id ? 'wait' : 'pointer',
                                  boxShadow:    '0 2px 12px rgba(255,107,0,0.15)',
                                }}
                              >
                                {busyPlanReqId === req.id ? 'Accepting...' : 'Accept'}
                              </motion.button>
                              <motion.button
                                type="button"
                                onClick={() => handleDeclinePlanRequest(req.id)}
                                disabled={busyPlanReqId === req.id}
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
                                  cursor:       busyPlanReqId === req.id ? 'wait' : 'pointer',
                                  opacity:      busyPlanReqId === req.id ? 0.65 : 1,
                                }}
                              >
                                {busyPlanReqId === req.id ? 'Working...' : 'Decline'}
                              </motion.button>
                            </div>
                          </HangoutRequestCard>
                        ))}
                      </>
                    ) : activeTab === 'requests' ? (
                      <p style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
                        No requests to join yet.
                      </p>
                    ) : null}
                  </div>
                ))}
              </>
            ) : (activeTab === 'upcoming' || activeTab === 'requests') && myDuos.length === 0 ? (
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
            ) : (activeTab === 'upcoming' || activeTab === 'requests') ? (
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
                  {activeTab === 'requests' ? 'No plan requests.' : 'Create an open plan'}
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
                  {activeTab === 'requests' ? 'Requests to join your open plans will show up here.' : 'Post a plan so another duo can request to join.'}
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
            ) : null}

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
