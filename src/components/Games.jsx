import { useState } from 'react'
import { ChevronRight, Clock, Target } from 'lucide-react'
import AroundTheWorld from './AroundTheWorld.jsx'
import PuckGame       from './screens/PuckGame.jsx'

export default function Games({ player, players, sessions, puckGames, onSubmitGame, onPuckGameUpdate }) {
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

  if (activeGame === 'puck') {
    return (
      <PuckGame
        player={player}
        players={players}
        puckGames={puckGames}
        onBack={() => setActiveGame(null)}
        onUpdate={onPuckGameUpdate}
      />
    )
  }

  const activePuckCount = puckGames.filter(g => g.status === 'active').length
  const urgentPuck      = puckGames.some(g => {
    if (g.status !== 'active') return false
    const r = g.currentRound
    if (!r) return false
    if (r.status === 'awaiting_setter' && r.setterPlayerId === player.id) return true
    if (r.status === 'awaiting_defender') {
      const isDefender = g.setterPlayerId !== player.id
      return isDefender
    }
    return false
  })

  return (
    <div style={{ padding: '16px 12px 24px' }}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
        Training Games
      </div>

      {/* P-U-C-K — featured at top */}
      <button
        onClick={() => setActiveGame('puck')}
        style={{ width: '100%', textAlign: 'left', background: 'var(--card-bg)', border: urgentPuck ? '2px solid #ef444455' : '1px solid #ef444422', borderRadius: 16, padding: 0, cursor: 'pointer', overflow: 'hidden', boxShadow: urgentPuck ? '0 4px 28px #ef444422' : '0 4px 24px #ef444410', display: 'block', marginBottom: 10 }}
      >
        <div style={{ height: 4, background: 'linear-gradient(90deg,#7f1d1d,#ef4444,#f97316)' }} />
        <div style={{ padding: '18px 18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#7f1d1d,#ef4444)', borderRadius: 6, padding: '3px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  MULTIPLAYER
                </div>
                {activePuckCount > 0 && (
                  <div style={{ background: urgentPuck ? '#ef4444' : '#334155', color: '#fff', borderRadius: 10, padding: '1px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700 }}>
                    {activePuckCount} ACTIVE
                  </div>
                )}
              </div>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 34, color: '#ef4444', letterSpacing: '0.06em', lineHeight: 1.1, textShadow: '0 0 20px #ef444433' }}>
                P-U-C-K
              </div>
            </div>
            <ChevronRight size={20} color="#ef4444" style={{ marginTop: 18, flexShrink: 0 }} />
          </div>
          <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '10px 0 14px' }}>
            Hockey HORSE. Set a trick shot — if you make it, your opponent must match it or get a letter. First to spell P-U-C-K loses.
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {['Turn-Based', 'Video Proof', 'Earn XP'].map(tag => (
              <div key={tag} style={{ background: '#1a0608', border: '1px solid #ef444422', borderRadius: 6, padding: '3px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.06em' }}>
                {tag}
              </div>
            ))}
          </div>
        </div>
      </button>

      {/* Around the World */}
      <button
        onClick={() => setActiveGame('atw')}
        style={{ width: '100%', textAlign: 'left', background: 'var(--card-bg)', border: '1px solid #10b98133', borderRadius: 16, padding: 0, cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 24px #10b98118', display: 'block' }}
      >
        <div style={{ height: 4, background: 'linear-gradient(90deg,#059669,#34d399,#0ea5e9)' }} />
        <div style={{ padding: '18px 18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#059669,#10b981)', borderRadius: 6, padding: '3px 8px', marginBottom: 6, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                ZERO-TOUCH
              </div>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 30, color: 'var(--text-1)', letterSpacing: '0.03em', lineHeight: 1.1 }}>
                Around the World
              </div>
            </div>
            <ChevronRight size={20} color="#10b981" style={{ marginTop: 18, flexShrink: 0 }} />
          </div>
          <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '10px 0 14px' }}>
            4 corners. 12 seconds per zone. Keep your gloves on until the end, then log your hits.
          </div>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {['Top Left', 'Top Right', 'Bottom Right', 'Bottom Left'].map((z, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ background: 'var(--card-bg)', border: '1px solid #10b98133', borderRadius: 6, padding: '3px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '0.06em' }}>{z}</div>
                {i < 3 && <span style={{ color: '#334155', fontSize: 12 }}>›</span>}
              </div>
            ))}
          </div>
        </div>
      </button>
    </div>
  )
}
