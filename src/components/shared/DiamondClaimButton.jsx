import { useState } from 'react'

export default function DiamondClaimButton({ onClaimed }) {
  const [animating, setAnimating] = useState(false)
  const [done,      setDone]      = useState(false)

  function handleTap() {
    if (animating || done) return
    setAnimating(true)
    try { new Audio('/fairy-arcade-sparkle.mp3').play().catch(() => {}) } catch {}
    setTimeout(() => {
      onClaimed?.()
      setDone(true)
      setAnimating(false)
    }, 700)
  }

  if (done) return null

  return (
    <>
      <style>{`
        @keyframes dClaimFloat {
          0%   { transform: scale(1); opacity: 1; }
          25%  { transform: scale(1.38); }
          100% { transform: scale(0.25) translate(-240px, 340px); opacity: 0; }
        }
        @keyframes dClaimPulse {
          0%,100% { transform: scale(1);    filter: drop-shadow(0 0 10px #fbbf2488); }
          50%      { transform: scale(1.14); filter: drop-shadow(0 0 22px #fbbf24cc); }
        }
        @keyframes dClaimShimmer {
          0%,100% { opacity: 1 }
          50%      { opacity: 0.55 }
        }
      `}</style>

      <button
        onClick={handleTap}
        style={{
          background: 'none', border: 'none',
          cursor: animating ? 'default' : 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          padding: 0,
          animation: animating
            ? 'dClaimFloat 0.7s ease-in forwards'
            : 'dClaimPulse 1.1s ease-in-out infinite',
        }}
      >
        <div style={{ fontSize: 52, lineHeight: 1 }}>💎</div>
        {!animating && (
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 12, fontWeight: 800,
            color: '#fbbf24', letterSpacing: '0.14em',
            animation: 'dClaimShimmer 1s ease-in-out infinite',
          }}>
            TAP TO CLAIM VICTORY BONUS!
          </div>
        )}
      </button>
    </>
  )
}
