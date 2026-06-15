import { useState } from 'react'
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff, Flame } from 'lucide-react'
import { getWeekStart, calcXP, getLevel } from '../../utils/stats.js'
import { getPSessions, dayStreak } from '../../utils/badgeHelpers.js'
import { C } from '../../styles.js'
import Scaffold from '../shared/Scaffold.jsx'
import LevelBadge from '../shared/LevelBadge.jsx'

export default function PlayerSelectScreen({ players, sessions, onSelect, onBack }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [pw,   setPw]   = useState('')
  const [err,  setErr]  = useState(false)
  const [show, setShow] = useState(false)

  const ws = getWeekStart()

  if (selectedPlayer) {
    return (
      <Scaffold onBack={() => { setSelectedPlayer(null); setPw(''); setErr(false) }} title="">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: 'var(--text-1)' }}>{selectedPlayer.name}</div>
          {selectedPlayer.jerseyNum && <div style={{ color: '#60a5fa', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16 }}>#{selectedPlayer.jerseyNum}</div>}
          <LevelBadge li={getLevel(calcXP(
            getPSessions(selectedPlayer, sessions).flatMap(s => s.sets).length * 10,
            getPSessions(selectedPlayer, sessions).flatMap(s => s.sets).reduce((a, x) => a + x.hits, 0),
          )).li} />
        </div>

        {selectedPlayer.password ? (
          <div style={C.card}>
            <label style={C.label}>Enter your password</label>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={e => { setPw(e.target.value); setErr(false) }}
                placeholder="Password"
                style={{ ...C.inp, marginBottom: 0, paddingRight: 40 }}
              />
              <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 10, top: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {err && (
              <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Wrong password
              </div>
            )}
            <button style={C.btnP} onClick={() => { if (pw === selectedPlayer.password) onSelect(selectedPlayer.id); else setErr(true) }}>
              <Lock size={15} /> Enter
            </button>
          </div>
        ) : (
          <div style={C.card}>
            <div style={{ fontSize: 14, marginBottom: 14, textAlign: 'center', color: 'var(--text-2)' }}>No password set for this profile</div>
            <button style={C.btnP} onClick={() => onSelect(selectedPlayer.id)}>
              <CheckCircle size={15} /> Continue
            </button>
          </div>
        )}
      </Scaffold>
    )
  }

  return (
    <Scaffold onBack={onBack} title="Who's Playing?">
      {players.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16 }}>
          No players yet — ask your coach!
        </div>
      ) : players.map(p => {
        const pss      = sessions.filter(s => s.playerId === p.id)
        const allSets  = pss.flatMap(s => s.sets)
        const shots    = allSets.length * 10
        const hits     = allSets.reduce((a, x) => a + x.hits, 0)
        const xp       = calcXP(shots, hits)
        const { li }   = getLevel(xp)
        const str      = dayStreak(p, sessions)
        const weekShots = pss.filter(s => new Date(s.date) >= ws).flatMap(s => s.sets).length * 10

        return (
          <button
            key={p.id}
            style={{ ...C.card, width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}
            onClick={() => setSelectedPlayer(p)}
          >
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 4, color: 'var(--text-1)' }}>
                {p.name}{p.jerseyNum ? <span style={{ color: '#60a5fa' }}> #{p.jerseyNum}</span> : ''}
              </div>
              <LevelBadge li={li} />
            </div>
            <div style={{ textAlign: 'right' }}>
              {str > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#f97316', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, justifyContent: 'flex-end' }}>
                  <Flame size={12} /> {str}d
                </div>
              )}
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'var(--text-2)' }}>{weekShots} this wk</div>
            </div>
          </button>
        )
      })}
    </Scaffold>
  )
}
