import { useState, useEffect } from 'react'
import { db } from '../firebase.js'
import {
  collection, query, orderBy, onSnapshot, deleteDoc, doc,
} from 'firebase/firestore'

function timeAgo(ts) {
  if (!ts) return '—'
  const sec = ts?.seconds ? ts.seconds * 1000 : ts
  const m = Math.floor((Date.now() - sec) / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function CoachFeedback() {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [squashing, setSquashing] = useState(new Set())   // docIds mid-animation

  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('timestamp', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ _id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('[CoachFeedback] snapshot error:', err)
      setLoading(false)
    })
    return unsub
  }, [])

  async function squashBug(id) {
    if (squashing.has(id)) return
    setSquashing(prev => new Set(prev).add(id))
    // Let the collapse animation finish before deleting
    setTimeout(async () => {
      try { await deleteDoc(doc(db, 'feedback', id)) } catch {}
      setSquashing(prev => { const n = new Set(prev); n.delete(id); return n })
    }, 420)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14 }}>
        Loading feedback...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.08em', color: '#22c55e', marginBottom: 6 }}>
          ALL CLEAR
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#475569' }}>
          No open feedback submissions.
        </div>
      </div>
    )
  }

  return (
    <div>
      <style>{`
        @keyframes squashCard {
          0%   { transform: scaleY(1)   translateY(0);    opacity: 1; max-height: 200px; }
          60%  { transform: scaleY(0.6) translateY(-4px); opacity: 0.4; }
          100% { transform: scaleY(0)   translateY(-8px); opacity: 0;   max-height: 0;  margin-bottom: 0; padding: 0; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
        <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: '#ef4444', letterSpacing: '0.1em' }}>
          LIVE BUG FEED
        </span>
        <span style={{
          background: '#ef4444', color: '#fff', borderRadius: 10,
          padding: '1px 8px', fontSize: 10, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif",
        }}>
          {items.length}
        </span>
      </div>

      {items.map(item => {
        const isSquashing = squashing.has(item._id)
        return (
          <div
            key={item._id}
            style={{
              background: 'linear-gradient(135deg,#0a0d18,#111827)',
              border: '1px solid #1e3a5f',
              borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              overflow: 'hidden',
              transformOrigin: 'top center',
              animation: isSquashing ? 'squashCard 0.42s ease-in forwards' : 'none',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { if (!isSquashing) e.currentTarget.style.borderColor = '#ef444433' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e3a5f' }}
          >
            {/* ── Header row ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div style={{ minWidth: 0 }}>
                {/* Username */}
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.06em', color: '#f1f5f9', lineHeight: 1 }}>
                  {item.username ?? item.userId ?? 'Unknown'}
                </div>
                {/* Context + time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700,
                    color: '#60a5fa', letterSpacing: '0.08em',
                    background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f622',
                    borderRadius: 6, padding: '2px 7px',
                  }}>
                    📍 {item.currentPath?.toUpperCase() ?? '?'}
                  </span>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#475569', letterSpacing: '0.04em' }}>
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
              </div>

              {/* Squash button */}
              <button
                onClick={() => squashBug(item._id)}
                disabled={isSquashing}
                style={{
                  flexShrink: 0,
                  background: isSquashing ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${isSquashing ? '#22c55e55' : '#ef444444'}`,
                  borderRadius: 8, padding: '6px 12px', cursor: isSquashing ? 'default' : 'pointer',
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11,
                  fontWeight: 800, letterSpacing: '0.08em',
                  color: isSquashing ? '#22c55e' : '#ef4444',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSquashing ? 'SQUASHED ✅' : 'SQUASH BUG 💥'}
              </button>
            </div>

            {/* ── Feedback text ───────────────────────────────────────────── */}
            <div style={{
              background: '#060912',
              border: '1px solid #1e293b',
              borderRadius: 10, padding: '12px 14px',
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14,
              fontWeight: 500, color: '#cbd5e1', lineHeight: 1.6,
              letterSpacing: '0.02em',
              wordBreak: 'break-word',
            }}>
              "{item.text}"
            </div>
          </div>
        )
      })}
    </div>
  )
}
