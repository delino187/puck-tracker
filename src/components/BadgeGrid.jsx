import { useState } from 'react'
import { Info, Gem, X } from 'lucide-react'
import { BADGES, BADGE_CATS, TIER, getBadgeXP } from '../constants/badges.js'
import { STREAK_BADGES, toCircleBadge } from '../constants/streakBadges.js'
import { allTimeStreakPB } from '../utils/badgeHelpers.js'
import { audioEngine } from '../services/audioEngine.js'
import { C } from '../styles.js'
import BadgeCircle from './shared/BadgeCircle.jsx'
import TierKeyPopup from './overlays/TierKeyPopup.jsx'
import { usePlayer } from '../context/PlayerContext.jsx'
import { useAppStore } from '../store/useAppStore.js'

export default function BadgeGrid({ newBadgeIds, onBadgeClick }) {
  const { activePlayer: player, st, upd } = usePlayer()
  const sessions = st.sessions
  const [showTierKey, setShowTierKey] = useState(false)
  const [claimingBadgeId, setClaimingBadgeId] = useState(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const earned = Object.keys(player.earnedBadges || {})
  const claimedBadges = player.claimedBadges || []

  // Claim XP reward for unclaimed badge.
  // Uses a lock flag to prevent double-tap awarding XP twice before the
  // first upd() re-render propagates the updated claimedBadges array.
  function claimBadgeReward(badgeId) {
    if (isClaiming) return
    const badge = BADGES.find(b => b.id === badgeId)
    if (!badge || claimedBadges.includes(badgeId)) return

    setIsClaiming(true)
    const xpReward = getBadgeXP(badge)

    // Play celebration audio
    audioEngine.playMp3('/compliment-shine.mp3', 0.9)

    // Read fresh claimedBadges from the current player in st.players to avoid
    // stale-closure races when two badges are claimed in quick succession.
    upd({
      players: st.players.map(p => {
        if (p.id !== player.id) return p
        const fresh = p.claimedBadges || []
        if (fresh.includes(badgeId)) return p
        return { ...p, claimedBadges: [...fresh, badgeId] }
      }),
    })

    // Log XP reward to technique store
    useAppStore.getState().logTechniqueShots(player.id, 0, xpReward)

    setClaimingBadgeId(null)
    // Release lock after one render cycle
    setTimeout(() => setIsClaiming(false), 400)
  }

  // Modal for claiming badge reward
  const claimingBadge = claimingBadgeId ? BADGES.find(b => b.id === claimingBadgeId) : null
  const xpValue = claimingBadge ? getBadgeXP(claimingBadge) : 0

  return (
    <div style={{ padding: '14px 16px 80px' }}>
      {/* CSS animation keyframes for wiggle */}
      <style>{`
        @keyframes badge-wiggle {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-3px) rotate(-2deg); }
          75% { transform: translateX(3px) rotate(2deg); }
        }
        .badge-unclaimed {
          animation: badge-wiggle 0.5s ease-in-out infinite;
          will-change: transform;
          filter: brightness(1.15);
        }
      `}</style>

      {showTierKey && <TierKeyPopup onClose={() => setShowTierKey(false)} />}

      {/* Claim Reward Modal */}
      {claimingBadge && (
        <div
          onClick={() => setClaimingBadgeId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg,#1a0050,#3f0066)',
              border: '3px solid #a855f7',
              borderRadius: 20,
              padding: '30px 24px',
              textAlign: 'center',
              maxWidth: 300,
              width: '100%',
              boxShadow: '0 0 60px #a855f744, 0 20px 60px rgba(0,0,0,0.8)',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setClaimingBadgeId(null)}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#a855f7',
                padding: 0,
              }}
            >
              <X size={20} />
            </button>

            {/* Badge icon */}
            <div style={{ fontSize: 60, marginBottom: 16 }}>{claimingBadge.icon}</div>

            {/* Badge name */}
            <div style={{
              fontFamily: "'Bangers',sans-serif", fontSize: 22,
              color: '#d8b4fe', letterSpacing: '0.08em',
              marginBottom: 8,
            }}>
              {claimingBadge.name}
            </div>

            {/* Description */}
            <div style={{
              fontFamily: "'Barlow',sans-serif", fontSize: 12,
              color: '#cbd5e1', marginBottom: 20,
              lineHeight: 1.5,
            }}>
              {claimingBadge.desc}
            </div>

            {/* XP Reward pill */}
            <div style={{
              background: 'rgba(168, 85, 247, 0.15)',
              border: '2px solid #a855f7',
              borderRadius: 16,
              padding: '12px 20px',
              marginBottom: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              <div>
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10,
                  fontWeight: 700, color: '#a78bfa', letterSpacing: '0.08em',
                }}>
                  XP REWARD
                </div>
                <div style={{
                  fontFamily: "'Bangers',sans-serif", fontSize: 20,
                  color: '#e9d5ff', lineHeight: 1,
                }}>
                  +{xpValue}
                </div>
              </div>
            </div>

            {/* Claim button */}
            <button
              onClick={() => claimBadgeReward(claimingBadge.id)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                border: '2px solid #c084fc',
                borderRadius: 14,
                padding: '12px 16px',
                fontFamily: "'Bangers',sans-serif", fontSize: 18,
                letterSpacing: '0.1em', color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #5b21b6, 0 0 20px #a855f755',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                transition: 'transform 0.1s',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              ✨ CLAIM REWARD
            </button>
          </div>
        </div>
      )}

      {/* Earned count + tier key */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: '14px 16px', border: 'var(--card-border)', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2, textShadow: '0 0 8px #fbbf2444' }}>Badges Earned</div>
          <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, color: '#fbbf24', textShadow: '0 0 12px #fbbf2455' }}>{earned.length}</span>
          <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, color: '#f1f5f9', marginLeft: 4 }}>/ {BADGES.length}</span>
        </div>
        <button
          onClick={() => setShowTierKey(true)}
          style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11 }}
        >
          <div style={{ display: 'flex', gap: 3 }}>
            {Object.values(TIER).map(tc => (
              <div key={tc.label} title={tc.label} style={{ width: 9, height: 9, borderRadius: '50%', background: tc.ring, boxShadow: `0 0 4px ${tc.glow}` }} />
            ))}
          </div>
          <Info size={11} />
        </button>
      </div>

      {/* Empty-state callout — 0 badges earned */}
      {earned.length === 0 && (
        <div style={{
          background: 'linear-gradient(135deg,#0a0f1a,#0f172a)',
          border: '1px dashed #1e3a5f',
          borderRadius: 14, padding: '22px 18px', marginBottom: 14,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 800,
            color: '#cbd5e1', letterSpacing: '0.04em', marginBottom: 6,
          }}>
            The Trophy Case is waiting.
          </div>
          <div style={{
            fontFamily: 'Barlow,sans-serif', fontSize: 13, color: '#475569', lineHeight: 1.5,
          }}>
            Hit the driveway and log your first set.
          </div>
        </div>
      )}

      {/* Badge categories */}
      {BADGE_CATS.map(cat => {
        const catBadges = BADGES.filter(b => b.cat === cat.id)
        if (!catBadges.length) return null

        // ── Streak milestones — circular BadgeCircle tiles matching all other categories ──
        if (cat.id === 'streak') {
          const streakPB      = allTimeStreakPB(player, sessions)
          const unlockedCount = STREAK_BADGES.filter(b => streakPB >= b.milestone).length
          return (
            <div key={cat.id} style={{ ...C.card, padding: '20px 18px' }}>
              {/* Identical header to standard categories */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <cat.Icon size={13} color="#64748b" />
                  <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 14, color: '#64748b', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {cat.label}
                  </span>
                </div>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: unlockedCount > 0 ? '#94a3b8' : '#334155', letterSpacing: '0.08em' }}>
                  {unlockedCount}/{STREAK_BADGES.length}
                </span>
              </div>

              {/* 4-col grid — exact same layout as all other badge categories */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, justifyItems: 'center' }}>
                {STREAK_BADGES.map(sb => (
                  <BadgeCircle
                    key={sb.id}
                    badge={toCircleBadge(sb)}
                    earned={streakPB >= sb.milestone}
                    earnedDate={player.earnedBadges?.[sb.id]?.ts ?? null}
                    isNew={!!newBadgeIds[sb.id]}
                    size={68}
                    onClick={onBadgeClick}
                  />
                ))}
              </div>
            </div>
          )
        }

        // ── Ultra-Rare gets a premium gold-bordered card ──────────────────────
        if (cat.id === 'ultra') {
          const earnedCount = catBadges.filter(b => player.earnedBadges?.[b.id]).length
          return (
            <div key={cat.id} style={{
              background: 'var(--card-bg)',
              border: '2px solid #f59e0b88',
              boxShadow: '0 0 28px #f59e0b14',
              borderRadius: 14, padding: '18px 16px', marginBottom: 12,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <Gem size={16} color="#f59e0b" />
                <span style={{
                  fontFamily: "'Bangers',sans-serif", fontSize: 17,
                  color: '#f59e0b', letterSpacing: '0.15em', textTransform: 'uppercase', flex: 1,
                }}>
                  Ultra-Rare Achievements
                </span>
                <span style={{
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: '0.1em',
                  color: earnedCount > 0 ? '#f59e0b' : '#6b7280',
                  background: earnedCount > 0 ? '#f59e0b18' : 'transparent',
                  border: `1px solid ${earnedCount > 0 ? '#f59e0b44' : '#334155'}`,
                  borderRadius: 6, padding: '2px 8px',
                }}>
                  {earnedCount}/{catBadges.length} UNLOCKED
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#f59e0b44,transparent)', marginBottom: 16 }} />

              {/* Larger badge grid — 3-col for premium feel */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, justifyItems: 'center' }}>
                {catBadges.map(b => {
                  const e = player.earnedBadges?.[b.id]
                  const isUnclaimed = e && !claimedBadges.includes(b.id)
                  return (
                    <div
                      key={b.id}
                      className={isUnclaimed ? 'badge-unclaimed' : ''}
                      onClick={() => {
                        if (isUnclaimed) {
                          setClaimingBadgeId(b.id)
                        } else {
                          onBadgeClick?.(b, !!e)
                        }
                      }}
                      style={{ cursor: isUnclaimed ? 'pointer' : 'default', position: 'relative' }}
                    >
                      <BadgeCircle
                        badge={b}
                        earned={!!e} earnedDate={e?.ts}
                        isNew={!!newBadgeIds[b.id]}
                        size={84}
                        onClick={() => {
                          if (!isUnclaimed) {
                            onBadgeClick?.(b, !!e)
                          }
                        }}
                      />
                      {isUnclaimed && (
                        <div style={{
                          position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
                          background: '#f59e0b', color: '#000',
                          padding: '2px 8px', borderRadius: 12,
                          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, fontWeight: 800,
                          letterSpacing: '0.08em', whiteSpace: 'nowrap',
                          zIndex: 10, boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                        }}>
                          UNCLAIMED
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }

        // ── Standard category card ─────────────────────────────────────────────
        const earnedInCat = catBadges.filter(b => player.earnedBadges?.[b.id]).length
        return (
          <div key={cat.id} style={{ ...C.card, padding: '20px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <cat.Icon size={13} color="#64748b" />
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {cat.label}
                </span>
              </div>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: earnedInCat > 0 ? '#39ff14' : '#334155', letterSpacing: '0.08em' }}>
                {earnedInCat}/{catBadges.length}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, justifyItems: 'center' }}>
              {catBadges.map(b => {
                const e = player.earnedBadges?.[b.id]
                const isUnclaimed = e && !claimedBadges.includes(b.id)
                return (
                  <div
                    key={b.id}
                    className={isUnclaimed ? 'badge-unclaimed' : ''}
                    onClick={() => {
                      if (isUnclaimed) {
                        setClaimingBadgeId(b.id)
                      } else {
                        onBadgeClick?.(b, !!e)
                      }
                    }}
                    style={{ cursor: isUnclaimed ? 'pointer' : 'default', position: 'relative' }}
                  >
                    <BadgeCircle
                      badge={b}
                      earned={!!e} earnedDate={e?.ts}
                      isNew={!!newBadgeIds[b.id]}
                      size={68}
                      onClick={() => {
                        if (!isUnclaimed) {
                          onBadgeClick?.(b, !!e)
                        }
                      }}
                    />
                    {isUnclaimed && (
                      <div style={{
                        position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
                        background: '#a855f7', color: '#fff',
                        padding: '2px 8px', borderRadius: 12,
                        fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, fontWeight: 800,
                        letterSpacing: '0.08em', whiteSpace: 'nowrap',
                        zIndex: 10, boxShadow: '0 2px 8px rgba(168,85,247,0.4)',
                      }}>
                        UNCLAIMED
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
