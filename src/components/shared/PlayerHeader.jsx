import { useRef, useState } from 'react'
import { ChevronLeft, Flame, Sun, Moon } from 'lucide-react'
import { upload } from '@vercel/blob/client'
import { LEVELS } from '../../constants/levels.js'
import { useAppStore } from '../../store/useAppStore.js'
import XPBar from './XPBar.jsx'
import Avatar from './Avatar.jsx'

export default function PlayerHeader({ player, stats, onBack, theme, onThemeToggle, onStreakClick, onPhotoUpload }) {
  const cur    = LEVELS[stats.li]
  const next   = LEVELS[stats.li + 1]
  const earned = stats.xp - cur.xpNeeded
  const needed = (next ? next.xpNeeded : stats.xp) - cur.xpNeeded
  const isDark = theme === 'dark'

  // Technique shots live in Zustand, not in sessions — subscribe directly so
  // the counter updates the instant a +10/+25/+50 button is tapped.
  const techniquePucks = useAppStore(s => s.techniqueByPlayer[player.id]?.totalPucks || 0)
  const totalPucks     = (stats.totalShots ?? 0) + techniquePucks

  const fileInputRef    = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file || !onPhotoUpload) return
    const ext = file.name.split('.').pop() || 'jpg'
    setUploading(true)
    try {
      const blob = await upload(`profilePictures/${player.id}.${ext}`, file, {
        access:          'public',
        handleUploadUrl: '/api/avatar/upload',
      })
      onPhotoUpload(blob.url)
    } catch (err) {
      console.error('[Avatar upload]', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
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

      {/* Avatar — tapping opens image picker; falls back to rank medallion */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Tap to change profile picture"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, position: 'relative' }}
      >
        {player.photoURL ? (
          <Avatar player={player} size={40} style={{ border: `2px solid ${cur.color}`, boxShadow: `0 0 12px ${cur.glow}66` }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: cur.bg, border: `2px solid ${cur.color}`, boxShadow: `0 0 12px ${cur.glow}66` }}>
            <img src={cur.img} alt={cur.name} className="rounded-full object-cover" style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }} />
          </div>
        )}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 14, height: 14, border: '2px solid #a855f7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Name / rank / XP — grows to fill available space */}
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

        {/* Total pucks — primary anchor stat */}
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

      {/* Outside mode toggle */}
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
          {isDark
            ? <Sun size={13} strokeWidth={2} />
            : <Moon size={13} strokeWidth={2} />}
          <span style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 7, fontWeight: 800,
            letterSpacing: '0.05em', lineHeight: 1,
          }}>
            {isDark ? 'OUTSIDE' : 'DARK'}
          </span>
        </button>
      )}
    </div>
  )
}
