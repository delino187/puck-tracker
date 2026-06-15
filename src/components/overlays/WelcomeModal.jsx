const STEPS = [
  'Set up your shooting pad 10–15 feet away from the net.',
  "Keep your head up when you shoot!",
  "Aim for the exact same target zone for 10 straight shots — this is called a 'set'.",
  'Log your score right here after the set.',
]

export default function WelcomeModal({ onClose }) {
  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      zIndex:         3000,
      background:     'rgba(4,9,20,0.90)',
      backdropFilter: 'blur(7px)',
      WebkitBackdropFilter: 'blur(7px)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '16px',
    }}>
      <div style={{
        background:   'linear-gradient(165deg,#0a0f1a 0%,#0d1b30 100%)',
        border:       '1px solid #1e3a5f',
        borderRadius: 20,
        padding:      '32px 28px 28px',
        maxWidth:     440,
        width:        '100%',
        boxShadow:    '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(59,130,246,0.12)',
        position:     'relative',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 44, marginBottom: 10, lineHeight: 1 }}>🏒</div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize:   28,
            fontWeight: 700,
            color:      '#f1f5f9',
            letterSpacing: '0.02em',
            marginBottom: 6,
          }}>
            Welcome to the team!
          </div>
          <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#3b82f6,transparent)', borderRadius: 1 }} />
        </div>

        {/* Intro sentence */}
        <p style={{
          color:        '#cbd5e1',
          fontSize:     14,
          lineHeight:   1.7,
          marginBottom: 20,
          fontFamily:   'Barlow, sans-serif',
          fontWeight:   400,
        }}>
          This app is designed to help you track the pucks you shoot so you can build{' '}
          <span style={{ color: '#60a5fa', fontWeight: 600 }}>sniper-level habits</span>.
        </p>

        {/* How to practice */}
        <div style={{
          background:   'rgba(30,58,95,0.25)',
          border:       '1px solid #1e3a5f',
          borderRadius: 12,
          padding:      '16px 18px',
          marginBottom: 18,
        }}>
          <div style={{
            fontFamily:    "'Barlow Condensed',sans-serif",
            fontSize:      11,
            fontWeight:    700,
            letterSpacing: '0.15em',
            color:         '#60a5fa',
            marginBottom:  12,
            textTransform: 'uppercase',
          }}>
            How to Practice
          </div>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            {STEPS.map((step, i) => (
              <li key={i} style={{
                color:        '#e2e8f0',
                fontSize:     13.5,
                lineHeight:   1.65,
                fontFamily:   'Barlow, sans-serif',
                fontWeight:   400,
                marginBottom: i < STEPS.length - 1 ? 8 : 0,
              }}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Honor system note */}
        <div style={{
          background:   'rgba(245,158,11,0.07)',
          border:       '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10,
          padding:      '12px 14px',
          marginBottom: 24,
          display:      'flex',
          gap:          10,
          alignItems:   'flex-start',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚡</span>
          <p style={{
            color:      '#fde68a',
            fontSize:   12.5,
            lineHeight: 1.65,
            fontFamily: 'Barlow, sans-serif',
            fontWeight: 400,
            margin:     0,
          }}>
            <span style={{ fontWeight: 600 }}>Honor system:</span> This app runs entirely on the honor system — be honest with your logs to truly track your progress and get better every day!
          </p>
        </div>

        {/* CTA button */}
        <button
          onClick={onClose}
          style={{
            width:        '100%',
            background:   'linear-gradient(135deg,#2563eb,#3b82f6)',
            color:        '#fff',
            border:       'none',
            borderRadius: 12,
            padding:      '14px',
            fontFamily:   "'Barlow Condensed',sans-serif",
            fontWeight:   700,
            fontSize:     18,
            letterSpacing: '0.04em',
            cursor:       'pointer',
            boxShadow:    '0 4px 20px rgba(59,130,246,0.4)',
            transition:   'opacity 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          LET'S PLAY! 🏒
        </button>
      </div>
    </div>
  )
}
