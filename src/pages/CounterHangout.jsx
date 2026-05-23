import { useState } from 'react';
import { motion } from 'framer-motion';
import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { counterHangout } from '../lib/hangouts.js';
import { logError } from '../lib/logger.js';

const DATES = [
  { label: 'Today',       value: 'today'     },
  { label: 'Tomorrow',    value: 'tomorrow'  },
  { label: 'This Friday', value: 'friday'    },
  { label: 'Saturday',    value: 'saturday'  },
  { label: 'This Sunday', value: 'sunday'    },
  { label: 'Next week',   value: 'next_week' },
];

const TIME_SLOTS = [
  { label: 'Morning',   sub: '10am – 12pm', value: 'morning'   },
  { label: 'Afternoon', sub: '12pm – 4pm',  value: 'afternoon' },
  { label: 'Evening',   sub: '4pm – 7pm',   value: 'evening'   },
  { label: 'Night',     sub: '7pm – 10pm',  value: 'night'     },
];

const OC_PLACES = [
  'Irvine Spectrum', 'Diamond Jamboree', 'Anaheim Packing House',
  'Downtown Fullerton', 'Balboa Island', 'Huntington Beach Pier',
  'Portola Coffee Lab', 'The CAMP Costa Mesa', 'Fashion Island', 'Pacific City HB',
];

const DATE_LABELS = {
  today: 'Today', tomorrow: 'Tomorrow', friday: 'This Friday',
  saturday: 'Saturday', sunday: 'This Sunday', next_week: 'Next week',
};

const LABEL_STYLE = {
  fontSize:      10,
  fontWeight:    700,
  letterSpacing: '1.1px',
  textTransform: 'uppercase',
  color:         C.muted,
  display:       'block',
  marginBottom:  10,
};

export default function CounterHangout({ currentUser, hangout, go, goBack }) {
  const [date,     setDate]     = useState(hangout?.date     ?? null);
  const [timeSlot, setTimeSlot] = useState(hangout?.time_slot ?? null);
  const [place,    setPlace]    = useState(hangout?.place    ?? null);
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const canSubmit = date && timeSlot && place && !loading;

  const handleCounter = async () => {
    if (!canSubmit || !hangout) return;
    try {
      setLoading(true);
      await counterHangout(hangout.id, { date, timeSlot, place });
      setSent(true);
    } catch (err) {
      logError('counter hangout failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
        <TopBar showBack onBack={() => go('hangouts')} onLogoClick={() => go('home')} />
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '80px 32px',
            textAlign:      'center',
            gap:            16,
          }}
        >
          <p style={{ fontSize: 40, margin: 0 }}>↩</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: C.white, margin: 0, letterSpacing: '-0.5px' }}>
            Counter proposed!
          </p>
          <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Waiting for them to accept the new time.
          </p>
          <div style={{ marginTop: 16, width: '100%', maxWidth: 280 }}>
            <PremiumButton fullWidth onClick={() => go('hangouts')}>
              Back to Hangouts
            </PremiumButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      <TopBar showBack onBack={goBack} title="Suggest New Time" />

      <div style={{ padding: '20px 16px 100px' }}>

        {/* Counter banner */}
        <div
          style={{
            background:   'rgba(255,255,255,0.04)',
            border:       '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding:      '12px 14px',
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            ↩ Countering {hangout?.vibe ?? 'hangout'} on {DATE_LABELS[hangout?.date] ?? hangout?.date ?? '—'}
          </p>
        </div>

        {/* DATE */}
        <span style={LABEL_STYLE}>When</span>
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 8,
            marginBottom:        24,
          }}
        >
          {DATES.map((d) => (
            <motion.button
              key={d.value}
              type="button"
              onClick={() => setDate(d.value)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                background:   date === d.value ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                border:       '0.5px solid ' + (date === d.value ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.08)'),
                borderRadius: 12,
                padding:      '12px 8px',
                textAlign:    'center',
                fontSize:     14,
                fontWeight:   600,
                color:        date === d.value ? C.amber : C.muted,
                cursor:       'pointer',
              }}
            >
              {d.label}
            </motion.button>
          ))}
        </div>

        {/* TIME SLOT */}
        <span style={LABEL_STYLE}>What time</span>
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap:                 8,
            marginBottom:        24,
          }}
        >
          {TIME_SLOTS.map((t) => (
            <motion.button
              key={t.value}
              type="button"
              onClick={() => setTimeSlot(t.value)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                background:   timeSlot === t.value ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                border:       '0.5px solid ' + (timeSlot === t.value ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.08)'),
                borderRadius: 12,
                padding:      '14px 12px',
                textAlign:    'left',
                cursor:       'pointer',
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 700, color: timeSlot === t.value ? C.amber : C.white, margin: '0 0 3px' }}>
                {t.label}
              </p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{t.sub}</p>
            </motion.button>
          ))}
        </div>

        {/* PLACE */}
        <span style={LABEL_STYLE}>OC Spot</span>
        <div
          className="no-scrollbar"
          style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 32, paddingBottom: 4 }}
        >
          {OC_PLACES.map((p) => (
            <motion.button
              key={p}
              type="button"
              onClick={() => setPlace(p)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                background:   place === p ? C.gradientCTA : 'rgba(255,255,255,0.04)',
                border:       '0.5px solid ' + (place === p ? 'transparent' : 'rgba(255,255,255,0.08)'),
                borderRadius: 9999,
                padding:      '8px 16px',
                fontSize:     13,
                fontWeight:   500,
                color:        place === p ? '#0A0A0F' : C.muted,
                cursor:       'pointer',
                flexShrink:   0,
                whiteSpace:   'nowrap',
              }}
            >
              {p}
            </motion.button>
          ))}
        </div>

        {/* CTA */}
        <PremiumButton
          fullWidth
          onClick={handleCounter}
          disabled={!canSubmit}
          style={{ opacity: canSubmit ? 1 : 0.45 }}
        >
          {loading ? 'Sending…' : 'Suggest New Time →'}
        </PremiumButton>

        {(!date || !timeSlot || !place) && (
          <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 10 }}>
            Pick a date, time, and place to continue.
          </p>
        )}
      </div>
    </div>
  );
}
