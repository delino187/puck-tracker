import { Flame, Lock, Users } from 'lucide-react'
import { C } from '../styles.js'
import { playerStats } from '../utils/stats.js'
import { useAppStore } from '../store/useAppStore.js'

const FREEZE_COST = 500

export default function StreakHub({ player, stats, sessions, players, onPurchase }) {
  const econEntry   = useAppStore(state => state.economyByPlayer[player.id])
  const techEntry   = useAppStore(state => state.techniqueByPlayer[player.id])
  const econ        = econEntry || { xpSpent: 0, streakFreezes: 0 }
  const techniqueXP = techEntry?.bonusXP || 0
  const balance     = Math.max(0, stats.xp + techniqueXP - (econ.xpSpent || 0))
  const freezeQty   = econ.streakFreezes || 0
  const canAfford   = balance >= FREEZE_COST

  // All players ranked by active streak (descending)
  const streakBoard = [...players]
    .map(p => {
      const s = playerStats(p, sessions)
      return { ...p, streak: s.streak, xp: s.xp }
    })
    .filter(p => p.streak > 0)
    .sort((a, b) => b.streak - a.streak)

  return (
    <div style={{ padding: '14px 14px 80px' }}>

      {/* ── Streak Leaderboard ────────────────────────────────────────────── */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.16em', marginBottom: 10 }}>
        ACTIVE STREAKS — ALL PLAYERS
      </div>

      {streakBoard.length === 0 ? (
        <div style={{ ...C.card, textAlign: 'center', padding: '20px 18px' }}>
          <Users size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            No active streaks yet — hit the driveway!
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          {streakBoard.map((p, i) => {
            const isMe = p.id === player.id
            return (
              <div
                key={p.id}
                style={{
                  background: isMe ? 'rgba(249,115,22,0.1)' : 'var(--card-bg)',
                  border: isMe ? '1px solid #f9731633' : 'var(--card-border)',
                  borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                {/* Rank */}
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 800,
                  color: i === 0 ? '#f59e0b' : 'var(--text-muted)',
                  minWidth: 22, textAlign: 'center',
                }}>
                  {i === 0 ? '🥇' : `#${i + 1}`}
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: isMe ? '#f97316' : 'var(--text-1)' }}>
                    {p.name}{p.jerseyNum ? ` #${p.jerseyNum}` : ''}{isMe ? ' 👈' : ''}
                  </div>
                </div>

                {/* Flame bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {Array.from({ length: Math.min(p.streak, 7) }).map((_, fi) => (
                    <Flame key={fi} size={10} color={`rgba(249,115,22,${1 - fi * 0.1})`} />
                  ))}
                </div>

                {/* Streak count */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 900, color: '#f97316', lineHeight: 1 }}>
                    {p.streak}
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                    DAYS
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Section D: Streak Freeze Quick-Action ────────────────────────── */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.16em', marginBottom: 10 }}>
        STREAK PROTECTION
      </div>

      <div style={{
        background: 'var(--card-bg)',
        border: freezeQty > 0 ? '1px solid #3b82f633' : 'var(--card-border)',
        borderRadius: 14, padding: '18px',
        boxShadow: freezeQty > 0 ? '0 0 20px #3b82f618' : 'none',
      }}>
        {/* Inventory status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, fontSize: 22,
              background: freezeQty > 0 ? 'linear-gradient(135deg,#0c1a2e,#1e3a5f)' : 'var(--card-bg)',
              border: `1px solid ${freezeQty > 0 ? '#3b82f633' : 'var(--card-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>❄️</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                Streak Freeze
              </div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>
                Auto-activates on a missed day
              </div>
            </div>
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 36, fontWeight: 900,
            color: freezeQty > 0 ? '#60a5fa' : 'var(--score-inactive)',
          }}>
            {freezeQty}
          </div>
        </div>

        {freezeQty > 0 && (
          <div style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid #3b82f622',
            borderRadius: 8, padding: '7px 12px', marginBottom: 14,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#60a5fa', letterSpacing: '0.07em',
          }}>
            ❄️ You have {freezeQty} Freeze{freezeQty !== 1 ? 's' : ''} available — your streak is protected
          </div>
        )}

        {/* Buy button */}
        {canAfford ? (
          <button
            onClick={() => onPurchase(FREEZE_COST, 'streakFreezes')}
            style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 800, fontSize: 16, cursor: 'pointer',
              letterSpacing: '0.06em',
              boxShadow: '0 0 16px #3b82f640',
            }}
          >
            Buy Freeze — {FREEZE_COST.toLocaleString()} XP
          </button>
        ) : (
          <div style={{
            width: '100%', padding: '12px',
            background: 'var(--card-bg)', border: 'var(--card-border)',
            borderRadius: 10, textAlign: 'center',
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxSizing: 'border-box',
          }}>
            <Lock size={12} color="var(--text-muted)" />
            {(FREEZE_COST - balance).toLocaleString()} more XP needed
          </div>
        )}

        <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
          Balance: {balance.toLocaleString()} XP available
        </div>
      </div>
    </div>
  )
}
