import { useState } from 'react'
import { Flame, Trophy, Target, TrendingUp } from 'lucide-react'
import { getWeekStart, playerStats } from '../utils/stats.js'
import LevelBadge from './shared/LevelBadge.jsx'

const MEDALS = ['🥇', '🥈', '🥉']

export default function TeamLeaderboards({ player, players, sessions, h2h }) {
  const [period, setPeriod] = useState('week')

  const ws    = getWeekStart()
  const today = new Date().toDateString()

  const ranked = [...players].map(p => {
    const pss  = sessions.filter(s => s.playerId === p.id)
    const sets =
      period === 'today'   ? pss.filter(s => new Date(s.date).toDateString() === today).flatMap(s => s.sets) :
      period === 'week'    ? pss.filter(s => new Date(s.date) >= ws).flatMap(s => s.sets) :
                             pss.flatMap(s => s.sets)
    const shots = sets.length * 10
    const hits  = sets.reduce((a, s) => a + s.hits, 0)
    const pstat = playerStats(p, sessions)
    return { ...p, shots, acc: shots > 0 ? hits / shots * 100 : 0, streak: pstat.streak, li: pstat.li }
  }).sort((a, b) => b.shots - a.shots)

  const hw           = ranked[0]
  const sn           = [...ranked].sort((a, b) => b.acc - a.acc)[0]
  const streakLeader = [...ranked].sort((a, b) => b.streak - a.streak)[0]

  return (
    <div style={{ padding: '14px 16px 80px' }}>

      {/* ── Period filter ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { v: 'today',   label: 'Today'    },
          { v: 'week',    label: 'This Week' },
          { v: 'alltime', label: 'All Time'  },
        ].map(({ v, label }) => {
          const sel = period === v
          return (
            <button
              key={v}
              onClick={() => setPeriod(v)}
              style={{
                flex: 1,
                background: sel ? '#1d4ed8'          : 'var(--card-bg)',
                color:      sel ? '#ffffff'           : 'var(--text-muted)',
                border:     sel ? '1px solid #1d4ed8' : 'var(--card-border)',
                borderRadius: 8, padding: '8px',
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11,
                fontWeight: sel ? 700 : 500, cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Longest active streak highlight ───────────────────────────────── */}
      {streakLeader?.streak > 0 && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid #f9731644',
          borderRadius: 14, padding: '14px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 0 20px #f9731618',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Flame size={14} color="#f97316" />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: '0.14em' }}>
                LONGEST ACTIVE STREAK
              </span>
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>
              {streakLeader.name}{streakLeader.jerseyNum ? ` #${streakLeader.jerseyNum}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 44, fontWeight: 900, color: '#f97316', lineHeight: 1 }}>
              {streakLeader.streak}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>DAYS</div>
          </div>
        </div>
      )}

      {/* ── Grinder / Sniper spotlight pods ───────────────────────────────── */}
      {hw?.shots > 0 && sn?.acc > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { p: hw, label: 'GRINDER', sub: `${hw.shots} pucks`, color: '#60a5fa', Icon: TrendingUp },
            { p: sn, label: 'SNIPER',  sub: `${sn.acc.toFixed(0)}% acc`, color: '#fbbf24', Icon: Target },
          ].map(({ p, label, sub, color, Icon }) => p && (
            <div key={label} style={{
              background: 'var(--card-bg)',
              borderRadius: 10, padding: 12,
              border: `1px solid ${color}44`,
              textAlign: 'center',
            }}>
              <Icon size={16} color={color} style={{ marginBottom: 3 }} />
              <div style={{ color, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{p.name}</div>
              <div style={{ color: 'var(--text-2)', fontSize: 11 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Player rows ────────────────────────────────────────────────────── */}
      {ranked.map((p, i) => {
        const isMe = p.id === player.id
        return (
          <div key={p.id} style={{
            background: isMe ? 'rgba(59,130,246,0.08)' : 'var(--card-bg)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 8,
            border: 'var(--card-border)',
            borderLeft: `3px solid ${i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'transparent'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 17, minWidth: 24, textAlign: 'center' }}>
              {MEDALS[i] || <span style={{ fontFamily: "'Barlow Condensed',sans-serif", color: 'var(--text-muted)', fontSize: 13 }}>#{i + 1}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 700, color: isMe ? '#60a5fa' : 'var(--text-1)' }}>
                  {p.name}{p.jerseyNum ? ` #${p.jerseyNum}` : ''}{isMe ? ' 👈' : ''}
                </span>
                <LevelBadge li={p.li} />
              </div>
              {p.streak > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#f97316', fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif" }}>
                  <Flame size={10} /> {p.streak}d streak
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', minWidth: 40 }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>{p.shots}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>shots</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 44, background: 'var(--progress-track)', borderRadius: 8, padding: '4px 7px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 800, color: '#34d399' }}>{p.acc.toFixed(0)}%</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>acc</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
