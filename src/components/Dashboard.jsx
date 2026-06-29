import { useState } from 'react'
import { Target, Lock, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { ROOKIE_QUESTS } from '../constants/rookieQuests.js'
import { LEVELS } from '../constants/levels.js'
import { BADGES } from '../constants/badges.js'
import { STREAK_BADGES } from '../constants/streakBadges.js'
import { playerStats, getWeekStart } from '../utils/stats.js'
import { getGameAction } from '../services/puckGameService.js'
import { useAppStore } from '../store/useAppStore.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { C } from '../styles.js'
import StatCard           from './shared/StatCard.jsx'
import XPBar              from './shared/XPBar.jsx'
import BadgeCircle        from './shared/BadgeCircle.jsx'
import PeerChallengeCard  from './shared/PeerChallengeCard.jsx'
import PuckGameTurnCard   from './shared/PuckGameTurnCard.jsx'
import DailyProgressRing  from './shared/DailyProgressRing.jsx'
import LiveFeed           from './shared/LiveFeed.jsx'

// ── Challenge card helpers ─────────────────────────────────────────────────────
// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard({ onStartSession, newBadgeIds, onBadgeClick, onNavigate, peerChallenges = [], onAcceptChallenge, puckGames = [], onPlayPuckGame }) {
  const { activePlayer: player, st } = usePlayer()
  const sessions = st.sessions
  const players  = st.players
  const techBonusXP      = useAppStore(s => s.techniqueByPlayer[player?.id]?.bonusXP ?? 0)
  const stats            = playerStats(player, sessions, techBonusXP)
  const ws      = getWeekStart()
  const cur     = LEVELS[stats.li]
  const next    = LEVELS[stats.li + 1]

  const techniquePucks   = useAppStore(s => s.techniqueByPlayer[player.id]?.totalPucks || 0)
  // Selector must NOT use `|| {}` — returning a new object literal on every call
  // makes Object.is() always false → Zustand reschedules a re-render → infinite loop.
  // Separate the subscription (returns the real ref or undefined) from the fallback.
  const _rawDailyLog     = useAppStore(s => s.techniqueByPlayer[player.id]?.dailyLog)
  const techniqueDailyLog = _rawDailyLog || {}
  const careerTotal      = (stats.totalShots ?? 0) + techniquePucks

  // Active-turn filtering: only cards where it IS the player's move right now
  const activePeerChallenges = peerChallenges.filter(
    c => c.receiverId === player.id && c.status === 'pending'
  )
  const activePuckGames = puckGames.filter(g => {
    const action = getGameAction(g, player.id)
    return action === 'set' || action === 'match' || action === 'expired'
  })
  const hasActiveGames = activePeerChallenges.length > 0 || activePuckGames.length > 0

  const weekRank = [...players]
    .map(p => ({
      id: p.id,
      wS: sessions.filter(s => s.playerId === p.id && new Date(s.date) >= ws).flatMap(s => s.sets || []).length * 10,
    }))
    .sort((a, b) => b.wS - a.wS)
    .findIndex(p => p.id === player.id) + 1

  const earnedBadges = BADGES.filter(b => player.earnedBadges?.[b.id])
  const recent       = sessions.filter(s => s.playerId === player.id).slice(-5).reverse()
  // Highest streak milestone badge the player's current streak qualifies for
  const currentStreak     = stats?.streak ?? 0
  const activeStreakBadge = [...STREAK_BADGES].reverse().find(b => currentStreak >= b.milestone) ?? null

  // Today's shots unified across all modes: Target Practice sessions + Technique
  // Only //(Technique/Versus/PUCK shots are date-logged in Zustand via dailyLog)
  const todayStr          = new Date().toDateString()
  const sessionTodayShots = sessions
    .filter(s => s.playerId === player.id && new Date(s.date).toDateString() === todayStr)
    .reduce((a, s) => a + (s.sets?.length ?? 0) * 10, 0)
  // Handle both legacy (number) and new (object with .total) dailyLog formats
  const todayTechEntry = techniqueDailyLog[todayStr]
  const todayTechShots = typeof todayTechEntry === 'object' ? (todayTechEntry?.total || 0) : (todayTechEntry || 0)
  const todayShots = sessionTodayShots + todayTechShots

  // This week's shots unified across all modes
  // Safe extraction: if entry is object, use .total; if number, use directly
  const weekTechniquePucks = Object.entries(techniqueDailyLog)
    .filter(([date]) => new Date(date) >= ws)
    .reduce((sum, [, entry]) => {
      const shotsToAdd = typeof entry === 'object' ? (entry?.total || 0) : (entry || 0)
      return sum + shotsToAdd
    }, 0)
  const weekShotsAll = (stats.weekShots ?? 0) + weekTechniquePucks

  const isIosSafari = typeof window !== 'undefined'
    && /iphone|ipad|ipod/i.test(navigator.userAgent)
    && !navigator.standalone
  const [showInstallPrompt, setShowInstallPrompt] = useState(
    () => isIosSafari && !localStorage.getItem('hasDismissedInstallPrompt')
  )

  function dismissInstallPrompt() {
    localStorage.setItem('hasDismissedInstallPrompt', '1')
    setShowInstallPrompt(false)
  }

  return (
    <div style={{ padding: '14px 16px 80px' }}>

      {/* ── iOS install prompt ───────────────────────────────────────────────── */}
      {showInstallPrompt && (
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg,#060d1a,#0b1426)',
          border: '1.5px solid #22d3ee',
          borderRadius: 14,
          padding: '13px 40px 13px 14px',
          marginBottom: 14,
          boxShadow: '0 0 18px #22d3ee22',
        }}>
          <button
            onClick={dismissInstallPrompt}
            style={{
              position: 'absolute', top: 9, right: 10,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', fontSize: 16, lineHeight: 1, padding: 2,
            }}
            aria-label="Dismiss"
          >✕</button>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 13, fontWeight: 700, color: '#e2e8f0',
            lineHeight: 1.55, letterSpacing: '0.01em',
          }}>
            📲 <span style={{ color: '#22d3ee' }}>Run Puck Tracker in Fullscreen!</span> Tap the Share icon (□↑) in Safari, scroll down, and select <strong>"Add to Home Screen"</strong> for the ultimate standalone experience.
          </div>
        </div>
      )}

      {/* ── Rookie Milestones widget ─────────────────────────────────────────── */}
      {(() => {
        const rq        = player.rookieQuests || {}
        const doneCount = ROOKIE_QUESTS.filter(q => rq[q.key]).length
        if (doneCount >= ROOKIE_QUESTS.length) return null   // all done — hide forever
        const pct = Math.round((doneCount / ROOKIE_QUESTS.length) * 100)
        return (
          <div style={{
            background: 'linear-gradient(135deg,#07040f,#110a1e)',
            border: '1.5px solid #a855f755',
            borderRadius: 16, padding: '14px 16px', marginBottom: 16,
            boxShadow: '0 0 20px #a855f722',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, color: '#d8b4fe', letterSpacing: '0.06em', textShadow: '0 0 14px #a855f766' }}>
                🏆 Rookie Milestones
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#7c3aed', letterSpacing: '0.1em' }}>
                {doneCount}/{ROOKIE_QUESTS.length} DONE
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: '#1e1b2e', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: 'linear-gradient(90deg,#7c3aed,#a855f7)',
                borderRadius: 3, transition: 'width 0.5s ease',
                boxShadow: '0 0 8px #a855f799',
              }} />
            </div>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {ROOKIE_QUESTS.map(q => {
                const done = !!rq[q.key]
                return (
                  <div key={q.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {done
                      ? <CheckCircle2 size={14} color="#22c55e" />
                      : <Circle       size={14} color="#4c1d95" />
                    }
                    <span style={{
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontSize: 13, fontWeight: 600,
                      color: done ? '#4ade80' : '#c4b5fd',
                      letterSpacing: '0.02em',
                      textDecoration: done ? 'line-through' : 'none',
                      opacity: done ? 0.6 : 1,
                    }}>
                      {q.icon} {q.label}
                    </span>
                    {!done && (
                      <span style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: '#fbbf24' }}>
                        +{q.reward}💎
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Active Games — YOUR TURN cards (Versus + PUCK) ─────────────────── */}
      {hasActiveGames && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 10, fontWeight: 800, letterSpacing: '0.18em',
            color: '#ef4444', textTransform: 'uppercase', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 5,
            textShadow: '0 0 8px #ef444444',
          }}>
            ⚡ ACTIVE TURNS
          </div>
          {activePeerChallenges.map(c => (
            <PeerChallengeCard
              key={c.id}
              challenge={c}
              playerId={player.id}
              onAccept={onAcceptChallenge}
            />
          ))}
          {activePuckGames.map(g => (
            <PuckGameTurnCard
              key={g.id}
              game={g}
              playerId={player.id}
              players={players}
              onPlay={onPlayPuckGame}
            />
          ))}
        </div>
      )}

      {/* ── Rank hero + This Week: side-by-side on md+ ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">

      {/* Rank hero — tap to open Rank Detail */}
      <div
        onClick={() => onNavigate?.('ranks', true)}
        style={{ ...C.card, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 0, cursor: 'pointer' }}
      >
        <div style={{
          width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          background: cur.bg, border: `3px solid ${cur.color}`,
          boxShadow: `0 0 24px ${cur.glow}77, inset 0 1px 0 rgba(255,255,255,0.10)`,
        }}>
          <img
            src={cur.img} alt={cur.name}
            className="rounded-full object-cover"
            style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#06b6d4', textTransform: 'uppercase', marginBottom: 3, textShadow: '0 0 8px #06b6d466' }}>
            Current Rank
          </div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 30, color: cur.color, lineHeight: 1, marginBottom: 5 }}>
            {cur.name}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, marginBottom: 7 }}>
            <span style={{ color: '#39ff14', fontWeight: 800 }}>{stats.xp} XP</span>
            {next
              ? <span style={{ color: '#f1f5f9' }}> · <span style={{ color: '#fbbf24' }}>{(next.xpNeeded - stats.xp).toLocaleString()}</span> to {next.name}</span>
              : <span style={{ color: '#fbbf24' }}> · Max Rank!</span>}
          </div>
          <XPBar li={stats.li} xp={stats.xp} compact />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
              ELO <strong style={{ color: '#fbbf24', textShadow: '0 0 8px #fbbf2444' }}>{player.elo ?? 1000}</strong>
            </span>
            {player.hasEloShield && (
              <span style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
                letterSpacing: '0.07em', color: '#06b6d4',
                background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.35)',
                borderRadius: 5, padding: '2px 6px', lineHeight: 1.5,
              }}>
                🛡️ ELO PROTECTED
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 5, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: cur.color, letterSpacing: '0.08em' }}>
            VIEW RANK PROGRESS <ChevronRight size={11} />
          </div>
        </div>
      </div>

      {/* ── This Week — second column of the responsive grid above ─────── */}
      <div style={{ ...C.card, padding: '20px 18px', marginBottom: 0 }}>
        <div style={C.label}>This Week</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          {/* Pucks — all modes unified */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>
              {weekShotsAll}
            </div>
            <div className="stat-label">PUCKS</div>
          </div>

          {/* Streak — earned badge with day count, or locked Spark as motivational goal */}
          <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => onNavigate?.('store')}>
            {(() => {
              const displayBadge = activeStreakBadge ?? STREAK_BADGES[0]
              const isActive     = !!activeStreakBadge
              return (
                <div style={{
                  position: 'relative', width: 48, height: 48,
                  margin: '0 auto 2px', borderRadius: '50%', overflow: 'hidden',
                  border:     isActive ? '2px solid #f9731666' : '1px solid #1e3a5f',
                  boxShadow:  isActive ? '0 0 14px #f9731640'  : 'none',
                  background: isActive
                    ? 'linear-gradient(135deg,#92400e,#f97316)'
                    : 'linear-gradient(135deg,#1e293b,#334155)',
                }}>
                  <img
                    src={`/badges/${displayBadge.image}`}
                    alt={displayBadge.name}
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                      filter: isActive ? 'none' : 'grayscale(1) brightness(0.4)',
                    }}
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: isActive ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isActive
                      ? <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 900, color: '#fff' }}>{currentStreak}d</span>
                      : <Lock size={14} color="rgba(255,255,255,0.55)" />
                    }
                  </div>
                </div>
              )
            })()}
            <div className="stat-label">STREAK</div>
          </div>

        </div>
      </div>

      </div>{/* end md:grid-cols-2 */}

      {/* ── Invite Friends button ────────────────────────────────────────── */}
      <button
        onClick={() => {
          const inviteUrl = `${window.location.origin}`
          const inviteMsg = `Hey! Come train with me on Puck Tracker so we can square off in P-U-C-K games and match our training streaks. Set up your profile here: ${inviteUrl}`

          if (navigator.share) {
            navigator.share({
              title: 'Join Me on Puck Tracker',
              text: inviteMsg,
              url: inviteUrl,
            }).catch(() => {})
          } else {
            // Fallback: SMS on unsupported browsers
            const smsBody = encodeURIComponent(inviteMsg)
            // iOS uses &body, Android uses ?body — use & for compatibility
            const smsLink = `sms:&body=${smsBody}`
            window.location.href = smsLink
          }
        }}
        style={{
          width: '100%',
          padding: '14px 16px',
          marginBottom: 16,
          background: 'linear-gradient(135deg,#1a4d6d,#0f2a48)',
          border: '1.5px solid #0ea5e944',
          borderRadius: 12,
          cursor: 'pointer',
          fontFamily: "'Bangers',sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: '#06b6d4',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textShadow: '0 0 10px #06b6d466',
          transition: 'all 0.2s',
          boxShadow: '0 0 16px #0ea5e933',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 0 24px #0ea5e955, 0 4px 12px rgba(0,0,0,0.3)'
          e.currentTarget.style.borderColor = '#0ea5e966'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 0 16px #0ea5e933'
          e.currentTarget.style.borderColor = '#0ea5e944'
        }}
      >
        📲 Invite a Training Partner
      </button>

      {/* ── Top 3-stat strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatCard label="Career"    value={careerTotal}                                              color="#60a5fa" />
        <StatCard label="Accuracy"  value={stats.totalShots > 0 ? stats.acc.toFixed(0) + '%' : '—'} color="#34d399" />
        <StatCard label="Week Rank" value={weekRank > 0 ? `#${weekRank}` : '—'}                     color="#fbbf24" />
      </div>

      {/* ── Daily Progress Ring ───────────────────────────────────────────── */}
      <div style={{ ...C.card, padding: '16px 18px' }}>
        <DailyProgressRing shots={todayShots} />
      </div>


      {/* ── Recent badges ─────────────────────────────────────────────────── */}
      {earnedBadges.length > 0 && (
        <div style={C.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: 12 }} onClick={() => onNavigate?.('badges')}>
            <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.1em', color: '#fbbf24', textShadow: '0 0 10px #fbbf2444' }}>
              RECENT BADGES
              <span style={{ color: '#39ff14', marginLeft: 6 }}>{earnedBadges.length}</span>
              <span style={{ color: '#94a3b8', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700 }}>/{BADGES.length}</span>
            </span>
            <ChevronRight size={13} color="#fbbf24" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {earnedBadges
              .sort((a, b) => (player.earnedBadges[b.id]?.ts || 0) - (player.earnedBadges[a.id]?.ts || 0))
              .slice(0, 4)
              .map(b => (
                <BadgeCircle
                  key={b.id} badge={b} earned size={68}
                  isNew={!!newBadgeIds[b.id]}
                  earnedDate={player.earnedBadges[b.id]?.ts}
                  onClick={onBadgeClick}
                />
              ))}
          </div>
        </div>
      )}

      {/* ── Recent sessions ───────────────────────────────────────────────── */}
      {recent.length > 0 && (
        <div style={{ ...C.card, padding: '18px 18px' }}>
          <div style={{ ...C.label, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => { onNavigate?.('session') }}>
            <span>Recent Sessions</span>
            <ChevronRight size={13} color="#64748b" />
          </div>
          {recent.map((s, i) => {
            const sets = s.sets || []
            const hi   = sets.reduce((a, x) => a + x.hits, 0)
            // ATW sessions only record hits, so shots = hits (no misses tracked)
            const sh   = s.source === 'atw' ? hi : sets.length * 10
            const label = s.source === 'atw' ? `${hi} hits` : `${sh} shots`
            return (
              <div key={s.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < recent.length - 1 ? '1px solid #1e3a5f' : 'none' }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", color: '#64748b', fontSize: 12, letterSpacing: '0.04em' }}>{new Date(s.date).toLocaleDateString()}</span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{label}</span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 800, color: '#34d399' }}>{sh > 0 ? (hi / sh * 100).toFixed(0) : '—'}%</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Live Feed ─────────────────────────────────────────────────────── */}
      {players.length > 1 && (
        <LiveFeed players={players} sessions={sessions} currentPlayerId={player.id} onBadgeClick={onBadgeClick} />
      )}

      <button style={C.btnP} onClick={onStartSession}>
        <Target size={16} /> Start New Session
      </button>
    </div>
  )
}
