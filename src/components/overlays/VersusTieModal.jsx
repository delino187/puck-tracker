import { useEffect, useMemo, useState } from 'react'
import { audioEngine } from '../../services/audioEngine.js'

const CONFETTI_COLORS = ['#06b6d4','#22c55e','#a78bfa','#fbbf24','#f97316','#fff','#cffafe']

export default function VersusTieModal({ reward, opponentName, onClaim, onRematch }) {
  const [tapped, setTapped] = useState(false)

  useEffect(() => {
    audioEngine.playHeavyMp3('/compliment-shine.mp3', 0.8)
    return () => audioEngine.stopHeavyAudio()
  }, [])

  const confetti = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id:       i,
      left:     `${(i / 24) * 100 + (Math.random() - 0.5) * 7}%`,
      delay:    `${(Math.random() * 2).toFixed(2)}s`,
      duration: `${(2.4 + Math.random() * 2.2).toFixed(2)}s`,
      color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size:     6 + Math.floor(Math.random() * 9),
      shape:    i % 3 === 0 ? '50%' : '2px',
    }))
  , []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTap() {
    if (tapped) return
    audioEngine.stopHeavyAudio()
    try {
      const sparkle = new Audio('/fairy-arcade-sparkle.mp3')
      sparkle.volume = 0.9
      sparkle.play().catch(() => {})
    } catch {}
    setTapped(true)
    setTimeout(() => onClaim(), 750)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'radial-gradient(ellipse at 50% 15%, #001a2e 0%, #000f1a 55%, #000508 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px 48px',
    }}>
      <style>{`
        @keyframes tie-halo {
          0%,100% { box-shadow: 0 0 80px 30px rgba(6,182,212,0.16) }
          50%     { box-shadow: 0 0 150px 60px rgba(6,182,212,0.30) }
        }
        @keyframes tie-title {
          0%,100% { text-shadow: 0 0 60px #06b6d299, 0 3px 0 #164e63 }
          50%     { text-shadow: 0 0 110px #06b6d2cc, 0 3px 0 #164e63 }
        }
        @keyframes tie-slideUp {
          from { transform: translateY(28px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
        @keyframes tie-handshake {
          0%,100% { transform: scale(1) rotate(-4deg) }
          50%     { transform: scale(1.1) rotate(4deg) }
        }
        @keyframes tie-pulse {
          0%,100% { transform: scale(1);    filter: drop-shadow(0 0 18px #06b6d288) }
          50%     { transform: scale(1.2);  filter: drop-shadow(0 0 38px #06b6d2dd) }
        }
        @keyframes tie-shimmer {
          0%,100% { opacity: 1 }
          50%     { opacity: 0.45 }
        }
        @keyframes tie-fly {
          0%   { transform: scale(1);    opacity: 1 }
          20%  { transform: scale(1.5);  opacity: 1 }
          100% { transform: scale(0.15) translate(-300px, 460px); opacity: 0 }
        }
        @keyframes tie-confetti {
          0%   { transform: translateY(-30px) rotate(0deg); opacity: 1 }
          80%  { opacity: 1 }
          100% { transform: translateY(110vh) rotate(600deg); opacity: 0 }
        }
      `}</style>

      {/* Pulsing cyan halo */}
      <div style={{
        position: 'fixed', inset: 0,
        animation: 'tie-halo 2s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Confetti */}
      {confetti.map(p => (
        <div key={p.id} style={{
          position: 'fixed', left: p.left, top: '-10px', zIndex: 1,
          width: p.size, height: p.size,
          background: p.color, borderRadius: p.shape,
          animation: `tie-confetti ${p.duration} ${p.delay} linear forwards`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Content column */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        maxWidth: 360, width: '100%',
      }}>

        {/* IT'S A DRAW! */}
        <div style={{
          fontFamily: "'Bangers',sans-serif",
          fontSize: 'clamp(56px,16vw,84px)',
          letterSpacing: '0.08em', lineHeight: 0.9,
          color: '#06b6d4',
          animation: 'tie-title 1.6s ease-in-out infinite, tie-slideUp 0.4s ease-out both',
          marginBottom: 6,
        }}>
          IT'S A DRAW!
        </div>

        {/* Handshake */}
        <div style={{
          fontSize: 58, lineHeight: 1, marginBottom: 28,
          animation: 'tie-handshake 2.2s ease-in-out infinite, tie-slideUp 0.45s ease-out 0.06s both',
        }}>
          🤝
        </div>

        {/* Opponent text */}
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 14, fontWeight: 700,
          color: '#cbd5e1', letterSpacing: '0.05em',
          textAlign: 'center', lineHeight: 1.4,
          marginBottom: 22,
          animation: 'tie-slideUp 0.5s ease-out 0.1s both',
        }}>
          Great match against <span style={{ color: '#06b6d4', fontWeight: 800 }}>{opponentName}</span>!
          <br />
          <span style={{ color: '#06b6d4', fontWeight: 800 }}>
            You just earned {reward.diamonds} diamonds!
          </span>
        </div>

        {/* Reward preview pills */}
        <div style={{
          display: 'flex', gap: 14, marginBottom: 32,
          animation: 'tie-slideUp 0.5s ease-out 0.15s both',
        }}>
          {[
            { icon: '💎', value: `+${reward.diamonds}`, label: 'DIAMONDS' },
            { icon: '⚡', value: `+${reward.xp}`,       label: 'XP BONUS' },
          ].map(({ icon, value, label }) => (
            <div key={label} style={{
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
              border: '1.5px solid #06b6d444', borderRadius: 16,
              padding: '14px 22px', textAlign: 'center',
              boxShadow: '0 0 20px rgba(6,182,212,0.10)',
            }}>
              <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 6 }}>{icon}</div>
              <div style={{
                fontFamily: "'Bangers',sans-serif", fontSize: 22,
                letterSpacing: '0.06em', color: '#06b6d4', lineHeight: 1,
              }}>{value}</div>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9,
                fontWeight: 800, color: '#164e63', letterSpacing: '0.18em', marginTop: 3,
              }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Diamond tap target */}
        <button
          onClick={handleTap}
          style={{
            background: 'none', border: 'none',
            cursor: tapped ? 'default' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            padding: 0, marginBottom: 28,
            animation: tapped
              ? 'tie-fly 0.75s ease-in forwards'
              : 'tie-pulse 1.1s ease-in-out infinite',
          }}
        >
          <div style={{ fontSize: 88, lineHeight: 1 }}>💎</div>
          {!tapped && (
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 13, fontWeight: 800,
              color: '#06b6d4', letterSpacing: '0.15em',
              animation: 'tie-shimmer 1.0s ease-in-out infinite',
            }}>
              CLAIM YOUR REWARDS!
            </div>
          )}
        </button>

        {/* REMATCH */}
        {onRematch && (
          <button
            onClick={onRematch}
            style={{
              background: 'linear-gradient(135deg,#0c4a6e,#06b6d4)',
              color: '#fff', border: '2px solid #06b6d4',
              borderRadius: 16, padding: '14px 44px',
              fontFamily: "'Bangers',sans-serif", fontSize: 22,
              letterSpacing: '0.1em', cursor: 'pointer',
              animation: 'tie-pulse 1.4s ease-in-out infinite',
              boxShadow: '0 0 20px #06b6d455',
            }}
          >
            🔄 REMATCH
          </button>
        )}
      </div>
    </div>
  )
}
