import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { submitVideoReport, REPORT_REASONS } from '../../services/videoReportService.js'
import { usePlayer } from '../../context/PlayerContext.jsx'

export default function VideoReportModal({ videoUrl, videoContext, onClose }) {
  const { activePlayer } = usePlayer()
  const [reason,      setReason]      = useState(REPORT_REASONS[0])
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [error,       setError]       = useState('')

  async function handleSubmit() {
    if (!activePlayer) return
    setSubmitting(true)
    setError('')
    try {
      await submitVideoReport({
        videoUrl,
        videoContext,
        reportedBy:   activePlayer.id,
        reporterName: activePlayer.name,
        reason,
      })
      setSubmitted(true)
      // Auto-close after showing success
      setTimeout(onClose, 2200)
    } catch (err) {
      console.error('[VideoReport] submit failed:', err)
      setError('Submission failed — check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 800,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'linear-gradient(160deg,#120808,#1c0f0f)',
        border: '2px solid #ef444455',
        borderRadius: 20,
        padding: '28px 22px 22px',
        boxShadow: '0 0 50px #ef444422',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#4ade80', letterSpacing: '0.08em', marginBottom: 8 }}>
              REPORT SUBMITTED
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, color: '#94a3b8', lineHeight: 1.5 }}>
              Thank you. This video has been flagged for admin review.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <AlertTriangle size={20} color="#ef4444" />
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.06em', color: '#fca5a5' }}>
                REPORT THIS VIDEO
              </div>
            </div>

            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#64748b', letterSpacing: '0.06em', marginBottom: 14 }}>
              SELECT A REASON
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {REPORT_REASONS.map(r => {
                const sel = reason === r
                return (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    style={{
                      background: sel ? 'rgba(239,68,68,0.15)' : 'rgba(15,23,42,0.6)',
                      border: `1.5px solid ${sel ? '#ef4444' : '#334155'}`,
                      borderRadius: 10, padding: '10px 14px',
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontSize: 14, fontWeight: 700,
                      color: sel ? '#fca5a5' : '#94a3b8',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sel ? '● ' : '○ '}{r}
                  </button>
                )
              })}
            </div>

            {error && (
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#ef4444', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={12} /> {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '11px', background: 'transparent',
                  border: '1px solid #334155', borderRadius: 12,
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14,
                  fontWeight: 700, color: '#64748b', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '11px',
                  background: submitting ? '#374151' : 'linear-gradient(135deg,#991b1b,#ef4444)',
                  border: 'none', borderRadius: 12,
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14,
                  fontWeight: 700, color: '#fff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting ? 'none' : '0 0 14px #ef444440',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Sending…' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
