import { useRef, useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext.jsx'

const ENCOURAGE_MSGS = [
  "Keep your head up when you shoot! 🏒",
  "Stick with it!",
  "Everyone sells sometimes, but winners keep at it 💪",
  "Keep your head up and try another set",
  "Don't look down at the puck. Lock in on your target!",
]
import { Target, CheckCircle, ChevronLeft } from 'lucide-react'
import { ZONES } from '../constants/zones.js'
import { C } from '../styles.js'
import StatCard          from './shared/StatCard.jsx'
import ZoneSetRow        from './shared/ZoneSetRow.jsx'
import NetSVG            from './net/NetSVG.jsx'
import TechniqueTracker  from './TechniqueTracker.jsx'
import AroundTheWorld    from './AroundTheWorld.jsx'
import PuckGame          from './screens/PuckGame.jsx'
import { syncQueue }     from '../services/syncQueue.js'
import PageHelpButton    from './shared/PageHelpButton.jsx'

export default function ShootTracker({
  session, sesGoal, setSesGoal,
  onLogSet, onLogAll, onEndSession, onStart,
  flashZone, flashType, puckAnim,
  puckGames = [], onSubmitGame, onPuckGameUpdate,
  onConcedeGame, onPuckEloUpdate,
  deepLinkPuckGameId = null,
  setPendingRoundOutcome,
  isSaving = false, weakConnToast = false,
  onGoalReached,
}) {
  const { activePlayer: player, st } = usePlayer()
  const sessions = st.sessions
  const players  = st.players
  // null = mode fork  |  'target' = zone tracker  |  'technique' = technique mode
  const [subMode,    setSubMode]    = useState(null)
  const [activeGame, setActiveGame] = useState(null)  // null | 'puck' | 'atw'
  // Lifted zone input state: { [zoneId]: '' | string-number }
  const [zoneInputs,   setZoneInputs]   = useState({})
  const [selectedZone, setSelectedZone] = useState(ZONES[0].id)

  // Reset to the fork whenever a session ends so the choice re-presents
  useEffect(() => {
    if (!session) {
      setSubMode(null)
      setZoneInputs({})
    }
  }, [!session]) // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link from Dashboard: when a specific PUCK game ID is passed, skip the
  // mode fork and jump straight into the P-U-C-K screen so the player lands
  // directly on their active turn without extra taps.
  // NOTE: do NOT call onDeepLinkConsumed here — that would clear the ID in the
  // same React render batch as setActiveGame, causing PuckGame to mount with
  // autoOpenGameId=null and the auto-select to silently no-op.  App.jsx clears
  // the ID via a tab-change useEffect instead, which fires after PuckGame has
  // already processed it.
  useEffect(() => {
    if (!deepLinkPuckGameId) return
    setActiveGame('puck')
  }, [deepLinkPuckGameId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Net-shake ref: restart CSS animation on every new puckAnim ─────────────
  const netRef = useRef(null)
  useEffect(() => {
    if (!puckAnim || !netRef.current) return
    const el = netRef.current
    el.classList.remove('net-shake', 'net-shake-fire')
    void el.offsetWidth
    el.classList.add(puckAnim.type === 'fire' ? 'net-shake-fire' : 'net-shake')
  }, [puckAnim?.ts])

  // ── Game routing — takes priority over session/mode state ─────────────────
  if (activeGame === 'atw') {
    return (
      <AroundTheWorld
        player={player}
        sessions={sessions}
        onSubmitGame={sets => { onSubmitGame?.(sets); setActiveGame(null) }}
        onBack={() => setActiveGame(null)}
      />
    )
  }

  if (activeGame === 'puck') {
    return (
      <PuckGame
        player={player}
        players={players}
        puckGames={puckGames}
        onBack={() => setActiveGame(null)}
        onUpdate={onPuckGameUpdate}
        onConcede={onConcedeGame}
        onEloUpdate={onPuckEloUpdate}
        autoOpenGameId={deepLinkPuckGameId}
        setPendingRoundOutcome={setPendingRoundOutcome}
      />
    )
  }

  const activePuckCount = puckGames.filter(g => g.status === 'active').length
  const urgentPuck      = puckGames.some(g => {
    if (g.status !== 'active') return false
    const r = g.currentRound
    if (!r) return false
    if (r.status === 'awaiting_setter'   && r.setterPlayerId === player.id) return true
    if (r.status === 'awaiting_defender' && g.setterPlayerId !== player.id) return true
    return false
  })

  if (!session) {
    // ── Mode fork ──────────────────────────────────────────────────────────────
    if (subMode === null) {
      return (
        <div style={{ padding: '24px 16px 80px' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.18em', marginBottom: 16, textAlign: 'center' }}>
            TRAINING MODES
          </div>

          {/* 🎯 Target Practice */}
          <button
            onClick={() => { setSubMode('target'); onStart?.() }}
            style={{
              width: '100%', textAlign: 'left', display: 'block',
              background: 'var(--card-bg)', border: '2px solid #3b82f644',
              borderRadius: 18, padding: 0, cursor: 'pointer', overflow: 'hidden',
              marginBottom: 12, boxShadow: '0 4px 24px #3b82f610',
            }}
          >
            <div style={{ height: 4, background: 'linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa)' }} />
            <div style={{ padding: '20px 20px 18px' }}>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 30, color: 'var(--text-1)', marginBottom: 6, letterSpacing: '0.03em' }}>
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
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 30, color: 'var(--text-1)', marginBottom: 6, letterSpacing: '0.03em' }}>
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

          {/* ── Training Games ─────────────────────────────────────────────────── */}
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.18em', marginTop: 28, marginBottom: 14, textAlign: 'center' }}>
            TRAINING GAMES
          </div>

          {/* P-U-C-K */}
          <button
            onClick={() => setActiveGame('puck')}
            style={{ width: '100%', textAlign: 'left', background: 'var(--card-bg)', border: urgentPuck ? '2px solid #ef444455' : '1px solid #ef444422', borderRadius: 16, padding: 0, cursor: 'pointer', overflow: 'hidden', boxShadow: urgentPuck ? '0 4px 28px #ef444422' : '0 4px 24px #ef444410', display: 'block', marginBottom: 10 }}
          >
            <div style={{ height: 4, background: 'linear-gradient(90deg,#7f1d1d,#ef4444,#f97316)' }} />
            <div style={{ padding: '18px 18px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#7f1d1d,#ef4444)', borderRadius: 6, padding: '3px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.12em' }}>
                      MULTIPLAYER
                    </div>
                    {activePuckCount > 0 && (
                      <div style={{ background: urgentPuck ? '#ef4444' : '#334155', color: '#fff', borderRadius: 10, padding: '1px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700 }}>
                        {activePuckCount} ACTIVE
                      </div>
                    )}
                  </div>
                  <div className="text-3d-red" style={{ fontFamily: "'Bangers',sans-serif", fontSize: 34, letterSpacing: '0.06em', lineHeight: 1.1 }}>P-U-C-K</div>
                </div>
                <ChevronRight size={20} color="#ef4444" style={{ marginTop: 18, flexShrink: 0 }} />
              </div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '10px 0 14px' }}>
                Hockey HORSE. Set a trick shot — if you make it, your opponent must match it or get a letter.
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                {['Turn-Based', 'Video Proof', 'Earn XP'].map(tag => (
                  <div key={tag} style={{ background: '#1a0608', border: '1px solid #ef444422', borderRadius: 6, padding: '3px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.06em' }}>{tag}</div>
                ))}
              </div>
            </div>
          </button>

          {/* Around the World */}
          <button
            onClick={() => setActiveGame('atw')}
            style={{ width: '100%', textAlign: 'left', background: 'var(--card-bg)', border: '1px solid #10b98133', borderRadius: 16, padding: 0, cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 24px #10b98118', display: 'block' }}
          >
            <div style={{ height: 4, background: 'linear-gradient(90deg,#059669,#34d399,#0ea5e9)' }} />
            <div style={{ padding: '18px 18px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#059669,#10b981)', borderRadius: 6, padding: '3px 8px', marginBottom: 6, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.12em' }}>
                    SINGLE PLAYER
                  </div>
                  <div className="text-3d-gold" style={{ fontFamily: "'Bangers',sans-serif", fontSize: 30, letterSpacing: '0.03em', lineHeight: 1.1 }}>Around the World</div>
                </div>
                <ChevronRight size={20} color="#10b981" style={{ marginTop: 18, flexShrink: 0 }} />
              </div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '10px 0 14px' }}>
                4 corners. 12 seconds per zone. Keep your gloves on until the end, then log your hits.
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#475569' }}>⏱ 48 sec total</span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#475569' }}>🎯 4 corners</span>
              </div>
            </div>
          </button>
        </div>
      )
    }

    // ── Technique mode ─────────────────────────────────────────────────────────
    if (subMode === 'technique') {
      return <TechniqueTracker player={player} onBack={() => setSubMode(null)} onGoalReached={onGoalReached} />
    }

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

      {/* ── Zone grid + single stepper ───────────────────────────────────── */}
      <div style={{ ...C.card, marginBottom: 10 }}>
        <div style={{ ...C.label, display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span>Select Zone · Set Hits · Log Session</span>
          <span style={{ color: '#f59e0b' }}>+5 XP/set</span>
        </div>

        {/* ── Visual net grid ───────────────────────────────────────────── */}
        {/* Layout mirrors a hockey net: TL–BD–TR / LP–·–RP / LG–·–LB */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
          {[
            'top_left', 'bar_down', 'top_right',
            'left_post', null,       'right_post',
            'low_glove', null,       'low_blocker',
          ].map((id, i) => {
            if (!id) return <div key={i} />
            const z    = ZONES.find(z => z.id === id)
            const hits = zoneInputs[id] !== undefined && zoneInputs[id] !== '' ? parseInt(zoneInputs[id]) : 0
            const prev = session.sets.filter(s => s.zone === id)
            const sel  = selectedZone === id
            const color = hits === 0 ? '#475569'
                        : hits >= 8 ? '#f97316'
                        : hits >= 5 ? '#22c55e'
                        : '#60a5fa'
            return (
              <button
                key={id}
                onClick={() => setSelectedZone(id)}
                style={{
                  background: sel
                    ? 'linear-gradient(135deg,#1d3a6e,#1e40af)'
                    : hits > 0
                      ? 'linear-gradient(135deg,#0a1a10,#0c2010)'
                      : '#0a0f1a',
                  border: sel
                    ? '2px solid #3b82f6'
                    : hits > 0
                      ? `2px solid ${color}55`
                      : '2px solid #1e293b',
                  borderRadius: 10,
                  padding: '10px 4px',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  boxShadow: sel ? '0 0 14px #3b82f655' : hits > 0 ? `0 0 8px ${color}22` : 'none',
                  transition: 'all 0.12s',
                  minHeight: 60,
                  userSelect: 'none',
                }}
              >
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: sel ? '#ffffff' : '#c0cfe0', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1, textAlign: 'center', padding: '0 2px' }}>
                  {z.label}
                </div>
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 24, color: sel ? '#ffffff' : hits > 0 ? color : '#94a3b8', lineHeight: 1, letterSpacing: '0.03em' }}>
                  {hits}<span style={{ fontSize: 13, color: sel ? '#bfdbfe' : '#64748b' }}>/10</span>
                </div>
                {prev.length > 0 && (
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: sel ? '#93c5fd' : '#64748b', lineHeight: 1 }}>
                    {prev.reduce((a,s)=>a+s.hits,0)}↑ session
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Single stepper for selected zone ──────────────────────────── */}
        {(() => {
          const z           = ZONES.find(z => z.id === selectedZone)
          const isExplicit  = zoneInputs[selectedZone] !== undefined && zoneInputs[selectedZone] !== ''
          const current     = isExplicit ? parseInt(zoneInputs[selectedZone]) : 0
          const setVal      = v => setZoneInputs(prev => ({ ...prev, [selectedZone]: String(v) }))
          const color   = current === 0 ? '#334155'
                        : current >= 8  ? '#f97316'
                        : current >= 5  ? '#22c55e'
                        :                  '#60a5fa'
          const btnStyle = {
            width: 56, height: 56, flexShrink: 0,
            borderRadius: 12, border: 'none', cursor: 'pointer',
            fontFamily: "'Bangers',sans-serif", fontSize: 30, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            userSelect: 'none', WebkitUserSelect: 'none',
          }
          return (
            <div style={{ background: '#060b14', borderRadius: 12, padding: '12px 10px', border: '1.5px solid #1e3a5f', marginBottom: 12 }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#3b82f6', letterSpacing: '0.16em', textAlign: 'center', marginBottom: 10 }}>
                ▶ {z?.label?.toUpperCase()} — TAP +/- TO SET HITS
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => {
                    if (current > 0) { setVal(current - 1) }
                    else if (!isExplicit) { setVal(0) }  // first tap locks zone at 0/10 explicitly
                  }}
                  disabled={isExplicit && current <= 0}
                  style={{ ...btnStyle, background: (current > 0 || !isExplicit) ? 'linear-gradient(135deg,#1e0a0a,#3d0808)' : '#0a0f1a', color: (current > 0 || !isExplicit) ? '#f87171' : '#1e293b', boxShadow: (current > 0 || !isExplicit) ? '0 0 10px #ef444422' : 'none' }}
                  onTouchStart={e => { if (current > 0 || !isExplicit) e.currentTarget.style.transform='scale(0.9)' }}
                  onTouchEnd={e  => { e.currentTarget.style.transform='scale(1)' }}
                >−</button>

                <div style={{ flex: 1, textAlign: 'center', fontFamily: "'Bangers',sans-serif", fontSize: 52, lineHeight: 1, letterSpacing: '0.04em', color, textShadow: current > 0 ? `0 0 18px ${color}66` : 'none', transition: 'color 0.1s' }}>
                  {current}
                  <span style={{ fontSize: 18, color: '#475569', marginLeft: 3 }}>/10</span>
                </div>

                <button
                  onClick={() => { if (current < 10) setVal(current + 1) }}
                  disabled={current >= 10}
                  style={{ ...btnStyle, background: current < 10 ? 'linear-gradient(135deg,#0c2a4a,#1d4ed8)' : '#0a0f1a', color: current < 10 ? '#93c5fd' : '#1e293b', boxShadow: current < 10 ? '0 0 10px #3b82f633' : 'none' }}
                  onTouchStart={e => { if (current < 10) e.currentTarget.style.transform='scale(0.9)' }}
                  onTouchEnd={e  => { e.currentTarget.style.transform='scale(1)' }}
                >+</button>
              </div>
            </div>
          )
        })()}

        {/* ── Log Practice Session button ────────────────────────────────── */}
        <button
          onClick={handleLogAllClick}
          disabled={filledCount === 0}
          style={{
            width: '100%', padding: '15px 0',
            borderRadius: 10, border: 'none',
            cursor: filledCount > 0 ? 'pointer' : 'default',
            fontFamily: "'Bangers',sans-serif", fontSize: 22,
            letterSpacing: '0.1em',
            background: filledCount > 0
              ? 'linear-gradient(90deg,#1d4ed8,#3b82f6)'
              : '#0f172a',
            color: filledCount > 0 ? '#fff' : '#334155',
            boxShadow: filledCount > 0 ? '0 0 22px #3b82f644' : 'none',
            transition: 'all 0.2s',
          }}
          onTouchStart={e => { if (filledCount > 0) e.currentTarget.style.transform='scale(0.98)' }}
          onTouchEnd={e  => { e.currentTarget.style.transform='scale(1)' }}
        >
          {filledCount > 0
            ? `⚡ LOG ${filledCount} ZONE${filledCount > 1 ? 'S' : ''} — ${filledCount * 10} PUCKS`
            : '← SET ZONES ABOVE FIRST'}
        </button>
      </div>

      {/* ── Weak-connection toast — appears after 5 s if Firestore is slow ── */}
      {weakConnToast && (
        <div style={{
          background: '#0c1a2e', border: '1px solid #3b82f644',
          borderRadius: 10, padding: '10px 14px', marginBottom: 8,
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700,
          color: '#93c5fd', letterSpacing: '0.04em', lineHeight: 1.5,
          textAlign: 'center',
        }}>
          Weak connection detected, but don't worry—we're holding onto your pucks until you're back online! 🥅
        </div>
      )}

      {/* ── End Session — elevated above the net so it's always reachable ── */}
      <button
        onClick={isSaving ? undefined : onEndSession}
        disabled={isSaving}
        style={{
          width: '100%', marginBottom: 10,
          padding: '15px 0',
          background: isSaving
            ? 'linear-gradient(135deg,#1e293b,#0f172a)'
            : 'linear-gradient(135deg,#064e3b,#059669)',
          color: isSaving ? '#60a5fa' : '#34d399',
          border: `1px solid ${isSaving ? '#1e3a5f' : '#10b98166'}`,
          borderRadius: 12,
          cursor: isSaving ? 'not-allowed' : 'pointer',
          fontFamily: "'Bangers',sans-serif",
          fontWeight: 400, fontSize: 22, letterSpacing: '0.12em',
          textTransform: 'uppercase',
          boxShadow: isSaving ? 'none' : '0 0 20px #10b98122',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: isSaving ? 0.8 : 1,
          pointerEvents: isSaving ? 'none' : 'auto',
        }}
      >
        {isSaving
          ? 'SAVING SHOTS... ⏳'
          : <><CheckCircle size={17} /> End Session</>
        }
      </button>

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

      {/* ── Net SVG with shake wrapper ───────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '68%', marginBottom: 10 }}>
        <div
          ref={netRef}
          style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,26,0.85)', borderRadius: 12, border: '1px solid #1e3a5f', overflow: 'hidden' }}
        >
          <NetSVG flashZone={flashZone} flashType={flashType} puckAnim={puckAnim} />
        </div>
      </div>

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
    </div>
  )
}
