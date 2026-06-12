// Transient, top-of-screen card shown to a recipient the moment a solo request
// arrives (via the realtime notifications subscription in App.jsx). Tap the body
// to view the sender in the inbox; Accept/Decline act immediately. Auto-dismiss
// is handled by the parent.

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import InitialsAvatar from './InitialsAvatar.jsx';

const ORANGE = '#FF8C00';

export default function IncomingRequestCard({ notif, onView, onAccept, onDecline }) {
  const name = notif?.payload?.sender_name || 'Someone';

  return (
    <motion.div
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -90, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        position: 'fixed',
        top: 'calc(10px + env(safe-area-inset-top))',
        left: '50%',
        x: '-50%',
        width: 'min(420px, calc(100% - 24px))',
        zIndex: 1000,
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 14px 44px rgba(0,0,0,0.24)',
        border: '0.5px solid #ededed',
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <button
        type="button"
        onClick={onView}
        style={{
          flex: 1, minWidth: 0,
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <InitialsAvatar name={name} size={44} />
        <div style={{ minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a1a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#888' }}>
            wants to hang out this week →
          </p>
        </div>
      </button>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <motion.button
          type="button"
          aria-label="Decline"
          onClick={onDecline}
          whileTap={{ scale: 0.88 }}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#fff', border: '1px solid #eee',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={18} color="#999" strokeWidth={2.6} />
        </motion.button>
        <motion.button
          type="button"
          aria-label="Accept"
          onClick={onAccept}
          whileTap={{ scale: 0.88 }}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: ORANGE, border: 'none',
            boxShadow: '0 6px 16px rgba(255,140,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Check size={18} color="#fff" strokeWidth={2.8} />
        </motion.button>
      </div>
    </motion.div>
  );
}
