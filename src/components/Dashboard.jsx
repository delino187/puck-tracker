import { Target, Lock, ChevronRight } from 'lucide-react'
import { LEVELS } from '../constants/levels.js'
import { BADGES } from '../constants/badges.js'
import { STREAK_BADGES } from '../constants/streakBadges.js'
import { getWeekStart } from '../utils/stats.js'
import { useAppStore } from '../store/useAppStore.js'
import { C } from '../styles.js'
import StatCard           from './shared/StatCard.jsx'
import XPBar              from './shared/XPBar.jsx'
import BadgeCircle        from './shared/BadgeCircle.jsx'
import PeerChallengeCard  from './shared/PeerChallengeCard.jsx'
import DailyProgressRing  from './shared/DailyProgressRing.jsx'
import LiveFeed           from './shared/LiveFeed.jsx'

// ── Challenge card helpers ─────────────────────────────────────────────────────
// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard({ player, stats, sessions, players, onStartSession, newBadgeIds, onBadgeClick, onNavigate, peerChallenges = [], onAcceptChallenge }) {
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
  // Highest streak milestone badge the player's current streak qualifies for
  const activeStreakBadge = [...STREAK_BADGES].reverse().find(b => stats.streak >= b.milestone) ?? null

  // Today's shots (session-based only — technique pucks are session-less)
  const todayShots = sessions
    .filter(s => s.playerId === player.id && new Date(s.date).toDateString() === new Date().toDateString())
    .reduce((a, s) => a + s.sets.length * 10, 0)

  return (
    <div style={{ padding: '14px 16px 80px' }}>

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

          {/* Pucks */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>
              {stats.weekShots}
            </div>
            <div className="stat-label">PUCKS</div>
          </div>

          {/* Accuracy */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 800, color: '#34d399', lineHeight: 1 }}>
              {stats.weekShots > 0 ? stats.weekAcc.toFixed(0) + '%' : '—'}
            </div>
            <div className="stat-label">ACCURACY</div>
          </div>

          {/* Streak — earned badge with day count, or locked Spark as motivational goal */}
          <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => onNavigate?.('streak')}>
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
            <div className="stat-label">STREAK</div>
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

      {/* ── Daily Progress Ring ───────────────────────────────────────────── */}
      <div style={{ ...C.card, padding: '16px 18px' }}>
        <DailyProgressRing shots={todayShots} />
      </div>

      {/* ── Incoming peer challenges ──────────────────────────────────────── */}
      {peerChallenges.filter(c => c.receiverId === player.id && c.status === 'pending').map(c => (
        <PeerChallengeCard
          key={c.id}
          challenge={c}
          playerId={player.id}
          onAccept={onAcceptChallenge}
        />
      ))}

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
