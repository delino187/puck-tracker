import { useState, useRef } from 'react'
import {
  Plus, Trash2, CheckCircle, X,
  Users, Lock, ChevronLeft, History, Eye, EyeOff,
  AlertCircle, Edit2, KeyRound, Trophy, Sun, Moon, MessageSquare, Mail,
} from 'lucide-react'
import CoachLeaderboard from './CoachLeaderboard.jsx'
import CoachFeedback    from './CoachFeedback.jsx'
import { getWeekStart, playerStats, calcXP, getLevel } from '../utils/stats.js'
import { getPSessions } from '../utils/badgeHelpers.js'
import { useTheme } from '../hooks/useTheme.js'
import { C } from '../styles.js'
import LevelBadge from './shared/LevelBadge.jsx'
import { deletePlayerData } from '../utils/firestoreSync.js'
import { useAppStore } from '../store/useAppStore.js'

// ─── Roster manager ───────────────────────────────────────────────────────────
function CoachRoster({ st, upd, onPuckCreditAdded, onPlayerLevelUp }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [editPw,   setEditPw]   = useState('')
  const [showPw,   setShowPw]   = useState({})
  const [savingPw, setSavingPw] = useState(false)
  const [msgDraft, setMsgDraft] = useState('')
  const [msgSaved, setMsgSaved] = useState(false)
  const [pendingDiamonds, setPendingDiamonds] = useState(0)
  const [diamondToast,    setDiamondToast]    = useState(null)
  const diamondToastTimer                      = useRef(null)
  const [puckInput,    setPuckInput]    = useState('')
  const [puckToast,    setPuckToast]    = useState(null)
  const puckToastTimer                  = useRef(null)

  const logTechniqueShots  = useAppStore(s => s.logTechniqueShots)
  const techniqueByPlayer  = useAppStore(s => s.techniqueByPlayer)

  if (selectedPlayer) {
    const p = st.players.find(x => x.id === selectedPlayer)
    if (!p) { setSelectedPlayer(null); return null }
    const pss = [...st.sessions.filter(s => s.playerId === p.id)].sort((a, b) => new Date(b.date) - new Date(a.date))

    return (
      <div>
        <button onClick={() => { setSelectedPlayer(null); setPendingDiamonds(0); setDiamondToast(null); setPuckInput(''); setPuckToast(null) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, marginBottom: 16 }}>
          <ChevronLeft size={16} /> Back to Roster
        </button>

        {/* Player card with password editor */}
        <div style={{ ...C.card, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 900, color: '#f1f5f9' }}>
                {p.name}{p.jerseyNum ? <span style={{ color: '#60a5fa' }}> #{p.jerseyNum}</span> : ''}
              </div>
              <LevelBadge li={getLevel(calcXP(getPSessions(p, st.sessions).flatMap(s => s.sets).length * 10, getPSessions(p, st.sessions).flatMap(s => s.sets).reduce((a, x) => a + x.hits, 0))).li} />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginTop: 12 }}>
            <div style={C.label}><KeyRound size={11} style={{ display: 'inline', marginRight: 4 }} />Player Password</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showPw[p.id] ? 'text' : 'password'}
                  value={editPw}
                  onChange={e => setEditPw(e.target.value)}
                  placeholder={p.password ? 'Change password…' : 'Set a password…'}
                  style={{ ...C.inp, marginBottom: 0, paddingRight: 36 }}
                />
                <button onClick={() => setShowPw(s => ({ ...s, [p.id]: !s[p.id] }))} style={{ position: 'absolute', right: 10, top: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showPw[p.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={() => { upd({ players: st.players.map(x => x.id === p.id ? { ...x, password: editPw.trim() } : x) }); setSavingPw(true); setTimeout(() => setSavingPw(false), 1500) }}
                style={{ background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1e3a5f', borderRadius: 8, padding: '9px 14px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {savingPw ? <><CheckCircle size={12} />Saved</> : <><Edit2 size={12} />Save</>}
              </button>
            </div>
            {p.password && (
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={10} /> Current: {showPw[p.id] ? p.password : '••••••••'}
              </div>
            )}
          </div>
        </div>

        {/* Coach message composer */}
        <div style={{ ...C.card, marginBottom: 12, borderColor: '#f59e0b33' }}>
          <div style={C.label}><AlertCircle size={11} style={{ display: 'inline', marginRight: 4 }} />Message to Player</div>
          {p.coachMsg && (
            <div style={{ background: '#1a1200', border: '1px solid #f59e0b55', borderRadius: 8, padding: '8px 10px', marginBottom: 8, color: '#fde68a', fontSize: 13, fontFamily: 'Barlow' }}>
              Pending: "{p.coachMsg}"
            </div>
          )}
          <textarea
            value={msgDraft}
            onChange={e => { setMsgDraft(e.target.value); setMsgSaved(false) }}
            placeholder="e.g. Great work this week — focus on Bar Down today!"
            rows={3}
            style={{ ...C.inp, resize: 'vertical', fontFamily: 'Barlow' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { if (!msgDraft.trim()) return; upd({ players: st.players.map(x => x.id === p.id ? { ...x, coachMsg: msgDraft.trim() } : x) }); setMsgSaved(true); setMsgDraft('') }}
              style={{ flex: 1, background: msgSaved ? '#064e3b' : '#f59e0b', color: msgSaved ? '#6ee7b7' : '#000', border: 'none', borderRadius: 8, padding: '10px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {msgSaved ? <><CheckCircle size={13} />Sent!</> : <>Send Message</>}
            </button>
            {p.coachMsg && (
              <button
                onClick={() => { upd({ players: st.players.map(x => x.id === p.id ? { ...x, coachMsg: '' } : x) }); setMsgSaved(false) }}
                style={{ background: 'transparent', color: '#f87171', border: '1px solid #475569', borderRadius: 8, padding: '10px 14px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Award Diamonds ──────────────────────────────────────────────── */}
        <div style={{ ...C.card, marginBottom: 12, borderColor: '#fbbf2444', background: 'linear-gradient(135deg,#0d0a00,#1a1400)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>💎</span>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.14em' }}>
              AWARD DIAMONDS
            </div>
            <div style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#94a3b8' }}>
              Current balance: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{p.diamonds || 0} 💎</span>
            </div>
          </div>

          {/* +5 / -5 stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button
              onClick={() => setPendingDiamonds(n => Math.max(-(p.diamonds || 0), n - 5))}
              style={{
                width: 44, height: 44, borderRadius: 10, border: '1.5px solid #ef444455',
                background: '#1a0404', color: '#f87171', fontSize: 18, fontWeight: 800,
                cursor: 'pointer', flexShrink: 0,
              }}
            >−5</button>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 34, letterSpacing: '0.04em', lineHeight: 1, color: pendingDiamonds === 0 ? '#334155' : pendingDiamonds > 0 ? '#fbbf24' : '#f87171', textShadow: pendingDiamonds !== 0 ? '0 0 14px #fbbf2466' : 'none' }}>
                {pendingDiamonds > 0 ? `+${pendingDiamonds}` : pendingDiamonds}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#475569', letterSpacing: '0.12em' }}>
                PENDING
              </div>
            </div>

            <button
              onClick={() => setPendingDiamonds(n => n + 5)}
              style={{
                width: 44, height: 44, borderRadius: 10, border: '1.5px solid #fbbf2455',
                background: '#1a1000', color: '#fbbf24', fontSize: 18, fontWeight: 800,
                cursor: 'pointer', flexShrink: 0,
              }}
            >+5</button>
          </div>

          {/* Confirm button */}
          <button
            disabled={pendingDiamonds === 0}
            onClick={() => {
              if (pendingDiamonds === 0) return
              const newTotal = Math.max(0, (p.diamonds || 0) + pendingDiamonds)
              upd({ players: st.players.map(x => x.id === p.id ? { ...x, diamonds: newTotal } : x) })

              const label = p.jerseyNum ? `#${p.jerseyNum}` : p.name
              const sign  = pendingDiamonds > 0 ? '+' : ''
              clearTimeout(diamondToastTimer.current)
              setDiamondToast(`🔥 ${sign}${pendingDiamonds} Diamonds awarded to ${label}!`)
              diamondToastTimer.current = setTimeout(() => setDiamondToast(null), 4000)
              setPendingDiamonds(0)
            }}
            style={{
              width: '100%', padding: '11px',
              background: pendingDiamonds === 0 ? '#111827' : 'linear-gradient(135deg,#78350f,#fbbf24)',
              color: pendingDiamonds === 0 ? '#334155' : '#000',
              border: 'none', borderRadius: 10,
              fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.08em',
              cursor: pendingDiamonds === 0 ? 'not-allowed' : 'pointer',
              boxShadow: pendingDiamonds !== 0 ? '0 0 18px #fbbf2444' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {pendingDiamonds === 0 ? 'TAP +5 OR −5 TO SET AMOUNT' : `✅ CONFIRM ${pendingDiamonds > 0 ? '+' : ''}${pendingDiamonds} DIAMONDS`}
          </button>

          {/* Toast */}
          {diamondToast && (
            <div style={{
              marginTop: 10, padding: '8px 12px',
              background: '#052e16', border: '1px solid #22c55e55',
              borderRadius: 8, textAlign: 'center',
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700,
              color: '#4ade80', letterSpacing: '0.06em',
            }}>
              {diamondToast}
            </div>
          )}
        </div>

        {/* ── Adjust Lifetime Pucks ────────────────────────────────────────── */}
        <div style={{ ...C.card, marginBottom: 12, borderColor: '#22d3ee33', background: 'linear-gradient(135deg,#020d10,#041a20)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>🏒</span>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#22d3ee', letterSpacing: '0.14em' }}>
              ADJUST LIFETIME PUCKS
            </div>
            <div style={{ marginLeft: 'auto', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#94a3b8' }}>
              Current total: <span style={{ color: '#22d3ee', fontWeight: 700 }}>
                {((playerStats(p, st.sessions).totalShots ?? 0) + (techniqueByPlayer[p.id]?.totalPucks || 0)).toLocaleString()} 🏒
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input
              type="number"
              min="1"
              value={puckInput}
              onChange={e => setPuckInput(e.target.value)}
              placeholder="e.g. 500"
              style={{
                ...C.inp,
                marginBottom: 0, flex: 1,
                fontFamily: "'Bangers',sans-serif", fontSize: 22,
                letterSpacing: '0.04em', color: '#22d3ee',
                textAlign: 'center',
              }}
            />
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
              pucks to add
            </div>
          </div>

          <button
            disabled={!puckInput || parseInt(puckInput) <= 0}
            onClick={() => {
              const amount = parseInt(puckInput)
              if (!amount || amount <= 0) return

              // XP is 1:1 per puck (matches logTechniqueShots bonusXP rate)
              const xpEarned    = amount
              const prevBonusXP = techniqueByPlayer[p.id]?.bonusXP || 0
              const prevTotalXP = playerStats(p, st.sessions).xp + prevBonusXP
              const prevLi      = getLevel(prevTotalXP).li
              const { li: newLi, level: newLevel } = getLevel(prevTotalXP + xpEarned)

              logTechniqueShots(p.id, amount)

              if (newLi > prevLi) {
                onPlayerLevelUp?.(p.id, newLevel)
              }

              // Check rookie quest threshold
              const prevTotal = (playerStats(p, st.sessions).totalShots ?? 0) + (techniqueByPlayer[p.id]?.totalPucks || 0)
              if (prevTotal < 100 && (prevTotal + amount) >= 100) {
                onPuckCreditAdded?.(p.id)
              }

              const label = p.jerseyNum ? `${p.name} #${p.jerseyNum}` : p.name
              clearTimeout(puckToastTimer.current)
              setPuckToast(`🏒 +${amount.toLocaleString()} pucks and +${xpEarned.toLocaleString()} XP added to ${label}'s lifetime total! ⚡`)
              puckToastTimer.current = setTimeout(() => setPuckToast(null), 4000)
              setPuckInput('')
            }}
            style={{
              width: '100%', padding: '11px',
              background: (!puckInput || parseInt(puckInput) <= 0)
                ? '#0a1a20'
                : 'linear-gradient(135deg,#0c4a6e,#22d3ee)',
              color: (!puckInput || parseInt(puckInput) <= 0) ? '#334155' : '#000',
              border: 'none', borderRadius: 10,
              fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.08em',
              cursor: (!puckInput || parseInt(puckInput) <= 0) ? 'not-allowed' : 'pointer',
              boxShadow: (!puckInput || parseInt(puckInput) <= 0) ? 'none' : '0 0 18px #22d3ee44',
              transition: 'all 0.2s',
            }}
          >
            {!puckInput || parseInt(puckInput) <= 0 ? 'ENTER AMOUNT ABOVE' : `✅ SAVE SHOT CREDIT (+${parseInt(puckInput).toLocaleString()})`}
          </button>

          {puckToast && (
            <div style={{
              marginTop: 10, padding: '8px 12px',
              background: '#042a30', border: '1px solid #22d3ee55',
              borderRadius: 8, textAlign: 'center',
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700,
              color: '#67e8f9', letterSpacing: '0.06em',
            }}>
              {puckToast}
            </div>
          )}
        </div>

        {/* Session history */}
        <div style={C.label}><History size={11} style={{ display: 'inline', marginRight: 4 }} />Session History ({pss.length})</div>
        {pss.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 24, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14 }}>No sessions yet</div>
        ) : pss.map(s => {
          const shots = s.sets.length * 10
          const hits  = s.sets.reduce((a, x) => a + x.hits, 0)
          const acc   = shots > 0 ? hits / shots * 100 : 0
          return (
            <div key={s.id} style={{ background: '#0a0f1a', borderRadius: 10, padding: '12px 14px', marginBottom: 8, border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#94a3b8' }}>
                    {new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>
                    {new Date(s.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, textAlign: 'center' }}>
                  {[{ v: shots, l: 'shots', c: '#60a5fa' }, { v: hits, l: 'hits', c: '#34d399' }, { v: acc.toFixed(0) + '%', l: 'acc', c: '#fbbf24' }].map(({ v, l, c }) => (
                    <div key={l}>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
                      <div style={{ color: '#94a3b8', fontSize: 9 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Roster list
  return (
    <div>
      {st.players.length === 0 ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 32, fontFamily: "'Barlow Condensed',sans-serif" }}>No players yet</div>
      ) : [...st.players].map(p => {
        const stats = playerStats(p, st.sessions)
        const hasPw = !!p.password
        return (
          <div key={p.id} style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', marginBottom: 8, border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              {/* Player info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>
                    {p.name}{p.jerseyNum ? <span style={{ color: '#60a5fa' }}> #{p.jerseyNum}</span> : ''}
                  </span>
                  <LevelBadge li={stats.li} />
                  {p.role === 'player' && (
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, fontWeight: 800, color: '#34d399', background: '#052e16', border: '1px solid #166534', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.1em' }}>
                      SELF-REG
                    </span>
                  )}
                </div>

                {/* Email */}
                {p.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#94a3b8' }}>
                    <Mail size={10} /> {p.email}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#cbd5e1' }}>
                    {stats.totalShots} shots · {stats.totalShots > 0 ? stats.acc.toFixed(0) : 0}%
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: hasPw ? '#34d399' : '#94a3b8', fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif" }}>
                    <Lock size={10} /> {hasPw ? `PW: ${p.password}` : 'No password'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button
                  style={{ background: '#1e3a5f', color: '#60a5fa', border: 'none', borderRadius: 6, padding: '6px 10px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  onClick={() => { setSelectedPlayer(p.id); setEditPw(''); setMsgDraft(''); setMsgSaved(false) }}
                >
                  <History size={11} /> View
                </button>
                <button
                  style={{ background: '#1a0606', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 6, padding: '6px 10px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
                  onClick={async () => {
                    if (!confirm(`Permanently delete ${p.name} and all their data? This cannot be undone.`)) return
                    upd({
                      players:  st.players.filter(x => x.id !== p.id),
                      sessions: st.sessions.filter(s => s.playerId !== p.id),
                    })
                    await deletePlayerData(p.id)
                  }}
                >
                  <Trash2 size={10} /> DELETE 🗑️
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Coach Panel ─────────────────────────────────────────────────────────
export default function CoachPortal({ st, upd, onPuckCreditAdded, onPlayerLevelUp }) {
  const [cTab, setCTab] = useState('roster')
  const { isOutside, toggleOutsideMode } = useTheme()
  const tabs = [
    { id: 'roster',      label: 'Roster',   Icon: Users          },
    { id: 'leaderboard', label: 'Leaders',  Icon: Trophy         },
    { id: 'feedback',    label: 'Feedback', Icon: MessageSquare  },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0a0f1a,#0a1628)', color: '#e2e8f0', fontFamily: 'Barlow,sans-serif' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 40 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 0' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 24, color: '#f1f5f9' }}>COACH PANEL</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              style={{ background: '#1e3a5f', color: '#60a5fa', border: 'none', borderRadius: 8, padding: '7px 12px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => upd({ view: 'addPlayer' })}
            >
              <Plus size={13} /> Add Player
            </button>
            <button
              style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '7px 12px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => upd({ view: 'home' })}
            >
              <Lock size={13} /> Lock
            </button>
            <button
              onClick={toggleOutsideMode}
              title={isOutside ? 'Switch to Dark Mode' : 'Switch to Outside Mode'}
              style={{
                background: isOutside ? '#0f172a' : '#1e3a5f',
                border: isOutside ? 'none' : '1px solid #3b82f633',
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '5px 7px', gap: 1,
                color: isOutside ? '#ffffff' : '#60a5fa',
              }}
            >
              {isOutside ? <Moon size={13} strokeWidth={2} /> : <Sun size={13} strokeWidth={2} />}
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 7, fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1 }}>
                {isOutside ? 'DARK' : 'OUTSIDE'}
              </span>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e3a5f', margin: '14px 0 0' }}>
          {tabs.map(t => {
            const sel = cTab === t.id
            return (
              <button key={t.id} onClick={() => setCTab(t.id)} style={{ flex: 1, padding: '10px 4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: `2px solid ${sel ? '#3b82f6' : 'transparent'}`, color: sel ? '#3b82f6' : '#94a3b8', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: sel ? 700 : 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <t.Icon size={15} /> {t.label}
              </button>
            )
          })}
        </div>

        <div style={{ padding: 16 }}>
          {cTab === 'roster'      && <CoachRoster       st={st} upd={upd} onPuckCreditAdded={onPuckCreditAdded} onPlayerLevelUp={onPlayerLevelUp} />}
          {cTab === 'leaderboard' && <CoachLeaderboard  st={st} />}
          {cTab === 'feedback'    && <CoachFeedback />}
        </div>
      </div>
    </div>
  )
}
