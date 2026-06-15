const GRAD_ID = 'heatGrad'
const STOPS   = [[0, '#0000ff'], [50, '#800080'], [100, '#ff0000']]

export default function HeatLegend() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
      <svg width="100%" height="16">
        <defs>
          <linearGradient id={GRAD_ID} x1="0" x2="1" y1="0" y2="0">
            {STOPS.map(([offset, color]) => (
              <stop key={offset} offset={`${offset}%`} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100%" height="14" rx="7" fill={`url(#${GRAD_ID})`} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {['0%', '25%', '50%', '75%', '100%'].map(l => (
          <span key={l} style={{ color: '#94a3b8', fontSize: 10 }}>{l}</span>
        ))}
      </div>
    </div>
  )
}
