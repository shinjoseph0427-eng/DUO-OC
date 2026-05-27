import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Eye, MapPin, MessageCircle, Settings2, Users } from 'lucide-react';
import { C } from '../tokens';
import PremiumButton from './ui/PremiumButton.jsx';
import { getMyDuos } from '../lib/duos.js';
import { getPendingHangoutsForDuo } from '../lib/hangouts.js';

function memberName(member) {
  return member?.profiles?.name ?? 'Member';
}

const DATE_LABELS = {
  today: 'Today', tomorrow: 'Tomorrow', friday: 'This Friday',
  saturday: 'Saturday', sunday: 'This Sunday', next_week: 'Next week',
};
const TIME_LABELS = {
  morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night',
};

function DuoCard({ duo, go }) {
  const [proposals,     setProposals]     = useState([]);
  const [proposalError, setProposalError] = useState('');

  useEffect(() => {
    if (!duo?.id) return;
    getPendingHangoutsForDuo(duo.id).then((items) => {
      setProposals(items);
    }).catch((err) => {
      console.error('[DuoCard] pending proposals failed', err);
      setProposalError('Could not load hangout proposals');
    });
  }, [duo?.id]);

  const members = duo?.duo_members ?? [];
  const names = members.map(memberName).slice(0, 2).join(' & ');
  const memberCount = members.length || 1;
  const tags = [
    ...(Array.isArray(duo?.vibes) ? duo.vibes : []),
    ...(Array.isArray(duo?.spots) ? duo.spots : []),
  ].filter(Boolean).slice(0, 5);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        background:   C.cardElevated,
        border:       `0.5px solid ${C.border}`,
        borderRadius: 18,
        overflow:     'hidden',
      }}
    >
      <div style={{ height: 2, background: C.gradientCTA, opacity: 0.85 }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width:          46,
              height:         46,
              borderRadius:   14,
              background:     'rgba(255,107,0,0.10)',
              border:         '0.5px solid rgba(255,107,0,0.15)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
            }}
          >
            <Users size={21} color={C.amber} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: C.white, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {duo?.name ?? 'Your Duo'}
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.45 }}>
              {[duo?.city, names, `${memberCount} ${memberCount === 1 ? 'person' : 'people'}`].filter(Boolean).join(' - ')}
            </p>
          </div>
        </div>

        {duo?.duo_bio && (
          <p style={{ fontSize: 14, color: C.white, lineHeight: 1.55, margin: '0 0 12px' }}>
            {duo.duo_bio}
          </p>
        )}

        {duo?.looking_for && (
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={12} strokeWidth={2} />
            Looking for {duo.looking_for}
          </p>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background:   'rgba(255,107,0,0.10)',
                  color:        C.amber,
                  border:       '0.5px solid rgba(255,107,0,0.15)',
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

        {proposalError && (
          <p style={{ fontSize: 11, color: 'rgba(162,59,42,0.75)', margin: '0 0 10px', lineHeight: 1.4 }}>
            {proposalError}
          </p>
        )}

        {proposals.length > 0 && (() => {
          const first = proposals[0];
          const fromName = first?.duo_a?.name ?? 'another duo';
          const metaParts = [
            DATE_LABELS[first?.date] ?? first?.date,
            TIME_LABELS[first?.time_slot] ?? first?.time_slot,
            first?.place,
          ].filter(Boolean);
          return (
            <div
              style={{
                background:     'rgba(255,107,0,0.08)',
                border:         '0.5px solid rgba(255,107,0,0.22)',
                borderRadius:   12,
                padding:        '11px 13px',
                marginBottom:   10,
                display:        'flex',
                alignItems:     'flex-start',
                justifyContent: 'space-between',
                gap:            10,
              }}
            >
              <div style={{ display: 'flex', gap: 8, minWidth: 0, flex: 1 }}>
                <Calendar size={14} color={C.amber} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.amber, margin: '0 0 2px' }}>
                    {proposals.length === 1 ? 'New hangout proposal' : `${proposals.length} hangout proposals`}
                  </p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    From {fromName}
                  </p>
                  {metaParts.length > 0 && (
                    <p style={{ fontSize: 11, color: C.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {metaParts.join(' · ')}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => go('hangouts')}
                style={{
                  background:   'rgba(255,107,0,0.12)',
                  border:       '0.5px solid rgba(255,107,0,0.22)',
                  borderRadius: 8,
                  padding:      '5px 11px',
                  fontSize:     11,
                  fontWeight:   700,
                  color:        C.amber,
                  cursor:       'pointer',
                  flexShrink:   0,
                  marginTop:    1,
                }}
              >
                View
              </button>
            </div>
          );
        })()}

        <div style={{ display: 'grid', gap: 8 }}>
          <PremiumButton fullWidth variant="ghost" onClick={() => go('duo_detail', duo)} style={{ gap: 8 }}>
            <Eye size={15} strokeWidth={2.2} />
            View Profile
          </PremiumButton>
          {memberCount >= 2 && (
            <PremiumButton fullWidth onClick={() => go('duo_room', duo)} style={{ gap: 8 }}>
              <MessageCircle size={15} strokeWidth={2.2} />
              Open Duo Room
            </PremiumButton>
          )}
          <PremiumButton fullWidth variant="ghost" onClick={() => go('edit_duo_profile', duo)} style={{ gap: 8 }}>
            <Settings2 size={15} strokeWidth={2.2} />
            Edit Profile
          </PremiumButton>
        </div>
      </div>
    </motion.div>
  );
}

function DuoSkeleton() {
  return (
    <div className="shimmer" style={{ height: 218, borderRadius: 18, background: C.cardElevated }} />
  );
}

export default function MyDuosSection({ currentUser, go }) {
  const [duos,    setDuos]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError('');
    getMyDuos(currentUser.id).then((nextDuos) => {
      if (cancelled) return;
      setDuos(nextDuos);
    }).catch((err) => {
      if (cancelled) return;
      console.error('[MyDuosSection] getMyDuos error', err);
      setError(err?.message ?? 'Could not load your Duos. Please try again.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const countLabel = useMemo(() => `${Math.min(duos.length, 3)}/3 duos`, [duos.length]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: C.muted, margin: 0 }}>
          My Duos
        </p>
        <span
          style={{
            background:   C.cardElevated,
            border:       `0.5px solid ${C.border}`,
            borderRadius: 9999,
            color:        C.amber,
            fontSize:     12,
            fontWeight:   800,
            padding:      '5px 10px',
          }}
        >
          {countLabel}
        </span>
      </div>

      {error && (
        <div
          style={{
            background:   'rgba(239,68,68,0.09)',
            border:       '0.5px solid rgba(239,68,68,0.28)',
            borderRadius: 16,
            padding:      14,
            marginBottom: 12,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 800, color: C.danger, margin: '0 0 3px' }}>
            Could not load Duos
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.45 }}>
            {error}
          </p>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <DuoSkeleton />
        </div>
      ) : duos.length === 0 ? (
        <div
          style={{
            background:   C.cardElevated,
            border:       `1.5px dashed ${C.border}`,
            borderRadius: 16,
            padding:      '20px 18px',
            textAlign:    'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <Users size={28} color={C.muted} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 6px' }}>
            You don't have a duo yet.
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
            Find a homie first, then create a duo together.
          </p>
          <PremiumButton fullWidth onClick={() => go('find_homie')}>
            Find a homie
          </PremiumButton>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            {duos.map((duo) => (
              <DuoCard key={duo.id} duo={duo} go={go} />
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            {duos.length < 3 ? (
              <PremiumButton fullWidth variant="ghost" onClick={() => go('find_homie')}>
                Create another duo
              </PremiumButton>
            ) : (
              <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                You've reached your 3 Duo limit.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
