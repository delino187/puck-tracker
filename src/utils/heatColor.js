export function heatColor(acc, hasData) {
  if (!hasData || acc === null) {
    return { fill: 'rgba(30,41,59,0.7)', stroke: 'rgba(71,85,105,0.95)', text: '#94a3b8' }
  }
  const t = Math.max(0, Math.min(1, acc / 100))
  const r = Math.round(255 * t)
  const b = Math.round(255 * (1 - t))
  const g = Math.round(34 * (1 - Math.abs(t - 0.5) * 2))
  return {
    fill:   `rgba(${r},${g},${b},0.9)`,
    stroke: `rgba(${Math.min(255, r + 55)},${Math.min(255, g + 70)},${Math.min(255, b + 55)},1)`,
    text:   '#fff',
  }
}
