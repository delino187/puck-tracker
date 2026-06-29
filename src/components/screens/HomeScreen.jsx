import { useState } from 'react'
import { Users, Lock, Trophy, Sun, Moon } from 'lucide-react'
import { getWeekStart } from '../../utils/stats.js'
import { APP_BG } from '../../styles.js'
import { useTheme } from '../../hooks/useTheme.js'
import GlobalStyles from '../shared/GlobalStyles.jsx'
import WelcomeModal from '../overlays/WelcomeModal.jsx'

const WELCOME_KEY = 'puck_hasSeenWelcome'

export default function HomeScreen({ st, upd }) {
  const [showWelcome, setShowWelcome] = useState(!localStorage.getItem(WELCOME_KEY))
  const { isOutside, toggleOutsideMode } = useTheme()

  function handleWelcomeClose() {
    localStorage.setItem(WELCOME_KEY, '1')
    setShowWelcome(false)
  }
  const ws        = getWeekStart()
  const topPlayer = [...st.players]
    .map(p => ({
      ...p,
      wS: st.sessions
        .filter(s => s.playerId === p.id && new Date(s.date) >= ws)
        .flatMap(s => s.sets || []).length * 10,
    }))
    .sort((a, b) => b.wS - a.wS)[0]

  return (
    <div style={{ ...APP_BG, position: 'relative' }}>
      <GlobalStyles />
      {showWelcome && <WelcomeModal onClose={handleWelcomeClose} />}

      {/* Theme toggle — always accessible from the landing screen */}
      <button
        onClick={toggleOutsideMode}
        title={isOutside ? 'Switch to Dark Mode' : 'Switch to Outside Mode'}
        className="absolute top-4 right-4 z-50"
        style={{
          background: isOutside ? '#0f172a' : '#1e3a5f',
          border: isOutside ? 'none' : '1px solid #3b82f633',
          borderRadius: 8, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '5px 7px', gap: 1,
          color: isOutside ? '#ffffff' : '#60a5fa',
        }}
      >
        {isOutside ? <Moon size={13} strokeWidth={2} /> : <Sun size={13} strokeWidth={2} />}
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 7, fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1 }}>
          {isOutside ? 'DARK' : 'OUTSIDE'}
        </span>
      </button>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 20px 40px' }}>

        {/* ── Logo ──────────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 10 }}>🏒</div>
          <div style={{
            fontFamily: "'Bangers',sans-serif",
            fontSize: 64,
            letterSpacing: '0.08em',
            lineHeight: 0.95,
            color: '#f1f5f9',
            textShadow: '3px 3px 0 #1d4ed8, 6px 6px 0 #1e3a5f, 0 0 50px #3b82f650',
          }}>
            PUCK<br />TRACKER
          </div>
        </div>

        {/* ── Grinder of the week ───────────────────────────────────────────── */}
        {topPlayer?.wS > 0 && (
          <div style={{
            background: 'rgba(30,58,95,0.35)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 14,
            textAlign: 'center',
            padding: '14px 16px',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: '#60a5fa', marginBottom: 5 }}>
              <Trophy size={11} /> GRINDER OF THE WEEK
            </div>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.05em', color: '#f1f5f9', lineHeight: 1 }}>
              {topPlayer.name}{topPlayer.jerseyNum ? ` #${topPlayer.jerseyNum}` : ''}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#60a5fa', marginTop: 3, letterSpacing: '0.06em' }}>
              {topPlayer.wS.toLocaleString()} PUCKS THIS WEEK
            </div>
          </div>
        )}

        {/* ── I'm a Player — arcade START GAME button ───────────────────────── */}
        <button
          onClick={() => upd({ view: 'playerSelect' })}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            padding: '20px 16px',
            marginBottom: 12,
            fontFamily: "'Bangers',sans-serif",
            fontSize: 28,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 0 40px #3b82f650, 0 8px 32px rgba(0,0,0,0.35)',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          <Users size={22} /> I'M A PLAYER
        </button>

        {/* ── Coach Mode — secondary, clean ────────────────────────────────── */}
        <button
          onClick={() => upd({ view: 'coachPin' })}
          style={{
            width: '100%',
            background: 'rgba(15,23,42,0.55)',
            color: '#ffffff',
            border: '1px solid #334155',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 10,
            fontFamily: "'Barlow Condensed',sans-serif",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: '0.12em',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            backdropFilter: 'blur(6px)',
          }}
        >
          <Lock size={14} /> COACH MODE
        </button>

        {/* ── New Player sign-up ────────────────────────────────────────────── */}
        <button
          onClick={() => upd({ view: 'playerSignup' })}
          style={{
            background: 'transparent',
            border: '1px solid #60a5fa66',
            cursor: 'pointer',
            width: '100%',
            padding: '12px 14px',
            marginTop: 6,
            fontFamily: "'Bangers',sans-serif",
            fontSize: 16, fontWeight: 700,
            color: '#60a5fa',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textShadow: '0 0 12px #60a5fa77, 0 0 24px #3b82f644',
            transition: 'all 0.2s',
            borderRadius: 10,
            boxShadow: '0 0 16px #60a5fa33, inset 0 0 12px #60a5fa11',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 0 24px #60a5fa55, inset 0 0 16px #60a5fa22'
            e.currentTarget.style.textShadow = '0 0 16px #60a5fa99, 0 0 32px #3b82f666'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 0 16px #60a5fa33, inset 0 0 12px #60a5fa11'
            e.currentTarget.style.textShadow = '0 0 12px #60a5fa77, 0 0 24px #3b82f644'
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          New Player? Create a Profile 🏒
        </button>
      </div>
    </div>
  )
}
