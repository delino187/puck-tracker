import { LEVELS } from '../../constants/levels.js'

export default function XPBar({ li, xp, compact, showLabel }) {
  const cur    = LEVELS[li]
  const next   = LEVELS[li + 1]
  // Bar fill: relative progress between the current rank's floor and the next rank's floor.
  // This keeps the bar smooth within each rank while labels show lifetime totals.
  const floor  = cur.xpNeeded
  const ceil   = next ? next.xpNeeded : xp
  const pct    = next ? Math.min(100, ((xp - floor) / (ceil - floor)) * 100) : 100
  // Cumulative label values: show lifetime XP out of the next rank's absolute threshold.
  const dispXP  = xp.toLocaleString()
  const dispMax = next ? next.xpNeeded.toLocaleString() : xp.toLocaleString()

  return (
    <div style={{ width: '100%' }}>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#94a3b8' }}>
            {dispXP} / {dispMax} XP to {next ? next.name : 'Max'}
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
          {dispXP} / {dispMax} XP to {next ? next.name : 'Max'}
        </div>
      )}
    </div>
  )
}
