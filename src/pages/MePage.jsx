import { C } from '../tokens';
import TopBar from '../components/TopBar.jsx';
import BottomNav from '../components/BottomNav.jsx';

export default function MePage({ go }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <TopBar title="Me" />

      <div style={{ flex: 1, padding: '20px 16px' }}>
        <p
          style={{
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '1.1px',
            textTransform: 'uppercase',
            color:         C.muted,
            margin:        '0 0 10px',
          }}
        >
          My Duo
        </p>
        <div
          style={{
            background:   C.cardElevated,
            borderLeft:   `3px solid ${C.amber}`,
            borderRadius: 12,
            padding:      16,
            marginBottom: 28,
          }}
        >
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            Your duo profile will appear here after joining.
          </p>
        </div>

        <p
          style={{
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '1.1px',
            textTransform: 'uppercase',
            color:         C.muted,
            margin:        '0 0 10px',
          }}
        >
          Matches
        </p>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
          No matches yet. Start browsing duos!
        </p>
      </div>

      <BottomNav activePage="me" onNavigate={(tab) => go(tab)} />
    </div>
  );
}
