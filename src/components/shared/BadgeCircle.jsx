import { Lock } from 'lucide-react'
import { TIER } from '../../constants/badges.js'

export default function BadgeCircle({ badge, earned, earnedDate, isNew, size = 80, onClick }) {
  const tc       = TIER[badge.tier]
  const IconC    = badge.Icon
  const lockSize = Math.round(size * 0.3)

  return (
    <div
      onClick={() => onClick && onClick(badge, earned)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
    >
      {/* Positioned wrapper — anchors NEW chip and lock indicator to the circle */}
      <div style={{ position: 'relative', width: size, height: size }}>

        {isNew && (
          <div style={{
            position: 'absolute', top: -7, right: -4, zIndex: 3,
            background: '#f59e0b', color: '#000', fontSize: 8, fontWeight: 700,
            borderRadius: 6, padding: '2px 5px', fontFamily: 'monospace',
            boxShadow: '0 0 8px #f59e0b',
          }}>NEW!</div>
        )}

        {/* Glow ring — separate from the filtered circle so color shows even when locked */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          boxShadow: earned
            ? `0 0 20px 5px ${tc.glow}, 0 0 40px 10px ${tc.glow}40`
            : `0 0 14px 4px ${tc.lockedGlow}, 0 0 28px 6px ${tc.lockedGlow}`,
          pointerEvents: 'none',
          zIndex: 0,
          transition: 'box-shadow 0.3s',
        }} />

        {/* Circle — always renders actual badge colors; filter desaturates when locked */}
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: badge.innerBg,
          border: `3px solid ${earned ? tc.ring : '#1f2937'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          filter: earned ? 'none' : 'grayscale(1) brightness(0.32)',
          opacity: earned ? 1 : 0.55,
          transition: 'filter 0.3s, opacity 0.3s',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
        }}>
          {/* Specular highlight — earned icon badges only */}
          {earned && !badge.img && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 25%,rgba(255,255,255,0.18),transparent 60%)',
            }} />
          )}

          {badge.img ? (
            <img
              src={badge.img}
              alt={badge.name}
              className="rounded-full object-cover"
              style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }}
            />
          ) : (
            <IconC size={size * 0.38} color={badge.innerIcon} strokeWidth={1.5} />
          )}
        </div>

        {/* Lock indicator — bottom-right bubble, outside overflow:hidden */}
        {!earned && (
          <div style={{
            position: 'absolute',
            bottom: 1, right: 1,
            width: lockSize, height: lockSize,
            background: '#0a0f1a',
            border: '2px solid #1e3a5f',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 2,
          }}>
            <Lock
              size={Math.round(lockSize * 0.52)}
              color="#64748b"
              strokeWidth={2.5}
            />
          </div>
        )}
      </div>

      {/* Name */}
      <div style={{
        fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700,
        color: earned ? tc.ring : '#374151',
        textAlign: 'center', lineHeight: 1.2, maxWidth: size + 8,
      }}>
        {badge.name}
      </div>

      {/* Earned date */}
      {earned && earnedDate && (
        <div style={{ fontSize: 9, color: '#6b7280', textAlign: 'center' }}>
          {new Date(earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  )
}
