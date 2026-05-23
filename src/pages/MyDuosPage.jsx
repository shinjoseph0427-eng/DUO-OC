import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, MapPin, MessageCircle, Settings2, Users } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { getMyDuos } from '../lib/duos.js';

function memberName(member) {
  return member?.profiles?.name ?? 'Member';
}

function DuoCard({ duo, go }) {
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
        background: C.cardElevated,
        border: `0.5px solid ${C.border}`,
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      <div style={{ height: 3, background: C.gradientCTA }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: 'rgba(245,158,11,0.12)',
              border: '0.5px solid rgba(245,158,11,0.24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
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
          <p style={{ fontSize: 14, color: 'rgba(245,245,248,0.78)', lineHeight: 1.55, margin: '0 0 12px' }}>
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
                  background: 'rgba(245,158,11,0.1)',
                  color: C.amber,
                  border: '0.5px solid rgba(245,158,11,0.22)',
                  borderRadius: 9999,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
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
          <PremiumButton
            fullWidth
            variant="ghost"
            onClick={() => {
              console.log('[MyDuosPage] edit duo clicked', duo);
              go('edit_duo_profile', duo);
            }}
            style={{ gap: 8 }}
          >
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
    <div
      className="shimmer"
      style={{
        height: 218,
        borderRadius: 18,
        background: C.cardElevated,
      }}
    />
  );
}

export default function MyDuosPage({ currentUser, go }) {
  const [duos, setDuos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    getMyDuos(currentUser.id).then((nextDuos) => {
      if (cancelled) return;
      setDuos(nextDuos);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const countLabel = useMemo(() => `${Math.min(duos.length, 3)}/3 duos`, [duos.length]);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={() => go('me')} onLogoClick={() => go('home')} />

      <div style={{ padding: '20px 16px 104px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: C.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>
              My teams
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: C.white, letterSpacing: 0, margin: 0 }}>
              My Duos
            </h1>
          </div>
          <span
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `0.5px solid ${C.border}`,
              borderRadius: 9999,
              color: C.amber,
              fontSize: 12,
              fontWeight: 800,
              padding: '7px 12px',
              flexShrink: 0,
            }}
          >
            {countLabel}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <DuoSkeleton />
            <DuoSkeleton />
          </div>
        ) : duos.length === 0 ? (
          <EmptyState
            icon={Users}
            title="You don't have a duo yet."
            subtitle="Find a homie and build your first 2-person team."
            action={() => go('find_homie')}
            actionLabel="Find Homie"
          />
        ) : (
          <>
            <div style={{ display: 'grid', gap: 12 }}>
              {duos.map((duo) => (
                <DuoCard key={duo.id} duo={duo} go={go} />
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              {duos.length < 3 ? (
                <PremiumButton fullWidth variant="ghost" onClick={() => go('find_homie')}>
                  Find another Homie
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
    </div>
  );
}
