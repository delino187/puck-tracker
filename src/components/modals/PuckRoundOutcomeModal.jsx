import { useEffect, useState } from 'react'

const PUCK_LETTERS = ['P', 'U', 'C', 'K']

export default function PuckRoundOutcomeModal({ outcome, opponentName, onDismiss }) {
  const [animate, setAnimate] = useState(false)

  // Play sound and trigger animation on mount
  useEffect(() => {
    // Delay animation slightly so mount is visible first
    const timer = setTimeout(() => setAnimate(true), 100)

    // Play audio
    try {
      const audio = new Audio('/sounds/retro-game-notification.mp3')
      audio.volume = 0.6
      audio.play().catch(err => console.log('Audio autoplay deferred:', err))
    } catch (err) {
      console.log('Audio playback error:', err)
    }

    return () => clearTimeout(timer)
  }, [])

  const isMade = outcome.type === 'made'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: isMade
        ? 'radial-gradient(ellipse at 50% 30%, rgba(34,197,94,0.25), rgba(0,0,0,0.95))'
        : 'radial-gradient(ellipse at 50% 30%, rgba(239,68,68,0.25), rgba(0,0,0,0.95))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(4px)',
    }}>
      <style>{`
        @keyframes outcomeSlideUp {
          from { transform: translateY(40px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
        @keyframes letterPulse {
          0%, 100%   { transform: scale(1);    filter: drop-shadow(0 0 8px currentColor) }
          50%        { transform: scale(1.15); filter: drop-shadow(0 0 24px currentColor) }
        }
        @keyframes letterAppear {
          from { color: #1e293b; filter: drop-shadow(0 0 0px rgba(239,68,68,0)) }
          to   { color: ${isMade ? '#22c55e' : '#ef4444'}; filter: drop-shadow(0 0 12px currentColor) }
        }
        .outcome-modal {
          animation: outcomeSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .letter-animate {
          animation: letterAppear 0.5s ease-out forwards, letterPulse 0.6s ease-in-out 0.5s forwards;
        }
      `}</style>

      <div className="outcome-modal" style={{
        textAlign: 'center',
        maxWidth: 320,
      }}>
        {/* Header */}
        <div style={{
          fontFamily: "'Bangers',sans-serif",
          fontSize: isMade ? 56 : 52,
          letterSpacing: '0.08em',
          color: isMade ? '#22c55e' : '#ef4444',
          textShadow: isMade
            ? '0 0 40px #22c55e77, 0 0 20px #22c55e44'
            : '0 0 40px #ef444477, 0 0 20px #ef444444',
          marginBottom: 16,
          lineHeight: 1,
        }}>
          {isMade ? 'CHALLENGE MATCHED!' : 'LETTER AWARDED!'}
        </div>

        {/* Opponent name + outcome text */}
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 16,
          color: '#cbd5e1',
          letterSpacing: '0.04em',
          marginBottom: 28,
          lineHeight: 1.6,
        }}>
          <strong style={{ color: '#f1f5f9' }}>{opponentName}</strong>
          {' '}
          {isMade ? 'matched your shot.' : 'missed the match!'}
          <br />
          {isMade ? 'Defensive pressure cleared!' : 'They take a letter.'}
        </div>

        {/* Letter display — only for missed shots */}
        {!isMade && outcome.letterAwarded && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32,
          }}>
            {PUCK_LETTERS.map((letter, idx) => (
              <div key={letter} style={{
                fontFamily: "'Bangers',sans-serif",
                fontSize: 42,
                letterSpacing: '0.04em',
                color: idx < outcome.letterAwarded ? '#ef4444' : '#1e293b',
                textShadow: idx < outcome.letterAwarded ? '0 0 16px #ef4444aa' : 'none',
                lineHeight: 1,
                animation: animate && idx < outcome.letterAwarded
                  ? 'letterAppear 0.4s ease-out forwards'
                  : 'none',
                animationDelay: animate ? `${100 + idx * 80}ms` : 'unset',
              }}>
                {letter}
              </div>
            ))}
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={onDismiss}
          style={{
            background: isMade
              ? 'linear-gradient(135deg,#15803d,#22c55e)'
              : 'linear-gradient(135deg,#991b1b,#ef4444)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '14px 32px',
            fontFamily: "'Bangers',sans-serif",
            fontSize: 20,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            boxShadow: isMade
              ? '0 0 24px #22c55e44'
              : '0 0 24px #ef444444',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = isMade
              ? '0 0 32px #22c55e66'
              : '0 0 32px #ef444466'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = isMade
              ? '0 0 24px #22c55e44'
              : '0 0 24px #ef444444'
          }}
        >
          CONTINUE
        </button>
      </div>
    </div>
  )
}
