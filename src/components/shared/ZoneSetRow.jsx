export default function ZoneSetRow({ zone, prevHits, prevShots, value, onChange, onLog }) {
  const hasVal = value !== '' && value !== undefined

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 8, padding: '8px 10px', border: 'var(--card-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", color: 'var(--text-1)', fontSize: 13, fontWeight: 700 }}>
          {zone.label}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hasVal && (
            <span style={{ color: '#f59e0b', fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif" }}>
              +{parseInt(value) >= 5 ? 8 : 5}xp
            </span>
          )}
          {prevShots > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{prevHits}/{prevShots}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, background: 'var(--input-bg)', border: 'var(--input-border)', borderRadius: 6,
            color: hasVal ? 'var(--text-1)' : 'var(--text-muted)', padding: '6px', fontSize: 13,
            fontFamily: "'Barlow Condensed',sans-serif", cursor: 'pointer',
          }}
        >
          <option value="">— /10 —</option>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <option key={n} value={n}>{n}/10</option>
          ))}
        </select>
        <button
          onClick={() => {
            if (!hasVal) return
            onLog(parseInt(value))
            onChange('')
          }}
          disabled={!hasVal}
          style={{
            background: hasVal ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'var(--card-bg)',
            color: hasVal ? '#ffffff' : 'var(--text-muted)',
            border: hasVal ? 'none' : 'var(--card-border)',
            borderRadius: 6, padding: '6px 14px',
            fontFamily: "'Bangers',sans-serif", fontWeight: 400, fontSize: 16,
            cursor: hasVal ? 'pointer' : 'default',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            boxShadow: hasVal ? '0 0 10px #3b82f633' : 'none',
          }}
        >
          LOG
        </button>
      </div>
    </div>
  )
}
