import { useState, useEffect } from 'react'
import { db } from '../../firebase.js'
import { collection, query, where, getDocs } from 'firebase/firestore'
import Avatar from '../shared/Avatar.jsx'
import { BADGES } from '../../constants/badges.js'
import { LEVELS } from '../../constants/levels.js'
import { calcXP, getLevel } from '../../utils/stats.js'

const TEAM_ID = 'team_main'

function computePlayerStats(player, sessions) {
  const pSessions = sessions.filter(s => s.playerId === player.id)
  const allSets   = pSessions.flatMap(s => s.sets)
  const totalShots = allSets.length * 10
  const totalHits  = allSets.reduce((a, s) => a + s.hits, 0)
  const xp         = calcXP(totalShots, totalHits)
  const { li }     = getLevel(xp)
  return { totalShots, totalHits, xp, li }
}

// Vertical bar — label below, colored fill
function Bar({ value, max, color, label }) {
  const pct  = max > 0 ? (value / max) * 100 : 0
  const BAR_H = 60
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 52 }}>
      <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 15, color: '#f1f5f9', letterSpacing: '0.04em' }}>
        {value}
      </span>
      <div style={{ width: 28, height: BAR_H, background: '#1e293b', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{
          width: '100%',
          height: `${pct}%`,
          minHeight: value > 0 ? 4 : 0,
          background: color,
          borderRadius: 6,
          transition: 'height 0.5s ease-out',
        }} />
      </div>
      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

export default function PlayerProfileCardModal({ player, currentPlayer, sessions, onClose }) {
  const [h2h,     setH2h]     = useState(null)
  const [loading, setLoading] = useState(true)

  const { totalHits, li } = computePlayerStats(player, sessions)
  const level              = LEVELS[li]
  const earnedIds          = Object.keys(player.earnedBadges || {})
  const medals             = BADGES.filter(b => earnedIds.includes(b.id)).slice(0, 6)
  const isSelf             = player.id === currentPlayer?.id

  useEffect(() => {
    if (isSelf || !currentPlayer?.id || !player?.id) {
      setH2h({ wins: 0, losses: 0, ties: 0 })
      setLoading(false)
      return
    }

    const col = collection(db, 'teams', TEAM_ID, 'peerChallenges')
    // Two queries because Firestore can't OR across different field pairs
    const q1 = query(col,
      where('challengerId', '==', currentPlayer.id),
      where('receiverId',   '==', player.id),
      where('status',       '==', 'completed'),
    )
    const q2 = query(col,
      where('challengerId', '==', player.id),
      where('receiverId',   '==', currentPlayer.id),
      where('status',       '==', 'completed'),
    )

    Promise.all([getDocs(q1), getDocs(q2)])
      .then(([s1, s2]) => {
        const all = [...s1.docs, ...s2.docs].map(d => d.data())
        let wins = 0, losses = 0, ties = 0
        for (const c of all) {
          if (!c.winnerId)                          ties++
          else if (c.winnerId === currentPlayer.id) wins++
          else                                      losses++
        }
        setH2h({ wins, losses, ties })
      })
      .catch(() => setH2h({ wins: 0, losses: 0, ties: 0 }))
      .finally(() => setLoading(false))
  }, [currentPlayer?.id, player?.id])

  const total   = h2h ? h2h.wins + h2h.losses + h2h.ties : 0
  const winRate = total > 0 ? Math.round(h2h.wins / total * 100) : 0
  const maxBar  = h2h ? Math.max(h2h.wins, h2h.losses, h2h.ties, 1) : 1

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          background: 'linear-gradient(160deg,#080b14,#0f1628)',
          border: '2px solid rgba(6,182,212,0.35)',
          borderRadius: 22,
          boxShadow: '0 0 40px rgba(6,182,212,0.15), 0 24px 48px rgba(0,0,0,0.6)',
          padding: '28px 20px 24px',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'transparent', border: '1px solid #334155',
            borderRadius: 8, width: 28, height: 28,
            color: '#64748b', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* ── Avatar + name + rank ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Avatar player={player} size={80} className="arcade-glow" style={{ borderRadius: '50%' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.05em', color: '#f1f5f9', lineHeight: 1.1 }}>
              {player.name}
              {player.jerseyNum ? <span style={{ color: '#60a5fa' }}> #{player.jerseyNum}</span> : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <img src={level.img} alt={level.name} style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: '50%' }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: level.color, letterSpacing: '0.06em' }}>
                {level.name}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          background: '#0f172a', borderRadius: 12, padding: '12px 8px',
          marginBottom: 16, gap: 4,
        }}>
          {[
            { label: 'Wins',    value: isSelf ? '—' : (h2h?.wins   ?? '…') },
            { label: 'Losses',  value: isSelf ? '—' : (h2h?.losses ?? '…') },
            { label: 'Ties',    value: isSelf ? '—' : (h2h?.ties   ?? '…') },
            { label: 'Win %',   value: isSelf ? '—' : (loading ? '…' : `${winRate}%`) },
            { label: 'Hits',    value: totalHits > 0 ? totalHits.toLocaleString() : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.04em', color: '#f1f5f9', lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Medals ────────────────────────────────────────────────────────── */}
        {medals.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#475569', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Badges
            </div>
            {/* Fixed-cell grid — 6 columns, each cell is a 52×52 square */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {medals.map(b => (
                <div
                  key={b.id}
                  title={`${b.name} — ${b.desc}`}
                  style={{
                    aspectRatio: '1 / 1',
                    borderRadius: 10,
                    background: b.innerBg || '#1e293b',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 6,
                    overflow: 'hidden',
                  }}
                >
                  {b.img ? (
                    <img
                      src={b.img}
                      alt={b.name}
                      style={{
                        width: '100%', height: '100%',
                        objectFit: 'contain',
                        aspectRatio: '1 / 1',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <b.Icon size={22} color={b.innerIcon || '#94a3b8'} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VS H2H bar chart ──────────────────────────────────────────────── */}
        {!isSelf && (
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#475569', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
              Head to Head vs You
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                <div style={{ width: 18, height: 18, border: '2px solid #06b6d4', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            ) : total === 0 ? (
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#475569', textAlign: 'center', padding: '8px 0' }}>
                No completed matches yet
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'flex-end' }}>
                <Bar value={h2h.wins}   max={maxBar} color="#22c55e" label="Your W" />
                <Bar value={h2h.losses} max={maxBar} color="#ef4444" label="Your L" />
                <Bar value={h2h.ties}   max={maxBar} color="#475569" label="Tied" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
