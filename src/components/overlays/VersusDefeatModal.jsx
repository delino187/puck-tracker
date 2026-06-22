import { useEffect, useMemo, useRef, useState } from 'react'

const PARTICLE_COLORS = ['#ef4444','#dc2626','#f97316','#7f1d1d','#fbbf24','#fff']

export default function VersusDefeatModal({ defeatState, winner, onClaim, onRematch }) {
  const opponentVideoUrl = defeatState?.opponentVideoUrl ?? null
  const [tapped, setTapped] = useState(false)
  const bgAudioRef = useRef(null)

  // Defeat audio: sad trombone if the winner bought it, otherwise streak-broken sting.
  // 300 ms delay lets the overlay transition settle before the sound hits.
  useEffect(() => {
    const src = winner?.sadTromboneUnlocked
      ? '/sad-game-over-trombone.mp3'
      : '/streak-broken.mp3'
    const audio = new Audio(src)
    audio.volume = winner?.sadTromboneUnlocked ? 0.85 : 0.9
    const t = setTimeout(() => audio.play().catch(() => {}), 300)
    bgAudioRef.current = audio
    return () => {
      clearTimeout(t)
      audio.pause()
      audio.currentTime = 0
    }
  }, []) // eslint-disable-line

  // Seeded once on mount
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id:       i,
      left:     `${(i / 18) * 100 + (Math.random() - 0.5) * 8}%`,
      delay:    `${(Math.random() * 1.5).toFixed(2)}s`,
      duration: `${(2.0 + Math.random() * 2.0).toFixed(2)}s`,
      color:    PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      size:     5 + Math.floor(Math.random() * 7),
      shape:    i % 4 === 0 ? '50%' : '2px',
    }))
  , []) // eslint-disable-line

  function handleTap() {
    if (tapped) return
    // Kill defeat audio immediately — synchronous, zero-latency
    if (bgAudioRef.current) bgAudioRef.current.volume = 0
    // Sparkle SFX fires before React re-render
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
      background: 'radial-gradient(ellipse at 50% 15%, #1a0000 0%, #0d0000 55%, #050000 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      overflowY: 'auto',
      padding: '32px 20px 56px',
    }}>
      <style>{`
        @keyframes vdm-halo {
          0%,100% { box-shadow: 0 0 80px 30px rgba(239,68,68,0.18) }
          50%     { box-shadow: 0 0 160px 70px rgba(239,68,68,0.32) }
        }
        @keyframes vdm-title {
          0%,100% { text-shadow: 0 0 60px #ef444499, 0 3px 0 #7f1d1d }
          50%     { text-shadow: 0 0 110px #ef4444cc, 0 3px 0 #7f1d1d }
        }
        @keyframes vdm-slideUp {
          from { transform: translateY(28px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
        @keyframes vdm-skull {
          0%,100% { transform: scale(1) rotate(-5deg) }
          50%     { transform: scale(1.08) rotate(5deg) }
        }
        @keyframes vdm-pulse {
          0%,100% { transform: scale(1);    filter: drop-shadow(0 0 18px #fbbf2488) }
          50%     { transform: scale(1.2);  filter: drop-shadow(0 0 38px #fbbf24dd) }
        }
        @keyframes vdm-shimmer {
          0%,100% { opacity: 1 }
          50%     { opacity: 0.45 }
        }
        @keyframes vdm-fly {
          0%   { transform: scale(1);    opacity: 1 }
          20%  { transform: scale(1.5);  opacity: 1 }
          100% { transform: scale(0.15) translate(-300px, 460px); opacity: 0 }
        }
        @keyframes vdm-drift {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1 }
          80%  { opacity: 0.8 }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0 }
        }
        @keyframes vdm-rematch {
          0%,100% { box-shadow: 0 0 16px #ef444444 }
          50%     { box-shadow: 0 0 32px #ef444488, 0 0 60px #ef444422 }
        }
      `}</style>

      {/* Red vignette halo */}
      <div style={{
        position: 'fixed', inset: 0,
        animation: 'vdm-halo 2s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Falling particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'fixed', left: p.left, top: '-10px', zIndex: 1,
          width: p.size, height: p.size,
          background: p.color, borderRadius: p.shape,
          animation: `vdm-drift ${p.duration} ${p.delay} linear forwards`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Content column */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        maxWidth: 360, width: '100%',
      }}>

        {/* NICE TRY! */}
        <div style={{
          fontFamily: "'Bangers',sans-serif",
          fontSize: 'clamp(62px,17vw,98px)',
          letterSpacing: '0.08em', lineHeight: 0.9,
          color: '#ef4444',
          animation: 'vdm-title 1.6s ease-in-out infinite, vdm-slideUp 0.4s ease-out both',
          marginBottom: 6,
        }}>
          NICE TRY!
        </div>

        {/* Skull */}
        <div style={{
          fontSize: 56, lineHeight: 1, marginBottom: 18,
          animation: 'vdm-skull 2.4s ease-in-out infinite, vdm-slideUp 0.45s ease-out 0.06s both',
        }}>
          💀
        </div>

        {/* XP auto-credited notice */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.22)',
          borderRadius: 10, padding: '7px 16px', marginBottom: 24,
          animation: 'vdm-slideUp 0.48s ease-out 0.12s both',
        }}>
          <span style={{ fontSize: 14 }}>⚡</span>
          <span style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            fontWeight: 700, color: '#34d399', letterSpacing: '0.08em',
          }}>
            +{defeatState.xp} XP CREDITED INSTANTLY
          </span>
        </div>

        {/* Reward pill */}
        <div style={{
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
          border: '1.5px solid #fbbf2444', borderRadius: 16,
          padding: '12px 28px', textAlign: 'center',
          boxShadow: '0 0 20px rgba(251,191,36,0.08)',
          marginBottom: 20,
          animation: 'vdm-slideUp 0.5s ease-out 0.16s both',
        }}>
          <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 4 }}>💎</div>
          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 20,
            letterSpacing: '0.06em', color: '#fbbf24', lineHeight: 1,
          }}>+{defeatState.diamonds}</div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9,
            fontWeight: 800, color: '#78350f', letterSpacing: '0.18em', marginTop: 3,
          }}>DIAMOND</div>
        </div>

        {/* Diamond tap target */}
        <button
          onClick={handleTap}
          style={{
            background: 'none', border: 'none',
            cursor: tapped ? 'default' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            padding: 0, marginBottom: 28,
            animation: tapped
              ? 'vdm-fly 0.75s ease-in forwards'
              : 'vdm-pulse 1.1s ease-in-out infinite',
          }}
        >
          <div style={{ fontSize: 76, lineHeight: 1 }}>💎</div>
          {!tapped && (
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 13, fontWeight: 800,
              color: '#fbbf24', letterSpacing: '0.15em',
              animation: 'vdm-shimmer 1.0s ease-in-out infinite',
            }}>
              TAP DIAMOND TO CLAIM!
            </div>
          )}
        </button>

        {/* ── Study Game Tape ─────────────────────────────────────────── */}
        {/* Video served from Vercel Blob public CDN — loads directly, no auth token needed */}
        <div style={{
          width: '100%', marginBottom: 24,
          animation: 'vdm-slideUp 0.5s ease-out 0.55s both',
        }}>
          {opponentVideoUrl ? (
            <div style={{
              background: 'rgba(0,0,0,0.55)',
              border: '1.5px solid #ef444433',
              borderRadius: 16, overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.06)',
                borderBottom: '1px solid #ef444422',
              }}>
                <span style={{ fontSize: 14 }}>👀</span>
                <span style={{
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11,
                  fontWeight: 800, color: '#ef4444', letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}>
                  Study Opponent Game Tape
                </span>
                {winner && (
                  <span style={{
                    marginLeft: 'auto',
                    fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10,
                    color: '#64748b', letterSpacing: '0.06em',
                  }}>
                    {winner.name}'s winning shot
                  </span>
                )}
              </div>
              <video
                src={opponentVideoUrl}
                controls playsInline preload="metadata"
                style={{ width: '100%', display: 'block', maxHeight: 320, background: '#000' }}
              />
            </div>
          ) : (
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px dashed #ef444422',
              borderRadius: 12, padding: '16px',
              textAlign: 'center',
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11,
              color: '#334155', letterSpacing: '0.08em',
            }}>
              📷 No video proof recorded for this match.
            </div>
          )}
        </div>

        {/* REMATCH */}
        <button
          onClick={onRematch}
          style={{
            background: 'linear-gradient(135deg,#7f1d1d,#dc2626)',
            color: '#fff', border: '2px solid #ef4444',
            borderRadius: 16, padding: '14px 44px',
            fontFamily: "'Bangers',sans-serif", fontSize: 22,
            letterSpacing: '0.1em', cursor: 'pointer',
            animation: 'vdm-rematch 1.4s ease-in-out infinite',
          }}
        >
          🔄 REMATCH
        </button>
      </div>
    </div>
  )
}
