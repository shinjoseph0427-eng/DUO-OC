import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Inbox, MapPin, MessageCircle, Settings2, UserCheck, Users } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import InitialsAvatar from '../components/InitialsAvatar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { acceptHomieRequest, getMyHomieRequests } from '../lib/homie.js';
import { getMyDuo } from '../lib/duos.js';

function getSender(request) {
  return request?.profiles ?? request?.profile ?? request?.from_profile ?? {};
}

function RequestSkeleton() {
  return (
    <div
      className="shimmer"
      style={{
        height: 132,
        borderRadius: 16,
        background: C.cardElevated,
      }}
    />
  );
}

function AcceptedCard({ profile, duoId }) {
  const name = profile?.name ?? 'New homie';

  return (
    <div
      style={{
        background: 'rgba(16,185,129,0.09)',
        border: '0.5px solid rgba(16,185,129,0.28)',
        borderRadius: 16,
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: 'rgba(16,185,129,0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <UserCheck size={20} color={C.success} strokeWidth={2.2} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: '0 0 3px' }}>
          You are now a duo.
        </p>
        <p style={{ fontSize: 12, color: 'rgba(245,245,248,0.68)', margin: 0, lineHeight: 1.4 }}>
          You joined {name}'s duo{duoId ? ` (${duoId.slice(0, 8)})` : ''}.
        </p>
      </div>
    </div>
  );
}

function DuoSuccessCard({ duo }) {
  const members = duo?.duo_members ?? [];
  const memberCount = members.length || 2;
  const tags = [
    ...(Array.isArray(duo?.vibes) ? duo.vibes : []),
    ...(Array.isArray(duo?.spots) ? duo.spots : []),
  ].filter(Boolean).slice(0, 4);

  return (
    <div
      style={{
        background: C.cardElevated,
        border: `0.5px solid ${C.border}`,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 18,
      }}
    >
      <div style={{ height: 3, background: C.gradientCTA }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(245,158,11,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Users size={20} color={C.amber} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 17, fontWeight: 900, color: C.white, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {duo?.name ?? 'Your Duo'}
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
              {[duo?.city, `${memberCount} members`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
      </div>
    </div>
  );
}

function RequestCard({ request, accepting, accepted, onAccept }) {
  const sender = getSender(request);
  const photo = sender?.photos?.[0] ?? sender?.avatar_url ?? null;
  const name = sender?.name ?? 'Someone';
  const details = [sender?.age, sender?.city].filter(Boolean).join(' · ');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        background: C.cardElevated,
        border: `0.5px solid ${accepted ? 'rgba(16,185,129,0.35)' : C.border}`,
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {photo ? (
          <img
            src={photo}
            alt={name}
            style={{
              width: 58,
              height: 58,
              borderRadius: 14,
              objectFit: 'cover',
              display: 'block',
              flexShrink: 0,
            }}
          />
        ) : (
          <InitialsAvatar name={name} size={58} />
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.white, margin: '0 0 4px' }}>
            {name}
          </p>
          {details && (
            <p style={{ fontSize: 12, color: C.muted, margin: '0 0 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
              {sender?.city && <MapPin size={11} strokeWidth={2} />}
              {details}
            </p>
          )}
          {sender?.bio && (
            <p
              style={{
                fontSize: 13,
                color: 'rgba(245,245,248,0.76)',
                lineHeight: 1.45,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {sender.bio}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <PremiumButton
          fullWidth
          onClick={() => onAccept(request)}
          disabled={accepted || accepting}
          loading={accepting}
          variant={accepted ? 'ghost' : 'primary'}
          style={{ height: 46, padding: '0 18px' }}
        >
          {accepting ? 'Accepting...' : accepted ? 'Accepted' : 'Accept'}
        </PremiumButton>
      </div>
    </motion.div>
  );
}

export default function HomieInboxPage({ currentUser, go, goBack, onDuoChanged }) {
  const [requests, setRequests] = useState([]);
  const [acceptedDuo, setAcceptedDuo] = useState(null);
  const [acceptedHomieName, setAcceptedHomieName] = useState('');
  const [acceptingRequestId, setAcceptingRequestId] = useState(null);
  const [acceptedIds, setAcceptedIds] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const nextRequests = await getMyHomieRequests(currentUser.id);
      setRequests(nextRequests);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    getMyHomieRequests(currentUser.id).then((nextRequests) => {
      if (cancelled) return;
      setRequests(nextRequests);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const handleAccept = async (request) => {
    if (!request?.id || acceptingRequestId) return;

    setAcceptingRequestId(request.id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const sender = getSender(request);
      const result = await acceptHomieRequest(request.id);
      console.log('[HomieInboxPage] accept result', result);
      setAcceptedIds((prev) => ({ ...prev, [request.id]: true }));
      setAcceptedHomieName(sender?.name ?? 'your homie');
      setSuccessMessage('You are now a duo.');
      let nextDuo = null;
      try {
        nextDuo = await onDuoChanged?.();
      } catch (refreshError) {
        console.error('HomieInboxPage onDuoChanged refresh failed:', refreshError);
      }
      if (!nextDuo && currentUser?.id) {
        nextDuo = await getMyDuo(currentUser.id);
      }
      setAcceptedDuo(nextDuo ?? { id: result?.duo_id, name: 'Your Duo', duo_members: [{}, {}] });
      await loadRequests();
    } catch (err) {
      console.error('HomieInboxPage accept homie request failed:', err);
      setErrorMessage(err?.message ?? 'Failed to accept Homie request. Please try again.');
    } finally {
      setAcceptingRequestId(null);
    }
  };

  if (acceptedDuo) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
        <TopBar showBack onBack={goBack} onLogoClick={() => go('home')} />

        <div style={{ padding: '28px 16px 104px' }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: 'rgba(16,185,129,0.12)',
                border: '0.5px solid rgba(16,185,129,0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <UserCheck size={28} color={C.success} strokeWidth={2.3} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0, color: C.white, margin: '0 0 8px' }}>
              Duo is created!
            </h1>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.55, margin: 0 }}>
              You and {acceptedHomieName || 'your homie'} are now a duo.
            </p>
          </div>

          <DuoSuccessCard duo={acceptedDuo} />

          <div style={{ display: 'grid', gap: 10 }}>
            <PremiumButton fullWidth onClick={() => go('me')} style={{ gap: 8 }}>
              <Users size={16} strokeWidth={2.2} />
              View in My Duos
            </PremiumButton>
            <PremiumButton fullWidth variant="ghost" onClick={() => go('duo_room')} style={{ gap: 8 }}>
              <MessageCircle size={16} strokeWidth={2.2} />
              Open Duo Room
            </PremiumButton>
            <PremiumButton fullWidth variant="ghost" onClick={() => go('home')} style={{ gap: 8 }}>
              <Home size={16} strokeWidth={2.2} />
              Back Home
            </PremiumButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={goBack} onLogoClick={() => go('home')} />

      <div style={{ padding: '18px 16px 104px' }}>
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: C.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>
            Homie inbox
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 0, color: C.white, margin: '0 0 6px' }}>
            Requests waiting.
          </h1>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, margin: 0 }}>
            Accept incoming homie requests here and turn them into your 2-person duo.
          </p>
        </div>

        {successMessage && (
          <div
            style={{
              background: 'rgba(16,185,129,0.09)',
              border: '0.5px solid rgba(16,185,129,0.28)',
              borderRadius: 16,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: 0 }}>
              {successMessage}
            </p>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background: 'rgba(239,68,68,0.09)',
              border: '0.5px solid rgba(239,68,68,0.28)',
              borderRadius: 16,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 800, color: C.white, margin: '0 0 4px' }}>
              Could not accept request.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(245,245,248,0.72)', margin: 0, lineHeight: 1.45 }}>
              {errorMessage}
            </p>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <RequestSkeleton />
            <RequestSkeleton />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No homie requests yet."
            subtitle="When someone sends you a request, it will show up here."
            action={() => go('find_homie')}
            actionLabel="Find Homies"
          />
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                accepting={acceptingRequestId === request.id}
                accepted={!!acceptedIds[request.id]}
                onAccept={handleAccept}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
