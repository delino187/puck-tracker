import { LEVELS } from '../../constants/levels.js'

export default function XPBar({ li, xp, compact, showLabel }) {
  const cur  = LEVELS[li]
  const next = LEVELS[li + 1]
  const prevXp  = cur.xpNeeded
  const nextXp  = next ? next.xpNeeded : xp
  const earned  = xp - prevXp
  const needed  = nextXp - prevXp
  const pct     = next ? Math.min(100, (earned / needed) * 100) : 100

  return (
    <div style={{ width: '100%' }}>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#94a3b8' }}>
            {earned} / {needed} XP to {next ? next.name : 'Max'}
          </span>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#6b7280' }}>
            {xp} total
          </span>
        </div>
      )}
      <div style={{ height: compact ? 4 : 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden', border: '1px solid #1e3a5f' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg,${LEVELS[li].color},${LEVELS[Math.min(li + 1, LEVELS.length - 1)].color})`,
          borderRadius: 3, transition: 'width 0.6s',
        }} />
      </div>
      {showLabel && (
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
          {earned}/{needed} XP to {next ? next.name : 'Max'}
        </div>
      )}
    </div>
  )
}
