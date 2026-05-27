import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Inbox, MapPin } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import InitialsAvatar from '../components/InitialsAvatar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { acceptHomieRequest, getMyHomieRequests, getSentHomieRequests } from '../lib/homie.js';

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
        border: `0.5px solid ${accepted ? C.greenBorder : C.border}`,
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
  const [showBanner, setShowBanner] = useState(false);
  const [acceptingRequestId, setAcceptingRequestId] = useState(null);
  const [acceptedIds, setAcceptedIds] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');
  const [sentRequests, setSentRequests] = useState([]);
  const [sentLoading, setSentLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id) return () => { cancelled = true; };

    setSentLoading(true);
    getSentHomieRequests(currentUser.id).then((nextRequests) => {
      if (!cancelled) setSentRequests(nextRequests);
    }).finally(() => {
      if (!cancelled) setSentLoading(false);
    });

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const handleAccept = async (request) => {
    if (!request?.id || acceptingRequestId) return;

    setAcceptingRequestId(request.id);
    setErrorMessage('');
    try {
      await acceptHomieRequest(request.id);
      setAcceptedIds((prev) => ({ ...prev, [request.id]: true }));
      try {
        await onDuoChanged?.();
      } catch (refreshError) {
        console.error('HomieInboxPage onDuoChanged refresh failed:', refreshError);
      }
      setShowBanner(true);
      setTimeout(() => go('explore'), 2500);
      await loadRequests();
    } catch (err) {
      console.error('HomieInboxPage accept homie request failed:', err);
      setErrorMessage(err?.message ?? 'Failed to accept Homie request. Please try again.');
    } finally {
      setAcceptingRequestId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={goBack} onLogoClick={() => go('home')} />

      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 999,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          Duo created — now find someone to hang with
        </motion.div>
      )}

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

        <div style={{
          display: 'flex',
          gap: 0,
          margin: '0 16px 16px',
          border: `0.5px solid ${C.border}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {['received', 'sent'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                background: activeTab === tab ? C.amber : 'transparent',
                color: activeTab === tab ? C.cream : C.muted,
                fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {tab === 'received' ? 'Received' : 'Sent'}
            </button>
          ))}
        </div>

        {activeTab === 'received' && errorMessage && (
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

        {activeTab === 'received' && (loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <RequestSkeleton />
            <RequestSkeleton />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No requests yet."
            subtitle="When someone sends you a request, it will show up here."
            action={() => go('find_homie')}
            actionLabel="Find a homie"
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
        ))}

        {activeTab === 'sent' && (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sentLoading && (
              <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 24 }}>
                Loading...
              </div>
            )}
            {!sentLoading && sentRequests.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: C.muted,
                fontSize: 13,
              }}>
                No sent requests yet.
              </div>
            )}
            {!sentLoading && sentRequests.map((req) => {
              const name = req.to_profile?.name ?? req.profiles?.name ?? 'Someone';
              const city = req.to_profile?.city ?? req.profiles?.city ?? '';
              const accepted = req.status === 'accepted';

              return (
                <div key={req.id ?? req.to_user_id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: `0.5px solid ${C.border}`,
                  background: C.bg2,
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: C.amberT08,
                    border: `1px solid ${C.brownBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.amber,
                    flexShrink: 0,
                  }}>
                    {name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.white,
                    }}>
                      {name}
                    </div>
                    {city && (
                      <div style={{
                        fontSize: 11,
                        color: C.muted,
                        marginTop: 1,
                      }}>
                        {city}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: accepted ? C.success : C.amber,
                    fontWeight: 500,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: accepted ? C.greenT08 : C.amberT08,
                    border: `0.5px solid ${accepted ? C.greenBorder : C.brownBorder}`,
                  }}>
                    {accepted ? 'Accepted' : 'Pending'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
