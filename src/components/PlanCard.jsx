import { motion } from 'framer-motion';
import { Clock, MapPin, Users } from 'lucide-react';
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

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return null;
  const min = Math.max(0, Math.floor(diff / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function memberNames(duo) {
  const names = (duo?.duo_members ?? [])
    .map((m) => m?.profiles?.name)
    .filter(Boolean)
    .slice(0, 2);
  return names.length > 0 ? names.join(' & ') : (duo?.name ?? 'A duo');
}

export default function PlanCard({
  duo,
  plan,
  featured = false,
  distanceLabel,
  requested = false,
  passing = false,
  requestBusy = false,
  onOpen,
  onPass,
  onRequest,
}) {
  const hasPlan = Boolean(plan);
  const planType = plan?.vibe ?? duo?.vibes?.[0] ?? 'Hangout';
  const date = DATE_SHORT[plan?.date] ?? plan?.date ?? null;
  const time = TIME_SHORT[plan?.time_slot] ?? plan?.time_slot ?? null;
  const posted = timeAgo(plan?.created_at ?? duo?.created_at);
  const location = plan?.place || duo?.city || null;
  const meta = [date, time].filter(Boolean).join(' - ');
  const mutualLabel = (duo?.duo_members?.length ?? 0) > 1 ? '2 members' : '1 member';

  return (
    <motion.article
      layout
      whileTap={{ scale: onOpen ? 0.985 : 1 }}
      transition={{ duration: 0.12 }}
      onClick={onOpen}
      style={{
        gridColumn:    featured ? '1 / -1' : undefined,
        background:    C.cardElevated,
        border:        `0.5px solid ${requested ? C.amber : C.border}`,
        borderRadius:  16,
        overflow:      'hidden',
        cursor:        onOpen ? 'pointer' : 'default',
        boxShadow:     featured ? '0 10px 32px rgba(17,17,17,0.08)' : '0 4px 16px rgba(17,17,17,0.05)',
        opacity:       passing ? 0.45 : 1,
      }}
    >
      <div style={{ position: 'relative', aspectRatio: featured ? '16 / 9' : '4 / 3' }}>
        <DuoPhotoSplit duo={duo} featured={featured} />

        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0.04) 62%)',
          }}
        />

        <span
          style={{
            position:     'absolute',
            top:          10,
            left:         10,
            background:   hasPlan ? C.gradientCTA : 'rgba(255,255,255,0.92)',
            color:        hasPlan ? C.cream : C.text,
            borderRadius: 9999,
            padding:      '5px 10px',
            fontSize:     11,
            fontWeight:   900,
            boxShadow:    '0 2px 10px rgba(0,0,0,0.12)',
          }}
        >
          {hasPlan ? planType : 'Duo'}
        </span>

        {hasPlan && (
          <span
            aria-label="Open plan active"
            style={{
              position:     'absolute',
              top:          12,
              right:        12,
              width:        12,
              height:       12,
              borderRadius: '50%',
              background:   C.success,
              border:       `2px solid ${C.cream}`,
              boxShadow:    '0 0 0 1px rgba(0,0,0,0.05)',
            }}
          />
        )}

        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
          <p style={{ fontSize: featured ? 18 : 15, fontWeight: 900, color: C.cream, margin: '0 0 4px', lineHeight: 1.12 }}>
            {memberNames(duo)}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.86)', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={11} strokeWidth={2.2} />
            {[duo?.city, distanceLabel && `${distanceLabel} away`].filter(Boolean).join(' - ') || 'Orange County'}
          </p>
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 850, color: C.text, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hasPlan ? [planType, location].filter(Boolean).join(' - ') : (duo?.name ?? 'Duo')}
            </p>
            {meta && (
              <p style={{ fontSize: 11, fontWeight: 750, color: C.amber, margin: 0 }}>
                {meta}
              </p>
            )}
          </div>
          {featured && (
            <span style={{ background: C.purpleT08, color: C.purple, borderRadius: 7, padding: '3px 7px', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>
              Featured
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 11, marginBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Users size={11} />
            {mutualLabel}
          </span>
          {posted && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} />
              {posted}
            </span>
          )}
        </div>

        {hasPlan ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPass?.(); }}
              disabled={requested || requestBusy}
              style={{
                flex:         1,
                border:       `0.5px solid ${C.border}`,
                background:   C.cardElevated,
                color:        C.muted,
                borderRadius: 10,
                padding:      '10px 0',
                fontSize:     13,
                fontWeight:   800,
                cursor:       requested || requestBusy ? 'default' : 'pointer',
                opacity:      requested || requestBusy ? 0.5 : 1,
              }}
            >
              Pass
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRequest?.(); }}
              disabled={requested || requestBusy}
              style={{
                flex:         2,
                border:       'none',
                background:   requested ? C.greenT12 : C.gradientCTA,
                color:        requested ? C.success : C.cream,
                borderRadius: 10,
                padding:      '10px 0',
                fontSize:     13,
                fontWeight:   900,
                cursor:       requested || requestBusy ? 'default' : 'pointer',
              }}
            >
              {requestBusy ? 'Sending...' : requested ? 'Request sent' : 'Request to join'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
            style={{
              width:        '100%',
              border:       `0.5px solid ${C.border}`,
              background:   C.cardElevated,
              color:        C.text,
              borderRadius: 10,
              padding:      '10px 0',
              fontSize:     13,
              fontWeight:   850,
              cursor:       'pointer',
            }}
          >
            View Duo
          </button>
        )}
      </div>
    </motion.article>
  );
}
