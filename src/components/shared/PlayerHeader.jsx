import { useState } from 'react'
import { ChevronLeft, Flame, Sun, Moon } from 'lucide-react'
import { LEVELS } from '../../constants/levels.js'
import { useAppStore } from '../../store/useAppStore.js'
import XPBar from './XPBar.jsx'
import Avatar from './Avatar.jsx'
import ManageProfileModal from '../overlays/ManageProfileModal.jsx'
import { getStreakAuraClass } from '../../utils/streakAura.js'

export default function PlayerHeader({ player, stats, onBack, theme, onThemeToggle, onStreakClick, onPhotoUpload }) {
  const cur    = LEVELS[stats.li]
  const next   = LEVELS[stats.li + 1]
  const earned = stats.xp - cur.xpNeeded
  const needed = (next ? next.xpNeeded : stats.xp) - cur.xpNeeded
  const isDark = theme === 'dark'

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
                {earned}/{needed} XP
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

      {/* ── Currency strip — diamonds + ELO shield, visible on every tab ─────── */}
      <div style={{
        background: 'var(--nav-bg)',
        borderBottom: 'var(--nav-border)',
        padding: '5px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {/* 💎 Diamond box */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'linear-gradient(135deg,#2a1a4a,#1a0a2a)',
          border: '2px solid #fbbf24',
          borderRadius: 10, padding: '5px 11px',
          boxShadow: '0 0 14px #fbbf2433',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>💎</span>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, color: '#fbbf24', letterSpacing: '0.14em', lineHeight: 1 }}>
              DIAMONDS
            </div>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, color: '#fbbf24', lineHeight: 1, textShadow: '0 0 10px #fbbf2466' }}>
              {diamonds.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 🛡️ ELO Shield box */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: hasShield
            ? 'linear-gradient(135deg,#050d1a,#091828)'
            : 'rgba(15,23,42,0.45)',
          border: `2px solid ${hasShield ? '#06b6d4' : '#1e293b'}`,
          borderRadius: 10, padding: '5px 11px',
          boxShadow: hasShield ? '0 0 14px #06b6d433' : 'none',
          opacity: hasShield ? 1 : 0.45,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{hasShield ? '🛡️' : '🔓'}</span>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, color: hasShield ? '#06b6d4' : '#475569', letterSpacing: '0.14em', lineHeight: 1 }}>
              ELO SHIELD
            </div>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 14, letterSpacing: '0.04em', lineHeight: 1, color: hasShield ? '#22d3ee' : '#334155', textShadow: hasShield ? '0 0 8px #22d3ee55' : 'none' }}>
              {hasShield ? 'ACTIVE' : 'NONE'}
            </div>
          </div>
        </div>
      </div>

      {showManageModal && (
        <ManageProfileModal
          player={player}
          stats={stats}
          onPhotoUpload={url => { onPhotoUpload?.(url); setShowManageModal(false) }}
          onClose={() => setShowManageModal(false)}
        />
      )}
    </>
  )
}
