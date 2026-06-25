import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Glowing arcade banner — fires when it becomes the player's turn in a P-U-C-K game.
 * Two visual states: orange (set) and red (match).
 * Auto-dismisses after 7 seconds.
 */
export default function PuckTurnBanner({ data, onDismiss, onView }) {
  const { opponentName, action } = data
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 7000)
    return () => clearTimeout(timerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isSet       = action === 'set'
  const accentColor = isSet ? '#f97316' : '#ef4444'
  const glowHex     = isSet ? '#f9731622' : '#ef444422'
  const icon        = isSet ? '🏒' : '🚨'
  const headline    = isSet ? 'YOUR TURN TO SET!' : 'MATCH THIS SHOT!'
  const subtext     = isSet
    ? `Film your trick shot vs ${opponentName}.`
    : `${opponentName} set a new shot. Match it or get a letter!`

  return (
    <>
      <style>{`
        @keyframes puckBannerIn {
          from { transform: translateX(-50%) translateY(-110%); opacity: 0 }
          to   { transform: translateX(-50%) translateY(0);      opacity: 1 }
        }
        @keyframes puckBannerGlow {
          0%,100% { box-shadow: 0 0 22px ${accentColor}44, 0 4px 20px rgba(0,0,0,0.6) }
          50%     { box-shadow: 0 0 44px ${accentColor}99, 0 4px 20px rgba(0,0,0,0.6) }
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
          background: 'linear-gradient(135deg,#0d0a04,#1a1000)',
          border: `2px solid ${accentColor}`,
          borderRadius: 16,
          padding: '14px 44px 14px 16px',
          cursor: 'pointer',
          animation: 'puckBannerIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both, puckBannerGlow 1.8s ease-in-out 0.4s infinite',
          display: 'flex', alignItems: 'center', gap: 12,
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{icon}</div>

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
            fontSize: 13, fontWeight: 600, color: '#94a3b8',
            marginTop: 3, lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {subtext}
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            color: accentColor, marginTop: 5,
          }}>
            TAP TO PLAY →
          </div>
        </div>

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
