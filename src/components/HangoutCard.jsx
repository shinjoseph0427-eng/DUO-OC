import { motion } from 'framer-motion';
import { Clock, MapPin, MessageCircle, Users } from 'lucide-react';
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

const STATUS_STYLE = {
  confirmed: { label: 'Confirmed', color: C.success, bg: C.greenT12 },
  open:      { label: 'Open',      color: C.amber,   bg: C.amberT08 },
  pending:   { label: 'Pending',   color: C.amber,   bg: C.amberT08 },
  done:      { label: 'Done',      color: C.muted,   bg: 'rgba(17,17,17,0.05)' },
};

function duoNames(duo) {
  const names = (duo?.duo_members ?? [])
    .map((m) => m?.profiles?.name)
    .filter(Boolean)
    .slice(0, 2);
  return names.length ? names.join(' & ') : (duo?.name ?? 'Duo');
}

function metaFor(item) {
  return [
    item?.vibe,
    DATE_SHORT[item?.date] ?? item?.date,
    TIME_SHORT[item?.time_slot] ?? item?.time_slot,
  ].filter(Boolean).join(' - ');
}

export default function HangoutCard({
  duo,
  item,
  status = 'confirmed',
  title,
  subtitle,
  calmer = false,
  chatAvailable = false,
  onOpenChat,
  children,
}) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.confirmed;
  const location = item?.place || duo?.city || 'Orange County';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        background:    C.cardElevated,
        border:        `0.5px solid ${status === 'confirmed' ? C.greenBorder : C.border}`,
        borderRadius:  16,
        overflow:      'hidden',
        marginBottom:  12,
        boxShadow:     calmer ? 'none' : '0 8px 24px rgba(17,17,17,0.06)',
        opacity:       calmer ? 0.82 : 1,
      }}
    >
      <div style={{ position: 'relative', aspectRatio: status === 'confirmed' ? '16 / 9' : '4 / 3' }}>
        <DuoPhotoSplit duo={duo} featured={status === 'confirmed'} />
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.64), rgba(0,0,0,0.05) 64%)',
          }}
        />
        <span
          style={{
            position:     'absolute',
            top:          12,
            left:         12,
            background:   style.bg,
            color:        style.color,
            borderRadius: 9999,
            padding:      '5px 11px',
            fontSize:     11,
            fontWeight:   900,
            boxShadow:    '0 2px 10px rgba(0,0,0,0.12)',
          }}
        >
          {style.label}
        </span>
        {status === 'open' && (
          <span
            aria-label="Open plan waiting"
            style={{
              position:     'absolute',
              top:          14,
              right:        14,
              width:        12,
              height:       12,
              borderRadius: '50%',
              background:   C.success,
              border:       `2px solid ${C.cream}`,
            }}
          />
        )}
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
          <p style={{ fontSize: status === 'confirmed' ? 19 : 16, fontWeight: 900, color: C.cream, margin: '0 0 5px', lineHeight: 1.08 }}>
            {title ?? duoNames(duo)}
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.86)', margin: 0 }}>
            <MapPin size={11} strokeWidth={2.2} />
            {location}
          </p>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 850, color: C.text, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle ?? metaFor(item)}
            </p>
            <p style={{ fontSize: 11, fontWeight: 750, color: status === 'done' ? C.muted : C.amber, margin: 0 }}>
              {metaFor(item)}
            </p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.muted, fontSize: 11, fontWeight: 750, flexShrink: 0 }}>
            <Users size={11} />
            {(duo?.duo_members?.length ?? 0) || 2}
          </span>
        </div>

        {item?.message && (
          <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.45 }}>
            "{item.message}"
          </p>
        )}

        {status === 'confirmed' && (
          <motion.button
            type="button"
            onClick={onOpenChat}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            style={{
              width:        '100%',
              background:   chatAvailable ? C.gradientCTA : 'rgba(17,17,17,0.04)',
              color:        chatAvailable ? C.cream : C.muted,
              border:       chatAvailable ? 'none' : `0.5px solid ${C.border}`,
              borderRadius: 11,
              padding:      '11px 0',
              fontSize:     13,
              fontWeight:   900,
              cursor:       'pointer',
              boxShadow:    chatAvailable ? '0 2px 12px rgba(255,107,0,0.15)' : 'none',
            }}
          >
            <MessageCircle size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            {chatAvailable ? 'Open Chat' : 'Chat coming soon'}
          </motion.button>
        )}

        {children}
      </div>
    </motion.article>
  );
}
