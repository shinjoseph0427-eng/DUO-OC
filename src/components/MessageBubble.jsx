import { motion } from 'framer-motion';
import { C } from '../tokens';
import { messageVariants } from '../lib/motion';

function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function MessageBubble({ msg, isMine, senderLabel }) {
  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
      }}
    >
      <p style={{ fontSize: 10.5, color: C.muted, margin: '0 4px 4px', fontWeight: 700 }}>
        {senderLabel}
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMine ? 'row-reverse' : 'row' }}>
        <div
          style={{
            maxWidth: '78%',
            padding: '10px 14px',
            fontSize: 14,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            ...(isMine
              ? {
                  background: C.gradientCTA,
                  color: C.cream,
                  borderRadius: '18px 18px 5px 18px',
                  fontWeight: 650,
                }
              : {
                  background: C.cardElevated,
                  color: C.text,
                  border: `0.5px solid ${C.border}`,
                  borderRadius: '18px 18px 18px 5px',
                }),
          }}
        >
          {msg.content}
        </div>
        <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, paddingBottom: 2 }}>
          {formatMsgTime(msg.created_at)}
        </span>
      </div>
    </motion.div>
  );
}
