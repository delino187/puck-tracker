import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { db } from '../../firebase.js'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function FeedbackModal({ player, activeTab, onClose, onSuccess }) {
  const [text,        setText]        = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')

  async function handleSubmit() {
    if (!text.trim()) { setError('Write something first!'); return }
    setSubmitting(true)
    setError('')
    try {
      await addDoc(collection(db, 'feedback'), {
        userId:      player.id,
        username:    player.name,
        text:        text.trim(),
        timestamp:   serverTimestamp(),
        currentPath: activeTab ?? 'unknown',
      })
      setText('')
      onClose()
      onSuccess()
    } catch (err) {
      console.error('[Feedback] write failed:', err)
      setError('Failed to send — check your connection and try again.')
      setSubmitting(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'linear-gradient(160deg,#080b14,#0f1628)',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: '20px 20px 16px 16px',
          padding: '24px 20px 20px',
          boxShadow: '0 -4px 40px rgba(239,68,68,0.12), 0 0 0 1px rgba(239,68,68,0.08)',
          margin: '0 12px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, letterSpacing: '0.08em', color: '#ef4444', textShadow: '0 0 16px #ef444455', lineHeight: 1 }}>
              🕹️ REPORT A BUG
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.12em', marginTop: 3 }}>
              SCREEN: {(activeTab ?? 'unknown').toUpperCase()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setError('') }}
          onKeyDown={handleKey}
          placeholder="Tell me what broke, what looks weird, or what feature you want next..."
          rows={5}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0a0d1a',
            border: `1px solid ${error ? '#ef4444' : '#1e3a5f'}`,
            borderRadius: 12, padding: '12px 14px',
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14,
            color: '#f1f5f9', lineHeight: 1.6, resize: 'none',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = '#ef444466' }}
          onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#1e3a5f' }}
        />

        {error && (
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#ef4444', marginTop: 6, letterSpacing: '0.04em' }}>
            {error}
          </div>
        )}

        {/* Hint */}
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#334155', marginTop: 6, letterSpacing: '0.06em' }}>
          ⌘ + ENTER to send · goes straight to the dev
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          style={{
            width: '100%', marginTop: 14,
            background: text.trim() && !submitting
              ? 'linear-gradient(135deg,#7f1d1d,#ef4444)'
              : '#1e293b',
            color: text.trim() && !submitting ? '#fff' : '#475569',
            border: 'none', borderRadius: 12, padding: '13px',
            fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.08em',
            cursor: text.trim() && !submitting ? 'pointer' : 'default',
            boxShadow: text.trim() && !submitting ? '0 0 20px #ef444440' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
        >
          {submitting
            ? <>SENDING...</>
            : <><Send size={15} /> SEND TO DEV TEAM 🚀</>
          }
        </button>
      </div>
    </div>
  )
}
