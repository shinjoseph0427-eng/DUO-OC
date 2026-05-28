import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { C } from '../tokens';
import DuoPhotoSplit from './DuoPhotoSplit.jsx';

const DATE_SHORT = {
  today:     'Today',
  tomorrow:  'Tomorrow',
  friday:    'This Fri',
  saturday:  'Sat',
  sunday:    'This Sun',
  next_week: 'Next week',
};

const TIME_SHORT = {
  morning:   'Morning',
  afternoon: 'Afternoon',
  evening:   'Evening',
  night:     'Night',
};

function duoNames(duo) {
  const names = (duo?.duo_members ?? [])
    .map((m) => m?.profiles?.name)
    .filter(Boolean)
    .slice(0, 2);
  return names.length ? names.join(' & ') : (duo?.name ?? 'A duo');
}

function metaFor(item) {
  return [
    item?.vibe,
    DATE_SHORT[item?.date] ?? item?.date,
    TIME_SHORT[item?.time_slot] ?? item?.time_slot,
  ].filter(Boolean).join(' - ');
}

export default function HangoutRequestCard({
  duo,
  item,
  statusLabel = 'Pending',
  statusColor = C.amber,
  title,
  message,
  busy = false,
  children,
}) {
  const location = item?.place || duo?.city || 'Orange County';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{
        background:    C.cardElevated,
        border:        `0.5px solid ${C.border}`,
        borderRadius:  16,
        overflow:      'hidden',
        marginBottom:  10,
        opacity:       busy ? 0.72 : 1,
        boxShadow:     '0 6px 18px rgba(17,17,17,0.045)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr', minHeight: 118 }}>
        <div style={{ position: 'relative', minHeight: 118 }}>
          <DuoPhotoSplit duo={duo} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }} />
        </div>
        <div style={{ padding: 12, minWidth: 0 }}>
          <span
            style={{
              display:      'inline-block',
              background:   'rgba(255,107,0,0.10)',
              color:        statusColor,
              borderRadius: 9999,
              padding:      '4px 10px',
              fontSize:     10,
              fontWeight:   900,
              marginBottom: 8,
            }}
          >
            {statusLabel}
          </span>
          <p style={{ fontSize: 14, fontWeight: 900, color: C.text, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title ?? duoNames(duo)}
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted, margin: '0 0 6px' }}>
            <MapPin size={11} strokeWidth={2.2} />
            {location}
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.35 }}>
            {metaFor(item)}
          </p>
        </div>
      </div>

      <div style={{ padding: '0 12px 12px' }}>
        {message && (
          <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.45 }}>
            "{message}"
          </p>
        )}
        {children}
      </div>
    </motion.article>
  );
}
