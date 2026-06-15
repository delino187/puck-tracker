import { useState } from 'react'
import { Info, Gem } from 'lucide-react'
import { BADGES, BADGE_CATS, TIER } from '../constants/badges.js'
import { STREAK_BADGES, toCircleBadge } from '../constants/streakBadges.js'
import { allTimeStreakPB } from '../utils/badgeHelpers.js'
import { C } from '../styles.js'
import BadgeCircle from './shared/BadgeCircle.jsx'
import TierKeyPopup from './overlays/TierKeyPopup.jsx'

export default function BadgeGrid({ player, sessions, newBadgeIds, onBadgeClick }) {
  const [showTierKey, setShowTierKey] = useState(false)
  const earned = Object.keys(player.earnedBadges || {})

  return (
    <div style={{ padding: '14px 16px 80px' }}>
      {showTierKey && <TierKeyPopup onClose={() => setShowTierKey(false)} />}

      {/* Earned count + tier key */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: '14px 16px', border: 'var(--card-border)', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>Badges Earned</div>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>{earned.length}</span>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, color: 'var(--text-muted)', marginLeft: 4 }}>/ {BADGES.length}</span>
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
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
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
                    earnedDate={null}
                    isNew={false}
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
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700,
                  color: '#f59e0b', letterSpacing: '0.18em', textTransform: 'uppercase', flex: 1,
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
                  return (
                    <BadgeCircle
                      key={b.id} badge={b}
                      earned={!!e} earnedDate={e?.ts}
                      isNew={!!newBadgeIds[b.id]}
                      size={84}
                      onClick={onBadgeClick}
                    />
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
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {cat.label}
                </span>
              </div>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: earnedInCat > 0 ? '#94a3b8' : '#334155', letterSpacing: '0.08em' }}>
                {earnedInCat}/{catBadges.length}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, justifyItems: 'center' }}>
              {catBadges.map(b => {
                const e = player.earnedBadges?.[b.id]
                return (
                  <BadgeCircle
                    key={b.id} badge={b}
                    earned={!!e} earnedDate={e?.ts}
                    isNew={!!newBadgeIds[b.id]}
                    size={68}
                    onClick={onBadgeClick}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
