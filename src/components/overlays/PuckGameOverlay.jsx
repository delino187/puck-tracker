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

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: iWon
          ? 'radial-gradient(circle at 40% 50%, rgba(34,197,94,0.25), rgba(0,0,0,0.8))'
          : 'radial-gradient(circle at 40% 50%, rgba(239,68,68,0.25), rgba(0,0,0,0.8))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
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
            fontSize: 42,
            letterSpacing: '0.06em',
            color: iWon ? '#22c55e' : '#ef4444',
            textShadow: iWon
              ? '0 0 40px #22c55e55, 0 0 20px #22c55e33'
              : '0 0 40px #ef444455, 0 0 20px #ef444433',
            marginBottom: 8,
            lineHeight: 1,
          }}
        >
          {iWon ? 'KNOCKOUT!' : 'WASTED!'}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: "'Bangers',sans-serif",
            fontSize: 24,
            color: '#f1f5f9',
            letterSpacing: '0.04em',
            marginBottom: 24,
          }}
        >
          {iWon ? 'YOU WIN!' : 'YOU LOSE!'}
        </div>

        {/* ELO Delta */}
        <div
          style={{
            background: 'rgba(15,23,42,0.7)',
            borderRadius: 16,
            padding: '16px 12px',
            marginBottom: 24,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onRematch}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg,#7f1d1d,#ef4444)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 16px',
              fontFamily: "'Bangers',sans-serif",
              fontSize: 18,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              boxShadow: '0 0 20px #ef444440',
            }}
          >
            🔥 REMATCH
          </button>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: '12px 16px',
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 14,
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  )
}
