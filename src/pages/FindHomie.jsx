import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import InitialsAvatar from '../components/InitialsAvatar.jsx';
import { findHomies, sendHomieRequest } from '../lib/homie.js';
import { getMyProfile } from '../lib/profile.js';

const FILTER_CHIPS = ['Same city', '±3 age', 'Same gender'];

function HomieCard({ homie, currentUser, sent, onSend }) {
  return (
    <div
      className="card-glow"
      style={{
        background:   'linear-gradient(145deg, #1C1C22, #151519)',
        border:       '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20,
        padding:      20,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <InitialsAvatar name={homie.name ?? 'User'} size={56} />
        <div>
          <p style={{ fontSize: 18, fontWeight: 800, color: C.white, margin: 0, marginBottom: 3 }}>
            {homie.name ?? 'Anonymous'}
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            {[homie.age, homie.city].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {homie.instagram && (
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          @{homie.instagram}
        </p>
      )}

      {sent ? (
        <div
          style={{
            width:        '100%',
            height:       48,
            borderRadius: 14,
            border:       '0.5px solid rgba(255,255,255,0.1)',
            background:   'transparent',
            color:        C.muted,
            fontSize:     14,
            fontWeight:   700,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
          }}
        >
          Request Sent ✓
        </div>
      ) : (
        <motion.button
          type="button"
          onClick={onSend}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
          style={{
            width:        '100%',
            height:       48,
            borderRadius: 14,
            border:       'none',
            background:   C.gradientCTA,
            color:        '#0A0A0F',
            fontSize:     14,
            fontWeight:   700,
            cursor:       'pointer',
            boxShadow:    '0 4px 16px rgba(245,158,11,0.2)',
          }}
        >
          Add as Homie →
        </motion.button>
      )}
    </div>
  );
}

export default function FindHomie({ currentUser, go, goBack }) {
  const [homies, setHomies]           = useState([]);
  const [myProfile, setMyProfile]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [sentRequests, setSentRequests] = useState({});

  useEffect(() => {
    if (!currentUser) return;
    getMyProfile(currentUser.id)
      .then((profile) => {
        setMyProfile(profile);
        return findHomies(currentUser, profile || {});
      })
      .then((results) => {
        setHomies(results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentUser]);

  const handleSend = async (homieId) => {
    setSentRequests((prev) => ({ ...prev, [homieId]: true }));
    try {
      await sendHomieRequest(currentUser.id, homieId);
    } catch {
      setSentRequests((prev) => ({ ...prev, [homieId]: false }));
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={goBack} title="Find a Homie" />

      <div style={{ paddingBottom: 40 }}>
        {/* Banner */}
        <div
          style={{
            background:   'rgba(245,158,11,0.07)',
            border:       '1px solid rgba(245,158,11,0.15)',
            borderRadius: 16,
            padding:      16,
            margin:       16,
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 6px' }}>
            Find your Homie 🤝
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
            No duo? No problem. Find someone with the same vibe to roll with.
          </p>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 20, flexWrap: 'wrap' }}>
          {FILTER_CHIPS.map((chip) => (
            <span
              key={chip}
              style={{
                fontSize:     12,
                color:        C.amber,
                border:       '0.5px solid rgba(245,158,11,0.3)',
                borderRadius: 9999,
                padding:      '4px 12px',
                fontWeight:   600,
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '0 16px' }}>
          {loading ? (
            <p style={{ fontSize: 14, color: C.muted, textAlign: 'center', padding: '40px 0' }}>
              Finding homies...
            </p>
          ) : homies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 14, color: C.muted, margin: '0 0 8px' }}>
                No homies found in your area yet.
              </p>
              <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
                Be the first to invite friends and grow the OC community.
              </p>
            </div>
          ) : (
            homies.map((homie) => (
              <HomieCard
                key={homie.id}
                homie={homie}
                currentUser={currentUser}
                sent={!!sentRequests[homie.id]}
                onSend={() => handleSend(homie.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
