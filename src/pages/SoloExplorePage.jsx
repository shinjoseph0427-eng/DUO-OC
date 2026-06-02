// src/pages/SoloExplorePage.jsx
// Solo 탐색 페이지 — is_solo=true 유저 카드 그리드 + 1:1 요청.
// 기존 ExplorePage 무변경, 패턴만 복제.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, UserCheck, Inbox, RefreshCw, Users } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import { findSoloUsers, sendSoloRequest, getMyReceivedSoloRequests } from '../lib/solo.js';
import TopBar from '../components/TopBar.jsx';
import EmptyState from '../components/EmptyState.jsx';

function gradientFor(id = '') {
  const code = id ? id.charCodeAt(0) : 0;
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

function fmtDist(km) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// ── 스켈레톤 ──────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="shimmer" style={{ borderRadius: 16, aspectRatio: '3/4', background: C.cardElevated }} />
  );
}

// ── 카드 ───────────────────────────────────────────────────
function SoloCard({ u, onRequest, requested }) {
  const photo   = u.photos?.[0] ?? null;
  const dist    = fmtDist(u.distanceKm);
  const initial = (u.name || u.username || '?')[0].toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18 }}
      style={{
        borderRadius: 16, overflow: 'hidden',
        background: C.cardElevated,
        border: `0.5px solid ${C.border}`,
        position: 'relative',
        aspectRatio: '3/4',
        cursor: 'pointer',
      }}
    >
      {/* 사진 or 이니셜 */}
      {photo ? (
        <img
          src={photo} alt={u.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          draggable={false}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: gradientFor(u.id),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 44, fontWeight: 800, color: 'rgba(255,255,255,0.25)' }}>
            {initial}
          </span>
        </div>
      )}

      {/* 하단 그래디언트 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.03) 30%, rgba(0,0,0,0.78) 100%)',
      }} />

      {/* 거리 배지 (우상단) */}
      {dist && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,0.52)',
          backdropFilter: 'blur(6px)',
          borderRadius: 9999, padding: '3px 8px',
          fontSize: 10, fontWeight: 600, color: '#fff',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <MapPin size={9} strokeWidth={2} /> {dist}
        </div>
      )}

      {/* Solo 뱃지 (좌상단) */}
      <div style={{
        position: 'absolute', top: 8, left: 8,
        background: 'rgba(255,107,0,0.15)',
        border: '0.5px solid rgba(255,107,0,0.35)',
        borderRadius: 9999, padding: '3px 8px',
        fontSize: 10, fontWeight: 700, color: C.amber,
      }}>
        Solo
      </div>

      {/* 하단 정보 + 버튼 */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 10px 12px' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', margin: '0 0 1px', lineHeight: 1.2 }}>
          {u.name || u.username || '익명'}
        </p>
        {u.username && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 7px' }}>
            @{u.username}
          </p>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onRequest(u.id); }}
          disabled={requested}
          style={{
            width: '100%', padding: '8px 0',
            borderRadius: 10, border: 'none',
            background: requested ? 'rgba(255,255,255,0.25)' : C.gradientCTA,
            color: '#fff',
            fontSize: 12, fontWeight: 700,
            cursor: requested ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'opacity 0.15s',
          }}
        >
          {requested ? (<><UserCheck size={13} /> 요청됨</>) : '1:1 요청'}
        </button>
      </div>
    </motion.div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────
export default function SoloExplorePage({ currentUser, profile, go, showToast }) {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requested,  setRequested]  = useState(new Set()); // 이미 요청 보낸 user_id
  const [inboxCount, setInboxCount] = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [soloUsers, received] = await Promise.all([
        findSoloUsers(
          { id: currentUser.id, lat: profile?.lat, lng: profile?.lng },
          { maxDistanceKm: 80, limit: 40 }
        ),
        getMyReceivedSoloRequests(),
      ]);
      setUsers(soloUsers);
      setInboxCount(received.length);
    } catch (e) {
      showToast?.('불러오기 실패', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, profile?.lat, profile?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleRequest = async (toUserId) => {
    if (requested.has(toUserId)) return;
    setRequested(prev => new Set([...prev, toUserId]));
    try {
      await sendSoloRequest(toUserId);
      showToast?.('1:1 요청을 보냈어요 👋', 'success');
    } catch (e) {
      setRequested(prev => { const s = new Set(prev); s.delete(toUserId); return s; });
      showToast?.(e?.message ?? '요청 실패', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <TopBar
        showBack
        onBack={() => go('home')}
        onLogoClick={() => go('home')}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* 받은 요청 뱃지 */}
            <button
              onClick={() => go('solo_inbox')}
              aria-label="받은 요청"
              style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Inbox size={20} color={C.text} />
              {inboxCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  background: C.amber, color: '#fff',
                  borderRadius: 9999, fontSize: 9, fontWeight: 700,
                  minWidth: 15, height: 15, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', border: '1.5px solid #fff',
                }}>
                  {inboxCount > 9 ? '9+' : inboxCount}
                </span>
              )}
            </button>
            {/* 새로고침 */}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              aria-label="새로고침"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <motion.div animate={{ rotate: refreshing ? 360 : 0 }} transition={{ duration: 0.6, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
                <RefreshCw size={18} color={C.muted} />
              </motion.div>
            </button>
          </div>
        }
      />

      {/* 본문 */}
      <div style={{ flex: 1, padding: '12px 16px 100px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, margin: '4px 0 12px' }}>
          Solo 탐색
        </h1>

        {/* 안내 문구 */}
        {!loading && users.length > 0 && (
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px' }}>
            근처에서 1:1을 원하는 {users.length}명
          </p>
        )}

        {/* 로딩 스켈레톤 */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* 카드 그리드 */}
        {!loading && users.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            <AnimatePresence>
              {users.map(u => (
                <SoloCard
                  key={u.id}
                  u={u}
                  onRequest={handleRequest}
                  requested={requested.has(u.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && users.length === 0 && (
          <EmptyState
            icon={Users}
            title="아직 근처에 없어요"
            subtitle="프로필에서 'Solo로도 보이기'를 켜면 나도 탐색에 노출돼요"
            action={() => go('edit_profile')}
            actionLabel="프로필 설정"
          />
        )}
      </div>
    </div>
  );
}
