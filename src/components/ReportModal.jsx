import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert } from 'lucide-react';
import { C } from '../tokens';
import { reportDuo, blockDuo, SAFETY_MESSAGES } from '../lib/safety.js';

const REASONS = [
  { key: 'inappropriate_photos', label: 'Inappropriate photos',   emoji: '📸' },
  { key: 'harassment',           label: 'Harassment',             emoji: '😤' },
  { key: 'fake_profile',         label: 'Fake profile',           emoji: '🤖' },
  { key: 'spam',                 label: 'Spam',                   emoji: '📢' },
  { key: 'underage',             label: 'Underage',               emoji: '🔞' },
  { key: 'other',                label: 'Other',                  emoji: '✏️' },
];

export default function ReportModal({
  reporterUserId,
  reportedDuoId,
  reportedDuoName,
  blockerDuoId,
  onClose,
  onBlocked,
  showToast,
}) {
  const [reason,       setReason]       = useState('');
  const [detail,       setDetail]       = useState('');
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [blocking,     setBlocking]     = useState(false);
  const [reporting,    setReporting]    = useState(false);

  const handleBlock = async () => {
    if (!blockConfirm) { setBlockConfirm(true); return; }
    if (!blockerDuoId || !reportedDuoId) return;
    setBlocking(true);
    try {
      await blockDuo({ blockerDuoId, blockedDuoId: reportedDuoId });
      showToast?.('Duo blocked', 'success');
      onBlocked?.(reportedDuoId);
      onClose();
    } catch {
      showToast?.('Failed to block', 'error');
    } finally {
      setBlocking(false);
    }
  };

  const handleReport = async () => {
    if (!reason) { showToast?.('Select a reason', 'error'); return; }
    setReporting(true);
    try {
      await reportDuo({ reporterUserId, reportedDuoId, reason, detail: detail.trim() || null });
      showToast?.('Report submitted.', 'success');
      onClose();
    } catch (err) {
      showToast?.(err?.message === SAFETY_MESSAGES.duplicateReport ? SAFETY_MESSAGES.duplicateReport : 'Failed to submit report', 'error');
    } finally {
      setReporting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.65)' }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        style={{
          position:     'fixed',
          bottom:       0,
          left:         0,
          right:        0,
          zIndex:       301,
          background:   C.cardElevated,
          borderRadius: '20px 20px 0 0',
          border:       '0.5px solid rgba(255,255,255,0.08)',
          padding:      '0 16px 40px',
          maxHeight:    '88vh',
          overflowY:    'auto',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color={C.amber} strokeWidth={2} />
            <p style={{ fontSize: 16, fontWeight: 800, color: C.white, margin: 0 }}>Report or Block</p>
          </div>
          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.9 }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} color={C.muted} />
          </motion.button>
        </div>

        {/* ── Block section ── */}
        <div
          style={{
            background:   'rgba(239,68,68,0.06)',
            border:       '0.5px solid rgba(239,68,68,0.2)',
            borderRadius: 14,
            padding:      '14px 16px',
            marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 700, color: C.white, margin: '0 0 4px' }}>
            Block this duo
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
            They won't appear in your feed and can't contact you.
          </p>

          <AnimatePresence mode="wait">
            {!blockConfirm ? (
              <motion.button
                key="block-btn"
                type="button"
                onClick={handleBlock}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  width:        '100%',
                  padding:      '11px 0',
                  borderRadius: 12,
                  border:       '0.5px solid rgba(239,68,68,0.35)',
                  background:   'rgba(239,68,68,0.1)',
                  color:        '#EF4444',
                  fontSize:     14,
                  fontWeight:   700,
                  cursor:       'pointer',
                }}
              >
                Block {reportedDuoName ? `"${reportedDuoName}"` : 'this duo'}
              </motion.button>
            ) : (
              <motion.div
                key="block-confirm"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <p style={{ fontSize: 13, color: C.white, fontWeight: 600, margin: 0, textAlign: 'center' }}>
                  Are you sure?
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button
                    type="button"
                    onClick={() => setBlockConfirm(false)}
                    whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `0.5px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleBlock}
                    disabled={blocking}
                    whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#EF4444', color: C.cream, fontSize: 13, fontWeight: 700, cursor: blocking ? 'default' : 'pointer' }}
                  >
                    {blocking ? 'Blocking…' : 'Yes, block'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Report section ── */}
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.9px', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Report
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {REASONS.map((r) => (
            <motion.button
              key={r.key}
              type="button"
              onClick={() => { setReason(r.key); if (r.key !== 'other') setDetail(''); }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.08 }}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          12,
                padding:      '12px 14px',
                borderRadius: 12,
                border:       `0.5px solid ${reason === r.key ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.07)'}`,
                background:   reason === r.key ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                cursor:       'pointer',
                textAlign:    'left',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{r.emoji}</span>
              <span
                style={{
                  fontSize:   14,
                  fontWeight: reason === r.key ? 600 : 400,
                  color:      reason === r.key ? C.white : C.muted,
                  flex:       1,
                }}
              >
                {r.label}
              </span>
              {reason === r.key && (
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: C.cream, fontWeight: 800 }}>✓</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Other detail input */}
        <AnimatePresence>
          {reason === 'other' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 16 }}
            >
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value.slice(0, 300))}
                placeholder="Describe the issue…"
                rows={3}
                style={{
                  width:        '100%',
                  background:   C.cardDeep,
                  border:       '0.5px solid rgba(255,255,255,0.09)',
                  borderRadius: 12,
                  padding:      '12px 14px',
                  fontSize:     14,
                  color:        C.white,
                  outline:      'none',
                  resize:       'none',
                  boxSizing:    'border-box',
                  lineHeight:   1.5,
                }}
              />
              <p style={{ fontSize: 11, color: C.muted, textAlign: 'right', margin: '4px 0 0' }}>
                {detail.length}/300
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={handleReport}
          disabled={reporting || !reason}
          whileTap={reason ? { scale: 0.97 } : {}}
          transition={{ duration: 0.1 }}
          style={{
            width:        '100%',
            height:       50,
            borderRadius: 14,
            border:       'none',
            background:   reason ? C.gradientCTA : 'rgba(255,255,255,0.06)',
            color:        reason ? '#fff' : C.muted,
            fontSize:     15,
            fontWeight:   700,
            cursor:       reason && !reporting ? 'pointer' : 'default',
            transition:   'background 0.2s',
          }}
        >
          {reporting ? 'Submitting…' : 'Submit Report'}
        </motion.button>
      </motion.div>
    </>
  );
}
