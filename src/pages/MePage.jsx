import { useState, useEffect } from 'react';
import { LogOut, Pencil, Camera, MapPin, AtSign, Users, Settings2, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { C, AVATAR_GRADIENTS, F } from '../tokens';
import InstagramButton from '../components/InstagramButton.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import { signOut } from '../lib/auth.js';
import { getMyDuo } from '../lib/duos.js';
import { getMyProfile } from '../lib/profile.js';
import { getMyHangouts } from '../lib/hangouts.js';

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

function calcAge(p) {
  if (p?.birth_year) return new Date().getFullYear() - p.birth_year;
  return p?.age ?? null;
}

function InfoPill({ icon: Icon, children }) {
  return (
    <span
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          5,
        background:   'rgba(255,255,255,0.06)',
        border:       '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 9999,
        padding:      '5px 12px',
        fontSize:     13,
        color:        C.white,
      }}
    >
      {Icon && <Icon size={12} color={C.muted} strokeWidth={1.8} />}
      {children}
    </span>
  );
}

function PromptCard({ q, a }) {
  if (!a) return null;
  return (
    <div
      style={{
        background:   C.cardElevated,
        border:       `0.5px solid ${C.border}`,
        borderRadius: 16,
        padding:      '16px 18px',
        marginBottom: 12,
      }}
    >
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
        {q}
      </p>
      <p style={{ fontSize: 17, fontWeight: 700, color: C.white, lineHeight: 1.45, margin: 0 }}>
        {a}
      </p>
    </div>
  );
}

const SECTION_LABEL = {
  fontSize:      10,
  fontWeight:    700,
  letterSpacing: '1.1px',
  textTransform: 'uppercase',
  color:         C.muted,
  margin:        '0 0 12px',
};

