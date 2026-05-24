import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, MapPin, X, Check } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import { getExploreDuos } from '../lib/duos.js';
import { getMyProfile } from '../lib/profile.js';
import { getBlockedDuoIds, getRestrictedDuoIds } from '../lib/safety.js';
import { getMyDuos } from '../lib/duos.js';
import { getOpenPlans } from '../lib/hangouts.js';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function duoMinDistance(duo, myLat, myLng) {
  if (!myLat || !myLng) return null;
  const dists = (duo.duo_members ?? [])
    .filter((m) => m.profiles?.lat && m.profiles?.lng)
    .map((m) => haversineKm(myLat, myLng, m.profiles.lat, m.profiles.lng));
  return dists.length ? Math.min(...dists) : null;
}

function formatKm(km) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

const EXPLORE_VIBES = [
  'chill', 'adventurous', 'foodie', 'outdoorsy',
  'night owl', 'homebody', 'artsy', 'sporty',
];

const AGE_RANGES = [
  { label: '18-22', min: 18, max: 22 },
  { label: '23-26', min: 23, max: 26 },
  { label: '27-30', min: 27, max: 30 },
  { label: '30+',   min: 30, max: 99 },
];

const DISTANCE_OPTIONS = [
  { label: '5km',  km: 5 },
  { label: '10km', km: 10 },
  { label: '20km', km: 20 },
  { label: '50km', km: 50 },
  { label: 'All',  km: null },
];

const DEFAULT_FILTERS = { vibes: [], ageRange: null, instagramOnly: false, distanceKm: null };

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

const ACTIVITY_SIGNALS = [
  { label: 'Open to plans',     color: C.brown, bg: 'rgba(255,107,0,0.15)' },
  { label: 'Active recently',   color: C.success, bg: C.greenT08 },
  { label: 'Open to plans',     color: C.amber,   bg: C.amberT08 },
  { label: 'Free this weekend', color: C.moss,    bg: C.greenT12 },
  { label: 'Looking for plans', color: C.brown, bg: 'rgba(255,107,0,0.15)' },
];

function getActivitySignal(duo) {
  if (duo.created_at) {
    const daysOld = (Date.now() - new Date(duo.created_at).getTime()) / 86400000;
    if (daysOld < 14) return { label: 'New duo', color: C.olive, bg: 'rgba(168,191,163,0.24)' };
  }
  const hash = (duo.id ?? '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return ACTIVITY_SIGNALS[hash % ACTIVITY_SIGNALS.length];
}

function Pill({ selected, onClick, children }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.1 }}
      style={{
        background:   selected ? 'rgba(255,107,0,0.15)' : C.cardElevated,
        border:       `0.5px solid ${selected ? 'rgba(242,242,240,0.22)' : C.border}`,
        borderRadius: 9999,
        padding:      '7px 14px',
        fontSize:     13,
        fontWeight:   600,
        color:        selected ? C.brown : C.muted,
        cursor:       'pointer',
        userSelect:   'none',
      }}
    >
      {children}
    </motion.button>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      style={{
        width:         44,
        height:        26,
        borderRadius:  13,
        background:    on ? C.olive : C.sand,
        border:        'none',
        cursor:        'pointer',
        position:      'relative',
        transition:    'background 0.2s',
        flexShrink:    0,
      }}
    >
      <motion.div
        animate={{ left: on ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          position:     'absolute',
          top:          3,
          width:        20,
          height:       20,
          borderRadius: '50%',
          background:   C.cream,
          boxShadow:    '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </motion.button>
  );
}

