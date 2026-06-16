export default function RecordingTipsModal({ onClose }) {
  const steps = [
    {
      emoji: '📱',
      title: 'Set the Stage',
      body: 'Prop your phone up against a hockey bag or water bottle about 10 feet away so the net and your hands are both in the frame.',
    },
    {
      emoji: '⚡',
      title: 'Keep it Snappy',
      body: 'Fire off your 3 or 5 shots in a rapid burst.',
    },
    {
      emoji: '✂️',
      title: 'Trim the Fat',
      body: "Use your phone's built-in video editor to crop the video down to 10 seconds or less. Cut out the walking back and forth — just include the shots and your celly if you have room for it!",
    },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#0f172a', border: '2px solid #a855f755', borderRadius: 20, padding: '28px 22px', maxWidth: 360, width: '100%', boxShadow: '0 0 60px #a855f722' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎥</div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 28, color: '#a855f7', letterSpacing: '0.08em', textShadow: '0 0 20px #a855f755' }}>
            PRO CAMERA SETUP
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#64748b', marginTop: 4, letterSpacing: '0.06em' }}>
            GET THE PERFECT CLIP EVERY TIME
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#a855f744,transparent)', marginBottom: 20 }} />

        {/* Steps */}
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < steps.length - 1 ? 18 : 24 }}>
            <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>{s.emoji}</div>
            <div>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 17, color: '#f1f5f9', letterSpacing: '0.04em', marginBottom: 3 }}>
                {s.title}
              </div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                {s.body}
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={onClose}
          style={{ width: '100%', background: 'linear-gradient(135deg,#6b21a8,#a855f7)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.10em', cursor: 'pointer', boxShadow: '0 0 20px #a855f740' }}
        >
          GOT IT! 🏒
        </button>
      </div>
    </div>
  )
}