export default function MePage({ go, currentUser, myDuo: myDuoProp }) {
  const [profile, setProfile] = useState(null);
  const [myDuo,   setMyDuo]   = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    Promise.all([getMyProfile(currentUser.id), getMyDuo(currentUser.id)])
      .then(([prof, duo]) => {
        setProfile(prof);
        setMyDuo(duo);
        return duo ? getMyHangouts(duo.id) : [];
      })
      .then((hangouts) => setMatches((hangouts || []).filter((h) => h.status === 'confirmed')))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const age        = calcAge(profile);
  const heroPhoto  = profile?.photos?.[0] ?? null;
  const extraPhotos = [profile?.photos?.[1], profile?.photos?.[2]].filter(Boolean);
  const hasDuoRoom = (myDuo?.duo_members?.length ?? 0) >= 2;

  if (loading) {
    return <div style={{ minHeight: '100vh', background: C.bg }} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>

      {/* ── Hero ─────────────────────────────────── */}
      <div style={{ position: 'relative', height: '55vh', minHeight: 280 }}>
        {heroPhoto ? (
          <img
            src={heroPhoto}
            alt="Profile"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width:          '100%',
              height:         '100%',
              background:     AVATAR_GRADIENTS[0],
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            <Camera size={44} color="rgba(255,255,255,0.35)" strokeWidth={1.5} />
          </div>
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 35%, rgba(0,0,0,0.72) 100%)',
          }}
        />

        {/* Top-right action buttons */}
        <div
          style={{
            position: 'absolute',
            top:      14,
            right:    14,
            display:  'flex',
            gap:      8,
            alignItems: 'center',
          }}
        >
          <NotificationBell currentUser={currentUser} go={go} />
          <motion.button
            type="button"
            aria-label="Edit profile"
            onClick={() => go('edit_profile')}
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.1 }}
            style={{
              width:          36,
              height:         36,
              borderRadius:   10,
              background:     'rgba(0,0,0,0.45)',
              border:         '0.5px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         'pointer',
            }}
          >
            <Pencil size={15} color="#fff" strokeWidth={2} />
          </motion.button>
          <motion.button
            type="button"
            aria-label="Log out"
            onClick={() => signOut()}
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.1 }}
            style={{
              width:          36,
              height:         36,
              borderRadius:   10,
              background:     'rgba(0,0,0,0.45)',
              border:         '0.5px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         'pointer',
            }}
          >
            <LogOut size={15} color="#fff" strokeWidth={2} />
          </motion.button>
        </div>

        {/* Name + age overlay */}
        <div style={{ position: 'absolute', bottom: 20, left: 20 }}>
          <p style={{ ...F.h1, color: '#fff', margin: '0 0 2px', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
            {profile?.name ?? '—'}
            {age ? <span style={{ fontWeight: 400, fontSize: 22, marginLeft: 8 }}>{age}</span> : null}
          </p>
          {profile?.city && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} strokeWidth={2} />
              {profile.city}
            </p>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────── */}
      <div style={{ padding: '16px 16px 0' }}>

        {/* Extra photos */}
        {extraPhotos.length > 0 && (
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: `repeat(${extraPhotos.length}, 1fr)`,
              gap:                 6,
              marginBottom:        20,
            }}
          >
            {extraPhotos.map((url, i) => (
              <div key={i} style={{ height: 160, borderRadius: 14, overflow: 'hidden' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}

        {/* Info pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {age && <InfoPill>{age} years old</InfoPill>}
          {profile?.instagram && (
            <InfoPill icon={AtSign}>@{profile.instagram.replace(/^@/, '')}</InfoPill>
          )}
        </div>

        {/* Bio */}
        {profile?.bio ? (
          <div
            style={{
              background:   C.cardElevated,
              border:       `0.5px solid ${C.border}`,
              borderRadius: 16,
              padding:      '16px 18px',
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 15, color: C.white, lineHeight: 1.65, margin: 0 }}>
              {profile.bio}
            </p>
          </div>
        ) : (
          <div
            onClick={() => go('edit_profile')}
            style={{
              background:   C.cardElevated,
              border:       `1.5px dashed ${C.border}`,
              borderRadius: 16,
              padding:      '14px 18px',
              marginBottom: 16,
              cursor:       'pointer',
            }}
          >
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
              Add a bio <span style={{ color: C.amber }}>→</span>
            </p>
          </div>
        )}

        {/* Prompt cards */}
        <PromptCard q={profile?.prompt_q1} a={profile?.prompt_a1} />
        <PromptCard q={profile?.prompt_q2} a={profile?.prompt_a2} />

        {/* Duo card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 }}>
          <p style={{ ...SECTION_LABEL, margin: 0 }}>My Duo</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button
              type="button"
              aria-label="My Duos"
              onClick={() => go('my_duos')}
              whileTap={{ scale: 0.88 }}
              transition={{ duration: 0.1 }}
              style={{
                height:         30,
                borderRadius:   8,
                background:     'rgba(255,255,255,0.05)',
                border:         `0.5px solid ${C.border}`,
                color:          C.muted,
                fontSize:       11,
                fontWeight:     800,
                padding:        '0 10px',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                cursor:         'pointer',
              }}
            >
              My Duos
            </motion.button>
            {myDuo && (
              <motion.button
                type="button"
                aria-label="Edit duo profile"
                onClick={() => go('edit_duo_profile')}
                whileTap={{ scale: 0.88 }}
                transition={{ duration: 0.1 }}
                style={{
                  width:          30,
                  height:         30,
                  borderRadius:   8,
                  background:     'rgba(255,255,255,0.05)',
                  border:         `0.5px solid ${C.border}`,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  cursor:         'pointer',
                }}
              >
                <Settings2 size={14} color={C.muted} strokeWidth={1.8} />
              </motion.button>
            )}
          </div>
        </div>
        {myDuo ? (
          <div
            style={{
              background:   C.cardElevated,
              borderLeft:   `3px solid ${C.amber}`,
              borderRight:  `0.5px solid ${C.border}`,
              borderTop:    `0.5px solid ${C.border}`,
              borderBottom: `0.5px solid ${C.border}`,
              borderRadius: 14,
              padding:      '16px 16px',
              marginBottom: 28,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Users size={14} color={C.amber} strokeWidth={2} />
              <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: 0 }}>{myDuo.name}</p>
            </div>
            {myDuo.city && (
              <p style={{ fontSize: 13, color: C.muted, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} strokeWidth={1.8} />{myDuo.city}
              </p>
            )}
            {myDuo.vibes?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {myDuo.vibes.map((v) => (
                  <span
                    key={v}
                    style={{
                      background:   'rgba(245,158,11,0.10)',
                      color:        C.amber,
                      border:       '0.5px solid rgba(245,158,11,0.25)',
                      borderRadius: 9999,
                      padding:      '3px 10px',
                      fontSize:     12,
                      fontWeight:   600,
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}
            {hasDuoRoom && (
              <motion.button
                type="button"
                onClick={() => go('duo_room')}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                style={{
                  width: '100%',
                  height: 46,
                  marginTop: 14,
                  borderRadius: 13,
                  border: 'none',
                  background: C.gradientCTA,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <MessageCircle size={16} strokeWidth={2.2} />
                Open Duo Room
              </motion.button>
            )}
          </div>
        ) : (
          <div
            style={{
              background:   C.cardElevated,
              borderLeft:   `3px solid ${C.amber}`,
              borderRight:  `0.5px solid ${C.border}`,
              borderTop:    `0.5px solid ${C.border}`,
              borderBottom: `0.5px solid ${C.border}`,
              borderRadius: 14,
              padding:      16,
              marginBottom: 28,
            }}
          >
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
              No duo yet.{' '}
              <span onClick={() => go('onboarding')} style={{ color: C.amber, cursor: 'pointer', fontWeight: 600 }}>
                Create one →
              </span>
            </p>
          </div>
        )}

        {/* Matches */}
        <p style={SECTION_LABEL}>Matches</p>
        {matches.length === 0 ? (
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            No confirmed hangouts yet. Start browsing duos!
          </p>
        ) : (
          matches.map((h) => {
            const otherDuo   = h.duo_a_id === myDuo?.id ? h.duo_b : h.duo_a;
            const members    = otherDuo?.duo_members ?? [];
            const dateLabel  = DATE_LABELS[h.date]      ?? h.date      ?? '';
            const timeLabel  = TIME_LABELS[h.time_slot] ?? h.time_slot ?? '';
            return (
              <div
                key={h.id}
                style={{
                  background:      'linear-gradient(145deg, #1C1C22, #151519)',
                  borderLeft:      `3px solid ${C.success}`,
                  border:          '0.5px solid rgba(255,255,255,0.06)',
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
                    background:   'rgba(16,185,129,0.12)',
                    color:        C.success,
                    borderRadius: 9999,
                    padding:      '4px 12px',
                    fontSize:     12,
                    fontWeight:   600,
                    marginBottom: 10,
                  }}
                >
                  ✓ Confirmed
                </span>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: '0 0 4px' }}>
                  {otherDuo?.name ?? 'Duo'}
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>
                  {[h.vibe, dateLabel, timeLabel].filter(Boolean).join(' · ')}
                </p>
                {members.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Connect on Instagram
                    </p>
                    {members.map((member, idx) =>
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
                        <p key={idx} style={{ fontSize: 13, color: C.muted }}>Instagram not added yet.</p>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
