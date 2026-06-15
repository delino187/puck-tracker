import Particles from '../shared/Particles.jsx'

export default function LevelUpPopup({ level, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Particles type="levelup" />
      <div style={{
        background: level.bg, border: `2px solid ${level.color}`,
        borderRadius: 20, padding: '40px 28px', maxWidth: 310, width: '90%', textAlign: 'center',
        boxShadow: `0 0 80px ${level.glow}55`, zIndex: 1,
      }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: '0.15em', color: level.color, marginBottom: 16 }}>
          LEVEL UP!
        </div>

        {/* 96×96 strict-square circle — border + glow, objectFit:cover crop */}
        <div style={{
          width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
          border: `3px solid ${level.color}`,
          boxShadow: `0 0 28px ${level.glow}99, inset 0 1px 0 rgba(255,255,255,0.15)`,
          background: level.bg,
          margin: '0 auto 18px',
          flexShrink: 0,
        }}>
          <img
            src={level.img}
            alt={level.name}
            className="rounded-full object-cover"
            style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }}
          />
        </div>

        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 40, fontWeight: 900, color: level.color, letterSpacing: '0.05em', marginBottom: 6 }}>
          {level.name}
        </div>
        <div style={{ color: '#e2e8f0', fontSize: 14, marginBottom: 24 }}>You've reached a new rank!</div>
        <button
          onClick={onClose}
          style={{
            background: level.color, color: '#000', border: 'none', borderRadius: 10,
            padding: '12px 28px', fontFamily: "'Barlow Condensed',sans-serif",
            fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%',
          }}
        >
          Let's Go!
        </button>
      </div>
    </div>
  )
}
