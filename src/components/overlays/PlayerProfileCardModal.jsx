import { useState, useEffect } from 'react'
import { db } from '../../firebase.js'
import { collection, query, where, getDocs } from 'firebase/firestore'
import Avatar from '../shared/Avatar.jsx'
import { BADGES } from '../../constants/badges.js'
import { LEVELS } from '../../constants/levels.js'
import { calcXP, getLevel } from '../../utils/stats.js'
import { getStreakAuraClass } from '../../utils/streakAura.js'
import { STREAK_EXCLUSIVE_BADGES } from '../../constants/streakBadges.js'
import { useAppStore } from '../../store/useAppStore.js'

const TEAM_ID = 'team_main'

function computePlayerStats(player, sessions) {
  const pSessions = sessions.filter(s => s.playerId === player.id)
  let sessionShots = 0
  let totalHits    = 0
  pSessions.forEach(s => {
    const h = (s.sets || []).reduce((a, st) => a + st.hits, 0)
    sessionShots += s.source === 'atw' ? h : (s.sets || []).length * 10
    totalHits    += h
  })
  const techEntry  = useAppStore.getState().techniqueByPlayer[player.id]
  const totalShots = sessionShots + (techEntry?.totalPucks || 0)
  const bonusXP    = techEntry?.bonusXP || 0
  const xp         = calcXP(totalShots, totalHits) + bonusXP
  const { li }     = getLevel(xp)
  return { totalShots, li }
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

  const { totalShots, li } = computePlayerStats(player, sessions)
  const level              = LEVELS[li]
  const earnedIds          = Object.keys(player.earnedBadges || {})
  const earnedMedals       = BADGES
    .filter(b => earnedIds.includes(b.id))
    .sort((a, b) => (player.earnedBadges?.[b.id]?.ts || 0) - (player.earnedBadges?.[a.id]?.ts || 0))
  const activeStreak       = player.streakCount || 0
  const liveMedals         = STREAK_EXCLUSIVE_BADGES.filter(b => activeStreak >= b.minStreak)
  const medals             = [...liveMedals, ...earnedMedals].slice(0, 8)
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
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '20px 16px 32px',
        overflowY: 'auto',
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
          padding: '28px 20px 28px',
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
          <Avatar player={player} size={80} className={getStreakAuraClass(player.streakCount || player.streak || 0)} style={{ borderRadius: '50%' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.05em', color: '#f1f5f9', lineHeight: 1.1 }}>
              {player.name}
              {player.jerseyNum ? <span style={{ color: '#60a5fa' }}> #{player.jerseyNum}</span> : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              <img
                src={level.img} alt={level.name}
                style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: '50%', boxShadow: `0 0 12px ${level.color}77` }}
              />
              <span style={{
                fontFamily: "'Bangers',sans-serif",
                fontSize: 28, letterSpacing: '0.1em', lineHeight: 1.15,
                color: level.color,
                textShadow: `0 0 18px ${level.color}77, 0 0 40px ${level.color}33`,
                background: `${level.color}1a`,
                border: `1px solid ${level.color}44`,
                borderRadius: 10, padding: '2px 14px',
              }}>
                {level.name}
              </span>
            </div>
          </div>
        </div>

        {/* ── ELO + Diamond chips ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
          {/* ELO chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg,#0c1a2e,#1e3a5f)',
            border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: 10, padding: '7px 14px',
            boxShadow: '0 0 12px rgba(59,130,246,0.18)',
          }}>
            <span style={{ fontSize: 15 }}>🏆</span>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.16em', lineHeight: 1 }}>ELO RANK</div>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, color: '#f1f5f9', letterSpacing: '0.04em', lineHeight: 1.1, textShadow: '0 0 10px #3b82f644' }}>
                {(player.elo ?? 1000).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Diamond chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg,#2a1a4a,#1a0a2a)',
            border: '1px solid rgba(251,191,36,0.45)',
            borderRadius: 10, padding: '7px 14px',
            boxShadow: '0 0 12px rgba(251,191,36,0.18)',
          }}>
            <span style={{ fontSize: 15 }}>💎</span>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.16em', lineHeight: 1 }}>DIAMONDS</div>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1.1, textShadow: '0 0 10px #fbbf2444' }}>
                {(player.diamonds || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          background: '#0f172a', borderRadius: 12, padding: '12px 8px',
          marginBottom: 16, gap: 4,
        }}>
          {[
            { label: 'Total Pucks', value: totalShots > 0 ? totalShots.toLocaleString() : '—' },
            { label: 'Streak',      value: activeStreak > 0 ? `${activeStreak}D` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.04em', color: '#f1f5f9', lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#a855f7', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Medals ────────────────────────────────────────────────────────── */}
        {medals.length > 0 && (
          <div style={{ marginBottom: 16, width: '100%', padding: '0 2px' }}>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.12em', color: '#f1f5f9', textTransform: 'uppercase', marginBottom: 10 }}>
              Badges <span style={{ color: '#a855f7' }}>({medals.length})</span>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-4 w-full px-4">
              {medals.map(b => (
                <div key={b.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    title={`${b.name} — ${b.desc}`}
                    style={{
                      background: b.innerBg || '#1e293b',
                      borderRadius: '50%',
                      padding: 2,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: b.live
                        ? b.minStreak >= 30
                          ? 'none'
                          : 'fireAura 1.6s ease-in-out infinite'
                        : 'none',
                      border: b.live
                        ? b.minStreak >= 30
                          ? '2px solid #06b6d4'
                          : '2px solid #f97316'
                        : 'none',
                    }}
                    className={b.live && b.minStreak >= 30 ? 'arcade-glow' : ''}
                  >
                    {b.img ? (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img src={b.img} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <b.Icon size={20} color={b.innerIcon || '#94a3b8'} />
                      </div>
                    )}
                  </div>
                  {b.live && (
                    <div style={{
                      marginTop: 3,
                      background: b.minStreak >= 30 ? '#06b6d4' : '#f97316',
                      borderRadius: 4,
                      padding: '1px 5px',
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontSize: 7, fontWeight: 800,
                      color: '#000', letterSpacing: '0.06em',
                      lineHeight: 1.4,
                    }}>
                      LIVE
                    </div>
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
