import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, MoreHorizontal } from 'lucide-react';
import { C, AVATAR_GRADIENTS, F } from '../tokens';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import InitialsAvatar from '../components/InitialsAvatar.jsx';
import ReportModal from '../components/ReportModal.jsx';
import { staggerContainer, staggerItem } from '../lib/motion';

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
      photo:   m.profiles?.photos?.[0] ?? m.profiles?.avatar_url ?? null,
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
        background:   accent ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)',
        border:       `0.5px solid ${accent ? 'rgba(245,158,11,0.2)' : C.border}`,
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
          <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>
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
            <p style={{ fontSize: 14, color: 'rgba(245,245,248,0.8)', lineHeight: 1.6, margin: 0 }}>
              {member.bio}
            </p>
          )}
          <PromptCard q={member.promptQ} a={member.promptA} />
        </div>
      )}
    </div>
  );
}

export default function DuoDetailPage({ duo, go, goBack, onLogout, currentUser, myDuo, showToast }) {
  const [reportOpen, setReportOpen] = useState(false);

  if (!duo) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <div style={{ padding: '72px 16px 0', textAlign: 'center' }}>
          <PremiumButton fullWidth onClick={() => go('home')}>Back to Home</PremiumButton>
        </div>
      </div>
    );
  }

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
          <ChevronLeft size={20} color="#fff" strokeWidth={2.2} />
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
            <span className="gradient-text">duo oc.</span>
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
          <MoreHorizontal size={18} color="#fff" strokeWidth={2} />
        </motion.button>

        {/* Duo name + members */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
          <p style={{ ...F.h2, color: '#fff', margin: '0 0 4px', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
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
        {/* Vibe pills */}
        {vibes.length > 0 && (
          <motion.div variants={staggerItem} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {vibes.map((v) => (
              <span
                key={v}
                style={{
                  background:   'rgba(245,158,11,0.10)',
                  color:        C.amber,
                  border:       '0.5px solid rgba(245,158,11,0.22)',
                  borderRadius: 9999,
                  padding:      '5px 12px',
                  fontSize:     12,
                  fontWeight:   600,
                }}
              >
                {v}
              </span>
            ))}
            {duo.city && (
              <span
                style={{
                  display:      'inline-flex',
                  alignItems:   'center',
                  gap:          4,
                  background:   'rgba(255,255,255,0.05)',
                  border:       `0.5px solid ${C.border}`,
                  borderRadius: 9999,
                  padding:      '5px 12px',
                  fontSize:     12,
                  color:        C.muted,
                }}
              >
                <MapPin size={10} strokeWidth={2} />{duo.city}
              </span>
            )}
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
              <p style={{ fontSize: 15, color: 'rgba(245,245,248,0.85)', lineHeight: 1.6, margin: 0 }}>
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

        {/* CTA */}
        <motion.div variants={staggerItem}>
          <PremiumButton fullWidth onClick={() => go('propose_hangout', duo)}>
            Propose 2v2 Hangout →
          </PremiumButton>
        </motion.div>
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
            onBlocked={() => { setReportOpen(false); goBack(); }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
