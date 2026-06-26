import { useState, useEffect } from 'react'
import { db } from '../../firebase.js'
import { collection, onSnapshot } from 'firebase/firestore'
import { X } from 'lucide-react'
import Avatar from '../shared/Avatar.jsx'
import { getStreakAuraClass } from '../../utils/streakAura.js'
import { playerStats } from '../../utils/stats.js'
import { usePlayer } from '../../context/PlayerContext.jsx'
import { useAppStore } from '../../store/useAppStore.js'

const TEAM_ID = 'team_main'
const MS_24H  = 24 * 60 * 60 * 1000

const RANKS = [
  { label: 'Benchwarmer', min: 0,  max: 5,        color: '#94a3b8' },
  { label: 'Third-Liner', min: 6,  max: 15,       color: '#60a5fa' },
  { label: 'Playmaker',   min: 16, max: 30,       color: '#a855f7' },
  { label: 'Pure Sniper', min: 31, max: Infinity, color: '#f59e0b' },
]

function getSnipeRank(wins) {
  return RANKS.find(r => wins >= r.min && wins <= r.max) ?? RANKS[0]
}

const MEDALS = ['🥇', '🥈', '🥉']

const FILTERS = [
  { id: 'elo',      label: '🏆 ELO',    color: '#f59e0b' },
  { id: 'xp',       label: '⚡ XP',      color: '#a855f7' },
  { id: 'rank',     label: '🎯 RANK',    color: '#22c55e' },
  { id: 'shots',    label: '🏒 SHOTS',   color: '#3b82f6' },
  { id: 'accuracy', label: '📊 ACC',     color: '#06b6d4' },
  { id: 'streak',   label: '🔥 STREAK',  color: '#ef4444' },
]

const SUBTITLES = {
  elo:      'TOP 10 · RANKED BY ELO RATING',
  xp:       'TOP 10 · RANKED BY TOTAL XP EARNED',
  rank:     'TOP 10 · RANKED BY TIER LEVEL',
  shots:    'TOP 10 · RANKED BY TOTAL SHOTS LOGGED',
  accuracy: 'TOP 10 · RANKED BY SESSION ACCURACY',
  streak:   'TOP 10 · RANKED BY LONGEST WINNING STREAK',
}

function getMetric(p, stats, sortBy) {
  switch (sortBy) {
    case 'elo':
      return { value: (p.elo ?? 1000).toString(), label: 'ELO', color: '#f59e0b', large: true }
    case 'xp':
      return { value: Math.round(stats.xp).toLocaleString(), label: 'XP', color: '#a855f7', large: true }
    case 'rank':
      // For rank filter, show the wins-based snipe rank, not the XP-based level
      const wins = p.totalWins || 0
      const snipeRank = getSnipeRank(wins)
      return { value: snipeRank.label, label: 'RANK', color: snipeRank.color, large: false }
    case 'shots':
      return { value: stats.totalShots.toLocaleString(), label: 'SHOTS', color: '#3b82f6', large: true }
    case 'accuracy':
      return {
        value: stats.totalShots > 0 ? `${Math.round(stats.acc)}%` : '—',
        label: 'ACC',
        color: '#06b6d4',
        large: true,
      }
    case 'streak':
      return {
        value: stats.streak > 0 ? `${stats.streak} Days 🔥` : '—',
        label: 'STREAK',
        color: '#ef4444',
        large: true,
      }
    default:
      return { value: '—', label: '', color: '#94a3b8', large: true }
  }
}

