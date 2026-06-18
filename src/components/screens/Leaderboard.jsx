import { useState, useEffect } from 'react'
import { db } from '../../firebase.js'
import { collection, getDocs } from 'firebase/firestore'
import { X } from 'lucide-react'
import Avatar from '../shared/Avatar.jsx'

const TEAM_ID  = 'team_main'
const MS_24H   = 24 * 60 * 60 * 1000

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

export default function Leaderboard({ player, players }) {
  const [challenges,  setChallenges]  = useState([])
  const [topVideo,    setTopVideo]    = useState(null)
  const [loadingVid,  setLoadingVid]  = useState(false)

  useEffect(() => {
    getDocs(collection(db, 'teams', TEAM_ID, 'peerChallenges'))
      .then(snap => setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {})
  }, [])

  // Sort by ELO descending; fall back to totalWins if elo is missing
  const sorted = [...players]
    .sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000))
    .slice(0, 10)

  function openTopVideo(p) {
    if (loadingVid) return
    setLoadingVid(true)
    const wins = challenges
      .filter(c => c.status === 'completed' && c.winnerId === p.id)
      .sort((a, b) => (b.respondedAt || 0) - (a.respondedAt || 0))

    const best = wins[0]
    if (best) {
      const url = best.winnerId === best.receiverId
        ? best.receiverVideo
        : best.challengerVideo
      if (url) { setTopVideo({ name: p.name, url }); setLoadingVid(false); return }
    }
    setLoadingVid(false)
  }

  return (
    <div style={{ padding: '16px 16px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div className="text-3d-gold" style={{ fontFamily: "'Bangers',sans-serif", fontSize: 30, letterSpacing: '0.06em' }}>
          🏒 SNIPER LEADERBOARD
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#64748b', marginTop: 2, letterSpacing: '0.1em' }}>
          TOP 10 · RANKED BY ELO RATING
        </div>
      </div>

      {/* Rank tier key */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {RANKS.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: `1px solid ${r.color}44`, borderRadius: 20, padding: '3px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: r.color, letterSpacing: '0.08em' }}>
              {r.label}
            </span>
          </div>
        ))}
      </div>

      {/* Player rows */}
      {sorted.map((p, i) => {
        const wins    = p.totalWins || 0
        const elo     = p.elo ?? 1000
        const rank    = getSnipeRank(wins)
        const isMe    = p.id === player.id
        const delta   = p.eloLastDelta ?? 0
        const recent  = p.eloLastUpdated && (Date.now() - p.eloLastUpdated) < MS_24H

        return (
          <div
            key={p.id}
            style={{
              background: isMe ? 'rgba(6,182,212,0.07)' : 'var(--card-bg)',
              border: isMe ? '1px solid rgba(6,182,212,0.4)' : 'var(--card-border)',
              borderLeft: `3px solid ${i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : rank.color}`,
              borderRadius: 12, padding: '10px 14px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            {/* Position */}
            <div style={{ minWidth: 26, textAlign: 'center', fontSize: 18 }}>
              {MEDALS[i] ?? <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: '#475569' }}>#{i + 1}</span>}
            </div>

            {/* Avatar */}
            <Avatar player={p} size={34} className={isMe ? 'arcade-glow' : ''} />

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
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#475569' }}>
                  {wins}W
                </span>
              </div>
            </div>

            {/* ELO rating + 24h delta indicator */}
            <div style={{ textAlign: 'center', minWidth: 56 }}>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#f1f5f9', lineHeight: 1, letterSpacing: '0.02em' }}>
                {elo}
              </div>
              {recent && delta !== 0 ? (
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800,
                  color: delta > 0 ? '#22c55e' : '#ef4444',
                  letterSpacing: '0.04em', lineHeight: 1, marginTop: 2,
                }}>
                  {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
                </div>
              ) : (
                <div className="stat-label" style={{ color: '#475569' }}>ELO</div>
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

      {/* Top video lightbox */}
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
