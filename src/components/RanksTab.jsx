import { useState, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { LEVELS } from '../constants/levels.js'

export default function RanksTab({ stats, openDetail, onDetailClose }) {
  const { xp, li } = stats
  const [selectedLevel, setSelectedLevel] = useState(null)

  // If Dashboard rank hero tapped, auto-open current rank detail
  useEffect(() => {
    if (openDetail) setSelectedLevel(LEVELS[li])
  }, [openDetail, li])

  function closeModal() {
    setSelectedLevel(null)
    onDetailClose?.()
  }

  // Compute modal stats for the selected level
  const modal = selectedLevel ? (() => {
    const sIdx      = LEVELS.indexOf(selectedLevel)
    const sNext     = LEVELS[sIdx + 1] ?? null
    const isUnlocked = xp >= selectedLevel.xpNeeded
    const isCurrent  = sIdx === li
    const rawEarned  = xp - selectedLevel.xpNeeded
    const sEarned    = isUnlocked && sNext
      ? Math.min(rawEarned, sNext.xpNeeded - selectedLevel.xpNeeded)
      : isUnlocked ? 1 : 0
    const sNeeded  = sNext ? sNext.xpNeeded - selectedLevel.xpNeeded : 1
    const sPct     = sNext
      ? Math.min(100, (Math.max(0, sEarned) / sNeeded) * 100)
      : isUnlocked ? 100 : 0
    const xpToUnlock = !isUnlocked ? selectedLevel.xpNeeded - xp : 0
    const xpToNext   = isCurrent && sNext ? Math.max(0, sNext.xpNeeded - xp) : 0
    return { sIdx, sNext, isUnlocked, isCurrent, sEarned, sNeeded, sPct, xpToUnlock, xpToNext }
  })() : null

  return (
    <div style={{ padding: '14px 16px 80px' }}>

      {/* ── Rank Detail Modal ──────────────────────────────────────────────── */}
      {selectedLevel && modal && (
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
              0%,100% { box-shadow: 0 0 40px 10px ${selectedLevel.glow}66, 0 0 80px 20px ${selectedLevel.glow}33; }
              50%      { box-shadow: 0 0 70px 22px ${selectedLevel.glow}99, 0 0 140px 44px ${selectedLevel.glow}55; }
            }
          `}</style>

          {/* Headline */}
          <div style={{
            fontFamily: "'Bangers',sans-serif",
            fontSize: 'clamp(24px,7vw,38px)',
            letterSpacing: '0.06em',
            color: selectedLevel.color,
            textShadow: `0 0 30px ${selectedLevel.glow}88`,
            marginBottom: 24,
            textAlign: 'center',
            lineHeight: 1.1,
          }}>
            {selectedLevel.name.toUpperCase()} RANK
            {modal.isCurrent ? ' PROGRESS' : modal.isUnlocked ? ' — COMPLETED' : ' — LOCKED'}
          </div>

          {/* Giant badge */}
          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            background: modal.isUnlocked ? selectedLevel.bg : 'linear-gradient(135deg,#1e293b,#334155)',
            border: `5px solid ${modal.isUnlocked ? selectedLevel.color : '#334155'}`,
            overflow: 'hidden', flexShrink: 0,
            filter: modal.isUnlocked ? 'none' : 'grayscale(1) brightness(0.35)',
            animation: modal.isUnlocked ? 'rankGlow 2.2s ease-in-out infinite' : 'none',
            marginBottom: 28,
          }}>
            <img
              src={selectedLevel.img}
              alt={selectedLevel.name}
              className="rounded-full object-cover"
              style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }}
            />
          </div>

          {/* Contextual body */}
          {modal.isCurrent && modal.sNext && (
            <>
              {/* Progress bar */}
              <div style={{ width: '100%', maxWidth: 320, marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    {modal.sEarned.toLocaleString()} / {modal.sNeeded.toLocaleString()} XP
                  </span>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: selectedLevel.color }}>
                    {modal.sPct.toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: 20, background: '#0a0f1a', borderRadius: 10, overflow: 'hidden', border: `2px solid ${selectedLevel.color}44` }}>
                  <div style={{
                    height: '100%', width: `${modal.sPct}%`,
                    background: `linear-gradient(90deg,${selectedLevel.color},${modal.sNext.color})`,
                    borderRadius: 10,
                    transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                    boxShadow: `0 0 12px ${selectedLevel.glow}`,
                  }} />
                </div>
              </div>
              <div style={{
                fontFamily: "'Bangers',sans-serif",
                fontSize: 'clamp(20px,5.5vw,30px)',
                color: '#f1f5f9',
                textAlign: 'center',
                letterSpacing: '0.04em',
                marginBottom: 36,
                lineHeight: 1.2,
              }}>
                {modal.xpToNext.toLocaleString()} XP TO GO UNTIL {modal.sNext.name.toUpperCase()}!
              </div>
            </>
          )}

          {modal.isCurrent && !modal.sNext && (
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 28, color: selectedLevel.color, textAlign: 'center', letterSpacing: '0.06em', marginBottom: 36, textShadow: `0 0 20px ${selectedLevel.glow}` }}>
              MAX RANK ACHIEVED! 🏆
            </div>
          )}

          {!modal.isCurrent && modal.isUnlocked && (
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, color: '#34d399', textAlign: 'center', letterSpacing: '0.05em', marginBottom: 36 }}>
              RANK COMPLETED ✓
            </div>
          )}

          {!modal.isUnlocked && (
            <>
              <div style={{ width: '100%', maxWidth: 320, marginBottom: 18 }}>
                <div style={{ height: 14, background: '#0a0f1a', borderRadius: 7, overflow: 'hidden', border: '2px solid #1e3a5f' }}>
                  <div style={{ height: '100%', width: '0%', background: '#334155', borderRadius: 7 }} />
                </div>
              </div>
              <div style={{
                fontFamily: "'Bangers',sans-serif",
                fontSize: 'clamp(20px,5.5vw,28px)',
                color: '#94a3b8',
                textAlign: 'center',
                letterSpacing: '0.04em',
                marginBottom: 36,
                lineHeight: 1.2,
              }}>
                {modal.xpToUnlock.toLocaleString()} XP NEEDED TO UNLOCK
              </div>
            </>
          )}

          <button
            onClick={closeModal}
            style={{
              background: modal.isUnlocked ? selectedLevel.color : '#1e293b',
              color: modal.isUnlocked ? '#000' : '#e2e8f0',
              border: modal.isUnlocked ? 'none' : '1px solid #334155',
              borderRadius: 14,
              padding: '15px 44px',
              fontFamily: "'Bangers',sans-serif",
              fontSize: 24,
              letterSpacing: '0.10em',
              cursor: 'pointer',
              boxShadow: modal.isUnlocked ? `0 0 30px ${selectedLevel.glow}66, 0 4px 20px rgba(0,0,0,0.5)` : 'none',
            }}
          >
            BACK TO GAME
          </button>
        </div>
      )}

      {/* ── Rank list ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.1em', color: '#f1f5f9' }}>
          ALL RANKS
        </span>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#39ff14', letterSpacing: '0.1em' }}>
          — {xp.toLocaleString()} XP TOTAL
        </span>
      </div>

      {LEVELS.map((l, i) => {
        const isCur      = i === li
        const isUnlocked = xp >= l.xpNeeded
        const nextL      = LEVELS[i + 1]
        const nextXp     = nextL?.xpNeeded ?? null
        const tierEarned = isUnlocked && nextXp
          ? Math.min(xp - l.xpNeeded, nextXp - l.xpNeeded)
          : isUnlocked ? 1 : Math.max(0, xp - l.xpNeeded)
        const tierNeeded = nextXp ? nextXp - l.xpNeeded : 1
        const tierPct    = nextXp ? Math.min(100, (tierEarned / tierNeeded) * 100) : isUnlocked ? 100 : 0

        return (
          <div
            key={l.name}
            onClick={() => setSelectedLevel(l)}
            style={{
              background:  isCur ? 'rgba(59,130,246,0.08)' : 'var(--card-bg)',
              borderRadius: 12, padding: '14px 16px', marginBottom: 10,
              border:      isCur ? `1px solid ${l.color}66` : 'var(--card-border)',
              boxShadow:   isCur ? `0 0 16px ${l.glow}22` : 'none',
              opacity:     isUnlocked ? 1 : 0.55,
              cursor:      'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: (isCur || (!isUnlocked && i === li + 1)) && nextXp ? 8 : 0 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                background: isUnlocked ? l.bg : 'linear-gradient(135deg,#1e293b,#334155)',
                border: `3px solid ${isUnlocked ? l.color : '#334155'}`,
                boxShadow: isUnlocked ? `0 0 18px ${l.glow}77, inset 0 1px 0 rgba(255,255,255,0.08)` : 'none',
                flexShrink: 0,
              }}>
                <img
                  src={l.img} alt={l.name}
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
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700 }}>
                  <span style={{ color: '#f1f5f9' }}>{l.xpNeeded.toLocaleString()} XP</span>
                  {nextXp && <span style={{ color: '#475569' }}> → </span>}
                  {nextXp && <span style={{ color: '#94a3b8' }}>{nextXp.toLocaleString()} XP</span>}
                </div>
              </div>

              {!isUnlocked && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, color: '#f97316', letterSpacing: '0.04em', lineHeight: 1 }}>
                    {(l.xpNeeded - xp).toLocaleString()}
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#f97316', letterSpacing: '0.1em' }}>XP AWAY</div>
                </div>
              )}
            </div>

            {(isCur || (!isUnlocked && i === li + 1)) && nextXp && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: isCur ? '#39ff14' : '#f97316' }}>
                    {isCur ? `${tierEarned.toLocaleString()} / ${tierNeeded.toLocaleString()} XP` : `${Math.max(0, l.xpNeeded - xp).toLocaleString()} XP TO UNLOCK`}
                  </span>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#f1f5f9' }}>{tierPct.toFixed(0)}%</span>
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
