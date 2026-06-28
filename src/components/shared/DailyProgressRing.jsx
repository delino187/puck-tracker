const DAILY_GOAL = 100

export default function DailyProgressRing({ shots }) {
  const pct    = Math.min(1, shots / DAILY_GOAL)
  const done   = shots >= DAILY_GOAL
  const over   = shots > DAILY_GOAL
  const R      = 50
  const circ   = 2 * Math.PI * R
  const offset = circ * (1 - pct)
  const color  = done ? '#fbbf24' : pct > 0.5 ? '#22c55e' : '#3b82f6'
  const remaining = Math.max(0, DAILY_GOAL - shots)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <style>{`
        @keyframes ringPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      `}</style>

      {/* SVG ring */}
      <div style={{
        position: 'relative', width: 110, height: 110, flexShrink: 0,
        animation: done ? 'ringPulse 1.8s ease-in-out infinite' : 'none',
        padding: '6px', boxSizing: 'border-box',
        overflow: 'visible',
      }}>
        <svg width="110" height="110" viewBox="0 0 110 110" style={{ display: 'block' }}>
          {/* Track */}
          <circle cx="55" cy="55" r={R} fill="none" stroke="#0f172a" strokeWidth="9" />
          {/* Glow blur layer */}
          {pct > 0 && (
            <circle cx="55" cy="55" r={R} fill="none" stroke={color} strokeWidth="14"
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 55 55)"
              style={{ opacity: 0.2, filter: 'blur(5px)' }}
            />
          )}
          {/* Progress arc */}
          <circle cx="55" cy="55" r={R} fill="none" stroke={color} strokeWidth="9"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 55 55)"
            style={{
              transition: 'stroke-dashoffset 0.75s cubic-bezier(0.22,1,0.36,1), stroke 0.4s',
              filter: done ? `drop-shadow(0 0 7px ${color})` : 'none',
            }}
          />
        </svg>
        {/* Center number */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 28, color, lineHeight: 1, letterSpacing: '0.02em' }}>
            {shots}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            /{DAILY_GOAL}
          </div>
        </div>
      </div>

      {/* Right-side text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color, letterSpacing: '0.05em', marginBottom: 4 }}>
          {done ? (over ? `${shots - DAILY_GOAL} OVER GOAL! 🔥` : 'DAILY GOAL SMASHED! 🏆') : 'DAILY PROGRESS'}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          {done
            ? <span style={{ color: '#39ff14' }}>{shots} shots today — you're locked in!</span>
            : <>
                <span style={{ color: '#39ff14', fontWeight: 800 }}>{shots}</span>
                <span style={{ color: '#94a3b8' }}> of </span>
                <span style={{ color: '#f1f5f9', fontWeight: 800 }}>{DAILY_GOAL}</span>
                <span style={{ color: '#94a3b8' }}> shots today</span>
              </>}
        </div>
        {!done && (
          <>
            <div style={{ height: 5, background: '#0f172a', borderRadius: 3, overflow: 'hidden', border: '1px solid #1e293b', marginBottom: 5 }}>
              <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3, transition: 'width 0.75s cubic-bezier(0.22,1,0.36,1)' }} />
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#f97316', letterSpacing: '0.08em' }}>
              {remaining} MORE TO HIT YOUR GOAL 🎯
            </div>
          </>
        )}
      </div>
    </div>
  )
}
