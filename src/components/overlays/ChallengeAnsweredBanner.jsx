import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Glowing arcade banner — fires when the CHALLENGER's sent challenge is answered.
 * Auto-dismisses after 7 seconds.  Three result states: win, loss, draw.
 */
export default function ChallengeAnsweredBanner({ data, onDismiss, onView }) {
  const { opponentName, won, isDraw } = data
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 7000)
    return () => clearTimeout(timerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const accentColor = isDraw ? '#06b6d4' : won ? '#22c55e' : '#ef4444'
  const glowColor   = isDraw ? '#06b6d422' : won ? '#22c55e22' : '#ef444422'
  const icon        = isDraw ? '🤝' : won ? '⚡' : '💀'
  const headline    = isDraw ? "IT'S A TIE!" : won ? 'CHALLENGE WON!' : 'CHALLENGE ANSWERED'
  const subtext     = isDraw
    ? `You and ${opponentName} tied it up. See you next time.`
    : won
      ? `${opponentName} answered — and you came out on top.`
      : `${opponentName} just answered your challenge. Check the results!`

  return (
    <>
      <style>{`
        @keyframes bannerSlideDown {
          from { transform: translateX(-50%) translateY(-100%); opacity: 0 }
          to   { transform: translateX(-50%) translateY(0);     opacity: 1 }
        }
        @keyframes bannerPulseGlow {
          0%,100% { box-shadow: 0 0 24px ${accentColor}44, 0 4px 24px rgba(0,0,0,0.6) }
          50%     { box-shadow: 0 0 44px ${accentColor}88, 0 4px 24px rgba(0,0,0,0.6) }
        }
      `}</style>
      <div
        onClick={onView}
        style={{
          position: 'fixed',
          top: 72, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9100,
          width: 'calc(100% - 32px)',
          maxWidth: 440,
          background: `linear-gradient(135deg, #080d1a, #0f1726)`,
          border: `2px solid ${accentColor}`,
          borderRadius: 16,
          padding: '14px 44px 14px 16px',
          cursor: 'pointer',
          animation: 'bannerSlideDown 0.35s cubic-bezier(0.34,1.56,0.64,1) both, bannerPulseGlow 2s ease-in-out 0.4s infinite',
          display: 'flex', alignItems: 'center', gap: 12,
          userSelect: 'none',
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{icon}</div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Bangers',sans-serif",
            fontSize: 18, letterSpacing: '0.08em', lineHeight: 1.1,
            color: accentColor,
          }}>
            {headline}
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 13, fontWeight: 600,
            color: '#94a3b8', marginTop: 3, lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {subtext}
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 11, fontWeight: 800,
            color: accentColor, letterSpacing: '0.1em', marginTop: 5,
          }}>
            TAP TO VIEW RESULTS →
          </div>
        </div>

        {/* Close button — stop propagation so it doesn't also trigger onView */}
        <button
          onClick={e => { e.stopPropagation(); onDismiss() }}
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: '#475569', display: 'flex', padding: 4,
          }}
        >
          <X size={15} />
        </button>
      </div>
    </>
  )
}
