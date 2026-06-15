import { AlertCircle } from 'lucide-react'

export default function CoachMsgPopup({ message, onAck }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#0f172a', border: '2px solid #f59e0b', borderRadius: 18,
        padding: '30px 24px', maxWidth: 340, width: '90%', textAlign: 'center',
        boxShadow: '0 0 50px rgba(245,158,11,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fbbf24', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, letterSpacing: '0.15em', marginBottom: 16 }}>
          <AlertCircle size={16} /> MESSAGE FROM COACH
        </div>
        <div style={{ color: '#f1f5f9', fontSize: 17, lineHeight: 1.5, marginBottom: 24, fontFamily: 'Barlow', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
          {message}
        </div>
        <button
          onClick={onAck}
          style={{
            width: '100%', background: '#f59e0b', color: '#000', border: 'none',
            borderRadius: 10, padding: '12px',
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 16, cursor: 'pointer',
          }}
        >
          Got it, Coach!
        </button>
      </div>
    </div>
  )
}
