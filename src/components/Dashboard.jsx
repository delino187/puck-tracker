import { useEffect, useRef, useState } from 'react'
import { Target, Zap, CalendarDays, BookOpen, Lock } from 'lucide-react'
import { LEVELS } from '../constants/levels.js'
import { ZONES }  from '../constants/zones.js'
import { BADGES } from '../constants/badges.js'
import { STREAK_BADGES } from '../constants/streakBadges.js'
import { getWeekStart } from '../utils/stats.js'
import { challengeLabel } from '../utils/challengeEngine.js'
import { useAppStore } from '../store/useAppStore.js'
import { C } from '../styles.js'
import StatCard    from './shared/StatCard.jsx'
import XPBar       from './shared/XPBar.jsx'
import BadgeCircle from './shared/BadgeCircle.jsx'

// ── Challenge card helpers ─────────────────────────────────────────────────────
function ChallengeRow({ ch, label, Icon, color, sessions, playerId }) {
  if (!ch) return null
  const zoneName = ZONES.find(z => z.id === ch.zone)?.label ?? ch.zone
  const isCoach  = ch.source === 'coach'

  // Today's or this-week's hits in the challenge zone
  const ws      = getWeekStart()
  const today   = new Date().toDateString()
  const pSets   = sessions
    .filter(s => s.playerId === playerId)
    .filter(s => label === 'Daily'
      ? new Date(s.date).toDateString() === today
      : new Date(s.date) >= ws)
    .flatMap(s => s.sets)
  const hits    = pSets.filter(s => s.zone === ch.zone).reduce((a, s) => a + s.hits, 0)
  const target  = parseInt(ch.target) || 5
  const pct     = Math.min(100, (hits / target) * 100)
  const done    = hits >= target

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon size={13} color={isCoach ? '#f59e0b' : color} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: isCoach ? '#f59e0b' : color, letterSpacing: '0.1em' }}>
            {isCoach ? '📋 COACH' : label.toUpperCase()}
          </span>
        </div>
        <span style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 800,
          color: done ? '#34d399' : 'var(--text-1)',
        }}>
          {hits}/{target}{done ? ' ✅' : ''}
        </span>
      </div>

      {/* Prompt text */}
      <div style={{
        fontFamily: "'Bangers',sans-serif", fontSize: 22, letterSpacing: '0.03em',
        color: 'var(--text-1)', marginBottom: 8, lineHeight: 1.2,
      }}>
        Hit {target} {zoneName} {target === 1 ? 'shot' : 'shots'}
      </div>

      {/* Progress bar */}
      <div style={{ height: 7, background: 'var(--progress-track)', borderRadius: 4, overflow: 'hidden', border: 'var(--card-border)' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: done ? '#22c55e' : (isCoach ? '#f59e0b' : color),
          borderRadius: 4, transition: 'width 0.5s',
        }} />
      </div>

      {done && (
        <div style={{ color: '#34d399', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
          ✓ Complete! +{label === 'Daily' ? 50 : 100} XP
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard({ player, stats, sessions, dailyChallenge, weeklyChallenge, players, onStartSession, newBadgeIds, onBadgeClick }) {
  const ws      = getWeekStart()
  const cur     = LEVELS[stats.li]
  const next    = LEVELS[stats.li + 1]

  const techniquePucks = useAppStore(s => s.techniqueByPlayer[player.id]?.totalPucks || 0)
  const careerTotal    = (stats.totalShots ?? 0) + techniquePucks

  const weekRank = [...players]
    .map(p => ({
      id: p.id,
      wS: sessions.filter(s => s.playerId === p.id && new Date(s.date) >= ws).flatMap(s => s.sets).length * 10,
    }))
    .sort((a, b) => b.wS - a.wS)
    .findIndex(p => p.id === player.id) + 1

  const earnedBadges = BADGES.filter(b => player.earnedBadges?.[b.id])
  const recent       = sessions.filter(s => s.playerId === player.id).slice(-5).reverse()
  const hasChallenges = dailyChallenge || weeklyChallenge

  // Highest streak milestone badge the player's current streak qualifies for
  const activeStreakBadge = [...STREAK_BADGES].reverse().find(b => stats.streak >= b.milestone) ?? null

  // ── Dash entrance music ────────────────────────────────────────────────────
  const audioRef          = useRef(null)
  const [mutePrompt, setMutePrompt] = useState(false)

  useEffect(() => {
    const audio = new Audio('/intro-song.m4a')
    audio.volume = 0.6
    audioRef.current = audio

    audio.play().catch(() => setMutePrompt(true))

    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [])

  function handleUnmute() {
    audioRef.current?.play().catch(() => {})
    setMutePrompt(false)
  }

  return (
    <div style={{ padding: '14px 16px 80px' }}>

      {/* ── Rank hero + This Week: side-by-side on md+ ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">

      {/* Rank hero */}
      <div style={{ ...C.card, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 0 }}>
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
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
            Current Rank
          </div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 30, color: cur.color, lineHeight: 1, marginBottom: 5 }}>
            {cur.name}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'var(--text-muted)', marginBottom: 7 }}>
            {stats.xp} XP{next ? ` · ${(next.xpNeeded - stats.xp).toLocaleString()} to ${next.name}` : ' · Max Rank!'}
          </div>
          <XPBar li={stats.li} xp={stats.xp} compact />
        </div>
      </div>

      {/* ── This Week — second column of the responsive grid above ─────── */}
      <div style={{ ...C.card, padding: '20px 18px', marginBottom: 0 }}>
        <div style={C.label}>This Week</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          {/* Pucks */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>
              {stats.weekShots}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 5 }}>
              PUCKS
            </div>
          </div>

          {/* Accuracy */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 800, color: '#34d399', lineHeight: 1 }}>
              {stats.weekShots > 0 ? stats.weekAcc.toFixed(0) + '%' : '—'}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 5 }}>
              ACCURACY
            </div>
          </div>

          {/* Streak — earned badge with day count, or locked Spark as motivational goal */}
          <div style={{ textAlign: 'center' }}>
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
                      ? <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 900, color: '#fff' }}>{stats.streak}d</span>
                      : <Lock size={14} color="rgba(255,255,255,0.55)" />
                    }
                  </div>
                </div>
              )
            })()}
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 5 }}>
              STREAK
            </div>
          </div>

        </div>
      </div>

      </div>{/* end md:grid-cols-2 */}

      {/* ── Top 3-stat strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatCard label="Career"    value={careerTotal}                                              color="#60a5fa" />
        <StatCard label="Accuracy"  value={stats.totalShots > 0 ? stats.acc.toFixed(0) + '%' : '—'} color="#34d399" />
        <StatCard label="Week Rank" value={weekRank > 0 ? `#${weekRank}` : '—'}                     color="#fbbf24" />
      </div>

      {/* ── Active challenges — dynamic engine + coach override ───────────── */}
      {hasChallenges && (
        <div style={{ ...C.card, padding: '20px 18px', borderColor: '#f59e0b44' }}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <BookOpen size={13} color="#f59e0b" />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.15em' }}>
              ACTIVE CHALLENGES
            </span>
            {(dailyChallenge?.source === 'coach' || weeklyChallenge?.source === 'coach') && (
              <span style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#f59e0b', background: '#f59e0b18', border: '1px solid #f59e0b33', borderRadius: 4, padding: '1px 6px' }}>
                COACH SET
              </span>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#f59e0b33,transparent)', marginBottom: 14 }} />

          <ChallengeRow
            ch={dailyChallenge} label="Daily"
            Icon={Zap} color="#f59e0b"
            sessions={sessions} playerId={player.id}
          />
          <ChallengeRow
            ch={weeklyChallenge} label="Weekly"
            Icon={CalendarDays} color="#60a5fa"
            sessions={sessions} playerId={player.id}
          />
        </div>
      )}

      {/* ── Recent badges ─────────────────────────────────────────────────── */}
      {earnedBadges.length > 0 && (
        <div style={C.card}>
          <div style={C.label}>Recent Badges ({earnedBadges.length}/{BADGES.length})</div>
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
          <div style={C.label}>Recent Sessions</div>
          {recent.map((s, i) => {
            const sh = s.sets.length * 10
            const hi = s.sets.reduce((a, x) => a + x.hits, 0)
            return (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < recent.length - 1 ? '1px solid #1e3a5f' : 'none' }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", color: '#64748b', fontSize: 12, letterSpacing: '0.04em' }}>{new Date(s.date).toLocaleDateString()}</span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{sh} shots</span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 800, color: '#34d399' }}>{sh > 0 ? (hi / sh * 100).toFixed(0) : 0}%</span>
              </div>
            )
          })}
        </div>
      )}

      <button style={C.btnP} onClick={onStartSession}>
        <Target size={16} /> Start New Session
      </button>

      {mutePrompt && (
        <div
          onClick={handleUnmute}
          style={{
            position: 'fixed', bottom: 24, right: 20, zIndex: 200,
            background: 'rgba(10,15,26,0.92)',
            border: '1px solid #3b82f644',
            borderRadius: 24, padding: '9px 16px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 14px #3b82f622',
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 12, fontWeight: 700,
            color: '#93c5fd', letterSpacing: '0.08em',
            userSelect: 'none',
          }}
        >
          🔊 Tap to Unmute Music
        </div>
      )}
    </div>
  )
}
