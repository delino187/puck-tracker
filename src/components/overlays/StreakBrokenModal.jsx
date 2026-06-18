import { Flame } from 'lucide-react'

const REVIVE_COST = 50

export default function StreakBrokenModal({ prevStreak, diamonds = 0, onRevive, onDecline }) {
  const canAfford = diamonds >= REVIVE_COST

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 490,
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'linear-gradient(160deg,#0d0800,#1a0a00)',
        border: '2px solid rgba(239,68,68,0.55)',
        borderRadius: 22,
        padding: '28px 22px 24px',
        textAlign: 'center',
        boxShadow: '0 0 60px rgba(239,68,68,0.2), 0 24px 48px rgba(0,0,0,0.75)',
      }}>

        {/* Broken flame icon */}
        <div style={{ fontSize: 52, marginBottom: 10, lineHeight: 1 }}>🔥</div>

        <div style={{
          fontFamily: "'Bangers',sans-serif", fontSize: 36,
          letterSpacing: '0.1em',
          color: '#ef4444',
          textShadow: '0 0 30px rgba(239,68,68,0.5)',
          marginBottom: 6,
        }}>
          STREAK BROKEN!
        </div>

        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14,
          color: '#94a3b8', marginBottom: 22, lineHeight: 1.5,
        }}>
          Your{' '}
          <span style={{ color: '#fb923c', fontWeight: 800 }}>{prevStreak}-day streak</span>
          {' '}has expired.
          <br />
          <span style={{ fontSize: 12, color: '#64748b' }}>You were away more than 36 hours.</span>
        </div>

        {/* Cost card */}
        <div style={{
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 18,
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10,
            color: '#d97706', letterSpacing: '0.18em', marginBottom: 8,
          }}>
            STREAK INSURANCE COST
          </div>
          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 30,
            color: '#fbbf24', letterSpacing: '0.06em', lineHeight: 1, marginBottom: 8,
          }}>
            💎 50 DIAMONDS
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            color: '#64748b',
          }}>
            YOUR BALANCE:{' '}
            <span style={{
              fontWeight: 800,
              color: canAfford ? '#34d399' : '#ef4444',
            }}>
              {diamonds} 💎
            </span>
          </div>
        </div>

        {/* Revive button */}
        <button
          onClick={canAfford ? onRevive : undefined}
          disabled={!canAfford}
          style={{
            width: '100%', marginBottom: 10,
            background: canAfford
              ? 'linear-gradient(135deg,#92400e,#f59e0b)'
              : '#0f172a',
            border: `2px solid ${canAfford ? '#f59e0b' : '#1e293b'}`,
            borderRadius: 13, padding: '14px 0',
            fontFamily: "'Bangers',sans-serif", fontSize: 19,
            letterSpacing: '0.08em',
            color: canAfford ? '#fff' : '#334155',
            cursor: canAfford ? 'pointer' : 'not-allowed',
            boxShadow: canAfford ? '0 0 22px rgba(245,158,11,0.4)' : 'none',
          }}
        >
          <Flame size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, marginBottom: 2 }} />
          {canAfford ? 'SPEND 50 DIAMONDS — REVIVE' : 'NOT ENOUGH DIAMONDS'}
        </button>

        {!canAfford && (
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11,
            color: '#475569', marginBottom: 10,
          }}>
            Earn diamonds from Daily Quests to unlock insurance.
          </div>
        )}

        {/* Decline button */}
        <button
          onClick={onDecline}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid #1e293b',
            borderRadius: 13, padding: '12px 0',
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
            color: '#475569', cursor: 'pointer',
          }}
        >
          LOSE STREAK — RESET TO 0
        </button>
      </div>
    </div>
  )
}
