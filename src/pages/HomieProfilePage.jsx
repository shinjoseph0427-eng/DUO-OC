import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AtSign, ChevronLeft, MapPin } from 'lucide-react';
import { C, F } from '../tokens';
import InitialsAvatar from '../components/InitialsAvatar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { getSentHomieRequests, sendHomieRequest } from '../lib/homie.js';

function PromptBlock({ question, answer }) {
  if (!answer) return null;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: `0.5px solid ${C.border}`,
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      {question && (
        <p
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.amber,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            margin: '0 0 7px',
          }}
        >
          {question}
        </p>
      )}
      <p style={{ fontSize: 15, fontWeight: 700, color: C.white, lineHeight: 1.45, margin: 0 }}>
        {answer}
      </p>
    </div>
  );
}

export default function HomieProfilePage({ homie, currentUser, go }) {
  const [requestStatus, setRequestStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [sending, setSending] = useState(false);

  const photo = homie?.photos?.[0] ?? homie?.avatar_url ?? null;
  const name = homie?.name ?? 'Anonymous';
  const details = useMemo(() => [homie?.age, homie?.city].filter(Boolean).join(' · '), [homie]);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id || !homie?.id) {
      setLoadingStatus(false);
      return () => { cancelled = true; };
    }

    setLoadingStatus(true);
    getSentHomieRequests(currentUser.id)
      .then((requests) => {
        if (cancelled) return;
        const existing = requests.find((request) => request.to_user_id === homie.id);
        setRequestStatus(existing?.status ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false);
      });

    return () => { cancelled = true; };
  }, [currentUser?.id, homie?.id]);

  const handleSend = async () => {
    if (!currentUser?.id || !homie?.id || sending || requestStatus) return;
    setSending(true);
    try {
      await sendHomieRequest(currentUser.id, homie.id);
      setRequestStatus('pending');
    } catch {
      setRequestStatus(null);
    } finally {
      setSending(false);
    }
  };

  if (!homie) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, padding: '72px 16px 0' }}>
        <PremiumButton fullWidth onClick={() => go('find_homie')}>Back to Find Homie</PremiumButton>
      </div>
    );
  }

  const buttonCopy = requestStatus === 'accepted'
    ? 'Already Homies'
    : requestStatus === 'pending'
      ? 'Request Sent'
      : 'Send Homie Request';

  const buttonDisabled = loadingStatus || sending || !!requestStatus;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <div style={{ position: 'relative', height: '48vh', minHeight: 310, background: C.cardDeep }}>
        {photo ? (
          <img
            src={photo}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <InitialsAvatar name={name} size={128} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.28), transparent 38%, rgba(0,0,0,0.78))' }} />

        <motion.button
          type="button"
          aria-label="Back"
          onClick={() => go('find_homie')}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            width: 38,
            height: 38,
            borderRadius: 11,
            background: 'rgba(0,0,0,0.45)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} color="#fff" strokeWidth={2.2} />
        </motion.button>

        <motion.button
          type="button"
          aria-label="Home"
          onClick={() => go('home')}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.1 }}
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.35)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            padding: '6px 14px',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800 }}>
            <span className="gradient-text">duo oc.</span>
          </span>
        </motion.button>

        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
          <p style={{ ...F.h1, letterSpacing: 0, color: '#fff', margin: '0 0 6px', textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>
            {name}{homie.age ? <span style={{ fontWeight: 500, fontSize: 23, marginLeft: 8 }}>{homie.age}</span> : null}
          </p>
          {details && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
              {homie.city && <MapPin size={12} strokeWidth={2} />}
              {details}
            </p>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 16px 104px' }}>
        {homie.instagram && (
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <AtSign size={14} strokeWidth={2} />
            @{homie.instagram}
          </p>
        )}

        {homie.bio && (
          <p style={{ fontSize: 15, color: 'rgba(245,245,248,0.84)', lineHeight: 1.7, margin: '0 0 16px' }}>
            {homie.bio}
          </p>
        )}

        <div style={{ display: 'grid', gap: 12, marginBottom: 22 }}>
          <PromptBlock question={homie.prompt_q1} answer={homie.prompt_a1} />
          <PromptBlock question={homie.prompt_q2} answer={homie.prompt_a2} />
        </div>

        <PremiumButton
          fullWidth
          onClick={handleSend}
          disabled={buttonDisabled}
          loading={sending || loadingStatus}
          variant={requestStatus ? 'ghost' : 'primary'}
        >
          {buttonCopy}
        </PremiumButton>
      </div>
    </div>
  );
}
