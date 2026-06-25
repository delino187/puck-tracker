import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react'
import { loadPendingReports, dismissReport, removeVideo } from '../services/videoReportService.js'
import { C } from '../styles.js'

function ReportCard({ report, onActionComplete }) {
  const [acting,  setActing]  = useState(null)  // 'dismiss' | 'remove'
  const [toast,   setToast]   = useState(null)

  async function handleDismiss() {
    setActing('dismiss')
    try {
      await dismissReport(report.id)
      setToast({ ok: true, msg: '✅ Report dismissed.' })
      setTimeout(() => onActionComplete(report.id), 1600)
    } catch (err) {
      console.error('[CoachVideoReports] dismiss failed:', err)
      setToast({ ok: false, msg: '⚠️ Action failed — check connection.' })
      setActing(null)
    }
  }

  async function handleRemove() {
    setActing('remove')
    try {
      await removeVideo(report.id, report.videoUrl)
      setToast({ ok: true, msg: '🗑️ Video removed and report resolved.' })
      setTimeout(() => onActionComplete(report.id), 1600)
    } catch (err) {
      console.error('[CoachVideoReports] remove failed:', err)
      setToast({ ok: false, msg: '⚠️ Removal failed — check connection.' })
      setActing(null)
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg,#0d1526,#0f1e3a)',
      border: '1.5px solid #ef444433',
      borderRadius: 14, padding: '16px 16px 14px',
      marginBottom: 12,
    }}>
      {/* Meta row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#ef4444', letterSpacing: '0.18em', marginBottom: 3 }}>
            ⚠️ {report.reason.toUpperCase()}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#94a3b8' }}>
            Reported by <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{report.reporterName}</span>
          </div>
          {report.videoContext && (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#475569', marginTop: 2 }}>
              {report.videoContext}
            </div>
          )}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#334155', textAlign: 'right' }}>
          {new Date(report.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Video preview */}
      {report.videoUrl ? (
        <video
          src={report.videoUrl}
          controls
          playsInline
          style={{ width: '100%', borderRadius: 8, maxHeight: 200, marginBottom: 12, background: '#000' }}
        />
      ) : (
        <div style={{
          background: '#0f172a', borderRadius: 8, padding: '14px', marginBottom: 12,
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#475569', textAlign: 'center',
        }}>
          Video URL unavailable
        </div>
      )}

      {toast ? (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: toast.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${toast.ok ? '#22c55e44' : '#ef444444'}`,
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700,
          color: toast.ok ? '#4ade80' : '#f87171',
        }}>
          {toast.msg}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={handleDismiss}
            disabled={!!acting}
            style={{
              padding: '10px 8px',
              background: acting === 'dismiss' ? '#1e293b' : 'rgba(34,197,94,0.1)',
              border: '1.5px solid #22c55e44',
              borderRadius: 10,
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700,
              color: '#4ade80', cursor: acting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              opacity: acting && acting !== 'dismiss' ? 0.4 : 1,
            }}
          >
            <CheckCircle size={13} />
            {acting === 'dismiss' ? 'Dismissing…' : 'Dismiss'}
          </button>
          <button
            onClick={handleRemove}
            disabled={!!acting}
            style={{
              padding: '10px 8px',
              background: acting === 'remove' ? '#1e293b' : 'rgba(239,68,68,0.12)',
              border: '1.5px solid #ef444455',
              borderRadius: 10,
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700,
              color: '#f87171', cursor: acting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              opacity: acting && acting !== 'remove' ? 0.4 : 1,
            }}
          >
            <Trash2 size={13} />
            {acting === 'remove' ? 'Removing…' : 'Remove Video'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function CoachVideoReports() {
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await loadPendingReports()
      setReports(data)
    } catch (err) {
      console.error('[CoachVideoReports] load failed:', err)
      setError('Failed to load reports — check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  function handleActionComplete(reportId) {
    setReports(prev => prev.filter(r => r.id !== reportId))
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#ef4444', letterSpacing: '0.18em' }}>
            🚨 FLAGGED VIDEOS
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#475569', marginTop: 2 }}>
            {loading ? 'Loading…' : `${reports.length} pending report${reports.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <button
          onClick={fetchReports}
          disabled={loading}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '7px 10px', cursor: loading ? 'not-allowed' : 'pointer', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, opacity: loading ? 0.5 : 1 }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ ...C.card, borderColor: '#ef444444', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, color: '#f87171', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700 }}>
            <AlertTriangle size={14} /> {error}
          </div>
        </div>
      )}

      {!loading && reports.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'linear-gradient(135deg,#0a0f1a,#0f1e3a)',
          border: '1px solid #1e3a5f', borderRadius: 14,
        }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>✅</div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, color: '#22c55e', letterSpacing: '0.08em' }}>ALL CLEAR</div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#475569', marginTop: 6 }}>No pending video reports.</div>
        </div>
      )}

      {reports.map(r => (
        <ReportCard key={r.id} report={r} onActionComplete={handleActionComplete} />
      ))}
    </div>
  )
}