function FilterPanel({ filters, setFilters, onClose, hasLocation }) {
  const [local, setLocal] = useState(filters);

  const toggleVibe = (v) =>
    setLocal((f) => ({
      ...f,
      vibes: f.vibes.includes(v) ? f.vibes.filter((x) => x !== v) : [...f.vibes, v],
    }));

  const setAge = (range) =>
    setLocal((f) => ({
      ...f,
      ageRange: f.ageRange?.label === range.label ? null : range,
    }));

  const setDist = (km) => setLocal((f) => ({ ...f, distanceKm: km }));

  const apply = () => { setFilters(local); onClose(); };
  const reset = () => { setLocal(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); onClose(); };

  const activeCount = [
    local.vibes.length > 0,
    local.ageRange != null,
    local.instagramOnly,
    local.distanceKm != null,
  ].filter(Boolean).length;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{
        position:      'fixed',
        bottom:        0,
        left:          0,
        right:         0,
        zIndex:        200,
        background:    C.cardElevated,
        borderRadius:  '20px 20px 0 0',
        border:        `0.5px solid ${C.border}`,
        padding:       '0 16px 40px',
        maxHeight:     '82vh',
        overflowY:     'auto',
      }}
    >
      {/* handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.cardDeep }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0 20px' }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: C.white, margin: 0 }}>Filters</p>
        <motion.button
          type="button"
          onClick={onClose}
          whileTap={{ scale: 0.9 }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <X size={18} color={C.muted} />
        </motion.button>
      </div>

      {/* Vibe */}
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.9px', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Vibe
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {EXPLORE_VIBES.map((v) => (
          <Pill key={v} selected={local.vibes.includes(v)} onClick={() => toggleVibe(v)}>
            {v}
          </Pill>
        ))}
      </div>

      {/* Age */}
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.9px', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Age range
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {AGE_RANGES.map((r) => (
          <Pill key={r.label} selected={local.ageRange?.label === r.label} onClick={() => setAge(r)}>
            {r.label}
          </Pill>
        ))}
      </div>

      {/* Instagram */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.white, margin: 0 }}>Instagram only</p>
          <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Duos with IG linked</p>
        </div>
        <Toggle on={local.instagramOnly} onToggle={() => setLocal((f) => ({ ...f, instagramOnly: !f.instagramOnly }))} />
      </div>

      {/* Distance */}
      {hasLocation && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.9px', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Distance
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            {DISTANCE_OPTIONS.map((d) => (
              <Pill
                key={d.label}
                selected={local.distanceKm === d.km}
                onClick={() => setDist(d.km)}
              >
                {d.label}
              </Pill>
            ))}
          </div>
        </>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={reset}
          style={{
            flex:         1,
            height:       48,
            borderRadius: 14,
            border:       `0.5px solid ${C.border}`,
            background:   'transparent',
            color:        C.muted,
            fontSize:     14,
            fontWeight:   700,
            cursor:       'pointer',
          }}
        >
          Reset
        </button>
        <motion.button
          type="button"
          onClick={apply}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
          style={{
            flex:         2,
            height:       48,
            borderRadius: 14,
            border:       'none',
            background:   C.gradientCTA,
            color:        '#fff',
            fontSize:     14,
            fontWeight:   800,
            cursor:       'pointer',
          }}
        >
          Apply{activeCount > 0 ? ` (${activeCount})` : ''}
        </motion.button>
      </div>
    </motion.div>
  );
}

