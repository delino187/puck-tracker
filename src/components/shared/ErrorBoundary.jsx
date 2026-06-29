import { Component } from 'react'

// ── App-owned localStorage keys cleared on hard reset ─────────────────────────
// Wiping only our own keys prevents nuking unrelated browser storage while still
// breaking any corrupt-state crash loop.
const APP_STORAGE_KEYS = [
  'puck_v5',               // main app state (PlayerContext / sessions)
  'hsh_global_app_state',  // Zustand (economy, technique, settings)
  'offline_sync_outbox',   // SyncQueue outbox
  'puck_activePlayer',     // last active player ID
]

function softReload() {
  window.location.reload()
}

function hardReset() {
  APP_STORAGE_KEYS.forEach(k => { try { localStorage.removeItem(k) } catch {} })
  window.location.reload()
}

// ─────────────────────────────────────────────────────────────────────────────
// GlobalErrorBoundary
// ─────────────────────────────────────────────────────────────────────────────
// Wraps the entire React tree in main.jsx (outside all providers).
// Any uncaught render/lifecycle error bubbles here instead of going blank.
//
// Props:
//   onError(error, errorInfo)  optional — hook for Sentry / error-reporting service
// ─────────────────────────────────────────────────────────────────────────────
export class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null, showDetails: false }
    this.toggleDetails = this.toggleDetails.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)
  }

  toggleDetails() {
    this.setState(s => ({ showDetails: !s.showDetails }))
  }

  render() {
    if (!this.state.error) return this.props.children

    const { error, errorInfo, showDetails } = this.state
    const errName    = error?.name    || 'RuntimeError'
    const errMessage = error?.message || String(error)

    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at 50% 20%, #0a0f1e 0%, #050810 60%, #020408 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
        fontFamily: "'Barlow Condensed', sans-serif",
        overflowY: 'auto',
        zIndex: 9999,
      }}>
        <style>{`
          @keyframes eb-pulse {
            0%,100% { transform: scale(1) rotate(-4deg); }
            50%      { transform: scale(1.12) rotate(4deg); }
          }
          @keyframes eb-glow {
            0%,100% { text-shadow: 0 0 30px #ef444488, 0 0 60px #ef444422; }
            50%      { text-shadow: 0 0 60px #ef4444cc, 0 0 120px #ef444444; }
          }
          @keyframes eb-slide {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .eb-btn {
            padding: 13px 28px;
            border-radius: 12px;
            font-family: 'Bangers', sans-serif;
            font-size: 18px;
            letter-spacing: 0.08em;
            cursor: pointer;
            transition: transform 0.12s, box-shadow 0.12s;
          }
          .eb-btn:active { transform: scale(0.96); }
        `}</style>

        {/* Puck icon */}
        <div style={{
          fontSize: 72, lineHeight: 1, marginBottom: 18,
          animation: 'eb-pulse 2.4s ease-in-out infinite',
          filter: 'drop-shadow(0 0 18px rgba(239,68,68,0.5))',
        }}>
          🏒
        </div>

        {/* Headline */}
        <div style={{
          fontFamily: "'Bangers', sans-serif",
          fontSize: 'clamp(28px, 8vw, 48px)',
          letterSpacing: '0.1em',
          lineHeight: 1.1,
          color: '#ef4444',
          textAlign: 'center',
          marginBottom: 10,
          animation: 'eb-glow 2s ease-in-out infinite, eb-slide 0.4s ease-out both',
        }}>
          TOOK A PUCK TO THE NET!
        </div>

        {/* Sub-headline */}
        <div style={{
          fontSize: 16, fontWeight: 700, color: '#94a3b8',
          letterSpacing: '0.04em', textAlign: 'center',
          marginBottom: 24, lineHeight: 1.5,
          animation: 'eb-slide 0.44s ease-out 0.06s both',
        }}>
          Something unexpected crashed the app.
          <br />
          Your data is safe in local storage and Firestore.
        </div>

        {/* Error badge */}
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 10, padding: '8px 18px',
          fontSize: 13, fontWeight: 800,
          color: '#fca5a5', letterSpacing: '0.08em',
          marginBottom: 28,
          animation: 'eb-slide 0.48s ease-out 0.1s both',
          maxWidth: 380, textAlign: 'center', wordBreak: 'break-word',
        }}>
          {errName}: {errMessage}
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320,
          animation: 'eb-slide 0.5s ease-out 0.14s both',
        }}>
          {/* Primary — soft reload, no data loss */}
          <button
            className="eb-btn"
            onClick={softReload}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
              color: '#fff', border: '2px solid #3b82f6',
              boxShadow: '0 0 24px rgba(59,130,246,0.4)',
            }}
          >
            🔄 RELOAD APP
          </button>

          {/* Secondary — wipe local cache in case the state itself is corrupt */}
          <button
            className="eb-btn"
            onClick={hardReset}
            style={{
              background: 'transparent',
              color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.5)',
              fontSize: 15,
            }}
          >
            ⚠️ CLEAR CACHE &amp; RELOAD
          </button>
        </div>

        {/* Collapsible stack trace for debugging */}
        <button
          onClick={this.toggleDetails}
          style={{
            marginTop: 28, background: 'none', border: 'none',
            cursor: 'pointer', color: '#475569',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', textDecoration: 'underline',
            animation: 'eb-slide 0.52s ease-out 0.18s both',
          }}
        >
          {showDetails ? 'HIDE DETAILS ▲' : 'SHOW DETAILS ▼'}
        </button>

        {showDetails && (
          <pre style={{
            marginTop: 12, padding: '14px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #1e293b',
            borderRadius: 10,
            fontSize: 10, color: '#64748b', lineHeight: 1.6,
            maxWidth: 420, width: '100%',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            overflowY: 'auto', maxHeight: 220,
          }}>
            {errorInfo?.componentStack?.trim() ?? 'No stack available.'}
          </pre>
        )}

        <div style={{
          marginTop: 24, fontSize: 10, color: '#334155',
          letterSpacing: '0.08em', textAlign: 'center',
          animation: 'eb-slide 0.54s ease-out 0.22s both',
        }}>
          PUCK TRACKER · GLOBAL ERROR BOUNDARY
        </div>
      </div>
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WidgetErrorBoundary
// ─────────────────────────────────────────────────────────────────────────────
// Wraps individual tabs, dashboard panels, or screen sections.
// On error, renders a compact inline card so the rest of the UI stays alive.
// The "Try Again" button resets the error state without reloading the page.
//
// Props:
//   label      string  — human-readable name for the section ("Leaderboard", "Stats…")
//   onError    fn      — optional error reporter
// ─────────────────────────────────────────────────────────────────────────────
export class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state  = { error: null }
    this.retry  = this.retry.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  retry() {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    const label   = this.props.label || 'this section'
    const message = this.state.error?.message || String(this.state.error)

    return (
      <div style={{
        margin: '12px 16px',
        padding: '18px 16px',
        background: 'linear-gradient(135deg, #0f172a, #1a0f20)',
        border: '1.5px solid rgba(239,68,68,0.3)',
        borderRadius: 14,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, textAlign: 'center',
        fontFamily: "'Barlow Condensed', sans-serif",
      }}>
        <div style={{ fontSize: 28, lineHeight: 1 }}>🏒</div>

        <div style={{
          fontFamily: "'Bangers', sans-serif",
          fontSize: 18, letterSpacing: '0.08em',
          color: '#ef4444', lineHeight: 1.1,
        }}>
          WIDGET CRASH
        </div>

        <div style={{
          fontSize: 13, fontWeight: 700, color: '#64748b',
          lineHeight: 1.5, letterSpacing: '0.03em',
        }}>
          {label} hit the boards.
          <br />
          <span style={{ fontSize: 11, color: '#334155' }}>{message}</span>
        </div>

        <button
          onClick={this.retry}
          style={{
            marginTop: 4,
            padding: '8px 22px',
            background: 'rgba(239,68,68,0.12)',
            border: '1.5px solid rgba(239,68,68,0.4)',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: "'Bangers', sans-serif",
            fontSize: 15, letterSpacing: '0.08em',
            color: '#fca5a5',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
        >
          🔄 TRY AGAIN
        </button>
      </div>
    )
  }
}
