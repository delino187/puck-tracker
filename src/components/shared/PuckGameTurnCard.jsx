import Avatar from './Avatar.jsx'
import { getGameAction } from '../../services/puckGameService.js'

const PUCK_LETTERS = ['P', 'U', 'C', 'K']

export default function PuckGameTurnCard({ game, playerId, players = [], onPlay }) {
  const isP1       = game.p1Id === playerId
  const oppName    = isP1 ? game.p2Name : game.p1Name
  const oppId      = isP1 ? game.p2Id   : game.p1Id
  const opp        = players.find(p => p.id === oppId)
  const myLetters  = (isP1 ? game.p1Letters : game.p2Letters) || []
  const oppLetters = (isP1 ? game.p2Letters : game.p1Letters) || []
  const action     = getGameAction(game, playerId)
  const isExpired  = action === 'expired'

  return (
    <div
      onClick={onPlay}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(135deg,#0d0b18,#14102a)',
        border: `2px solid ${isExpired ? '#ef444466' : '#ef444499'}`,
        borderRadius: 16, padding: '12px 14px', marginBottom: 10,
        cursor: 'pointer',
        boxShadow: isExpired ? '0 0 12px #ef444412' : '0 0 20px #ef444428',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {/* Left: opponent avatar */}
      <div style={{ flexShrink: 0 }}>
        <Avatar player={opp} size={48} className="arcade-glow" style={{ borderRadius: '50%' }} />
      </div>

      {/* Center: name + letter scoreboard + status pill */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Bangers',sans-serif", fontSize: 20,
          letterSpacing: '0.06em', color: '#f1f5f9', lineHeight: 1.1,
        }}>
          P-U-C-K vs {oppName?.toUpperCase() ?? '—'}
        </div>

        {/* Compact letter scoreboard */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 1 }}>
            {PUCK_LETTERS.map((l, i) => (
              <span key={l} style={{
                fontFamily: "'Bangers',sans-serif", fontSize: 13, letterSpacing: '0.02em',
                color: i < myLetters.length ? '#ef4444' : '#1e2d44',
                textShadow: i < myLetters.length ? '0 0 8px #ef444488' : 'none',
              }}>{l}</span>
            ))}
          </div>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#475569', letterSpacing: '0.08em' }}>
            YOU
          </span>
          <span style={{ color: '#334155', fontSize: 10 }}>·</span>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#475569', letterSpacing: '0.08em' }}>
            THEM
          </span>
          <div style={{ display: 'flex', gap: 1 }}>
            {PUCK_LETTERS.map((l, i) => (
              <span key={l} style={{
                fontFamily: "'Bangers',sans-serif", fontSize: 13, letterSpacing: '0.02em',
                color: i < oppLetters.length ? '#ef4444' : '#1e2d44',
                textShadow: i < oppLetters.length ? '0 0 8px #ef444488' : 'none',
              }}>{l}</span>
            ))}
          </div>
        </div>

        {/* Status pill — mirrors PeerChallengeCard YOUR TURN style */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7,
          background: isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${isExpired ? '#ef444433' : '#ef444466'}`,
          borderRadius: 20, padding: '3px 10px',
        }}>
          <span style={{ fontSize: 10 }}>{isExpired ? '⏰' : '⚡'}</span>
          <span style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10,
            fontWeight: 800, letterSpacing: '0.1em', color: '#ef4444',
          }}>
            {isExpired ? 'TIME EXPIRED' : 'YOUR TURN!'}
          </span>
        </div>
      </div>

      {/* Right: PLAY button */}
      <button
        onClick={e => { e.stopPropagation(); onPlay?.() }}
        style={{
          flexShrink: 0,
          background: isExpired
            ? 'linear-gradient(135deg,#7f1d1d,#b91c1c)'
            : 'linear-gradient(135deg,#991b1b,#ef4444)',
          border: 'none', borderRadius: 12, padding: '10px 14px',
          fontFamily: "'Bangers',sans-serif", fontSize: 16,
          letterSpacing: '0.06em', color: '#fff', cursor: 'pointer',
          boxShadow: '0 0 16px #ef444444',
          whiteSpace: 'nowrap',
        }}
      >
        PLAY 🏒
      </button>
    </div>
  )
}
