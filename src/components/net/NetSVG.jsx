import { ZONES, NET_POS } from '../../constants/zones.js'
import { heatColor } from '../../utils/heatColor.js'

export default function NetSVG({ flashZone, flashType, heatData, puckAnim }) {
  const getColors = (zoneId) => {
    if (flashZone === zoneId) {
      if (flashType === 'fire') return { fill: 'rgba(249,115,22,0.95)', stroke: '#fed7aa', text: '#fff' }
      if (flashType === 'ice')  return { fill: 'rgba(37,99,235,0.95)',  stroke: '#93c5fd', text: '#fff' }
      return { fill: 'rgba(34,197,94,0.95)', stroke: '#86efac', text: '#fff' }
    }
    const d = heatData && heatData[zoneId]
    return heatColor(d && d.shots > 0 ? d.acc : null, !!(d && d.shots > 0))
  }

  // Float label color by shot type
  const floatColor = puckAnim
    ? (puckAnim.type === 'fire' ? '#fb923c' : puckAnim.type === 'ice' ? '#60a5fa' : '#22c55e')
    : '#fff'

  // Zone centre for float origin
  const floatPos = puckAnim ? (() => {
    const pos = NET_POS[puckAnim.zone]
    return pos.rect
      ? { x: pos.x + pos.w / 2, y: pos.y + pos.h / 2 }
      : { x: pos.cx, y: pos.cy }
  })() : null

  return (
    <svg viewBox="0 0 400 270" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
      {/* Net mesh */}
      {Array.from({ length: 9  }).map((_, i) => <line key={'h' + i} x1="38"         y1={52 + i * 19} x2="362"        y2={52 + i * 19} stroke="#1e3a5f" strokeWidth="0.8" />)}
      {Array.from({ length: 17 }).map((_, i) => <line key={'v' + i} x1={40 + i * 20} y1="48"         x2={40 + i * 20} y2="224"          stroke="#1e3a5f" strokeWidth="0.8" />)}

      {/* Frame */}
      <rect x="24"  y="34" width="352" height="11" rx="5.5" fill="#e2e8f0" />
      <rect x="24"  y="34" width="11"  height="198" rx="5"  fill="#e2e8f0" />
      <rect x="365" y="34" width="11"  height="198" rx="5"  fill="#e2e8f0" />
      <line x1="24" y1="232" x2="376" y2="232" stroke="#e2e8f0" strokeWidth="4" />
      <ellipse cx="200" cy="252" rx="88" ry="16" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.4" />

      {/* Bar Down */}
      {(() => {
        const { x, y, w, h } = NET_POS.bar_down
        const d       = heatData && heatData.bar_down
        const hasData = d && d.shots > 0
        const { fill, stroke, text } = getColors('bar_down')
        return (
          <g key="bar_down">
            <rect x={x} y={y} width={w} height={h} rx="6" fill={fill} stroke={stroke} strokeWidth="1.5" />
            <text x={x + w / 2} y={y + h / 2 - 3}  textAnchor="middle" fill={text} fontSize="9"  fontWeight="700" fontFamily="Barlow Condensed" style={{ userSelect: 'none' }}>BAR DOWN</text>
            {hasData && <text x={x + w / 2} y={y + h / 2 + 9} textAnchor="middle" fill={text} fontSize="11" fontWeight="800" fontFamily="Barlow Condensed" style={{ userSelect: 'none' }}>{d.acc.toFixed(0)}%</text>}
          </g>
        )
      })()}

      {/* Circle zones */}
      {ZONES.filter(z => z.id !== 'bar_down').map(z => {
        const pos     = NET_POS[z.id]
        const { fill, stroke, text } = getColors(z.id)
        const d       = heatData && heatData[z.id]
        const hasData = d && d.shots > 0
        return (
          <g key={z.id}>
            <circle cx={pos.cx} cy={pos.cy} r={pos.r} fill={fill} stroke={stroke} strokeWidth="1.5" />
            <circle cx={pos.cx - pos.r * 0.25} cy={pos.cy - pos.r * 0.25} r={pos.r * 0.35} fill="rgba(255,255,255,0.1)" />
            <text x={pos.cx} y={pos.cy - (hasData ? 6 : 3)} textAnchor="middle" fill={text} fontSize="9"  fontWeight="700" fontFamily="Barlow Condensed" style={{ userSelect: 'none' }}>{z.short}</text>
            {hasData && <text x={pos.cx} y={pos.cy + 10} textAnchor="middle" fill={text} fontSize="12" fontWeight="800" fontFamily="Barlow Condensed" style={{ userSelect: 'none' }}>{d.acc.toFixed(0)}%</text>}
          </g>
        )
      })}

      {/* ── Floating shot-count animation ────────────────────────────────── */}
      {puckAnim && floatPos && (
        <text
          key={puckAnim.ts}
          x={floatPos.x}
          y={floatPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={floatColor}
          fontSize="20"
          fontWeight="900"
          fontFamily="Barlow Condensed"
          opacity="0"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {puckAnim.hits}/10
          {/* Fade in → hold → fade out */}
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.55;1" dur="1.15s" begin="0s" fill="freeze" />
          {/* Float upward 42px */}
          <animate attributeName="y" from={String(floatPos.y)} to={String(floatPos.y - 42)} dur="1.15s" begin="0s" fill="freeze" />
          {/* Scale pop: small → big → settle */}
          <animate attributeName="fontSize" values="12;24;20" keyTimes="0;0.12;1" dur="1.15s" begin="0s" fill="freeze" />
        </text>
      )}
    </svg>
  )
}
