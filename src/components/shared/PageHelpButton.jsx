import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

export default function PageHelpButton({ title, content }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Help"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '50%',
          width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          position: 'relative', zIndex: 50,
        }}
      >
        <HelpCircle size={16} color="#94a3b8" />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340,
              background: 'linear-gradient(160deg,#080b14,#0f1628)',
              border: '2px solid rgba(96,165,250,0.35)',
              borderRadius: 20,
              padding: '28px 22px 22px',
              boxShadow: '0 0 40px rgba(96,165,250,0.15), 0 24px 48px rgba(0,0,0,0.6)',
              position: 'relative',
            }}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              style={{
                position: 'absolute', top: 14, right: 14,
                background: 'transparent', border: '1px solid #334155',
                borderRadius: 8, width: 28, height: 28,
                color: '#64748b', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>

            {/* Icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <HelpCircle size={20} color="#60a5fa" />
              <div style={{
                fontFamily: "'Bangers',sans-serif", fontSize: 20,
                letterSpacing: '0.08em', color: '#60a5fa',
                textShadow: '0 0 14px #60a5fa44',
              }}>
                {title}
              </div>
            </div>

            {/* Content */}
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 14, fontWeight: 600,
              color: '#cbd5e1', lineHeight: 1.6,
              letterSpacing: '0.03em',
              marginBottom: 22,
            }}>
              {content}
            </div>

            {/* Got it */}
            <button
              onClick={() => setOpen(false)}
              style={{
                width: '100%', padding: '12px',
                background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                color: '#fff', border: 'none', borderRadius: 12,
                cursor: 'pointer',
                fontFamily: "'Bangers',sans-serif", fontSize: 18,
                letterSpacing: '0.1em',
                boxShadow: '0 0 18px #3b82f630',
              }}
            >
              GOT IT 👍
            </button>
          </div>
        </div>
      )}
    </>
  )
}
