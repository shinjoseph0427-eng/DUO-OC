// src/pages/SoloInboxPage.jsx
// 받은 Solo 요청 수락/거절 — HomieInboxPage 패턴 복제, 듀오 생성 없음.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Inbox, MapPin } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import {
  getMyReceivedSoloRequests,
  acceptSoloRequest,
  declineSoloRequest,
} from '../lib/solo.js';
import TopBar from '../components/TopBar.jsx';
import EmptyState from '../components/EmptyState.jsx';

function gradientFor(id = '') {
  const code = id ? id.charCodeAt(0) : 0;
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

// ── 요청 카드 ──────────────────────────────────────────────
function RequestCard({ req, onAccept, onDecline, busy }) {
  const u     = req.from_user;
  const photo = u?.photos?.[0] ?? null;
  const name  = u?.name || u?.username || '익명';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        background: C.cardElevated,
        borderRadius: 16,
        border: `0.5px solid ${C.border}`,
      }}
    >
      {/* 아바타 */}
      {photo ? (
        <img
          src={photo} alt={name}
          style={{ width: 52, height: 52, borderRadius: 26, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 52, height: 52, borderRadius: 26, flexShrink: 0,
          background: gradientFor(u?.id ?? ''),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>
            {name[0].toUpperCase()}
          </span>
        </div>
      )}

      {/* 이름 + 동네 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: 0, lineHeight: 1.3 }}>
          {name}
        </p>
        {u?.username && (
          <p style={{ fontSize: 12, color: C.muted, margin: '1px 0 0' }}>@{u.username}</p>
        )}
        {u?.city && (
          <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
            <MapPin size={10} strokeWidth={2} /> {u.city}
          </p>
        )}
      </div>

      {/* 수락 / 거절 */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => onDecline(req)}
          disabled={busy}
          aria-label="거절"
          style={{
            width: 40, height: 40, borderRadius: 20,
            border: `1.5px solid ${C.border}`,
            background: C.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <X size={16} color={C.muted} />
        </button>

        <button
          onClick={() => onAccept(req)}
          disabled={busy}
          aria-label="수락"
          style={{
            width: 40, height: 40, borderRadius: 20,
            border: 'none',
            background: C.gradientCTA,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <Check size={16} color="#fff" strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────
export default function SoloInboxPage({ currentUser, go, goBack, showToast }) {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    getMyReceivedSoloRequests()
      .then(setRequests)
      .catch(() => showToast?.('불러오기 실패', 'error'))
      .finally(() => setLoading(false));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async (req) => {
    if (busyId) return;
    setBusyId(req.id);
    try {
      const matchId = await acceptSoloRequest(req.id);
      setRequests(prev => prev.filter(r => r.id !== req.id));
      showToast?.('매칭됐어요! 채팅을 시작해보세요 🎉', 'success');
      // 채팅으로 바로 이동 — go() chat 슬롯에 match 객체
      go('solo_chat', null, null, { matchId, partner: req.from_user });
    } catch (e) {
      showToast?.(e?.message ?? '수락 실패', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (req) => {
    if (busyId) return;
    setBusyId(req.id);
    try {
      await declineSoloRequest(req.id);
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e) {
      showToast?.(e?.message ?? '거절 실패', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <TopBar showBack onBack={goBack ?? (() => go('solo_explore'))} onLogoClick={() => go('home')} />

      <div style={{ flex: 1, padding: '12px 16px 100px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, margin: '4px 0 14px' }}>
          받은 Solo 요청
        </h1>

        {/* 카운트 */}
        {!loading && requests.length > 0 && (
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px' }}>
            {requests.length}개의 요청이 있어요
          </p>
        )}

        {/* 로딩 스켈레톤 */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer" style={{ height: 80, borderRadius: 16, background: C.cardElevated }} />
            ))}
          </div>
        )}

        {/* 요청 목록 */}
        {!loading && requests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence mode="popLayout">
              {requests.map(req => (
                <RequestCard
                  key={req.id}
                  req={req}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  busy={busyId === req.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && requests.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="아직 받은 요청이 없어요"
            subtitle="Solo 탐색에서 먼저 다가가보세요"
            action={() => go('solo_explore')}
            actionLabel="탐색하기"
          />
        )}
      </div>
    </div>
  );
}
