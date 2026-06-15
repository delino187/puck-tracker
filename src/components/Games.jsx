import { useState } from 'react'
import { ChevronRight, Clock, Target, Gamepad2 } from 'lucide-react'
import AroundTheWorld from './AroundTheWorld.jsx'

export default function Games({ player, sessions, onSubmitGame }) {
  const [activeGame, setActiveGame] = useState(null)

  if (activeGame === 'atw') {
    return (
      <AroundTheWorld
        player={player}
        sessions={sessions}
        onSubmitGame={sets => { onSubmitGame(sets); setActiveGame(null) }}
        onBack={() => setActiveGame(null)}
      />
    )
  }

  return (
    <div style={{ padding: '16px 12px 24px' }}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
        Training Games
      </div>

      {/* Around the World — premium card */}
      <button
        onClick={() => setActiveGame('atw')}
        style={{
          width: '100%', textAlign: 'left',
          background: 'var(--card-bg)',
          border: '1px solid #10b98133',
          borderRadius: 16, padding: 0,
          cursor: 'pointer', overflow: 'hidden',
          boxShadow: '0 4px 24px #10b98118',
          display: 'block',
        }}
      >
        {/* Top color accent */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#059669,#34d399,#0ea5e9)' }} />

        <div style={{ padding: '18px 18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              {/* Badge */}
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg,#059669,#10b981)',
                borderRadius: 6, padding: '3px 8px', marginBottom: 6,
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 9, fontWeight: 800, color: '#fff',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                ZERO-TOUCH
              </div>

              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '0.03em', lineHeight: 1.1 }}>
                Around the World
              </div>
            </div>
            <ChevronRight size={20} color="#10b981" style={{ marginTop: 18, flexShrink: 0 }} />
          </div>

          <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '10px 0 14px' }}>
            4 corners. 12 seconds per zone. Keep your gloves on until the end, then log your hits.
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={12} color="#475569" />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#475569' }}>48 sec total</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Target size={12} color="#475569" />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#475569' }}>4 corners</span>
            </div>
          </div>

          {/* Zone sequence chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {['Top Left', 'Top Right', 'Bottom Right', 'Bottom Left'].map((z, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  background: 'var(--card-bg)', border: '1px solid #10b98133',
                  borderRadius: 6, padding: '3px 8px',
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '0.06em',
                }}>
                  {z}
                </div>
                {i < 3 && <span style={{ color: '#334155', fontSize: 12, lineHeight: 1 }}>›</span>}
              </div>
            ))}
          </div>
        </div>
      </button>

      {/* Coming soon placeholder */}
      <div style={{
        marginTop: 10,
        background: 'var(--card-bg)', border: '1px dashed var(--text-muted)',
        borderRadius: 12, padding: '20px 16px', textAlign: 'center',
        opacity: 0.55,
      }}>
        <Gamepad2 size={22} color="#64748b" style={{ marginBottom: 8 }} />
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          MORE GAMES COMING SOON
        </div>
      </div>
    </div>
  )
}
