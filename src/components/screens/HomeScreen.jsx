import { useState } from 'react'
import { Target, Users, Lock, Trophy, Zap, Sun, Moon } from 'lucide-react'
import { ZONES } from '../../constants/zones.js'
import { getWeekStart } from '../../utils/stats.js'
import { C, APP_BG } from '../../styles.js'
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
        .flatMap(s => s.sets).length * 10,
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

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Target size={48} color="#3b82f6" style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 42, letterSpacing: '0.05em', lineHeight: 1, color: 'var(--text-1)' }}>
            PUCK TRACKER
          </div>
          <div className="text-blue-700 dark:text-blue-400" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: '0.2em', marginTop: 6 }}>
            12U TEAM EDITION
          </div>
        </div>

        {/* Grinder of the week */}
        {topPlayer?.wS > 0 && (
          <div style={{ ...C.card, background: 'rgba(30,58,95,0.4)', textAlign: 'center', marginBottom: 16 }}>
            <div className="text-blue-700 dark:text-blue-400" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.15em', marginBottom: 4 }}>
              <Trophy size={12} /> GRINDER OF THE WEEK
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900, color: 'var(--text-1)' }}>
              {topPlayer.name}{topPlayer.jerseyNum ? ` #${topPlayer.jerseyNum}` : ''}
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{topPlayer.wS} pucks this week</div>
          </div>
        )}

        {/* Active challenges banner */}
        {(st.dailyChallenge || st.weeklyChallenge) && (
          <div style={{ ...C.card, borderColor: '#f59e0b44', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f59e0b', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.15em', marginBottom: 8 }}>
              <Zap size={12} /> ACTIVE CHALLENGES
            </div>
            {st.dailyChallenge && (
              <div className="text-slate-700 dark:text-slate-300 font-medium" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14 }}>
                Daily: {ZONES.find(z => z.id === st.dailyChallenge.zone)?.label} — {st.dailyChallenge.target} hits
              </div>
            )}
            {st.weeklyChallenge && (
              <div className="text-slate-700 dark:text-slate-300 font-medium" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, marginTop: 4 }}>
                Weekly: {ZONES.find(z => z.id === st.weeklyChallenge.zone)?.label} — {st.weeklyChallenge.target} hits
              </div>
            )}
          </div>
        )}

        <button style={C.btnP} onClick={() => upd({ view: 'playerSelect' })}>
          <Users size={17} /> I'm a Player
        </button>
        <button style={C.btnS} onClick={() => upd({ view: 'coachPin' })}>
          <Lock size={15} /> Coach Mode
        </button>
      </div>
    </div>
  )
}
