import Particles from '../shared/Particles.jsx'

export default function CelebOverlay({ data, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Particles type="confetti" />
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 20,
        padding: '32px 24px', maxWidth: 300, width: '88%', textAlign: 'center', zIndex: 1,
      }}>
        <div style={{ fontSize: 60, marginBottom: 10 }}>{data.emoji}</div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: '#f1f5f9', marginBottom: 6 }}>
          {data.title}
        </div>
        <div style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 18 }}>{data.subtitle}</div>
        <button
          onClick={onClose}
          style={{
            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10,
            padding: '11px 24px', fontFamily: "'Barlow Condensed',sans-serif",
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}
        >
          Nice!
        </button>
      </div>
    </div>
  )
}
