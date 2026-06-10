import { Component } from 'react';

// App-wide error boundary. Any uncaught render error is caught here so the user
// sees a recoverable screen instead of a blank white page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log for debugging; wire up to a crash reporter (Sentry) here later.
    console.error('[DUO OC] Uncaught error:', error, info);

    const message = String(error?.message ?? error ?? '');
    const isChunkLoadError =
      error?.name === 'ChunkLoadError' ||
      /failed to fetch dynamically imported module/i.test(message) ||
      /importing a module script failed/i.test(message) ||
      /loading chunk/i.test(message);

    if (!isChunkLoadError) return;

    try {
      const key = 'duo_oc_chunk_reload_v1';
      if (sessionStorage.getItem(key) === '1') return;
      sessionStorage.setItem(key, '1');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight:      '100vh',
          background:     '#FFFFFF',
          color:          '#111111',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          textAlign:      'center',
          padding:        '0 28px',
          fontFamily:     "'DM Sans', system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(17,17,17,0.55)', margin: '0 0 24px', lineHeight: 1.6, maxWidth: 320 }}>
          An unexpected error occurred. Refreshing usually fixes it.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          style={{
            padding:      '14px 28px',
            borderRadius: 14,
            border:       'none',
            background:   'linear-gradient(135deg, #FF6B00 0%, #FF8A1F 100%)',
            color:        '#FFFFFF',
            fontSize:     15,
            fontWeight:   800,
            cursor:       'pointer',
            boxShadow:    '0 10px 26px rgba(255,107,0,0.3)',
          }}
        >
          Refresh
        </button>
      </div>
    );
  }
}
