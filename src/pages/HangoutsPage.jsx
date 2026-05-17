import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { C, AVATAR_GRADIENTS } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import InstagramButton from '../components/InstagramButton.jsx';
import { OC_SPOTS } from '../data/duos.js';
import { getMyHangouts, acceptHangout, declineHangout } from '../lib/hangouts.js';
import { getMyDuo } from '../lib/duos.js';

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
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>📍 {h.place}</p>
      )}
    </>
  );
}

export default function HangoutsPage({ currentUser, go, onLogout }) {
  const [hangouts, setHangouts] = useState([]);
  const [myDuo,    setMyDuo]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(() => {
    if (!currentUser) { setLoading(false); return; }
    getMyDuo(currentUser.id).then((duo) => {
      setMyDuo(duo);
      if (duo) return getMyHangouts(duo.id);
      return [];
    }).then((data) => {
      setHangouts(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (id) => {
    await acceptHangout(id);
    load();
  };

  const handleDecline = async (id) => {
    await declineHangout(id);
    load();
  };

  const incoming  = hangouts.filter((h) => h.status === 'pending'   && h.duo_b_id === myDuo?.id);
  const outgoing  = hangouts.filter((h) => h.status === 'pending'   && h.duo_a_id === myDuo?.id);
  const countered = hangouts.filter((h) => h.status === 'countered' && h.duo_a_id === myDuo?.id);
  const confirmed = hangouts.filter((h) => h.status === 'confirmed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <TopBar title="Hangouts" onLogout={onLogout} />

      <div style={{ flex: 1, padding: '20px 16px', paddingBottom: 80, overflowY: 'auto' }}>

        {loading ? (
          <p style={{ fontSize: 14, color: C.muted, textAlign: 'center', padding: '40px 0' }}>
            Loading…
          </p>
        ) : (
          <>
            {/* INCOMING PENDING */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={SECTION_LABEL}>Pending</p>
              {incoming.length > 0 && (
                <span
                  style={{
                    background:   'rgba(245,158,11,0.12)',
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

            {incoming.length === 0 && outgoing.length === 0 && (
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
                No pending hangouts.
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
                <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0 }}>
                  Hangout request
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
                      boxShadow:    '0 2px 12px rgba(245,158,11,0.2)',
                    }}
                  >
                    ✓ Accept
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
                    ✗ Decline
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => go('counter_hangout', null, null, null, h)}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.1 }}
                    style={{
                      flex:         1,
                      background:   'transparent',
                      color:        '#A78BFA',
                      border:       '0.5px solid rgba(139,92,246,0.3)',
                      borderRadius: 10,
                      padding:      10,
                      fontSize:     13,
                      fontWeight:   700,
                      cursor:       'pointer',
                    }}
                  >
                    ↩ Counter
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
                      borderLeft:   `3px solid rgba(245,158,11,0.3)`,
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
                <p style={{ ...SECTION_LABEL, marginTop: 20, marginBottom: 12 }}>New time proposed</p>
                {countered.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      background:   C.cardElevated,
                      borderLeft:   '3px solid #8B5CF6',
                      borderRight:  `0.5px solid ${C.border}`,
                      borderTop:    `0.5px solid ${C.border}`,
                      borderBottom: `0.5px solid ${C.border}`,
                      borderRadius: 14,
                      padding:      '14px 16px',
                      marginBottom: 10,
                    }}
                  >
                    <p style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 700, margin: '0 0 4px' }}>
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
                          flex: 1, background: C.gradientCTA, color: '#fff',
                          border: 'none', borderRadius: 10, padding: 10,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        ✓ Accept
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
                        ✗ Decline
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
                No confirmed hangouts yet.
              </p>
            )}

            {confirmed.map((h) => {
              const otherDuo = h.duo_a_id === myDuo?.id ? h.duo_b : h.duo_a;
              const members  = otherDuo?.duo_members ?? [];
              return (
                <div
                  key={h.id}
                  style={{
                    background:   'linear-gradient(145deg, #1C1C22, #151519)',
                    borderLeft:   `3px solid ${C.success}`,
                    border:       `0.5px solid rgba(255,255,255,0.06)`,
                    borderLeftWidth: 3,
                    borderLeftColor: C.success,
                    borderRadius: 16,
                    padding:      20,
                    marginBottom: 12,
                  }}
                >
                  {/* Confirmed badge */}
                  <span
                    style={{
                      display:      'inline-block',
                      background:   'rgba(16,185,129,0.12)',
                      color:        C.success,
                      borderRadius: 9999,
                      padding:      '4px 12px',
                      fontSize:     12,
                      fontWeight:   600,
                      marginBottom: 12,
                    }}
                  >
                    ✓ Confirmed
                  </span>

                  {/* Duo name + meta */}
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 4px' }}>
                    {otherDuo?.name ?? 'Duo'}
                  </p>
                  <HangoutMeta h={h} />

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginBottom: 12 }}>
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
