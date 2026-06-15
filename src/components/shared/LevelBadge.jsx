import { LEVELS } from '../../constants/levels.js'

export default function LevelBadge({ li }) {
  const l = LEVELS[li] || LEVELS[0]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: l.bg, border: `1px solid ${l.color}55`,
      borderRadius: 8, padding: '3px 9px',
    }}>
      {/* 24×24 strict-square circle — scale(1.1) zooms past any white corners */}
      <span style={{
        display: 'inline-flex', flexShrink: 0,
        width: 24, height: 24, borderRadius: '50%', overflow: 'hidden',
        border: `1.5px solid ${l.color}`,
        boxShadow: `0 0 7px ${l.glow}77`,
        background: l.bg,
      }}>
        <img
          src={l.img}
          alt={l.name}
          className="rounded-full object-cover"
          style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }}
        />
      </span>
      <span style={{
        fontFamily: "'Barlow Condensed',sans-serif",
        fontWeight: 700, color: l.color, fontSize: 12, letterSpacing: '0.05em',
      }}>
        {l.name}
      </span>
    </span>
  )
}
