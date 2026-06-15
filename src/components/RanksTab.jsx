import { CheckCircle } from 'lucide-react'
import { LEVELS } from '../constants/levels.js'

export default function RanksTab({ stats, openDetail, onDetailClose }) {
  const { xp, li } = stats

  // Current-rank progress math — used by both the list and the detail popup
  const cur          = LEVELS[li]
  const next         = LEVELS[li + 1] ?? null
  const earnedInTier = next
    ? Math.min(xp - cur.xpNeeded, next.xpNeeded - cur.xpNeeded)
    : 1
  const neededInTier = next ? next.xpNeeded - cur.xpNeeded : 1
  const pct          = next ? Math.min(100, (earnedInTier / neededInTier) * 100) : 100
  const xpToNext     = next ? next.xpNeeded - xp : 0

  return (
    <div style={{ padding: '14px 16px 80px' }}>

      {/* ── Rank Detail Popup ──────────────────────────────────────────────── */}
      {openDetail && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.96)',
          zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '28px 24px',
        }}>
          <style>{`
            @keyframes rankGlow {
              0%, 100% { box-shadow: 0 0 40px 10px ${cur.glow}66, 0 0 80px 20px ${cur.glow}33; }
              50%       { box-shadow: 0 0 70px 22px ${cur.glow}99, 0 0 140px 44px ${cur.glow}55; }
            }
          `}</style>

          {/* Headline */}
          <div style={{
            fontFamily: "'Bangers',sans-serif",
            fontSize: 'clamp(24px,7vw,38px)',
            letterSpacing: '0.06em',
            color: cur.color,
            textShadow: `0 0 30px ${cur.glow}88`,
            marginBottom: 28,
            textAlign: 'center',
            lineHeight: 1.1,
          }}>
            {cur.name.toUpperCase()} RANK PROGRESS
          </div>

          {/* Giant glowing badge */}
          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            background: cur.bg,
            border: `5px solid ${cur.color}`,
            overflow: 'hidden', flexShrink: 0,
            animation: 'rankGlow 2.2s ease-in-out infinite',
            marginBottom: 32,
          }}>
            <img
              src={cur.img}
              alt={cur.name}
              className="rounded-full object-cover"
              style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }}
            />
          </div>

          {/* XP progress bar */}
          <div style={{ width: '100%', maxWidth: 320, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                {earnedInTier.toLocaleString()} / {neededInTier.toLocaleString()} XP
              </span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: cur.color, letterSpacing: '0.06em' }}>
                {pct.toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 20, background: '#0a0f1a', borderRadius: 10, overflow: 'hidden', border: `2px solid ${cur.color}44` }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: next
                  ? `linear-gradient(90deg,${cur.color},${next.color})`
                  : cur.color,
                borderRadius: 10,
                transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                boxShadow: `0 0 12px ${cur.glow}`,
              }} />
            </div>
          </div>

          {/* XP callout */}
          {next ? (
            <div style={{
              fontFamily: "'Bangers',sans-serif",
              fontSize: 'clamp(22px,6vw,32px)',
              color: '#f1f5f9',
              textAlign: 'center',
              letterSpacing: '0.04em',
              marginBottom: 40,
              lineHeight: 1.2,
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            }}>
              {xpToNext.toLocaleString()} XP TO GO UNTIL {next.name.toUpperCase()}!
            </div>
          ) : (
            <div style={{
              fontFamily: "'Bangers',sans-serif",
              fontSize: 28,
              color: cur.color,
              textAlign: 'center',
              letterSpacing: '0.06em',
              marginBottom: 40,
              textShadow: `0 0 20px ${cur.glow}`,
            }}>
              MAX RANK ACHIEVED! 🏆
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onDetailClose}
            style={{
              background: cur.color,
              color: '#000',
              border: 'none',
              borderRadius: 14,
              padding: '15px 44px',
              fontFamily: "'Bangers',sans-serif",
              fontSize: 24,
              letterSpacing: '0.10em',
              cursor: 'pointer',
              boxShadow: `0 0 30px ${cur.glow}66, 0 4px 20px rgba(0,0,0,0.5)`,
            }}
          >
            BACK TO GAME
          </button>
        </div>
      )}

      {/* ── Rank list ─────────────────────────────────────────────────────── */}
      <div style={{
        fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.12em',
        color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: 12,
      }}>
        All Ranks — {xp} XP Total
      </div>

      {LEVELS.map((l, i) => {
        const isCur      = i === li
        const isUnlocked = xp >= l.xpNeeded
        const nextL      = LEVELS[i + 1]
        const prevXp     = l.xpNeeded
        const nextXp     = nextL ? nextL.xpNeeded : null
        const tierEarned = isUnlocked && nextXp
          ? Math.min(xp - prevXp, nextXp - prevXp)
          : isUnlocked ? 1 : Math.max(0, xp - prevXp)
        const tierNeeded = nextXp ? nextXp - prevXp : 1
        const tierPct    = nextXp ? Math.min(100, (tierEarned / tierNeeded) * 100) : isUnlocked ? 100 : 0

        return (
          <div key={l.name} style={{
            background:  isCur ? 'rgba(59,130,246,0.08)' : 'var(--card-bg)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 10,
            border:      isCur ? `1px solid ${l.color}66` : 'var(--card-border)',
            boxShadow:   isCur ? `0 0 16px ${l.glow}22` : 'none',
            opacity:     isUnlocked ? 1 : 0.55,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: (isCur || (!isUnlocked && i === li + 1)) && nextXp ? 8 : 0 }}>
              {/* Rank image — 72×72 premium circle */}
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
                  <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.03em', color: isUnlocked ? l.color : '#94a3b8' }}>
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
                    {isCur ? `${tierEarned} / ${tierNeeded} XP` : `${Math.max(0, l.xpNeeded - xp)} XP to unlock`}
                  </span>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)' }}>{tierPct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--progress-track)', borderRadius: 3, overflow: 'hidden', border: 'var(--card-border)' }}>
                  <div style={{ height: '100%', width: `${tierPct}%`, background: `linear-gradient(90deg,${l.color},${LEVELS[Math.min(i + 1, LEVELS.length - 1)].color})`, borderRadius: 3, transition: 'width 0.6s' }} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
