import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, MapPin, X } from 'lucide-react';
import { C, AVATAR_GRADIENTS } from '../tokens';
import { getExploreDuos } from '../lib/duos.js';
import { getMyProfile } from '../lib/profile.js';
import { getBlockedDuoIds, getRestrictedDuoIds, getHiddenUserIds } from '../lib/safety.js';
import { getMyDuos } from '../lib/duos.js';
import { getOpenPlans, requestToJoinPlan } from '../lib/hangouts.js';
import { findHomies } from '../lib/homie.js';
import HomieCard from '../components/HomieCard.jsx';
import FilterStrip from '../components/FilterStrip.jsx';
import PlanCard from '../components/PlanCard.jsx';

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

function getActivitySignal(duo, openPlanMap) {
  if (openPlanMap?.has(duo.id)) {
    return { label: 'Open plan', color: C.amber, bg: C.amberT08 };
  }
  if (duo.created_at) {
    const daysOld = (Date.now() - new Date(duo.created_at)) / 86400000;
    if (daysOld < 14) {
      return { label: 'New duo', color: C.success, bg: C.greenT08 };
    }
  }
  return null;
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

function ExploreCard({ duo, myLat, myLng, go, openPlan, openPlanMap }) {
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
  const signal    = getActivitySignal(duo, openPlanMap);

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
          {distLabel} away
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
        {!distLabel && city && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: 3 }}>
            <MapPin size={9} strokeWidth={2} />{city}
          </p>
        )}
        {signal && (
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
        )}
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