function ExploreCard({ duo, myLat, myLng, go, openPlan }) {
  const members   = duo.duo_members ?? [];
  const primary   = members[0];
  const heroPhoto = primary?.profiles?.photos?.[0] ?? primary?.profiles?.avatar_url ?? null;
  const gradIdx   = 0;
  const vibe      = duo.vibes?.[0] ?? null;
  const dist      = duoMinDistance(duo, myLat, myLng);
  const distLabel = formatKm(dist);
  const names     = members.map((m) => m.profiles?.name ?? '?').slice(0, 2).join(' & ');
  const username  = primary?.profiles?.username;
  const city      = duo.city ?? primary?.profiles?.city ?? null;
  const signal    = openPlan
    ? { label: 'Open plan', color: C.moss, bg: C.greenT12 }
    : getActivitySignal(duo);

  const planPreview = openPlan
    ? [
        openPlan.vibe,
        DATE_SHORT[openPlan.date] ?? openPlan.date,
        TIME_SHORT[openPlan.time_slot] ?? openPlan.time_slot,
      ].filter(Boolean).join(' · ')
    : null;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      onClick={() => go('duo_detail', duo)}
      style={{
        borderRadius: 16,
        overflow:     'hidden',
        background:   C.cardElevated,
        border:       `0.5px solid ${C.border}`,
        cursor:       'pointer',
        position:     'relative',
        aspectRatio:  '3/4',
      }}
    >
      {heroPhoto ? (
        <img
          src={heroPhoto}
          alt={duo.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          draggable={false}
        />
      ) : (
        <div
          style={{
            width:      '100%',
            height:     '100%',
            background: AVATAR_GRADIENTS[gradIdx % AVATAR_GRADIENTS.length],
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 40, fontWeight: 800, color: 'rgba(255,255,255,0.2)' }}>
            {(duo.name || '?')[0].toUpperCase()}
          </span>
        </div>
      )}

      {/* Gradient overlay */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.82) 100%)',
        }}
      />

      {/* Distance badge */}
      {distLabel && (
        <div
          style={{
            position:    'absolute',
            top:         8,
            right:       8,
            background:  'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            borderRadius: 9999,
            padding:     '3px 9px',
            fontSize:    11,
            fontWeight:  600,
            color:       '#fff',
            display:     'flex',
            alignItems:  'center',
            gap:         3,
          }}
        >
          <MapPin size={9} strokeWidth={2} />
          {distLabel}
        </div>
      )}

      {/* Vibe pill */}
      {vibe && (
        <div
          style={{
            position:     'absolute',
            top:          8,
            left:         8,
            background:   'rgba(255,107,0,0.15)',
            border:       '0.5px solid rgba(242,242,240,0.18)',
            borderRadius: 9999,
            padding:      '3px 9px',
            fontSize:     10,
            fontWeight:   700,
            color:        C.brown,
          }}
        >
          {vibe}
        </div>
      )}

      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 10px 12px' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: C.cream, margin: '0 0 2px', lineHeight: 1.2 }}>
          {names || duo.name}
        </p>
        {username && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '0 0 3px' }}>
            @{username}
          </p>
        )}
        {city && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: 3 }}>
            <MapPin size={9} strokeWidth={2} />{city}
          </p>
        )}
        <span
          style={{
            display:      'inline-block',
            background:   signal.bg,
            color:        signal.color,
            borderRadius: 9999,
            padding:      '2px 8px',
            fontSize:     10,
            fontWeight:   700,
          }}
        >
          {signal.label}
        </span>
        {planPreview && (
          <p
            style={{
              fontSize:     10,
              color:        'rgba(255,255,255,0.5)',
              margin:       '4px 0 0',
              lineHeight:   1.3,
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {planPreview}
            {openPlan?.place && ` · ${openPlan.place}`}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function activeFilterCount(f) {
  return [f.vibes.length > 0, f.ageRange != null, f.instagramOnly, f.distanceKm != null].filter(Boolean).length;
}

export default function ExplorePage({ currentUser, go }) {
  const [duos,         setDuos]         = useState([]);
  const [myProfile,    setMyProfile]    = useState(null);
  const [blockedSet,   setBlockedSet]   = useState(new Set());
  const [restrictedSet,setRestrictedSet]= useState(new Set());
  const [openPlanMap,  setOpenPlanMap]  = useState(new Map()); // duo_id → plan
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState('');
  const [debQ,         setDebQ]         = useState('');
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [filters,      setFilters]      = useState({ ...DEFAULT_FILTERS });
  const [planFilter,   setPlanFilter]   = useState('all'); // 'all' | 'open_plans'
  const debTimer = useRef(null);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    Promise.all([
      getExploreDuos(currentUser.id),
      getMyProfile(currentUser.id),
      getMyDuos(currentUser.id).then((duos) => getBlockedDuoIds((duos ?? []).map((duo) => duo.id))).catch(() => []),
      getRestrictedDuoIds(),
      getOpenPlans().catch(() => []),
    ])
      .then(([d, p, blocked, restricted, plans]) => {
        setDuos(d ?? []);
        setMyProfile(p);
        setBlockedSet(new Set(blocked));
        setRestrictedSet(new Set(restricted));
        setOpenPlanMap(new Map((plans ?? []).filter((pl) => !restricted?.includes(pl.creator_duo_id)).map((pl) => [pl.creator_duo_id, pl])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser]);

  const handleQueryChange = (v) => {
    setQuery(v);
    clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => setDebQ(v), 300);
  };

  const currentYear = new Date().getFullYear();
  const myLat = myProfile?.lat ?? null;
  const myLng = myProfile?.lng ?? null;

  const filtered = useMemo(() => {
    let r = duos.filter((d) => !blockedSet.has(d.id) && !restrictedSet.has(d.id));

    if (debQ.trim()) {
      const q = debQ.replace(/^@/, '').toLowerCase();
      r = r.filter((d) =>
        d.duo_members?.some(
          (m) =>
            m.profiles?.username?.toLowerCase().includes(q) ||
            m.profiles?.name?.toLowerCase().includes(q),
        ) || d.name?.toLowerCase().includes(q),
      );
    }

    if (filters.vibes.length > 0) {
      r = r.filter((d) => filters.vibes.some((v) => d.vibes?.map(x => x.toLowerCase()).includes(v)));
    }

    if (filters.ageRange) {
      const { min, max } = filters.ageRange;
      r = r.filter((d) =>
        d.duo_members?.some((m) => {
          if (!m.profiles?.birth_year) return true;
          const age = currentYear - m.profiles.birth_year;
          return age >= min && age <= max;
        }),
      );
    }

    if (filters.instagramOnly) {
      r = r.filter((d) => d.duo_members?.some((m) => m.instagram || m.profiles?.instagram));
    }

    if (filters.distanceKm && myLat && myLng) {
      r = r.filter((d) => {
        const dist = duoMinDistance(d, myLat, myLng);
        return dist == null || dist <= filters.distanceKm;
      });
    }

    if (planFilter === 'open_plans') {
      r = r.filter((d) => openPlanMap.has(d.id));
    }

    return r;
  }, [duos, blockedSet, restrictedSet, debQ, filters, myLat, myLng, currentYear, planFilter, openPlanMap]);

  const numFilters = activeFilterCount(filters);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      {/* Search bar + filter */}
      <div
        style={{
          position:    'sticky',
          top:         0,
          zIndex:      50,
          background:  C.bg,
          padding:     '12px 16px 10px',
          borderBottom:`0.5px solid ${C.border}`,
          display:     'flex',
          gap:         10,
          alignItems:  'center',
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={15}
            color={C.muted}
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search @username or duo name"
            style={{
              width:        '100%',
              background:   C.cardElevated,
              border:       `0.5px solid ${C.border}`,
              borderRadius: 12,
              padding:      '10px 14px 10px 36px',
              fontSize:     14,
              color:        C.white,
              outline:      'none',
              boxSizing:    'border-box',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setDebQ(''); }}
              style={{
                position:   'absolute',
                right:      10,
                top:        '50%',
                transform:  'translateY(-50%)',
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                padding:    2,
              }}
            >
              <X size={14} color={C.muted} />
            </button>
          )}
        </div>

        <motion.button
          type="button"
          onClick={() => setFilterOpen(true)}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.1 }}
          style={{
            width:          40,
            height:         40,
            borderRadius:   12,
            background:     numFilters > 0 ? 'rgba(255,107,0,0.15)' : C.cardElevated,
            border:         `0.5px solid ${numFilters > 0 ? 'rgba(242,242,240,0.22)' : C.border}`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
            position:       'relative',
            flexShrink:     0,
          }}
        >
          <SlidersHorizontal size={17} color={numFilters > 0 ? C.brown : C.muted} strokeWidth={2} />
          {numFilters > 0 && (
            <div
              style={{
                position:     'absolute',
                top:          -4,
                right:        -4,
                width:        16,
                height:       16,
                borderRadius: '50%',
                background:   C.brown,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                fontSize:     9,
                fontWeight:   800,
                color:        '#fff',
              }}
            >
              {numFilters}
            </div>
          )}
        </motion.button>
      </div>

      {/* Results */}
      <div style={{ padding: '14px 16px 0' }}>

        {/* Plan filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { value: 'all',        label: 'All' },
            { value: 'open_plans', label: 'Open plans' },
          ].map(({ value, label }) => (
            <motion.button
              key={value}
              type="button"
              onClick={() => setPlanFilter(value)}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.1 }}
              style={{
                background:   planFilter === value ? C.amberT08 : C.cardElevated,
                border:       `0.5px solid ${planFilter === value ? C.brownBorder : C.border}`,
                borderRadius: 9999,
                padding:      '6px 14px',
                fontSize:     13,
                fontWeight:   600,
                color:        planFilter === value ? C.amber : C.muted,
                cursor:       'pointer',
              }}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {loading ? (
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: '1fr 1fr',
              gap:                 10,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  background:   C.cardElevated,
                  aspectRatio:  '3/4',
                  animation:    'pulse 1.4s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            {planFilter === 'open_plans' ? (
              <>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 8px' }}>
                  Nothing open right now.
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px', lineHeight: 1.6 }}>
                  Check back later or send a hangout request to a duo you like.
                </p>
                <motion.button
                  type="button"
                  onClick={() => setPlanFilter('all')}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    background:   C.cardElevated,
                    border:       `0.5px solid ${C.border}`,
                    borderRadius: 10,
                    padding:      '9px 20px',
                    fontSize:     13,
                    fontWeight:   600,
                    color:        C.white,
                    cursor:       'pointer',
                  }}
                >
                  Show all duos
                </motion.button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: '0 0 8px' }}>
                  {duos.length === 0 ? 'You\'ve seen them all. Check back soon.' : 'No results.'}
                </p>
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                  {duos.length === 0 ? 'Check back soon or update your vibe.' : 'Try adjusting your filters.'}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: C.muted, margin: '0 0 12px' }}>
              {filtered.length} duo{filtered.length !== 1 ? 's' : ''}
              {planFilter === 'open_plans' && ' with open plans'}
            </p>
            <div
              style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr',
                gap:                 10,
              }}
            >
              {filtered.map((duo) => (
                <ExploreCard
                  key={duo.id}
                  duo={duo}
                  myLat={myLat}
                  myLng={myLng}
                  go={go}
                  openPlan={openPlanMap.get(duo.id) ?? null}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Filter panel backdrop */}
      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterOpen(false)}
              style={{
                position: 'fixed',
                inset:    0,
                zIndex:   199,
                background: 'rgba(0,0,0,0.6)',
              }}
            />
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              onClose={() => setFilterOpen(false)}
              hasLocation={!!(myLat && myLng)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
