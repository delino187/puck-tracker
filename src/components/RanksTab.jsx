import { CheckCircle } from 'lucide-react'
import { LEVELS } from '../constants/levels.js'

export default function RanksTab({ stats }) {
  const { xp, li } = stats

  return (
    <div style={{ padding: '14px 16px 80px' }}>
      <div style={{
        fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.12em',
        color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: 12,
      }}>
        All Ranks — {xp} XP Total
      </div>

      {LEVELS.map((l, i) => {
        const isCur      = i === li
        const isUnlocked = xp >= l.xpNeeded
        const next       = LEVELS[i + 1]
        const prevXp     = l.xpNeeded
        const nextXp     = next ? next.xpNeeded : null
        const earnedInTier = isUnlocked && nextXp
          ? Math.min(xp - prevXp, nextXp - prevXp)
          : isUnlocked ? 1 : Math.max(0, xp - prevXp)
        const neededInTier = nextXp ? nextXp - prevXp : 1
        const pct = nextXp ? Math.min(100, (earnedInTier / neededInTier) * 100) : isUnlocked ? 100 : 0

        return (
          <div key={l.name} style={{
            background:  isCur ? 'rgba(59,130,246,0.08)' : 'var(--card-bg)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 10,
            border:      isCur ? `1px solid ${l.color}66` : 'var(--card-border)',
            boxShadow:   isCur ? `0 0 16px ${l.glow}22` : 'none',
            opacity:     isUnlocked ? 1 : 0.55,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: (isCur || (!isUnlocked && i === li + 1)) && nextXp ? 8 : 0 }}>
              {/* Rank image — 72×72 premium circle, scale(1.1) clips white corners */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                background: isUnlocked ? l.bg : 'linear-gradient(135deg,#1e293b,#334155)',
                border: `3px solid ${isUnlocked ? l.color : '#334155'}`,
                boxShadow: isUnlocked ? `0 0 18px ${l.glow}77, inset 0 1px 0 rgba(255,255,255,0.08)` : 'none',
                flexShrink: 0,
              }}>
                <img
                  src={l.img}
                  alt={l.name}
                  className="rounded-full object-cover"
                  style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 18, color: isUnlocked ? l.color : '#94a3b8' }}>
                    {l.name}
                  </span>
                  {isCur && (
                    <span style={{ background: l.color, color: '#000', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>
                      CURRENT
                    </span>
                  )}
                  {isUnlocked && !isCur && <CheckCircle size={13} color="#34d399" />}
                </div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>
                  {l.xpNeeded.toLocaleString()} XP{nextXp ? ` → ${nextXp.toLocaleString()} XP` : ''}
                </div>
              </div>

              {!isUnlocked && (
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'var(--text-muted)', textAlign: 'right' }}>
                  {(l.xpNeeded - xp).toLocaleString()}<br />
                  <span style={{ fontSize: 10 }}>XP away</span>
                </div>
              )}
            </div>

            {(isCur || (!isUnlocked && i === li + 1)) && nextXp && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-2)' }}>
                    {isCur ? `${earnedInTier} / ${neededInTier} XP` : `${Math.max(0, l.xpNeeded - xp)} XP to unlock`}
                  </span>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--progress-track)', borderRadius: 3, overflow: 'hidden', border: 'var(--card-border)' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${l.color},${LEVELS[Math.min(i + 1, LEVELS.length - 1)].color})`, borderRadius: 3, transition: 'width 0.6s' }} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
