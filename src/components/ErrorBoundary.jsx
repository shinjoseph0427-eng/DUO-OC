import { Component } from 'react';

// App-wide error boundary. Any uncaught render error is caught here so the user
// sees a recoverable screen instead of a blank white page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log for debugging; wire up to a crash reporter (Sentry) here later.
    console.error('[DUO OC] Uncaught error:', error, info);
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
        <div style={{ fontSize: 44, marginBottom: 16 }}>😵‍💫</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
          문제가 생겼어
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(17,17,17,0.55)', margin: '0 0 24px', lineHeight: 1.6, maxWidth: 320 }}>
          예상치 못한 오류가 발생했어. 새로고침하면 대부분 해결돼.
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
          새로고침
        </button>
      </div>
    );
  }
}
