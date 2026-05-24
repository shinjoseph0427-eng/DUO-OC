import { useState, useEffect } from 'react';
import { Inbox } from 'lucide-react';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import HomieCard from '../components/HomieCard.jsx';
import { findHomies } from '../lib/homie.js';
import { getMyProfile } from '../lib/profile.js';

const FILTER_CHIPS = ['Same city', '+/-3 age', 'Solo profiles'];

function HomieSkeleton() {
  return (
    <div
      className="shimmer"
      style={{
        height: 260,
        borderRadius: 16,
        background: C.cardElevated,
      }}
    />
  );
}

export default function FindHomie({ currentUser, go }) {
  const [homies, setHomies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser) return () => { cancelled = true; };

    setLoading(true);
    getMyProfile(currentUser.id)
      .then((profile) => findHomies(currentUser, profile || {}))
      .then((results) => {
        if (cancelled) return;
        setHomies(results);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentUser]);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar
        showBack
        onBack={() => go('home')}
        onLogoClick={() => go('home')}
        rightContent={
          <button
            type="button"
            aria-label="Homie inbox"
            onClick={() => go('homie_inbox')}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Inbox size={17} color={C.muted} strokeWidth={2} />
          </button>
        }
      />

      <div style={{ paddingBottom: 40 }}>
        <div
          style={{
            background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: 16,
            padding: 16,
            margin: 16,
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 6px' }}>
            Find a homie to create a duo
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
            A duo starts with two people. Find a homie, then set up your duo profile together.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 20, flexWrap: 'wrap' }}>
          {FILTER_CHIPS.map((chip) => (
            <span
              key={chip}
              style={{
                fontSize: 12,
                color: C.amber,
                border: '0.5px solid rgba(245,158,11,0.3)',
                borderRadius: 9999,
                padding: '4px 12px',
                fontWeight: 600,
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        <div style={{ padding: '0 16px' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <HomieSkeleton />
              <HomieSkeleton />
              <HomieSkeleton />
              <HomieSkeleton />
            </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {homies.map((homie) => (
                <HomieCard
                  key={homie.id}
                  homie={homie}
                  go={go}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
