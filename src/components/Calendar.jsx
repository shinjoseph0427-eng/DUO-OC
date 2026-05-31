import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { C } from '../tokens';

// Accent: matches the app-wide orange (C.amber === #FF6B00).
const ACCENT = C.amber;
const HEAD_FONT = "'Bricolage Grotesque', 'Inter', system-ui, sans-serif";
const BODY_FONT = "'DM Sans', 'Inter', system-ui, sans-serif";

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Local 'YYYY-MM-DD' (avoids UTC off-by-one from toISOString()).
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function fmtLong(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });
}

/**
 * Collapsible calendar.
 * @param {string|null} value  selected date as 'YYYY-MM-DD'
 * @param {(iso: string) => void} onChange
 */
export default function Calendar({ value, onChange }) {
  const today = startOfToday();
  const todayISO = toISO(today);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return { y, m: m - 1 };
    }
    return { y: today.getFullYear(), m: today.getMonth() };
  });

  const quickChips = (() => {
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const dow = today.getDay();
    const satDiff = (6 - dow + 7) % 7; // upcoming Saturday (today if Sat)
    const weekend = new Date(today.getTime() + satDiff * 86_400_000);
    return [
      { label: 'Today', iso: toISO(today) },
      { label: 'Tomorrow', iso: toISO(tomorrow) },
      { label: 'This weekend', iso: toISO(weekend) },
    ];
  })();

  const pick = (iso) => {
    onChange(iso);
    setOpen(false);
  };

  const selectChip = (iso) => {
    onChange(iso);
    const [y, m] = iso.split('-').map(Number);
    setView({ y, m: m - 1 });
    setOpen(true);
  };

  // Build the month grid
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const atCurrentMonth = view.y === today.getFullYear() && view.m === today.getMonth();
  const shiftMonth = (delta) => {
    setView((v) => {
      const next = new Date(v.y, v.m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  };

  const chipStyle = (active) => ({
    flex: 1,
    background: active ? ACCENT : C.cardElevated,
    border: `1px solid ${active ? 'transparent' : '#eee'}`,
    borderRadius: 100,
    padding: '10px 8px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: BODY_FONT,
    color: active ? '#fff' : C.muted,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      {/* Quick chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {quickChips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => selectChip(c.iso)}
            style={chipStyle(value === c.iso)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Pick a date row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: C.cardElevated,
          border: `1px solid ${value ? 'rgba(255,107,0,0.45)' : '#eee'}`,
          borderRadius: 16,
          padding: '14px 16px',
          cursor: 'pointer',
          fontFamily: BODY_FONT,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarDays size={18} color={value ? ACCENT : C.muted} strokeWidth={2} />
          <span style={{ fontSize: 14, fontWeight: value ? 600 : 400, color: value ? C.text : C.muted }}>
            {value ? fmtLong(value) : 'Pick a date —'}
          </span>
        </span>
        <ChevronDown
          size={18}
          color={C.muted}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}
        />
      </button>

      {/* Expandable month */}
      <div
        style={{
          maxHeight: open ? 420 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div
          style={{
            marginTop: 10,
            background: C.cardElevated,
            border: '1px solid #eee',
            borderRadius: 16,
            padding: 14,
          }}
        >
          {/* Month header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={atCurrentMonth}
              aria-label="Previous month"
              style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(17,17,17,0.04)',
                opacity: atCurrentMonth ? 0.3 : 1,
                cursor: atCurrentMonth ? 'default' : 'pointer',
              }}
            >
              <ChevronLeft size={18} color={C.text} strokeWidth={2.2} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: HEAD_FONT, color: C.text }}>
              {MONTHS[view.m]} {view.y}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(17,17,17,0.04)', cursor: 'pointer',
              }}
            >
              <ChevronRight size={18} color={C.text} strokeWidth={2.2} />
            </button>
          </div>

          {/* Weekday header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {WEEKDAYS.map((w, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.muted, padding: '4px 0' }}>
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} style={{ minHeight: 44 }} />;
              const iso = toISO(new Date(view.y, view.m, day));
              const isPast = iso < todayISO;
              const isSelected = value === iso;
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isPast}
                  onClick={() => pick(iso)}
                  style={{
                    position: 'relative',
                    minHeight: 44,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    cursor: isPast ? 'default' : 'pointer',
                  }}
                >
                  <span
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34, borderRadius: '50%',
                      fontSize: 14,
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? ACCENT : 'transparent',
                      color: isSelected ? '#fff' : isPast ? 'rgba(17,17,17,0.25)' : C.text,
                    }}
                  >
                    {day}
                  </span>
                  {isToday && !isSelected && (
                    <span style={{
                      position: 'absolute', bottom: 4,
                      width: 4, height: 4, borderRadius: '50%', background: ACCENT,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
