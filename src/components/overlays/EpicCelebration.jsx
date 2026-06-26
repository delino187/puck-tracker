import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { TIER } from '../../constants/badges.js'

export default function EpicCelebration({ type, level, badge, onClose, onClaimBonus }) {
  // Safety gate: if the type is unrecognised or required data is missing, render
  // a minimal fallback that always has a close path to prevent a frozen screen.
  const isLevelUp = type === 'levelup'
  const isBadge   = type === 'badge'
  if (!isLevelUp && !isBadge) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        zIndex: 2000, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 48, color: '#fbbf24', marginBottom: 24 }}>
          ⭐
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#fbbf24', color: '#000', border: 'none',
            borderRadius: 14, padding: '14px 40px',
            fontFamily: "'Bangers',sans-serif", fontSize: 24, letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          CONTINUE
        </button>
      </div>
    )
  }

  const tc          = badge ? TIER[badge.tier] : null
  const accentColor = isLevelUp ? (level?.color   ?? '#ffd700') : (tc?.ring     ?? '#a855f7')
  const glowBase    = isLevelUp ? (level?.glow    ?? '#ffd700') : (tc?.ring     ?? '#a855f7')
  const bgGradient  = isLevelUp ? (level?.bg      ?? '#1e293b') : (badge?.innerBg ?? tc?.bg ?? '#1e293b')
  const imgSrc      = isLevelUp ? level?.img : badge?.img
  const IconC       = (!imgSrc && badge?.Icon) ? badge.Icon : null
  const iconColor   = badge?.innerIcon ?? '#e9d5ff'

  const [claimed,   setClaimed]   = useState(false)
  const [animating, setAnimating] = useState(false)
  const diamondRef                = useRef(null)

  useEffect(() => {
    const colors = isLevelUp
      ? [accentColor, '#ffffff', '#fef08a', '#fbbf24']
      : [accentColor, '#ffffff', '#e9d5ff', '#f0abfc']

    confetti({ particleCount: 150, spread: 80, origin: { y: 0.55 }, colors })
    const t1 = setTimeout(() => confetti({ particleCount: 80, spread: 55, angle: 60,  origin: { x: 0.05, y: 0.65 }, colors }), 260)
    const t2 = setTimeout(() => confetti({ particleCount: 80, spread: 55, angle: 120, origin: { x: 0.95, y: 0.65 }, colors }), 260)
    const t3 = setTimeout(() => confetti({ particleCount: 100, spread: 110, origin: { y: 0.5 }, colors }), 850)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClaimTap() {
    if (claimed || animating || !onClaimBonus) return
    setAnimating(true)

    // Audio
    try { new Audio('/fairy-arcade-sparkle.wav').play().catch(() => {}) } catch {}

    // After fly animation ends, award and close
    setTimeout(() => {
      onClaimBonus()
      setClaimed(true)
      setAnimating(false)
      setTimeout(onClose, 380)
    }, 700)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.96)',
      zIndex: 2000,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <style>{`
        @keyframes epicEntry {
          0%   { transform: scale(0.15) rotate(-30deg); opacity: 0; }
          55%  { transform: scale(1.20) rotate(7deg);   opacity: 1; }
          72%  { transform: scale(0.93) rotate(-3deg); }
          86%  { transform: scale(1.05) rotate(1.5deg); }
          100% { transform: scale(1)    rotate(0deg);   }
        }
        @keyframes epicPulse {
          0%, 100% { box-shadow: 0 0 40px 10px ${glowBase}55, 0 0 80px 20px ${glowBase}33; }
          50%       { box-shadow: 0 0 70px 24px ${glowBase}88, 0 0 140px 50px ${glowBase}55; }
        }
        @keyframes diamondFloat {
          0%   { transform: scale(1); }
          25%  { transform: scale(1.35); }
          100% { transform: scale(0.3) translate(-220px, 320px); opacity: 0; }
        }
        @keyframes diamondPulse {
          0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 10px #fbbf2488); }
          50%       { transform: scale(1.12); filter: drop-shadow(0 0 22px #fbbf24cc); }
        }
        @keyframes claimShimmer {
          0%,100% { opacity: 1 }
          50%      { opacity: 0.6 }
        }
      `}</style>

      {/* Headline */}
      <div style={{
        fontFamily: "'Bangers',sans-serif",
        fontSize: 'clamp(44px,13vw,68px)',
        letterSpacing: '0.08em',
        color: accentColor,
        textShadow: `0 0 30px ${glowBase}88, 0 0 80px ${glowBase}44`,
        marginBottom: 28, lineHeight: 1, textAlign: 'center',
      }}>
        {isLevelUp ? 'LEVEL UP!' : 'BADGE UNLOCKED!'}
      </div>

      {/* Badge / level image */}
      <div style={{
        width: 172, height: 172, borderRadius: '50%',
        background: bgGradient,
        border: `5px solid ${accentColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0, position: 'relative',
        animation: 'epicEntry 0.72s cubic-bezier(0.22,1,0.36,1) both, epicPulse 2.2s 0.72s ease-in-out infinite',
        marginBottom: 26,
      }}>
        {imgSrc ? (
          <img src={imgSrc} alt={isLevelUp ? level?.name : badge?.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.1)' }} />
        ) : IconC ? (
          <IconC size={70} color={iconColor} strokeWidth={1.3} />
        ) : null}
      </div>

      {/* Name */}
      <div style={{
        fontFamily: "'Bangers',sans-serif",
        fontSize: 'clamp(28px,8vw,46px)',
        color: '#f1f5f9', letterSpacing: '0.04em',
        marginBottom: 10, textAlign: 'center', lineHeight: 1.1,
      }}>
        {isLevelUp ? level?.name : badge?.name}
      </div>

      {/* Desc */}
      <div style={{
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 15, color: '#94a3b8',
        marginBottom: !isLevelUp ? 22 : 38,
        textAlign: 'center', lineHeight: 1.4, maxWidth: 300,
      }}>
        {isLevelUp ? "You've reached a new rank!" : badge?.desc}
      </div>

      {/* ── Interactive diamond claim (badge unlocks only) ───────────────── */}
      {!isLevelUp && onClaimBonus && !claimed && (
        <button
          ref={diamondRef}
          onClick={handleClaimTap}
          disabled={animating}
          style={{
            background: 'none', border: 'none', cursor: animating ? 'default' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            marginBottom: 22, padding: 0,
            animation: animating
              ? 'diamondFloat 0.7s ease-in forwards'
              : 'diamondPulse 1.1s ease-in-out infinite',
          }}
        >
          <div style={{ fontSize: 52, lineHeight: 1 }}>💎</div>
          {!animating && (
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 12, fontWeight: 800, color: '#fbbf24',
              letterSpacing: '0.14em',
              animation: 'claimShimmer 1s ease-in-out infinite',
            }}>
              TAP TO CLAIM +1 💎!
            </div>
          )}
        </button>
      )}

      {/* CTA — shown after claiming or for level-ups */}
      {(isLevelUp || claimed) && (
        <button
          onClick={onClose}
          style={{
            background: accentColor, color: '#000', border: 'none',
            borderRadius: 14, padding: '15px 48px',
            fontFamily: "'Bangers',sans-serif", fontSize: 26,
            letterSpacing: '0.10em', cursor: 'pointer',
            boxShadow: `0 0 30px ${glowBase}66, 0 4px 20px rgba(0,0,0,0.5)`,
          }}
        >
          LET'S GO!
        </button>
      )}

      {/* Safety-net close — always visible so the player is never stuck if
          badge data is partial or onClaimBonus is unexpectedly missing */}
      {!isLevelUp && !claimed && !onClaimBonus && (
        <button
          onClick={onClose}
          style={{
            background: accentColor, color: '#000', border: 'none',
            borderRadius: 14, padding: '15px 48px',
            fontFamily: "'Bangers',sans-serif", fontSize: 26,
            letterSpacing: '0.10em', cursor: 'pointer',
            boxShadow: `0 0 30px ${glowBase}66, 0 4px 20px rgba(0,0,0,0.5)`,
          }}
        >
          LET'S GO!
        </button>
      )}
    </div>
  )
}
