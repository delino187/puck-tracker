import { useState } from 'react'
import { ChevronLeft, Flame, Sun, Moon } from 'lucide-react'
import { LEVELS } from '../../constants/levels.js'
import { useAppStore } from '../../store/useAppStore.js'
import XPBar from './XPBar.jsx'
import Avatar from './Avatar.jsx'
import ManageProfileModal from '../overlays/ManageProfileModal.jsx'
import { getStreakAuraClass } from '../../utils/streakAura.js'

export default function PlayerHeader({ player, stats, onBack, theme, onThemeToggle, onStreakClick, onPhotoUpload, onResetCareer, onSwitchProfile }) {
  const cur    = LEVELS[stats.li]
  const next   = LEVELS[stats.li + 1]
  const dispMax = next ? next.xpNeeded : stats.xp
  const isDark = theme === 'dark'

  // Master puck total — unified across all game modes:
  //   stats.totalShots  → Target Practice sessions + ATW hits (from playerStats/sessions)
  //   techniquePucks    → Technique-only + Versus challenges + PUCK horse rounds (Zustand)
  // Both sources are reactive: stats recomputes on every st.sessions change;
  // techniquePucks subscribes to Zustand, which updates on every logTechniqueShots call.
  const techniquePucks = useAppStore(s => s.techniqueByPlayer[player.id]?.totalPucks || 0)
  const totalPucks     = (stats.totalShots ?? 0) + techniquePucks

  const [showManageModal, setShowManageModal] = useState(false)

  const diamonds   = player.diamonds   || 0
  const hasShield  = player.hasEloShield || false

  return (
    <>
      <div style={{
        padding: '10px 12px',
        background: 'var(--nav-bg)',
        borderBottom: 'var(--nav-border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}
          onClick={onBack}
        >
          <ChevronLeft size={22} />
        </button>

        {/* Avatar — tap opens ManageProfileModal (own profile) */}
        <button
          onClick={() => setShowManageModal(true)}
          title="Manage your profile"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
        >
          <Avatar
            player={player}
            size={40}
            className={getStreakAuraClass(stats.streak || 0)}
            glowActive={!!player.hasBorderGlow}
            style={{ borderRadius: '50%' }}
          />
        </button>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.03em', color: 'var(--text-1)', lineHeight: 1 }}>
                {player.name}
                {player.jerseyNum ? <span style={{ color: '#60a5fa' }}> #{player.jerseyNum}</span> : ''}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: cur.color }}>
                {cur.name}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)' }}>
                {stats.xp}/{dispMax} XP
              </span>
            </div>
            <XPBar li={stats.li} xp={stats.xp} compact />
          </div>

          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 18, color: 'var(--text-1)', lineHeight: 1 }}>
              {totalPucks.toLocaleString()}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', lineHeight: 1, marginTop: 3 }}>
              TOTAL PUCKS
            </div>
          </div>
        </div>

        {stats.streak > 0 && (
          <button
            onClick={onStreakClick}
            title="View Streak Hub"
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              background: isDark ? '#1a0800' : '#fff7ed',
              border: '1px solid #f97316',
              borderRadius: 8, padding: '3px 7px', flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <Flame size={12} color="#f97316" />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: '#f97316' }}>
              {stats.streak}d
            </span>
          </button>
        )}

        {onThemeToggle && (
          <button
            onClick={onThemeToggle}
            title={isDark ? 'Switch to Outside Mode' : 'Switch to Dark Mode'}
            style={{
              flexShrink: 0,
              background: isDark ? '#1e3a5f' : '#0f172a',
              border: isDark ? '1px solid #3b82f633' : 'none',
              borderRadius: 8, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '5px 7px', gap: 1,
              color: isDark ? '#60a5fa' : '#ffffff',
            }}
          >
            {isDark ? <Sun size={13} strokeWidth={2} /> : <Moon size={13} strokeWidth={2} />}
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 7, fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1 }}>
              {isDark ? 'OUTSIDE' : 'DARK'}
            </span>
          </button>
        )}
      </div>

      {/* ── Floating currency widgets — bottom-left, above tab bar ── */}
      <div style={{
        position: 'fixed', left: 8, bottom: 16,
        zIndex: 200,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'auto',
        opacity: 0.8,
        transition: 'opacity 0.2s ease',
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
        onTouchStart={e => e.currentTarget.style.opacity = '1'}
        onTouchEnd={e => e.currentTarget.style.opacity = '0.8'}
      >
        {/* 💎 Diamonds — always in DOM */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'rgba(42,26,74,0.82)',
          border: '2px solid #fbbf24',
          borderRadius: 12, padding: '8px 10px',
          boxShadow: '0 0 18px #fbbf2455',
          minWidth: 52, textAlign: 'center',
          backdropFilter: 'blur(6px)',
        }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>💎</span>
          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 18,
            color: '#fbbf24', lineHeight: 1,
            textShadow: '0 0 12px #fbbf2466', marginTop: 3,
          }}>
            {diamonds.toLocaleString()}
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 7,
            color: '#fbbf24', letterSpacing: '0.14em', lineHeight: 1, marginTop: 2,
          }}>
            DIAMONDS
          </div>
        </div>

        {/* 🛡️ ELO Shield — only rendered when active; completely absent otherwise */}
        {hasShield && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'rgba(5,13,26,0.82)',
            border: '2px solid #06b6d4',
            borderRadius: 12, padding: '8px 10px',
            boxShadow: '0 0 18px #06b6d455',
            minWidth: 52, textAlign: 'center',
            backdropFilter: 'blur(6px)',
          }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>🛡️</span>
            <div style={{
              fontFamily: "'Bangers',sans-serif", fontSize: 14,
              color: '#22d3ee', letterSpacing: '0.04em', lineHeight: 1,
              textShadow: '0 0 8px #22d3ee66', marginTop: 3,
            }}>
              ACTIVE
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 7,
              color: '#06b6d4', letterSpacing: '0.12em', lineHeight: 1, marginTop: 2,
            }}>
              ELO SHIELD
            </div>
          </div>
        )}
      </div>

      {showManageModal && (
        <ManageProfileModal
          player={player}
          stats={stats}
          onPhotoUpload={url => { onPhotoUpload?.(url); setShowManageModal(false) }}
          onResetCareer={onResetCareer}
          onSwitchProfile={onSwitchProfile ? () => { setShowManageModal(false); onSwitchProfile() } : undefined}
          onClose={() => setShowManageModal(false)}
        />
      )}
    </>
  )
}