export default function ExplorePage({ currentUser, go, showToast }) {
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
  const [planFilter,   setPlanFilter]   = useState('all'); // 'all' | 'open_plans' | vibe
  const debTimer = useRef(null);

  const [myDuoIds,      setMyDuoIds]      = useState([]);
  const [myDuos,        setMyDuos]        = useState([]);
  const [activeTab,     setActiveTab]     = useState('duos');
  const [homies,        setHomies]        = useState([]);
  const [homiesLoading, setHomiesLoading] = useState(false);
  const [passedPlanIds, setPassedPlanIds] = useState(new Set());
  const [requestedPlanIds, setRequestedPlanIds] = useState(new Set());
  const [requestingPlanId, setRequestingPlanId] = useState(null);
  const [createDuoPromptOpen, setCreateDuoPromptOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    Promise.all([
      getExploreDuos(currentUser.id),
      getMyProfile(currentUser.id),
      getMyDuos(currentUser.id).then((duos) => {
        const list = duos ?? [];
        setMyDuos(list);
        const ids = list.map((duo) => duo.id);
        setMyDuoIds(ids);
        return getBlockedDuoIds(ids)
          .then((b) => ({ blocked: b, myIds: ids }))
          .catch(() => ({ blocked: [], myIds: ids }));
      }).catch(() => {
        setMyDuos([]);
        setMyDuoIds([]);
        return { blocked: [], myIds: [] };
      }),
      getRestrictedDuoIds(),
      getOpenPlans().catch(() => []),
    ])
      .then(([d, p, { blocked, myIds }, restricted, plans]) => {
        // Merge plan creator duos that aren't already in the explore results
        const existingIds = new Set((d ?? []).map((x) => x.id));
        const myIdSet = new Set(myIds);
        const planDuos = (plans ?? [])
          .map((pl) => pl.creator_duo)
          .filter((duo) =>
            duo?.id &&
            !existingIds.has(duo.id) &&
            !myIdSet.has(duo.id) &&
            !(blocked ?? []).includes(duo.id) &&
            !(restricted ?? []).includes(duo.id)
          );
        setDuos([...(d ?? []), ...planDuos]);
        setMyProfile(p);
        setBlockedSet(new Set(blocked));
        setRestrictedSet(new Set(restricted));
        setOpenPlanMap(new Map((plans ?? []).filter((pl) => !restricted?.includes(pl.creator_duo_id)).map((pl) => [pl.creator_duo_id, pl])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => {
    if (activeTab !== 'find_homie' || !currentUser) return;
    let cancelled = false;
    setHomiesLoading(true);
    Promise.all([
      findHomies(currentUser, myProfile || {}),
      getHiddenUserIds(myDuoIds, currentUser?.id),
    ])
      .then(([results, hiddenIds]) => {
        if (cancelled) return;
        setHomies((results ?? []).filter((h) => !hiddenIds.has(h.id)));
      })
      .catch(() => { if (!cancelled) setHomies([]); })
      .finally(() => { if (!cancelled) setHomiesLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, currentUser, myDuoIds]);

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
    } else if (planFilter !== 'all') {
      r = r.filter((d) => {
        const plan = openPlanMap.get(d.id);
        return plan?.vibe === planFilter;
      });
    }

    r = r.filter((d) => {
      const plan = openPlanMap.get(d.id);
      return !plan || !passedPlanIds.has(plan.id);
    });

    return r;
  }, [duos, blockedSet, restrictedSet, debQ, filters, myLat, myLng, currentYear, planFilter, openPlanMap, passedPlanIds]);

  const numFilters = activeFilterCount(filters);
  const openPlanCount = useMemo(
    () => filtered.filter((duo) => openPlanMap.has(duo.id)).length,
    [filtered, openPlanMap],
  );
  const featuredDuo = useMemo(
    () => filtered.find((duo) => openPlanMap.has(duo.id)) ?? null,
    [filtered, openPlanMap],
  );
  const feedDuos = featuredDuo ? filtered.filter((duo) => duo.id !== featuredDuo.id) : filtered;
  const planFilterOptions = useMemo(() => {
    const vibes = Array.from(new Set(Array.from(openPlanMap.values()).map((plan) => plan.vibe).filter(Boolean)));
    return [
      { value: 'all', label: 'All' },
      { value: 'open_plans', label: `Open plans${openPlanCount > 0 ? ` ${openPlanCount}` : ''}` },
      ...vibes.slice(0, 5).map((vibe) => ({ value: vibe, label: vibe })),
    ];
  }, [openPlanMap, openPlanCount]);

  const handlePassPlan = (planId) => {
    if (!planId) return;
    setPassedPlanIds((prev) => new Set(prev).add(planId));
  };

  const handleRequestPlan = async (plan, duo) => {
    if (!plan?.id || requestingPlanId) return;
    const requesterDuoId = myDuos[0]?.id ?? myDuoIds[0];
    if (!requesterDuoId) {
      showToast?.('Create your Duo first to send a request', 'info');
      setCreateDuoPromptOpen(true);
      return;
    }

    setRequestingPlanId(plan.id);
    try {
      await requestToJoinPlan({
        planId: plan.id,
        requesterDuoId,
        message: `We'd love to join ${duo?.name ?? 'your duo'} for this plan.`,
      });
      setRequestedPlanIds((prev) => new Set(prev).add(plan.id));
      showToast?.('Request sent!', 'success');
    } catch (err) {
      showToast?.(err?.message ?? 'Could not send request.', 'error');
    } finally {
      setRequestingPlanId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      {/* Sticky header */}
      <div
        style={{
          position:    'sticky',
          top:         0,
          zIndex:      50,
          background:  C.bg,
          borderBottom:`0.5px solid ${C.border}`,
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0' }}>
          {[
            { key: 'duos',       label: 'Duos' },
            { key: 'find_homie', label: 'Find Homie' },
          ].map(({ key, label }) => (
            <motion.button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                padding:      '7px 18px',
                borderRadius: 9999,
                border:       activeTab === key ? 'none' : `0.5px solid ${C.border}`,
                background:   activeTab === key ? C.gradientCTA : C.cardElevated,
                color:        activeTab === key ? '#fff' : C.muted,
                fontSize:     13,
                fontWeight:   700,
                cursor:       'pointer',
                boxShadow:    activeTab === key ? '0 4px 14px rgba(255,107,0,0.22)' : 'none',
              }}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* Search bar + filter — Duos tab only */}
        {activeTab === 'duos' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px 10px' }}>
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
        )}

        {/* Find Homie header spacer */}
        {activeTab === 'find_homie' && <div style={{ height: 10 }} />}
      </div>

      {/* Find Homie tab content */}
      {activeTab === 'find_homie' && (
        <div style={{ padding: '0 16px 24px' }}>
          <div
            style={{
              background:   C.amberT08,
              border:       `1px solid ${C.amberT22}`,
              borderRadius: 16,
              padding:      '14px 16px',
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: '0 0 4px' }}>
              Find a homie to create a duo
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.5 }}>
              A duo starts with two people. Find a homie, then set up your duo profile together.
            </p>
          </div>

          {homiesLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height:       260,
                    borderRadius: 16,
                    background:   C.cardElevated,
                    animation:    'pulse 1.4s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : homies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: '0 0 8px' }}>
                No homies found nearby yet.
              </p>
              <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
                Be the first to invite friends and grow the OC community.
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 12px' }}>
                {homies.length} profile{homies.length !== 1 ? 's' : ''} looking for a duo partner
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {homies.map((homie) => (
                  <HomieCard key={homie.id} homie={homie} go={go} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Duos tab content */}
      {activeTab === 'duos' && <div style={{ padding: '14px 16px 0' }}>

        <FilterStrip
          options={planFilterOptions}
          value={planFilter}
          onChange={setPlanFilter}
          style={{ marginBottom: 14 }}
        />

        {loading ? (
            <div className="explore-photo-feed" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
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
            <style>{`
              @media (max-width: 520px) {
                .explore-photo-feed { grid-template-columns: 1fr !important; }
              }
            `}</style>
            <div className="explore-photo-feed" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {featuredDuo && (
                <PlanCard
                  duo={featuredDuo}
                  plan={openPlanMap.get(featuredDuo.id)}
                  featured
                  distanceLabel={formatKm(duoMinDistance(featuredDuo, myLat, myLng))}
                  requested={requestedPlanIds.has(openPlanMap.get(featuredDuo.id)?.id)}
                  requestBusy={requestingPlanId === openPlanMap.get(featuredDuo.id)?.id}
                  onOpen={() => go('duo_detail', featuredDuo)}
                  onPass={() => handlePassPlan(openPlanMap.get(featuredDuo.id)?.id)}
                  onRequest={() => handleRequestPlan(openPlanMap.get(featuredDuo.id), featuredDuo)}
                />
              )}
              {feedDuos.map((duo) => {
                const plan = openPlanMap.get(duo.id) ?? null;
                return (
                <PlanCard
                  key={duo.id}
                  duo={duo}
                  plan={plan}
                  distanceLabel={formatKm(duoMinDistance(duo, myLat, myLng))}
                  requested={requestedPlanIds.has(plan?.id)}
                  passing={passedPlanIds.has(plan?.id)}
                  requestBusy={requestingPlanId === plan?.id}
                  onOpen={() => go('duo_detail', duo)}
                  onPass={() => handlePassPlan(plan?.id)}
                  onRequest={() => handleRequestPlan(plan, duo)}
                />
                );
              })}
            </div>
          </>
        )}
      </div>}

      {/* Filter panel backdrop */}
      <AnimatePresence>
        {createDuoPromptOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateDuoPromptOpen(false)}
              style={{
                position:   'fixed',
                inset:      0,
                zIndex:     198,
                background: 'rgba(0,0,0,0.62)',
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{
                position:     'fixed',
                left:         16,
                right:        16,
                bottom:       96,
                zIndex:       201,
                background:   C.cardElevated,
                border:       `0.5px solid ${C.border}`,
                borderRadius: 16,
                padding:      16,
                boxShadow:    '0 18px 44px rgba(0,0,0,0.28)',
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 900, color: C.text, margin: '0 0 5px' }}>
                Create your Duo first
              </p>
              <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
                You need an active Duo before you can request to join an open plan.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCreateDuoPromptOpen(false)}
                  style={{
                    flex:         1,
                    background:   'transparent',
                    border:       `0.5px solid ${C.border}`,
                    borderRadius: 10,
                    padding:      '10px 0',
                    color:        C.muted,
                    fontSize:     13,
                    fontWeight:   800,
                    cursor:       'pointer',
                  }}
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateDuoPromptOpen(false);
                    go('find_homie');
                  }}
                  style={{
                    flex:         2,
                    background:   C.gradientCTA,
                    border:       'none',
                    borderRadius: 10,
                    padding:      '10px 0',
                    color:        C.cream,
                    fontSize:     13,
                    fontWeight:   900,
                    cursor:       'pointer',
                  }}
                >
                  Create Duo
                </button>
              </div>
            </motion.div>
          </>
        )}
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
