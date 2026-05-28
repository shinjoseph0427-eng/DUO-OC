import { Clock, MapPin } from 'lucide-react';
import { C } from '../tokens';

const DATE_LABELS = {
  today:     'Today',
  tomorrow:  'Tomorrow',
  friday:    'This Friday',
  saturday:  'Saturday',
  sunday:    'This Sunday',
  next_week: 'Next week',
};

const TIME_LABELS = {
  morning:   'Morning',
  afternoon: 'Afternoon',
  evening:   'Evening',
  night:     'Night',
};

export default function PlanContextBar({ chat }) {
  const vibe = chat?.vibe ?? null;
  const date = DATE_LABELS[chat?.date] ?? chat?.date ?? null;
  const time = TIME_LABELS[chat?.timeSlot] ?? chat?.timeSlot ?? null;
  const place = chat?.place ?? null;
  const when = [date, time].filter(Boolean).join(' - ');

  if (!vibe && !date && !time && !place) return null;

  return (
    <div
      style={{
        background: C.cardElevated,
        border: `0.5px solid ${C.border}`,
        borderRadius: 14,
        padding: '10px 12px',
        margin: '10px 12px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        flexShrink: 0,
      }}
    >
      {vibe && (
        <span
          style={{
            background: C.gradientCTA,
            color: C.cream,
            borderRadius: 9999,
            padding: '4px 9px',
            fontSize: 11,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          {vibe}
        </span>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, color: C.text, fontSize: 12, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {place || when || vibe}
        </p>
        {when && (
          <p style={{ margin: '2px 0 0', color: C.muted, fontSize: 11, display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {place && <MapPin size={10} strokeWidth={2.2} />}
            <Clock size={10} strokeWidth={2.2} />
            {when}
          </p>
        )}
      </div>
    </div>
  );
}
