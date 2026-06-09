// src/pages/SoloChatPage.jsx
// Solo 1:1 chat room — cloned from DuoRoomPage, backed by solo_messages.
// match prop: { matchId, partner: { id, name, username, photos, ... } }

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CalendarPlus, Check, RefreshCw, Send } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import {
  getSoloMessages,
  sendSoloMessage,
  subscribeSoloMessages,
} from '../lib/soloMessages.js';
import {
  PLAN_DAYS,
  PLAN_TIME_PRESETS,
  confirmSoloPlan,
  describePlan,
  getSoloPlanGuests,
  getSoloPlan,
  inviteSoloPlanGuest,
  proposeSoloPlan,
  respondSoloPlanGuest,
  searchSoloPlanGuestCandidates,
  subscribeSoloPlan,
  subscribeSoloPlanGuests,
} from '../lib/soloPlans.js';
import { endSoloMatch } from '../lib/solo.js';
import TopBar from '../components/TopBar.jsx';

function gradientFor(id = '') {
  const code = id ? id.charCodeAt(0) : 0;
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

const MAX_LENGTH = 500;

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── Message bubble ─────────────────────────────────────────
function Bubble({ msg, isMine, partnerPhoto, partnerName, showAvatar }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isMine ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 7,
      marginBottom: 4,
    }}>
      {/* Partner avatar (their message + last bubble in group only) */}
      {!isMine && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {showAvatar && (
            partnerPhoto ? (
              <img
                src={partnerPhoto} alt={partnerName}
                style={{ width: 28, height: 28, borderRadius: 14, objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                background: gradientFor(msg.sender_user_id),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>
                  {(partnerName || '?')[0].toUpperCase()}
                </span>
              </div>
            )
          )}
        </div>
      )}

      {/* Bubble + time */}
      <div style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 5,
        maxWidth: '72%',
      }}>
        <div style={{
          padding: '10px 13px',
          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isMine ? C.gradientCTA : C.cardDeep,
          color: isMine ? '#fff' : C.text,
          fontSize: 14,
          lineHeight: 1.45,
          wordBreak: 'break-word',
          boxShadow: isMine ? '0 2px 8px rgba(255,107,0,0.18)' : 'none',
        }}>
          {msg.content}
        </div>
        <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, marginBottom: 2 }}>
          {fmtTime(msg.created_at)}
        </span>
      </div>
    </div>
  );
}

