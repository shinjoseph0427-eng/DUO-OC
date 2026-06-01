import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { C } from '../tokens.js';

// 9:16 dark "viral" DUO CARD with image export (Instagram story) + link share,
// shown as a slide-up bottom sheet from the DUO CARD on the ME tab.
const MEMBER_BG = ['#FF6B00', '#534AB7'];

function memberName(m) {
  return m?.profiles?.name ?? m?.name ?? 'Member';
}

export default function DuoShareSheet({ duo, onClose, showToast }) {
  const cardRef = useRef(null);
  const [saving, setSaving] = useState(false);

  if (!duo) return null;

  const members  = (duo.duo_members ?? []).slice(0, 2);
  const names    = members.map(memberName);
  const photo    = (duo.duo_photos ?? []).find(Boolean) ?? null;
  const vibes    = (duo.vibes ?? []).filter(Boolean).slice(0, 3);
  const school   = members.map((m) => m?.profiles?.school).find(Boolean) ?? null;
  const city     = duo.city ?? members.map((m) => m?.profiles?.city).find(Boolean) ?? null;
  const subtitle = [school || city, 'looking to hang'].filter(Boolean).join(' · ');
  const shareUrl = `${window.location.origin}/duo/${duo.id}`;

  const handleSaveImage = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#0d0d0d',
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('이미지를 만들지 못했어');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'duo-oc-card.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast?.('이미지가 저장됐어! 인스타 스토리에 올려봐 🔥', 'success');
    } catch (e) {
      console.error('card export failed:', e);
      showToast?.('이미지 저장에 실패했어. 다시 시도해줘.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleShareLink = async () => {
    const shareData = { title: 'Duo OC', text: '우리 Duo OC 카드 봐봐 👀', url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast?.('링크 복사됨', 'success');
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl).catch(() => {});
        showToast?.('링크 복사됨', 'success');
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="share-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position:       'fixed',
          inset:          0,
          background:     'rgba(0,0,0,0.6)',
          zIndex:         1150,
          display:        'flex',
          alignItems:     'flex-end',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ y: 400 }}
          animate={{ y: 0 }}
          exit={{ y: 400 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background:   C.bg,
            borderRadius: '24px 24px 0 0',
            padding:      '12px 20px 28px',
            width:        '100%',
            maxWidth:     480,
            maxHeight:    '92vh',
            overflowY:    'auto',
            boxSizing:    'border-box',
            position:     'relative',
          }}
        >
          {/* Handle bar */}
          <div style={{ width: 38, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 8px' }} />

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 14, right: 16,
              width: 30, height: 30, borderRadius: '50%',
              border: 'none', background: C.cardDeep, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
            }}
          >
            <X size={16} color={C.muted} strokeWidth={2.2} />
          </button>

          <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.5px', color: C.muted, textTransform: 'uppercase', margin: '6px 0 14px' }}>
            카드 공유
          </p>

          {/* ── Section 1: 9:16 capture target ── */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <div
              ref={cardRef}
              style={{
                position:      'relative',
                width:         '100%',
                maxWidth:      300,
                aspectRatio:   '9 / 16',
                background:    '#0d0d0d',
                borderRadius:  20,
                overflow:      'hidden',
                display:       'flex',
                flexDirection: 'column',
                fontFamily:    "'Inter', system-ui, sans-serif",
              }}
            >
              {/* top bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 0', zIndex: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.5px', color: '#FF6B00' }}>
                  DUO OC
                </span>
                {city && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
                    {city}
                  </span>
                )}
              </div>

              {/* photo / avatars (fills middle) */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {photo ? (
                  <img
                    src={photo}
                    alt={duo.name}
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: 16 }}>
                    {(names.length ? names : ['?', '?']).slice(0, 2).map((n, i) => (
                      <div key={i} style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: MEMBER_BG[i % MEMBER_BG.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 26, fontWeight: 900, color: '#fff',
                      }}>
                        {n?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* bottom gradient + text overlay */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                padding: '60px 18px 16px',
                background: 'linear-gradient(180deg, rgba(13,13,13,0) 0%, rgba(13,13,13,0.92) 60%)',
                zIndex: 2,
              }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 5px', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                  {names.length >= 2 ? (
                    <>{names[0]} <span style={{ color: '#FF6B00' }}>&amp;</span> {names[1]}</>
                  ) : (
                    duo.name
                  )}
                </p>
                {subtitle && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>
                    {subtitle}
                  </p>
                )}
                {vibes.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                    {vibes.map((v) => (
                      <span key={v} style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.7)',
                        borderRadius: 9999, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                      }}>
                        {v}
                      </span>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center', letterSpacing: '0.5px' }}>
                  duo-oc.com
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 2: actions ── */}
          <button
            type="button"
            onClick={handleSaveImage}
            disabled={saving}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
              background: C.gradientCTA, color: '#fff', fontSize: 16, fontWeight: 800,
              cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.75 : 1,
              boxShadow: '0 10px 26px rgba(255,107,0,0.3)',
            }}
          >
            {saving ? '저장 중…' : '이미지 저장하기'}
          </button>

          <button
            type="button"
            onClick={handleShareLink}
            style={{
              width: '100%', marginTop: 10, padding: '14px 0', borderRadius: 14,
              border: `0.5px solid ${C.border}`, background: 'transparent',
              color: C.white, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            링크도 공유하기
          </button>

          <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
            저장한 이미지를 인스타 스토리에 올리고 @duo_oc 태그해봐
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
