import { X } from 'lucide-react'
import { TIER } from '../../constants/badges.js'

export default function TierKeyPopup({ onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: 16, padding: '28px 24px', maxWidth: 300, width: '90%', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.08em' }}>
            BADGE TIERS
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        {Object.entries(TIER).map(([k, tc]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg,#1e293b,#334155)',
              border: `3px solid ${tc.ring}`, boxShadow: `0 0 10px ${tc.glow}`, flexShrink: 0,
            }} />
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: tc.ring }}>{tc.label}</div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>{tc.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
