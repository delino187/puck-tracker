export default function ZoneSetRow({ zone, prevHits, prevShots, value, onChange, onLog }) {
  const current = value === '' || value === undefined ? 0 : parseInt(value)
  const hasVal  = value !== '' && value !== undefined

  function increment() { onChange(String(Math.min(10, current + 1))) }
  function decrement() { if (current > 0) onChange(String(current - 1)) }

  function handleLog() {
    onLog(current)
    onChange('')
  }

  const btnBase = {
    width: 52, height: 52, flexShrink: 0,
    borderRadius: 12, border: 'none', cursor: 'pointer',
    fontFamily: "'Bangers',sans-serif", fontSize: 28, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.08s, box-shadow 0.08s',
    userSelect: 'none', WebkitUserSelect: 'none',
  }

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: '10px 10px 10px', border: 'var(--card-border)' }}>
      {/* Zone label + history */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", color: 'var(--text-1)', fontSize: 13, fontWeight: 700 }}>
          {zone.label}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hasVal && (
            <span style={{ color: '#f59e0b', fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif" }}>
              +{current >= 5 ? 8 : 5}xp
            </span>
          )}
          {prevShots > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{prevHits}/{prevShots}</span>
          )}
        </div>
      </div>

      {/* Stepper row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {/* Minus */}
        <button
          onClick={decrement}
          disabled={current <= 0}
          style={{
            ...btnBase,
            background: current > 0 ? 'linear-gradient(135deg,#1e0a0a,#3d0808)' : '#0a0f1a',
            color:       current > 0 ? '#f87171' : '#1e293b',
            boxShadow:   current > 0 ? '0 0 10px #ef444422' : 'none',
          }}
          onTouchStart={e => { if (current > 0) e.currentTarget.style.transform = 'scale(0.92)' }}
          onTouchEnd={e  => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          −
        </button>

        {/* Center display */}
        <div style={{
          flex: 1, textAlign: 'center',
          fontFamily: "'Bangers',sans-serif",
          fontSize: 42, lineHeight: 1,
          letterSpacing: '0.04em',
          color: current === 0 ? '#334155'
               : current >= 8  ? '#f97316'
               : current >= 5  ? '#22c55e'
               :                  '#60a5fa',
          textShadow: current >= 8 ? '0 0 14px #f9731666'
                    : current >= 5 ? '0 0 14px #22c55e66'
                    : current > 0  ? '0 0 14px #3b82f655'
                    : 'none',
          transition: 'color 0.12s',
        }}>
          {current}
          <span style={{ fontSize: 16, color: '#475569', marginLeft: 2 }}>/10</span>
        </div>

        {/* Plus */}
        <button
          onClick={increment}
          disabled={current >= 10}
          style={{
            ...btnBase,
            background: current < 10 ? 'linear-gradient(135deg,#0c2a4a,#1d4ed8)' : '#0a0f1a',
            color:       current < 10 ? '#93c5fd' : '#1e293b',
            boxShadow:   current < 10 ? '0 0 10px #3b82f633' : 'none',
          }}
          onTouchStart={e => { if (current < 10) e.currentTarget.style.transform = 'scale(0.92)' }}
          onTouchEnd={e  => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          +
        </button>
      </div>

      {/* Log button */}
      <button
        onClick={handleLog}
        style={{
          width: '100%', padding: '11px 0',
          borderRadius: 9, border: 'none',
          cursor: 'pointer',
          fontFamily: "'Bangers',sans-serif", fontSize: 17,
          letterSpacing: '0.1em',
          background: hasVal
            ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
            : 'linear-gradient(135deg,#0d1117,#111827)',
          color:     hasVal ? '#fff' : '#334155',
          boxShadow: hasVal ? '0 0 14px #3b82f644' : 'none',
          transition: 'background 0.15s, box-shadow 0.15s',
        }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onTouchEnd={e  => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {hasVal ? `LOG ${current} HITS` : 'LOG PUCKS'}
      </button>
    </div>
  )
}
