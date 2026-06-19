import { useState, useEffect } from 'react'

// Hook for animated rolling number counter
function useRollingValue(finalValue, duration = 1800) {
  const [displayValue, setDisplayValue] = useState(0)
  useEffect(() => {
    if (finalValue === 0) return
    const startTime = performance.now()
    const animationId = requestAnimationFrame(function animate(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      setDisplayValue(Math.round(easeProgress * finalValue))
      if (progress < 1) requestAnimationFrame(animate)
    })
    return () => cancelAnimationFrame(animationId)
  }, [finalValue, duration])
  return displayValue
}

export default function PuckGameOverlay({ game, playerElo, onRematch, onClose }) {
  const iWon = playerElo.delta > 0
  const eloDisplay = useRollingValue(Math.abs(playerElo.delta), 1800)

  // Play sound effect when overlay mounts
  useEffect(() => {
    try {
      if (iWon) {
        // Play win fanfare
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav').play().catch(() => {})
      } else {
        // Play game-over fail sound
        new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-81.wav').play().catch(() => {})
      }
    } catch {}
  }, [iWon])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: iWon
          ? 'radial-gradient(circle at 50% 30%, rgba(251,191,36,0.3), rgba(0,0,0,0.9))'
          : 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.4), rgba(0,0,0,0.95))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
        backdropFilter: 'blur(4px)',
        animation: iWon ? 'none' : 'redVignettePulse 0.3s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 340,
          background: 'linear-gradient(160deg,#080b14,#0f1628)',
          border: `2px solid ${iWon ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
          borderRadius: 24,
          padding: '32px 24px',
          textAlign: 'center',
          boxShadow: iWon
            ? '0 0 60px rgba(34,197,94,0.15), 0 24px 48px rgba(0,0,0,0.6)'
            : '0 0 60px rgba(239,68,68,0.15), 0 24px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Result emoji */}
        <div style={{ fontSize: 64, marginBottom: 12, lineHeight: 1 }}>
          {iWon ? '🏆' : '💀'}
        </div>

        {/* Main title */}
        <div
          style={{
            fontFamily: "'Bangers',sans-serif",
            fontSize: 48,
            letterSpacing: '0.08em',
            color: iWon ? '#fbbf24' : '#ef4444',
            textShadow: iWon
              ? '0 0 60px #fbbf2455, 0 0 30px #fbbf2466, 0 0 20px #fbbf2477'
              : '0 0 60px #ef444466, 0 0 30px #ef444477, 0 0 20px #ef444488',
            marginBottom: 8,
            lineHeight: 1,
            animation: iWon ? 'goldenPulse 0.4s ease-out' : 'none',
          }}
        >
          {iWon ? 'VICTORY! YOU BROKE THE COMPETITION 🏆' : 'DEFEAT! YOU SPELLED P-U-C-K 💀'}
        </div>

        {/* Subtitle (removed - title now contains full message) */}

        {/* ELO Delta */}
        <div
          style={{
            background: 'rgba(15,23,42,0.7)',
            borderRadius: 16,
            padding: '16px 12px',
            marginBottom: 28,
            marginTop: 20,
            border: `1px solid ${iWon ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          <div
            style={{
              fontFamily: "'Bangers',sans-serif",
              fontSize: 36,
              color: iWon ? '#22c55e' : '#ef4444',
              lineHeight: 1,
              marginBottom: 4,
              letterSpacing: '0.02em',
            }}
          >
            {iWon ? '▲' : '▼'} {eloDisplay}
          </div>
          <div
            style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 11,
              color: '#94a3b8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            ELO RATING
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <button
            onClick={onRematch}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg,#dc2626,#ef4444)',
              color: '#fff',
              border: '2px solid #ef4444',
              borderRadius: 14,
              padding: '16px 20px',
              fontFamily: "'Bangers',sans-serif",
              fontSize: 20,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              boxShadow: '0 0 30px #ef444466, 0 0 60px #ef444433',
              animation: 'rematchPulse 1.2s ease-in-out infinite',
              fontWeight: 'bold',
            }}
          >
            🔄 REMATCH?
          </button>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid #475569',
              borderRadius: 12,
              padding: '12px 16px',
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 13,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#64748b'
              e.target.style.color = '#cbd5e1'
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#475569'
              e.target.style.color = '#94a3b8'
            }}
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  )
}