// ── Player Card Modal ─────────────────────────────────────────────────────────
function PlayerCardModal({ selected, challenges, activePlayerId, onClose }) {
  const { p, stats, rank: rankFromLeaderboard, position } = selected
  const isMe           = p.id === activePlayerId
  // Technique-only pucks (logged outside sessions) live in Zustand
  const techniquePucks = useAppStore(s => s.techniqueByPlayer?.[p.id]?.totalPucks || 0)
  // All-mode lifetime shots: Target Practice + ATW + Technique Only + P-U-C-K + Versus
  const allLifetimeShots = stats.totalShots + techniquePucks
  // Recalculate rank independently to ensure consistency with leaderboard
  const wins = challenges.filter(c => c.status === 'completed' && c.winnerId === p.id).length
  const rank = getSnipeRank(wins)
  const losses = challenges.filter(c =>
    c.status === 'completed' && !c.isTie &&
    c.winnerId && c.winnerId !== p.id &&
    (c.challengerId === p.id || c.receiverId === p.id)
  ).length
  const ties = challenges.filter(c =>
    c.status === 'completed' && c.isTie &&
    (c.challengerId === p.id || c.receiverId === p.id)
  ).length

  // Best win video for "Top Play" button
  const topPlay = (() => {
    const winMatches = challenges
      .filter(c => c.status === 'completed' && c.winnerId === p.id)
      .sort((a, b) => (b.respondedAt || 0) - (a.respondedAt || 0))
    const best = winMatches[0]
    if (!best) return null
    return best.winnerId === best.receiverId ? best.receiverVideo : best.challengerVideo
  })()

  const accent = isMe ? '#06b6d4' : rank.color

  const stats2 = [
    { label: 'ELO',    value: (p.elo ?? 1000).toString(),                    color: '#f59e0b' },
    { label: 'XP',     value: Math.round(stats.xp).toLocaleString(),          color: '#a855f7' },
    { label: 'SHOTS',  value: allLifetimeShots.toLocaleString(),               color: '#3b82f6' },
    { label: 'ACC',    value: stats.totalShots > 0 ? `${Math.round(stats.acc)}%` : '—', color: '#06b6d4' },
    { label: 'STREAK', value: (stats.streak || 0) > 0 ? `${stats.streak} 🔥` : '—', color: '#ef4444' },
    { label: 'LEVEL',  value: stats.level?.name ?? '—',                       color: '#22c55e' },
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 800,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          background: 'linear-gradient(160deg,#080d18,#0d1628)',
          border: `2px solid ${accent}55`,
          borderRadius: 24,
          padding: '28px 22px 22px',
          boxShadow: `0 0 60px ${accent}22, 0 24px 48px rgba(0,0,0,0.7)`,
          position: 'relative',
          animation: 'badgePop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex' }}
        >
          <X size={18} />
        </button>

        {/* Position badge */}
        <div style={{
          position: 'absolute', top: 14, left: 14,
          fontFamily: "'Bangers',sans-serif", fontSize: 22,
          letterSpacing: '0.06em',
          color: position === 0 ? '#f59e0b' : position === 1 ? '#94a3b8' : position === 2 ? '#b45309' : '#475569',
        }}>
          {MEDALS[position] ?? `#${position + 1}`}
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{
            padding: 4,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${accent}88, ${accent}22)`,
            boxShadow: `0 0 32px ${accent}44`,
          }}>
            <Avatar
              player={p}
              size={88}
              className={getStreakAuraClass(p.streakCount || 0)}
              style={{ border: `3px solid ${accent}` }}
            />
          </div>
        </div>

        {/* Name */}
        <div style={{
          fontFamily: "'Bangers',sans-serif",
          fontSize: 32, letterSpacing: '0.08em', lineHeight: 1,
          color: accent,
          textShadow: `0 0 30px ${accent}66`,
          textAlign: 'center', marginBottom: 4,
        }}>
          {p.name}{p.jerseyNum ? ` #${p.jerseyNum}` : ''}{isMe ? ' 👈' : ''}
        </div>

        {/* Rank + username */}
        <div style={{
          textAlign: 'center', marginBottom: 20,
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 800,
          color: rank.color, letterSpacing: '0.14em',
        }}>
          {rank.label.toUpperCase()}
          {p.isAdmin && (
            <span style={{
              display: 'inline-block', marginLeft: 8,
              background: 'rgba(245,158,11,0.18)', color: '#fbbf24',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
              padding: '1px 7px', borderRadius: 20,
              border: '1px solid rgba(245,158,11,0.35)',
              verticalAlign: 'middle',
            }}>ADMIN</span>
          )}
          {p.username && (
            <span style={{ color: '#475569', fontWeight: 400, marginLeft: 6 }}>
              @{p.username}
            </span>
          )}
        </div>

        {/* Stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {stats2.map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #1e3a5f',
              borderRadius: 12, padding: '10px 6px',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: "'Bangers',sans-serif",
                fontSize: 20, letterSpacing: '0.04em',
                color: s.color, lineHeight: 1,
              }}>
                {s.value}
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 9, fontWeight: 800,
                color: '#475569', letterSpacing: '0.12em', marginTop: 3,
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Win / Loss / Tie record */}
        <div style={{
          display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid #1e3a5f',
          borderRadius: 12, padding: '10px 12px',
        }}>
          {[
            { label: 'WINS',   value: wins,   color: '#22c55e' },
            { label: 'LOSSES', value: losses,  color: '#ef4444' },
            { label: 'TIES',   value: ties,    color: '#94a3b8' },
          ].map((r, i) => (
            <div key={r.label} style={{ flex: 1, textAlign: 'center' }}>
              {i > 0 && <div style={{ position: 'absolute' }} />}
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 24, color: r.color, lineHeight: 1 }}>
                {r.value}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#475569', letterSpacing: '0.12em', marginTop: 2 }}>
                {r.label}
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {topPlay && (
            <button
              onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent('leaderboard-topplay', { detail: { name: p.name, url: topPlay } })), 50) }}
              style={{
                flex: 1, padding: '11px 8px',
                background: 'linear-gradient(135deg,#451a03,#92400e)',
                border: '1.5px solid #f59e0b66',
                borderRadius: 12,
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 800,
                color: '#fbbf24', cursor: 'pointer', letterSpacing: '0.06em',
              }}
            >
              🎬 Top Play
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px 8px',
              background: 'transparent',
              border: '1.5px solid #1e3a5f',
              borderRadius: 12,
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 800,
              color: '#475569', cursor: 'pointer', letterSpacing: '0.06em',
            }}
          >
            ✕ Close
          </button>
        </div>

        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10,
          color: '#334155', textAlign: 'center', marginTop: 14, letterSpacing: '0.08em',
        }}>
          Tap outside to close
        </div>
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const { activePlayer: player, st } = usePlayer()
  const players  = st.players
  const sessions = st.sessions
  const [challenges,     setChallenges]     = useState([])
  const [puckGames,      setPuckGames]      = useState([])
  const [topVideo,       setTopVideo]       = useState(null)
  const [sortBy,         setSortBy]         = useState('elo')
  const [selectedPlayer, setSelectedPlayer] = useState(null)  // { p, stats, rank, position }

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'teams', TEAM_ID, 'peerChallenges'),
      snap => setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {},
    )
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'teams', TEAM_ID, 'puckGames'),
      snap => setPuckGames(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {},
    )
    return unsub
  }, [])

  // Listen for the top-play event dispatched from inside PlayerCardModal
  useEffect(() => {
    const handler = e => setTopVideo(e.detail)
    window.addEventListener('leaderboard-topplay', handler)
    return () => window.removeEventListener('leaderboard-topplay', handler)
  }, [])

  // Get technique-only shots from Zustand to include in holistic totals
  const techniqueByPlayer = useAppStore(s => s.techniqueByPlayer || {})

  // Precompute stats for every player once per render, including shots from all game modes
  const withStats = players.map(p => ({ p, stats: playerStats(p, sessions, 0, puckGames, challenges, techniqueByPlayer) }))

  // Sort based on active filter, descending
  const sorted = [...withStats]
    .sort(({ p: a, stats: sa }, { p: b, stats: sb }) => {
      switch (sortBy) {
        case 'elo':      return (b.elo ?? 1000) - (a.elo ?? 1000)
        case 'xp':       return sb.xp       - sa.xp
        case 'rank':     return (b.totalWins ?? 0) - (a.totalWins ?? 0)
        case 'shots':    return sb.totalShots - sa.totalShots
        case 'accuracy': return sb.acc       - sa.acc
        case 'streak':   return sb.streak     - sa.streak
        default:         return 0
      }
    })
    .slice(0, 10)

  const activeFilter = FILTERS.find(f => f.id === sortBy)

  return (
    <div style={{ padding: '16px 16px 80px' }}>
      <style>{`
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateX(-10px) }
          to   { opacity: 1; transform: translateX(0) }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <div className="text-3d-gold" style={{ fontFamily: "'Bangers',sans-serif", fontSize: 30, letterSpacing: '0.06em' }}>
          🏒 SNIPER LEADERBOARD
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#f1f5f9', marginTop: 2, letterSpacing: '0.1em' }}>
          {SUBTITLES[sortBy]}
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
        overflowX: 'auto', paddingBottom: 4,
        scrollbarWidth: 'none',
      }}>
        {FILTERS.map(f => {
          const active = sortBy === f.id
          return (
            <button
              key={f.id}
              onClick={() => setSortBy(f.id)}
              style={{
                flexShrink: 0,
                background: active ? `${f.color}1a` : 'var(--card-bg)',
                border: `2px solid ${active ? f.color : 'transparent'}`,
                borderRadius: 22, padding: '5px 14px',
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
                color: active ? f.color : '#475569',
                cursor: 'pointer',
                boxShadow: active ? `0 0 14px ${f.color}44` : 'none',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* ── Rank tier key ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {RANKS.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: `1px solid ${r.color}44`, borderRadius: 20, padding: '3px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: r.color, letterSpacing: '0.08em' }}>
              {r.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Player rows ─────────────────────────────────────────────────────── */}
      {sorted.map(({ p, stats }, i) => {
        const wins   = p.totalWins || 0
        const elo    = p.elo ?? 1000
        const rank   = getSnipeRank(wins)
        const isMe   = p.id === player.id
        const delta  = p.eloLastDelta ?? 0
        const recent = p.eloLastUpdated && (Date.now() - p.eloLastUpdated) < MS_24H
        const metric = getMetric(p, stats, sortBy)

        return (
          <div
            key={`${sortBy}-${p.id}`}
            style={{
              background: isMe ? 'rgba(6,182,212,0.07)' : 'var(--card-bg)',
              border: isMe ? '1px solid rgba(6,182,212,0.4)' : 'var(--card-border)',
              borderLeft: `3px solid ${i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : rank.color}`,
              borderRadius: 12, padding: '10px 14px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 10,
              animation: `rowFadeIn 0.28s ease-out ${i * 0.04}s both`,
            }}
          >
            {/* Position */}
            <div style={{ minWidth: 26, textAlign: 'center', fontSize: 18 }}>
              {MEDALS[i] ?? <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: '#475569' }}>#{i + 1}</span>}
            </div>

            {/* Avatar — clickable */}
            <button
              onClick={() => setSelectedPlayer({ p, stats, rank, position: i })}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, display: 'flex' }}
            >
              <Avatar player={p} size={34} className={getStreakAuraClass(p.streakCount || p.streak || 0)} />
            </button>

            {/* Name + rank tier */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                onClick={() => setSelectedPlayer({ p, stats, rank, position: i })}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.04em', color: isMe ? '#06b6d4' : 'var(--text-1)', lineHeight: 1 }}>
                  {p.name}{p.jerseyNum ? ` #${p.jerseyNum}` : ''}{isMe ? ' 👈' : ''}
                </div>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: rank.color, letterSpacing: '0.1em' }}>
                  {rank.label.toUpperCase()}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
                  {wins}W
                </span>
                {p.isAdmin && (
                  <span style={{
                    fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.1em', color: '#fbbf24',
                    background: 'rgba(245,158,11,0.15)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 10, padding: '0px 5px',
                  }}>ADMIN</span>
                )}
              </div>
            </div>

            {/* Dynamic metric column — changes with active filter */}
            <div style={{ textAlign: 'center', minWidth: 60, flexShrink: 0 }}>
              <div style={{
                fontFamily: "'Bangers',sans-serif",
                fontSize: metric.large ? 22 : 14,
                color: metric.color, lineHeight: 1, letterSpacing: '0.02em',
              }}>
                {metric.value}
              </div>
              {/* ELO: show 24h delta instead of label when recent */}
              {sortBy === 'elo' && recent && delta !== 0 ? (
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800,
                  color: delta > 0 ? '#22c55e' : '#ef4444',
                  letterSpacing: '0.04em', lineHeight: 1, marginTop: 2,
                }}>
                  {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
                </div>
              ) : (
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 700,
                  color: '#475569', letterSpacing: '0.1em', lineHeight: 1, marginTop: 3,
                }}>
                  {metric.label}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', color: '#475569', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, padding: '40px 0' }}>
          No players yet — issue a quick match to get on the board!
        </div>
      )}

      {/* ── Top video lightbox ──────────────────────────────────────────────── */}
      {topVideo && (
        <div
          onClick={() => setTopVideo(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
            <button
              onClick={() => setTopVideo(null)}
              style={{ position: 'absolute', top: -36, right: 0, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <X size={16} /> Close
            </button>
            <div className="text-3d-gold" style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.06em', marginBottom: 10, textAlign: 'center' }}>
              {topVideo.name}'s Top Play
            </div>
            <video
              src={topVideo.url}
              controls autoPlay playsInline
              style={{ width: '100%', borderRadius: 14, background: '#000', maxHeight: 420 }}
            />
          </div>
        </div>
      )}

      {/* ── Player card modal ───────────────────────────────────────────────── */}
      {selectedPlayer && (
        <PlayerCardModal
          selected={selectedPlayer}
          challenges={challenges}
          activePlayerId={player.id}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}
