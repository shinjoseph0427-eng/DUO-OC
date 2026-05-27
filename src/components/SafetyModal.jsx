import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C } from '../tokens.js';
import { getBlockedDuoIds, unblockDuo } from '../lib/safety.js';
import { supabase } from '../lib/supabaseClient.js';

export default function SafetyModal({ myDuo, onClose }) {
  const [blockedDuos, setBlockedDuos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!myDuo?.id) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    getBlockedDuoIds(myDuo.id)
      .then(async (ids) => {
        if (!ids?.length || cancelled) return;
        const { data } = await supabase
          .from('duos')
          .select('id, name, city')
          .in('id', ids);
        if (!cancelled) setBlockedDuos(data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [myDuo?.id]);

  async function handleUnblock(blockedDuoId) {
    setUnblocking(blockedDuoId);
    try {
      await unblockDuo({
        blockerDuoId: myDuo.id,
        blockedDuoId,
      });
      setBlockedDuos((prev) => prev.filter((duo) => duo.id !== blockedDuoId));
    } catch (error) {
      console.error('SafetyModal unblock failed:', error);
    } finally {
      setUnblocking(null);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={(event) => event.stopPropagation()}
          style={{
            background: C.bg,
            borderRadius: '20px 20px 0 0',
            width: '100%',
            maxWidth: 448,
            maxHeight: '70vh',
            overflow: 'auto',
            paddingBottom: 32,
          }}
        >
          <div style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: C.border,
            margin: '12px auto 0',
          }} />

          <div style={{
            padding: '16px 20px 12px',
            borderBottom: `0.5px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>
              Safety
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              Duos you've blocked
            </div>
          </div>

          <div style={{ padding: '12px 16px' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: 32, color: C.muted, fontSize: 13 }}>
                Loading...
              </div>
            )}

            {!loading && blockedDuos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: C.muted, fontSize: 13 }}>
                No blocked duos.
              </div>
            )}

            {!loading && blockedDuos.map((duo) => (
              <div key={duo.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                border: `0.5px solid ${C.border}`,
                background: C.bg2,
                marginBottom: 8,
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: C.cardElevated,
                  border: `0.5px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.muted,
                  flexShrink: 0,
                }}>
                  {duo.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>
                    {duo.name}
                  </div>
                  {duo.city && (
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {duo.city}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleUnblock(duo.id)}
                  disabled={unblocking === duo.id}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `0.5px solid ${C.border}`,
                    background: 'transparent',
                    fontSize: 12,
                    color: C.muted,
                    cursor: 'pointer',
                    opacity: unblocking === duo.id ? 0.5 : 1,
                  }}
                >
                  {unblocking === duo.id ? '...' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