function PlanPanel({
  plan,
  guests,
  currentUserId,
  partnerName,
  submitting,
  guestSubmitting,
  form,
  setForm,
  showForm,
  setShowForm,
  guestQuery,
  setGuestQuery,
  guestResults,
  onInviteGuest,
  onRespondGuest,
  onPropose,
  onConfirm,
}) {
  const isConfirmed = plan?.status === 'confirmed';
  const proposedByMe = plan?.proposed_by === currentUserId;
  const needsMyConfirm = plan?.status === 'proposed' && !proposedByMe;
  const myGuest = guests.find((g) => g.invited_by === currentUserId);
  const myGuestInvite = guests.find((g) => g.guest_user_id === currentUserId);
  const othersGuests = guests.filter((g) => g.invited_by !== currentUserId && g.guest_user_id !== currentUserId);

  return (
    <section
      style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${C.border}`,
        background: C.bg2,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          background: C.cardElevated,
          border: `1px solid ${isConfirmed ? C.greenBorder : C.brownBorder}`,
          borderRadius: 14,
          padding: 12,
          boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, color: isConfirmed ? C.success : C.amber, fontSize: 11, fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {isConfirmed ? 'Plan confirmed' : plan ? 'Plan proposed' : 'Make a plan'}
            </p>
            <p style={{ margin: '4px 0 0', color: C.white, fontSize: 14, fontWeight: 850, lineHeight: 1.35 }}>
              {plan ? describePlan(plan) : `Suggest one concrete thing with ${partnerName} this week.`}
            </p>
            {plan && (
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12, lineHeight: 1.35 }}>
                {isConfirmed
                  ? 'You both said yes.'
                  : proposedByMe
                  ? 'Waiting for them to confirm.'
                  : 'Accept it or suggest a different one.'}
              </p>
            )}
          </div>

          {!isConfirmed && (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              style={{
                border: 'none',
                borderRadius: 10,
                background: C.amberT08,
                color: C.amber,
                width: 36,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              aria-label={plan ? 'Suggest different plan' : 'Suggest a plan'}
            >
              <CalendarPlus size={17} />
            </button>
          )}
        </div>

        {needsMyConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            style={{
              marginTop: 10,
              width: '100%',
              minHeight: 38,
              border: 'none',
              borderRadius: 10,
              background: C.gradientCTA,
              color: C.cream,
              fontSize: 13,
              fontWeight: 850,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.72 : 1,
            }}
          >
            {submitting ? <RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={15} />}
            Accept plan
          </button>
        )}

        {showForm && !isConfirmed && (
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '86px minmax(0, 1fr)', gap: 8 }}>
              <select
                value={form.day}
                onChange={(e) => setForm((p) => ({ ...p, day: e.target.value }))}
                style={PLAN_INPUT}
              >
                {PLAN_DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <select
                value={form.time_label}
                onChange={(e) => setForm((p) => ({ ...p, time_label: e.target.value }))}
                style={PLAN_INPUT}
              >
                {PLAN_TIME_PRESETS.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <input
              value={form.place}
              onChange={(e) => setForm((p) => ({ ...p, place: e.target.value.slice(0, 120) }))}
              placeholder="Place or area"
              style={PLAN_INPUT}
            />
            <input
              value={form.activity}
              onChange={(e) => setForm((p) => ({ ...p, activity: e.target.value.slice(0, 120) }))}
              placeholder="Activity"
              style={PLAN_INPUT}
            />
            <button
              type="button"
              onClick={onPropose}
              disabled={submitting || !form.time_label.trim()}
              style={{
                minHeight: 38,
                border: 'none',
                borderRadius: 10,
                background: submitting ? C.cardDeep : C.gradientCTA,
                color: submitting ? C.muted : C.cream,
                fontSize: 13,
                fontWeight: 850,
                cursor: submitting ? 'default' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : plan ? 'Suggest different' : 'Send plan'}
            </button>
          </div>
        )}

        {plan && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <p style={{ margin: '0 0 8px', color: C.white, fontSize: 13, fontWeight: 850 }}>
              Bring a friend
            </p>

            {myGuestInvite && (
              <div style={{ ...GUEST_ROW, background: C.amberT08, borderColor: C.brownBorder }}>
                <div style={{ minWidth: 0 }}>
                  <p style={GUEST_TITLE}>
                    {myGuestInvite.inviter?.name || myGuestInvite.inviter?.username || 'Someone'} invited you
                  </p>
                  <p style={GUEST_SUB}>Optional +1 · plan stays on either way</p>
                </div>
                {myGuestInvite.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button type="button" onClick={() => onRespondGuest(myGuestInvite, false)} disabled={guestSubmitting} style={GUEST_SMALL_BTN}>
                      No
                    </button>
                    <button type="button" onClick={() => onRespondGuest(myGuestInvite, true)} disabled={guestSubmitting} style={{ ...GUEST_SMALL_BTN, background: C.gradientCTA, color: C.cream, border: 'none' }}>
                      Yes
                    </button>
                  </div>
                ) : (
                  <span style={{ ...GUEST_STATUS, color: myGuestInvite.status === 'accepted' ? C.success : C.muted }}>
                    {myGuestInvite.status}
                  </span>
                )}
              </div>
            )}

            {myGuest ? (
              <div style={GUEST_ROW}>
                <div style={{ minWidth: 0 }}>
                  <p style={GUEST_TITLE}>
                    {myGuest.guest?.name || myGuest.guest?.username || 'Friend'}
                  </p>
                  <p style={GUEST_SUB}>Your +1</p>
                </div>
                <span style={{ ...GUEST_STATUS, color: myGuest.status === 'accepted' ? C.success : myGuest.status === 'declined' ? C.danger : C.amber }}>
                  {myGuest.status}
                </span>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  value={guestQuery}
                  onChange={(e) => setGuestQuery(e.target.value)}
                  placeholder="@username or name"
                  style={PLAN_INPUT}
                />
                {guestQuery.trim().length >= 2 && (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {guestResults.length > 0 ? guestResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => onInviteGuest(user)}
                        disabled={guestSubmitting}
                        style={GUEST_PICK_BTN}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.name || user.username || 'Someone'}
                          {user.username ? ` · @${user.username}` : ''}
                        </span>
                        <span style={{ color: C.amber, fontWeight: 850 }}>Invite</span>
                      </button>
                    )) : (
                      <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>
                        No matching profiles.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {othersGuests.length > 0 && (
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {othersGuests.map((guest) => (
                  <div key={guest.id} style={GUEST_ROW}>
                    <div style={{ minWidth: 0 }}>
                      <p style={GUEST_TITLE}>
                        {guest.guest?.name || guest.guest?.username || 'Friend'}
                      </p>
                      <p style={GUEST_SUB}>
                        {guest.inviter?.name || guest.inviter?.username || 'Their'} +1
                      </p>
                    </div>
                    <span style={{ ...GUEST_STATUS, color: guest.status === 'accepted' ? C.success : guest.status === 'declined' ? C.danger : C.amber }}>
                      {guest.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const PLAN_INPUT = {
  width: '100%',
  minHeight: 38,
  boxSizing: 'border-box',
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  background: C.bg,
  color: C.text,
  fontSize: 13,
  outline: 'none',
  padding: '9px 10px',
  fontFamily: 'inherit',
};

const GUEST_ROW = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '9px 10px',
  background: C.bg,
};

const GUEST_TITLE = {
  margin: 0,
  color: C.white,
  fontSize: 13,
  fontWeight: 800,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const GUEST_SUB = {
  margin: '2px 0 0',
  color: C.muted,
  fontSize: 11,
};

const GUEST_STATUS = {
  fontSize: 12,
  fontWeight: 850,
  textTransform: 'capitalize',
  flexShrink: 0,
};

const GUEST_SMALL_BTN = {
  minWidth: 42,
  minHeight: 30,
  borderRadius: 9,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.white,
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
};

const GUEST_PICK_BTN = {
  width: '100%',
  minHeight: 36,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  background: C.bg,
  color: C.white,
  fontSize: 12,
  fontWeight: 750,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '8px 10px',
  cursor: 'pointer',
};

// ── Main page ─────────────────────────────────────────────
export default function SoloChatPage({ match, currentUser, go, goBack, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [showEnd,  setShowEnd]  = useState(false);
  const [plan,     setPlan]     = useState(null);
  const [planGuests, setPlanGuests] = useState([]);
  const [planForm, setPlanForm] = useState({
    day: 'fri',
    time_label: 'Evening',
    place: '',
    activity: '',
  });
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [guestQuery, setGuestQuery] = useState('');
  const [guestResults, setGuestResults] = useState([]);
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const endRef = useRef(null);

  const partner      = match?.partner ?? {};
  const matchId      = match?.matchId;
  const partnerPhoto = partner?.photos?.[0] ?? null;
  const partnerName  = partner?.name || partner?.username || 'Chat';

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initial load + realtime subscription
  useEffect(() => {
    if (!matchId) return undefined;
    let cancelled = false;
    let unsub = null;

    getSoloMessages(matchId)
      .then(msgs => {
        if (cancelled) return;
        setMessages(msgs);
        setLoading(false);
        setTimeout(scrollToBottom, 60);
      })
      .catch(() => setLoading(false));

    unsub = subscribeSoloMessages(matchId, (msg) => {
      setMessages(prev => (prev.some(x => x.id === msg.id) ? prev : [...prev, msg]));
      setTimeout(scrollToBottom, 50);
    });

    return () => { cancelled = true; unsub?.(); };
  }, [matchId, scrollToBottom]);

  useEffect(() => {
    if (!matchId) return undefined;
    let cancelled = false;
    const applyPlan = (nextPlan) => {
      if (!nextPlan || cancelled) return;
      setPlan(nextPlan);
      setPlanForm({
        day: nextPlan.day ?? 'fri',
        time_label: nextPlan.time_label ?? 'Evening',
        place: nextPlan.place ?? '',
        activity: nextPlan.activity ?? '',
      });
      if (nextPlan.status === 'confirmed') setShowPlanForm(false);
    };

    getSoloPlan(matchId).then(applyPlan).catch(() => {});
    const unsub = subscribeSoloPlan(matchId, applyPlan);
    return () => { cancelled = true; unsub?.(); };
  }, [matchId]);

  const reloadGuests = useCallback((planId) => {
    if (!planId) {
      setPlanGuests([]);
      return Promise.resolve([]);
    }
    return getSoloPlanGuests(planId)
      .then((rows) => {
        setPlanGuests(rows);
        return rows;
      })
      .catch(() => []);
  }, []);

  useEffect(() => {
    reloadGuests(plan?.id);
  }, [plan?.id, reloadGuests]);

  useEffect(() => {
    if (!plan?.id) return undefined;
    return subscribeSoloPlanGuests(plan.id, () => reloadGuests(plan.id));
  }, [plan?.id, reloadGuests]);

  useEffect(() => {
    if (!plan?.id || guestQuery.trim().length < 2) {
      setGuestResults([]);
      return undefined;
    }

    let cancelled = false;
    const t = setTimeout(() => {
      searchSoloPlanGuestCandidates(plan.id, guestQuery)
        .then((rows) => {
          if (!cancelled) setGuestResults(rows);
        })
        .catch(() => {
          if (!cancelled) setGuestResults([]);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [plan?.id, guestQuery]);

  // Send (optimistic update)
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !matchId) return;
    setInput('');
    setSending(true);

    const optimistic = {
      id: `opt-${Date.now()}`,
      match_id: matchId,
      sender_user_id: currentUser?.id,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(scrollToBottom, 50);

    try {
      const saved = await sendSoloMessage(matchId, text);
      setMessages(prev => prev.map(m => (m.id === optimistic.id ? saved : m)));
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(text);
      showToast?.(e?.message ?? 'Failed to send', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEnd = async () => {
    try {
      await endSoloMatch(matchId);
      go('home');
    } catch (e) {
      showToast?.(e?.message ?? 'Failed to leave', 'error');
    }
  };

  const handleProposePlan = async () => {
    if (!matchId || planSubmitting) return;
    setPlanSubmitting(true);
    try {
      const nextPlan = await proposeSoloPlan(matchId, planForm);
      if (nextPlan) setPlan(nextPlan);
      setShowPlanForm(false);
      showToast?.('Plan sent', 'success');
    } catch (e) {
      showToast?.(e?.message ?? 'Could not send plan', 'error');
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleConfirmPlan = async () => {
    if (!plan?.id || planSubmitting) return;
    setPlanSubmitting(true);
    try {
      const nextPlan = await confirmSoloPlan(plan.id);
      if (nextPlan) setPlan(nextPlan);
      showToast?.('Plan confirmed', 'success');
    } catch (e) {
      showToast?.(e?.message ?? 'Could not confirm plan', 'error');
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleInviteGuest = async (user) => {
    if (!plan?.id || !user?.id || guestSubmitting) return;
    setGuestSubmitting(true);
    try {
      await inviteSoloPlanGuest(plan.id, user.id);
      setGuestQuery('');
      setGuestResults([]);
      await reloadGuests(plan.id);
      showToast?.('Friend invited', 'success');
    } catch (e) {
      showToast?.(e?.message ?? 'Could not invite friend', 'error');
    } finally {
      setGuestSubmitting(false);
    }
  };

  const handleRespondGuest = async (invite, accept) => {
    if (!invite?.id || guestSubmitting) return;
    setGuestSubmitting(true);
    try {
      await respondSoloPlanGuest(invite.id, accept);
      await reloadGuests(invite.plan_id);
      showToast?.(accept ? 'You joined as +1' : 'Invite declined', 'success');
    } catch (e) {
      showToast?.(e?.message ?? 'Could not update invite', 'error');
    } finally {
      setGuestSubmitting(false);
    }
  };

  // No matchId → error screen
  if (!matchId) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <AlertCircle size={32} color={C.muted} />
        <p style={{ color: C.muted, fontSize: 14 }}>Chat not found</p>
        <button onClick={() => go('home')} style={{ color: C.amber, background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>
          Go home
        </button>
      </div>
    );
  }

  // Only last bubble in a group shows an avatar
  const withAvatar = messages.map((msg, i) => {
    const next = messages[i + 1];
    const isLastInGroup = !next || next.sender_user_id !== msg.sender_user_id;
    return { ...msg, showAvatar: isLastInGroup };
  });

  return (
    <div style={{ height: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <TopBar
        showBack
        onBack={goBack ?? (() => go('home'))}
        onLogoClick={() => go('home')}
        rightContent={
          <button
            onClick={() => setShowEnd(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.muted, padding: '4px 6px', whiteSpace: 'nowrap' }}
          >
            Leave
          </button>
        }
      />

      {/* Partner header strip (TopBar has no title, so name shows here) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
        {partnerPhoto ? (
          <img src={partnerPhoto} alt={partnerName} style={{ width: 32, height: 32, borderRadius: 16, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: 16, background: gradientFor(partner?.id ?? ''), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>{partnerName[0].toUpperCase()}</span>
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: C.white, margin: 0, lineHeight: 1.2 }}>{partnerName}</p>
          {partner?.username && (
            <p style={{ fontSize: 11, color: C.muted, margin: '1px 0 0' }}>@{partner.username}</p>
          )}
        </div>
      </div>

      <PlanPanel
        plan={plan}
        guests={planGuests}
        currentUserId={currentUser?.id}
        partnerName={partnerName}
        submitting={planSubmitting}
        guestSubmitting={guestSubmitting}
        form={planForm}
        setForm={setPlanForm}
        showForm={showPlanForm}
        setShowForm={setShowPlanForm}
        guestQuery={guestQuery}
        setGuestQuery={setGuestQuery}
        guestResults={guestResults}
        onInviteGuest={handleInviteGuest}
        onRespondGuest={handleRespondGuest}
        onPropose={handleProposePlan}
        onConfirm={handleConfirmPlan}
      />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: C.muted, fontSize: 13 }}>Loading...</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <p style={{ fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
              You matched with {partnerName}!<br />Say hi first.
            </p>
          </div>
        )}

        {!loading && withAvatar.map(msg => (
          <Bubble
            key={msg.id}
            msg={msg}
            isMine={msg.sender_user_id === currentUser?.id}
            partnerPhoto={partnerPhoto}
            partnerName={partnerName}
            showAvatar={msg.showAvatar}
          />
        ))}

        <div ref={endRef} style={{ height: 1 }} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        borderTop: `1px solid ${C.border}`,
        background: C.bg,
        display: 'flex', alignItems: 'flex-end', gap: 8,
        flexShrink: 0,
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          placeholder="Type a message..."
          rows={1}
          style={{
            flex: 1, resize: 'none', border: `1px solid ${C.border}`,
            borderRadius: 20, padding: '10px 14px',
            fontSize: 14, color: C.text, background: C.cardElevated,
            outline: 'none', lineHeight: 1.45,
            maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          aria-label="Send"
          style={{
            width: 42, height: 42, borderRadius: 21, border: 'none',
            background: input.trim() ? C.gradientCTA : C.cardDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <Send size={17} color={input.trim() ? '#fff' : C.muted} />
        </button>
      </div>

      {/* Leave confirmation modal */}
      {showEnd && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, padding: 24,
          }}
          onClick={() => setShowEnd(false)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ background: C.bg, borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 320, textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 8px' }}>
              Leave this chat?
            </p>
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 22px', lineHeight: 1.5 }}>
              The match ends and the chat history<br />will no longer be available.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowEnd(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg, fontSize: 14, fontWeight: 600, color: C.muted, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleEnd}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: C.danger, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              >
                Leave
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
