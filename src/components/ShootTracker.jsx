import { useRef, useEffect, useState } from 'react'

const ENCOURAGE_MSGS = [
  "Keep your head up when you shoot! 🏒",
  "Stick with it!",
  "Everyone sells sometimes, but winners keep at it 💪",
  "Keep your head up and try another set",
  "Don't look down at the puck. Lock in on your target!",
]
import { Target, CheckCircle, Zap, ChevronLeft } from 'lucide-react'
import { ZONES } from '../constants/zones.js'
import { C } from '../styles.js'
import StatCard          from './shared/StatCard.jsx'
import ZoneSetRow        from './shared/ZoneSetRow.jsx'
import NetSVG            from './net/NetSVG.jsx'
import TechniqueTracker  from './TechniqueTracker.jsx'
import { syncQueue }     from '../services/syncQueue.js'

export default function ShootTracker({
  player, session, sesGoal, setSesGoal,
  onLogSet, onLogAll, onEndSession, onStart,
  dailyChallenge, weeklyChallenge,
  flashZone, flashType, puckAnim,
}) {
  // null = mode fork  |  'target' = zone tracker  |  'technique' = technique mode
  const [subMode,    setSubMode]    = useState(null)
  // Lifted zone input state: { [zoneId]: '' | string-number }
  const [zoneInputs, setZoneInputs] = useState({})

  // Reset to the fork whenever a session ends so the choice re-presents
  useEffect(() => {
    if (!session) {
      setSubMode(null)
      setZoneInputs({})
    }
  }, [!session]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Net-shake ref: restart CSS animation on every new puckAnim ─────────────
  const netRef = useRef(null)
  useEffect(() => {
    if (!puckAnim || !netRef.current) return
    const el = netRef.current
    el.classList.remove('net-shake', 'net-shake-fire')
    void el.offsetWidth
    el.classList.add(puckAnim.type === 'fire' ? 'net-shake-fire' : 'net-shake')
  }, [puckAnim?.ts])

  if (!session) {
    // ── Mode fork ──────────────────────────────────────────────────────────────
    if (subMode === null) {
      return (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.18em', marginBottom: 16, textAlign: 'center' }}>
            CHOOSE YOUR MODE
          </div>

          {/* 🎯 Target Practice */}
          <button
            onClick={() => setSubMode('target')}
            style={{
              width: '100%', textAlign: 'left', display: 'block',
              background: 'var(--card-bg)', border: '2px solid #3b82f644',
              borderRadius: 18, padding: 0, cursor: 'pointer', overflow: 'hidden',
              marginBottom: 12, boxShadow: '0 4px 24px #3b82f610',
            }}
          >
            <div style={{ height: 4, background: 'linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa)' }} />
            <div style={{ padding: '20px 20px 18px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>
                🎯 Target Practice
              </div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Log sets by zone, track accuracy, and earn XP on every hit.
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['7 Zones', 'Accuracy Tracked', '+5 XP/set'].map(tag => (
                  <div key={tag} style={{ background: '#0c1a2e', border: '1px solid #1e3a5f', borderRadius: 6, padding: '3px 9px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: '#60a5fa', letterSpacing: '0.08em' }}>
                    {tag}
                  </div>
                ))}
              </div>
            </div>
          </button>

          {/* 🏒 Technique Only */}
          <button
            onClick={() => setSubMode('technique')}
            style={{
              width: '100%', textAlign: 'left', display: 'block',
              background: 'var(--card-bg)', border: '2px solid #10b98144',
              borderRadius: 18, padding: 0, cursor: 'pointer', overflow: 'hidden',
              boxShadow: '0 4px 24px #10b98110',
            }}
          >
            <div style={{ height: 4, background: 'linear-gradient(90deg,#059669,#10b981,#34d399)' }} />
            <div style={{ padding: '20px 20px 18px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>
                🏒 Technique Only
              </div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Pure volume. No net, no zones. Just rapid-log your puck count and earn bonus XP.
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['No Net', 'No Accuracy', '+1 XP/puck'].map(tag => (
                  <div key={tag} style={{ background: '#052e16', border: '1px solid #10b98133', borderRadius: 6, padding: '3px 9px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: '#34d399', letterSpacing: '0.08em' }}>
                    {tag}
                  </div>
                ))}
              </div>
            </div>
          </button>
        </div>
      )
    }

    // ── Technique mode ─────────────────────────────────────────────────────────
    if (subMode === 'technique') {
      return <TechniqueTracker player={player} onBack={() => setSubMode(null)} />
    }

    // ── Target Practice: session goal config ───────────────────────────────────
    return (
      <div style={{ padding: '20px 16px', textAlign: 'center' }}>
        <button
          onClick={() => setSubMode(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 0 14px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13 }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <Target size={38} color="#3b82f6" style={{ marginBottom: 10 }} />
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, marginBottom: 18, color: 'var(--text-1)' }}>
          Start a Session
        </div>
        <div style={{ ...C.card, textAlign: 'left', marginBottom: 18 }}>
          <div style={C.label}>Session Goal (sets of 10)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
            {[5, 10, 15, 20].map(n => {
              const gold = n === 20 && sesGoal === 20
              const sel  = sesGoal === n
              return (
                <button
                  key={n}
                  onClick={() => setSesGoal(n)}
                  style={{
                    background:  gold ? 'rgba(120,53,15,0.25)' : sel ? '#1e3a5f' : 'var(--card-bg)',
                    color:       gold ? '#fbbf24'              : sel ? '#60a5fa' : 'var(--text-1)',
                    border:      gold ? '2px solid #f59e0b'    : sel ? '2px solid #3b82f6' : 'var(--card-border)',
                    boxShadow:   gold ? '0 0 14px #f59e0b33'  : 'none',
                    borderRadius: 8, padding: '9px 4px',
                    fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  {n}<br />
                  <span style={{ fontSize: 10, fontWeight: 400, color: gold ? '#d97706' : 'var(--text-muted)' }}>
                    {n * 10} shots
                  </span>
                </button>
              )
            })}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center', fontFamily: "'Barlow Condensed',sans-serif" }}>
            +5 XP per set of 10 shots
          </div>
        </div>
        <button style={C.btnP} onClick={onStart}>
          <Target size={16} /> Let's Go!
        </button>
      </div>
    )
  }

  const sLeft  = Math.max(0, sesGoal - session.sets.length)
  const sHits  = session.sets.reduce((a, s) => a + s.hits, 0)
  const sShots = session.sets.length * 10
  const sAcc   = sShots > 0 ? (sHits / sShots * 100).toFixed(0) : '—'

  // How many zones have a value selected (for "Log All" button)
  const filledZones = ZONES.filter(z => zoneInputs[z.id] !== '' && zoneInputs[z.id] !== undefined)
  const filledCount = filledZones.length

  function handleLogAllClick() {
    if (!filledCount) return
    if (!navigator.onLine) {
      filledZones.forEach(z => {
        syncQueue.enqueue('LOG_SET_WORKOUT', {
          sessionId: session?.id,
          playerId:  player?.id,
          zoneId:    z.id,
          hits:      parseInt(zoneInputs[z.id]),
        })
      })
      alert(`❄️ ${filledCount} zones saved offline! Your workout will sync automatically once you reach Wi-Fi.`)
    }
    const batch = {}
    filledZones.forEach(z => { batch[z.id] = parseInt(zoneInputs[z.id]) })
    onLogAll(batch)
    setZoneInputs({})
  }

  return (
    <div style={{ padding: '12px 16px 80px', position: 'relative' }}>

      {/* ── Puck result toast ────────────────────────────────────────────── */}
      {puckAnim && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 500, pointerEvents: 'none', textAlign: 'center',
          background: 'rgba(10,15,26,0.93)', borderRadius: 12, padding: '10px 20px', border: '1px solid #334155',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 42, fontWeight: 900,
            color: puckAnim.type === 'ice' ? '#60a5fa' : puckAnim.type === 'fire' ? '#f97316' : '#22c55e',
          }}>
            {puckAnim.hits}/10
          </div>
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 180 }}>
            {Array.from({ length: puckAnim.hits }).map((_, i) => <span key={i} style={{ fontSize: 16 }}>🏒</span>)}
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: puckAnim.type === 'ice' ? 12 : 14,
            fontWeight: 700,
            color: puckAnim.type === 'ice' ? '#fbbf24' : puckAnim.type === 'fire' ? '#f97316' : '#22c55e',
            maxWidth: 220, lineHeight: 1.35,
          }}>
            {puckAnim.type === 'fire'
              ? 'ON FIRE 🔥'
              : puckAnim.type === 'ice'
                ? ENCOURAGE_MSGS[puckAnim.ts % ENCOURAGE_MSGS.length]
                : 'NICE ✅'}
          </div>
        </div>
      )}

      {/* ── Session stats strip ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
        <StatCard label="Sets Left" value={sLeft}                          color="#fbbf24" />
        <StatCard label="Shots"     value={sShots}                         color="#60a5fa" />
        <StatCard label="Hits"      value={sHits}                          color="#34d399" />
        <StatCard label="Acc"       value={sShots > 0 ? sAcc + '%' : '—'} color="#c084fc" />
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase' }}>Progress</span>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#6b7280' }}>{session.sets.length}/{sesGoal}</span>
        </div>
        <div style={{ height: 5, background: '#0a0f1a', borderRadius: 3, overflow: 'hidden', border: '1px solid #1e3a5f' }}>
          <div style={{ height: '100%', width: `${Math.min(100, session.sets.length / sesGoal * 100)}%`, background: 'linear-gradient(90deg,#3b82f6,#22c55e)', borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* ── Zone logging grid + Log All ──────────────────────────────────── */}
      <div style={{ ...C.card, marginBottom: 10 }}>
        <div style={{ ...C.label, display: 'flex', justifyContent: 'space-between' }}>
          <span>Log a Set of 10</span>
          <span style={{ color: '#f59e0b' }}>+5 XP/set</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ZONES.map(z => {
            const pr = session.sets.filter(s => s.zone === z.id)
            return (
              <ZoneSetRow
                key={z.id} zone={z}
                prevHits={pr.reduce((a, s) => a + s.hits, 0)}
                prevShots={pr.length * 10}
                value={zoneInputs[z.id] ?? ''}
                onChange={v => setZoneInputs(prev => ({ ...prev, [z.id]: v }))}
                onLog={h => {
                  if (!navigator.onLine) {
                    syncQueue.enqueue('LOG_SET_WORKOUT', {
                      sessionId: session?.id,
                      playerId:  player?.id,
                      zoneId:    z.id,
                      hits:      h,
                    })
                    alert('❄️ Saved offline! Your workout will sync automatically once you reach Wi-Fi.')
                  }
                  onLogSet(z.id, h)
                }}
              />
            )
          })}
        </div>

        {/* ── Log All button ─────────────────────────────────────────────── */}
        <button
          onClick={handleLogAllClick}
          disabled={filledCount === 0}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '13px 0',
            borderRadius: 10,
            border: 'none',
            cursor: filledCount > 0 ? 'pointer' : 'default',
            fontFamily: "'Barlow Condensed',sans-serif",
            fontWeight: 900,
            fontSize: 15,
            letterSpacing: '0.06em',
            background: filledCount > 0
              ? 'linear-gradient(90deg,#1d4ed8,#2563eb,#3b82f6)'
              : '#0f172a',
            color: filledCount > 0 ? '#fff' : '#334155',
            boxShadow: filledCount > 0 ? '0 0 18px #3b82f633' : 'none',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
        >
          {filledCount > 0
            ? `⚡ Log All ${filledCount} ${filledCount === 1 ? 'Zone' : 'Zones'}`
            : 'Fill zones above, then Log All'}
        </button>
      </div>

      {/* ── Net SVG with shake wrapper ───────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '68%', marginBottom: 10 }}>
        <div
          ref={netRef}
          style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,26,0.85)', borderRadius: 12, border: '1px solid #1e3a5f', overflow: 'hidden' }}
        >
          <NetSVG flashZone={flashZone} flashType={flashType} puckAnim={puckAnim} />
        </div>
      </div>

      {/* ── Active challenge bars ─────────────────────────────────────────── */}
      {[
        dailyChallenge  && { ch: dailyChallenge,  label: 'Daily',  xp: 50  },
        weeklyChallenge && { ch: weeklyChallenge, label: 'Weekly', xp: 100 },
      ].filter(Boolean).map(({ ch, label, xp }) => {
        const hits   = session.sets.filter(s => s.zone === ch.zone).reduce((a, s) => a + s.hits, 0)
        const target = parseInt(ch.target) || 5
        return (
          <div key={label} style={{ ...C.card, borderColor: '#f59e0b44' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Zap size={11} color="#f59e0b" />
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
                  {label}: {ZONES.find(z => z.id === ch.zone)?.label}
                </span>
              </div>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: hits >= target ? '#34d399' : '#f59e0b' }}>
                {hits}/{target}{hits >= target ? ' ✅' : ''}
              </span>
            </div>
            <div style={{ height: 4, background: '#0a0f1a', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, hits / target * 100)}%`, background: hits >= target ? '#22c55e' : '#f59e0b', borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
          </div>
        )
      })}

      {/* ── Recent sets ──────────────────────────────────────────────────── */}
      {session.sets.length > 0 && (
        <div style={C.card}>
          <div style={C.label}>Recent Sets</div>
          {[...session.sets].reverse().slice(0, 4).map((s, i) => {
            const z = ZONES.find(x => x.id === s.zone)
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: i < 3 ? '1px solid #1e3a5f' : 'none' }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", color: 'var(--text-1)', fontSize: 13 }}>{z?.label ?? s.zone}</span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: s.hits === 0 ? '#60a5fa' : s.hits >= 5 ? '#f97316' : '#22c55e' }}>
                  {s.hits}/10 <span style={{ fontSize: 10, color: '#94a3b8' }}>{(s.hits / 10 * 100).toFixed(0)}%</span>
                </span>
              </div>
            )
          })}
        </div>
      )}

      <button style={{ ...C.btnS, borderColor: '#22c55e', color: '#22c55e' }} onClick={onEndSession}>
        <CheckCircle size={15} /> End Session
      </button>
    </div>
  )
}
