import { useState, useEffect } from 'react'
import { db } from '../../firebase.js'
import { collection, getDocs } from 'firebase/firestore'
import { X } from 'lucide-react'
import Avatar from '../shared/Avatar.jsx'
import { getStreakAuraClass } from '../../utils/streakAura.js'
import { playerStats } from '../../utils/stats.js'

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
  { id: 'elo',      label: '🏆 ELO',   color: '#f59e0b' },
  { id: 'xp',       label: '⚡ XP',     color: '#a855f7' },
  { id: 'rank',     label: '🎯 RANK',   color: '#22c55e' },
  { id: 'shots',    label: '🏒 SHOTS',  color: '#3b82f6' },
  { id: 'accuracy', label: '📊 ACC',    color: '#06b6d4' },
]

const SUBTITLES = {
  elo:      'TOP 10 · RANKED BY ELO RATING',
  xp:       'TOP 10 · RANKED BY TOTAL XP EARNED',
  rank:     'TOP 10 · RANKED BY TIER LEVEL',
  shots:    'TOP 10 · RANKED BY TOTAL SHOTS LOGGED',
  accuracy: 'TOP 10 · RANKED BY SESSION ACCURACY',
}

function getMetric(p, stats, sortBy) {
  switch (sortBy) {
    case 'elo':
      return { value: (p.elo ?? 1000).toString(), label: 'ELO', color: '#f59e0b', large: true }
    case 'xp':
      return { value: Math.round(stats.xp).toLocaleString(), label: 'XP', color: '#a855f7', large: true }
    case 'rank':
      return { value: stats.level?.name ?? '—', label: 'TIER', color: '#22c55e', large: false }
    case 'shots':
      return { value: stats.totalShots.toLocaleString(), label: 'SHOTS', color: '#3b82f6', large: true }
    case 'accuracy':
      return {
        value: stats.totalShots > 0 ? `${Math.round(stats.acc)}%` : '—',
        label: 'ACC',
        color: '#06b6d4',
        large: true,
      }
    default:
      return { value: '—', label: '', color: '#94a3b8', large: true }
  }
}

export default function Leaderboard({ player, players, sessions = [] }) {
  const [challenges,  setChallenges]  = useState([])
  const [topVideo,    setTopVideo]    = useState(null)
  const [loadingVid,  setLoadingVid]  = useState(false)
  const [sortBy,      setSortBy]      = useState('elo')

  useEffect(() => {
    getDocs(collection(db, 'teams', TEAM_ID, 'peerChallenges'))
      .then(snap => setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {})
  }, [])

  // Precompute stats for every player once per render
  const withStats = players.map(p => ({ p, stats: playerStats(p, sessions) }))

  // Sort based on active filter, descending
  const sorted = [...withStats]
    .sort(({ p: a, stats: sa }, { p: b, stats: sb }) => {
      switch (sortBy) {
        case 'elo':      return (b.elo ?? 1000) - (a.elo ?? 1000)
        case 'xp':       return sb.xp       - sa.xp
        case 'rank':     return sb.li        - sa.li
        case 'shots':    return sb.totalShots - sa.totalShots
        case 'accuracy': return sb.acc       - sa.acc
        default:         return 0
      }
    })
    .slice(0, 10)

  function openTopVideo(p) {
    if (loadingVid) return
    setLoadingVid(true)
    const wins = challenges
      .filter(c => c.status === 'completed' && c.winnerId === p.id)
      .sort((a, b) => (b.respondedAt || 0) - (a.respondedAt || 0))
    const best = wins[0]
    if (best) {
      const url = best.winnerId === best.receiverId ? best.receiverVideo : best.challengerVideo
      if (url) { setTopVideo({ name: p.name, url }); setLoadingVid(false); return }
    }
    setLoadingVid(false)
  }

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

            {/* Avatar */}
            <Avatar player={p} size={34} className={getStreakAuraClass(p.streakCount || p.streak || 0)} />

            {/* Name + rank tier */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                onClick={() => openTopVideo(p)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.04em', color: isMe ? '#06b6d4' : 'var(--text-1)', lineHeight: 1 }}>
                  {p.name}{p.jerseyNum ? ` #${p.jerseyNum}` : ''}{isMe ? ' 👈' : ''}
                </div>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: rank.color, letterSpacing: '0.1em' }}>
                  {rank.label.toUpperCase()}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
                  {wins}W
                </span>
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
          No players yet — issue a showdown to get on the board!
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
    </div>
  )
}
