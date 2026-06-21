import { Lock, ShoppingBag, Snowflake } from 'lucide-react'
import { C } from '../styles.js'
import { useAppStore } from '../store/useAppStore.js'

const STORE_ITEMS = [
  {
    id:     'streakFreeze',
    key:    'streakFreezes',
    emoji:  '❄️',
    name:   'Streak Shield',
    desc:   "Streak Shield! Automatically protects your daily streak if you miss a day on the ice. Use it to keep your hard work alive!",
    cost:   500,
    border: '#3b82f633',
    glow:   '#3b82f628',
    accent: '#60a5fa',
    bg:     'linear-gradient(145deg,#080f1e,#0c1a2e)',
  },
]

export default function ProShop({ player, stats, onPurchase }) {
  const econEntry  = useAppStore(state => state.economyByPlayer[player.id])
  const econ       = econEntry || { xpSpent: 0, streakFreezes: 0 }
  const balance    = Math.max(0, stats.xp - (econ.xpSpent || 0))
  const xpSpent    = econ.xpSpent || 0
  const freezeQty  = econ.streakFreezes || 0

  return (
    <div style={{ padding: '14px 14px 80px' }}>

      {/* ── XP Balance hero ──────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card-bg)',
        border: '2px solid #f59e0b',
        borderRadius: 16, padding: '22px 20px', marginBottom: 18,
        boxShadow: '0 0 40px #f59e0b14',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11,
          color: '#d97706', letterSpacing: '0.2em', marginBottom: 8,
        }}>
          🏦 XP BALANCE
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 56, fontWeight: 900,
          color: '#fbbf24', lineHeight: 1,
          textShadow: '0 0 40px #f59e0b77',
        }}>
          {balance.toLocaleString()}
          <span style={{ fontSize: 20, fontWeight: 600, color: '#92400e', marginLeft: 8 }}>XP</span>
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10,
          color: 'var(--text-muted)', marginTop: 8, letterSpacing: '0.1em',
        }}>
          TOTAL EARNED: {stats.xp.toLocaleString()} XP
          {xpSpent > 0 && ` · SPENT: ${xpSpent.toLocaleString()} XP`}
        </div>
      </div>

      {/* ── Available items ─────────────────────────────────────────────── */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.18em', marginBottom: 12 }}>
        AVAILABLE ITEMS
      </div>

      {STORE_ITEMS.map(item => {
        const canAfford = balance >= item.cost
        const owned     = econ[item.key] || 0

        return (
          <div key={item.id} style={{
            background: 'var(--card-bg)',
            border: canAfford ? `2px solid ${item.accent}44` : 'var(--card-border)',
            borderRadius: 16, marginBottom: 14, overflow: 'hidden',
            boxShadow: canAfford ? `0 4px 28px ${item.glow}` : 'none',
          }}>
            {/* Accent stripe */}
            <div style={{ height: 3, background: canAfford ? item.accent : '#1e3a5f' }} />

            <div style={{ padding: '18px 18px 16px' }}>
              {/* Title + cost */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontSize: 24, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.1,
                  }}>
                    {item.emoji} {item.name}
                  </div>
                  {owned > 0 && (
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: item.accent, letterSpacing: '0.08em', marginTop: 3 }}>
                      IN STOCK: {owned}
                    </div>
                  )}
                </div>
                <div style={{
                  flexShrink: 0, marginLeft: 12,
                  background: canAfford ? '#fef3c7' : 'var(--card-bg)',
                  border: `1px solid ${canAfford ? '#f59e0b77' : 'var(--card-border)'}`,
                  borderRadius: 8, padding: '5px 11px',
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 15, fontWeight: 800,
                  color: canAfford ? '#fbbf24' : 'var(--text-muted)',
                }}>
                  {item.cost.toLocaleString()} XP
                </div>
              </div>

              {/* Description */}
              <div style={{
                fontFamily: 'Barlow,sans-serif', fontSize: 13,
                color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 16,
              }}>
                {item.desc}
              </div>

              {/* CTA */}
              {canAfford ? (
                <button
                  onClick={() => onPurchase(item.cost, item.key)}
                  style={{
                    width: '100%', padding: '14px',
                    background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                    color: '#fff', border: 'none', borderRadius: 11,
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontWeight: 800, fontSize: 17, cursor: 'pointer',
                    letterSpacing: '0.06em',
                    boxShadow: '0 0 20px #3b82f640',
                  }}
                >
                  BUY NOW — {item.cost.toLocaleString()} XP
                </button>
              ) : (
                <div style={{
                  width: '100%', padding: '13px',
                  background: 'var(--card-bg)', border: 'var(--card-border)',
                  borderRadius: 11, textAlign: 'center',
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.06em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  boxSizing: 'border-box',
                }}>
                  <Lock size={12} color="#334155" />
                  {(item.cost - balance).toLocaleString()} more XP needed · Keep Shooting to Earn
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* ── Inventory ────────────────────────────────────────────────────── */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.18em', marginBottom: 12, marginTop: 4 }}>
        YOUR INVENTORY
      </div>

      <div style={{ ...C.card, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg,#0c1a2e,#1e3a5f)',
              border: `1px solid ${freezeQty > 0 ? '#3b82f633' : '#1e293b'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>
              ❄️
            </div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                Streak Freeze
              </div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                Auto-activates when you miss a day
              </div>
            </div>
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 36, fontWeight: 900,
            color: freezeQty > 0 ? '#60a5fa' : '#1e3a5f',
          }}>
            {freezeQty}
          </div>
        </div>

        {freezeQty > 0 && (
          <div style={{
            marginTop: 12, padding: '8px 12px',
            background: '#0c1a2e', borderRadius: 8, border: '1px solid #3b82f622',
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            color: '#60a5fa', letterSpacing: '0.07em',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            ❄️ {freezeQty} Active Freeze{freezeQty !== 1 ? 's' : ''} — Your streak is protected
          </div>
        )}

        {freezeQty === 0 && (
          <div style={{
            marginTop: 10, fontFamily: 'Barlow,sans-serif', fontSize: 12,
            color: 'var(--text-muted)', textAlign: 'center',
          }}>
            No items in inventory
          </div>
        )}
      </div>

      {/* ── Earning hint ──────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 12, padding: '12px 16px',
        background: '#0a0f1a', border: '1px dashed #1e3a5f', borderRadius: 12,
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.08em', lineHeight: 1.5 }}>
          Earn XP by shooting pucks · Each set earns +5 XP · Each hit earns +0.3 XP
        </div>
      </div>
    </div>
  )
}
