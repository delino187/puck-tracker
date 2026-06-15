export default function StatCard({ label, value, color = '#3b82f6' }) {
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: '14px 8px', textAlign: 'center', border: 'var(--card-border)' }}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", color: 'var(--text-muted)', fontSize: 10, marginTop: 5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}
