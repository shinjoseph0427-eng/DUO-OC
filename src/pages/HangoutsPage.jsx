import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import BottomNav from '../components/BottomNav.jsx';
import { OC_SPOTS } from '../data/duos.js';

const PENDING = [
  { id: 1, fromDuo: "Mia & Jess",    fromCities: "Irvine + Newport",       vibe: "Boba",   when: "This Friday" },
  { id: 2, fromDuo: "Sophie & Ana",  fromCities: "Newport + Costa Mesa",   vibe: "Coffee", when: "Saturday"    },
];

const CONFIRMED = [
  { id: 3, duoName: "Jay & Marcus", vibe: "Dinner", when: "Saturday", spot: "Anaheim Packing House" },
];

const SECTION_LABEL = {
  fontSize:      10,
  fontWeight:    700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color:         C.muted,
};

function SpotCard({ spot }) {
  return (
    <div
      style={{
        background:   spot.bg,
        border:       `0.5px solid ${C.border}`,
        borderRadius: 14,
        padding:      '14px 12px',
        minWidth:     90,
        textAlign:    'center',
        flexShrink:   0,
        cursor:       'pointer',
        transition:   'border-color 0.15s',
      }}
    >
      <p style={{ fontSize: 18, marginBottom: 6 }}>{spot.emoji}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.white, marginBottom: 2 }}>{spot.name}</p>
      <p style={{ fontSize: 10, color: C.muted }}>{spot.city}</p>
    </div>
  );
}

export default function HangoutsPage({ go }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <TopBar title="Hangouts" />

      <div style={{ flex: 1, padding: '20px 16px', paddingBottom: 80, overflowY: 'auto' }}>

        {/* PENDING */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={SECTION_LABEL}>Pending</p>
          <span
            style={{
              background:    'rgba(245,158,11,0.12)',
              color:         C.amber,
              borderRadius:  9999,
              padding:       '2px 10px',
              fontSize:      11,
              fontWeight:    700,
            }}
          >
            {PENDING.length}
          </span>
        </div>

        {PENDING.map((item) => (
          <div
            key={item.id}
            style={{
              background:   C.cardElevated,
              borderLeft:   `3px solid ${C.amber}`,
              borderRight:  `0.5px solid ${C.border}`,
              borderTop:    `0.5px solid ${C.border}`,
              borderBottom: `0.5px solid ${C.border}`,
              borderRadius: 14,
              padding:      '14px 16px',
              marginBottom: 10,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 2 }}>{item.fromDuo}</p>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{item.fromCities}</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{item.vibe} · {item.when}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                style={{
                  flex:         1,
                  background:   C.gradientCTA,
                  color:        '#fff',
                  border:       'none',
                  borderRadius: 10,
                  padding:      10,
                  fontSize:     13,
                  fontWeight:   700,
                  cursor:       'pointer',
                  boxShadow:    '0 2px 12px rgba(245,158,11,0.2)',
                }}
              >
                Confirm
              </button>
              <button
                type="button"
                style={{
                  flex:         1,
                  background:   'transparent',
                  color:        C.muted,
                  border:       `0.5px solid ${C.border}`,
                  borderRadius: 10,
                  padding:      10,
                  fontSize:     13,
                  fontWeight:   700,
                  cursor:       'pointer',
                }}
              >
                Decline
              </button>
            </div>
          </div>
        ))}

        {/* CONFIRMED */}
        <div style={{ marginBottom: 12, marginTop: 28 }}>
          <p style={SECTION_LABEL}>Confirmed</p>
        </div>

        {CONFIRMED.map((item) => (
          <div
            key={item.id}
            style={{
              background:   C.cardElevated,
              borderLeft:   `3px solid ${C.success}`,
              borderRight:  `0.5px solid ${C.border}`,
              borderTop:    `0.5px solid ${C.border}`,
              borderBottom: `0.5px solid ${C.border}`,
              borderRadius: 14,
              padding:      '14px 16px',
              marginBottom: 10,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 4 }}>{item.duoName}</p>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{item.vibe} · {item.when}</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>📍 {item.spot}</p>
            <button
              type="button"
              style={{
                background:   C.gradientCTA,
                color:        '#fff',
                border:       'none',
                borderRadius: 10,
                padding:      '10px 20px',
                fontSize:     13,
                fontWeight:   700,
                cursor:       'pointer',
              }}
            >
              Chat →
            </button>
          </div>
        ))}

        {/* OC SPOTS */}
        <div style={{ marginBottom: 12, marginTop: 28 }}>
          <p style={SECTION_LABEL}>OC Spots</p>
        </div>

        <div
          className="no-scrollbar"
          style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}
        >
          {OC_SPOTS.map((spot) => <SpotCard key={spot.id} spot={spot} />)}
        </div>

      </div>

      <BottomNav activePage="hangouts" onNavigate={(tab) => go(tab)} />
    </div>
  );
}
