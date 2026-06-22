import { useState } from 'react'
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff, Flame } from 'lucide-react'
import { playerStats } from '../../utils/stats.js'
import { C } from '../../styles.js'
import { getStreakAuraClass } from '../../utils/streakAura.js'
import Scaffold from '../shared/Scaffold.jsx'
import LevelBadge from '../shared/LevelBadge.jsx'
import Avatar from '../shared/Avatar.jsx'
import { useAppStore } from '../../store/useAppStore.js'

export default function PlayerSelectScreen({ players, sessions, onSelect, onBack }) {
  // Read Zustand's technique bonus XP so the level badge reflects ALL activity
  // (Target Practice + Technique Only + PUCK game rounds + Versus challenges),
  // not just the shots stored in sessions.  Without this the login screen shows
  // a lower rank than the player's actual in-app level.
  const techniqueByPlayer = useAppStore(s => s.techniqueByPlayer)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [pw,   setPw]   = useState('')
  const [err,  setErr]  = useState(false)
  const [show, setShow] = useState(false)

  if (selectedPlayer) {
    const selectedBonusXP = techniqueByPlayer[selectedPlayer.id]?.bonusXP || 0
    const { li: selectedLi } = playerStats(selectedPlayer, sessions, selectedBonusXP)
    return (
      <Scaffold onBack={() => { setSelectedPlayer(null); setPw(''); setErr(false) }} title="">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: 'var(--text-1)' }}>{selectedPlayer.name}</div>
          {selectedPlayer.jerseyNum && <div style={{ color: '#60a5fa', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16 }}>#{selectedPlayer.jerseyNum}</div>}
          <LevelBadge li={selectedLi} />
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
        const bonusXP = techniqueByPlayer[p.id]?.bonusXP || 0
        const { li, streak: str, weekShots } = playerStats(p, sessions, bonusXP)

        return (
          <button
            key={p.id}
            onClick={() => setSelectedPlayer(p)}
            style={{
              ...C.card,
              width: '100%', textAlign: 'left', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            }}
          >
            {/* ── Avatar — respects canChangePfp + onError fallback ─────── */}
            <Avatar
              player={p}
              size={48}
              className={getStreakAuraClass(str)}
              glowActive={!!p.hasBorderGlow}
              style={{ borderRadius: '50%', flexShrink: 0 }}
            />

            {/* ── Name + level badge ────────────────────────────────────── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Bangers',sans-serif", fontSize: 22,
                letterSpacing: '0.03em', lineHeight: 1.1,
                color: 'var(--text-1)', marginBottom: 5,
              }}>
                {p.name}
                {p.jerseyNum ? <span style={{ color: '#60a5fa' }}> #{p.jerseyNum}</span> : ''}
              </div>
              <LevelBadge li={li} />
            </div>

            {/* ── Stats ────────────────────────────────────────────────── */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {str > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  justifyContent: 'flex-end', marginBottom: 5,
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 13, fontWeight: 800, color: '#f97316',
                }}>
                  <Flame size={12} /> {str}d
                </div>
              )}
              <div style={{
                fontFamily: "'Bangers',sans-serif", fontSize: 20,
                color: '#f1f5f9', lineHeight: 1,
              }}>
                {weekShots.toLocaleString()}
              </div>
              <div className="stat-label" style={{ marginTop: 2 }}>
                THIS WK
              </div>
            </div>
          </button>
        )
      })}
    </Scaffold>
  )
}
