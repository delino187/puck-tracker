import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, X, Trophy } from 'lucide-react'
import { audioEngine } from '../services/audioEngine.js'
import { syncQueue }   from '../services/syncQueue.js'

const ATW_ZONES = [
  { id: 'top_left',    label: 'Top Left',     short: 'TL' },
  { id: 'top_right',   label: 'Top Right',    short: 'TR' },
  { id: 'low_blocker', label: 'Low Blocker',  short: 'LB' },
  { id: 'low_glove',   label: 'Low Glove',    short: 'LG' },
]

const ZONE_TIME = 12
const PREP_TIME = 5

// Net-corner grid order: TL [0] TR [1] / LB [2] LG [3]
// From shooter's POV: blocker (index 2) is bottom-left, glove (index 3) is bottom-right
const GRID_ORDER = [0, 1, 2, 3]

function computePB(player, sessions) {
  const atw = sessions.filter(s => s.playerId === player.id && s.source === 'atw')
  if (!atw.length) return null
  return Math.max(...atw.map(s => (s.sets || []).reduce((a, x) => a + x.hits, 0)))
}

export default function AroundTheWorld({ player, sessions, onSubmitGame, onBack }) {
  const [phase, setPhase]           = useState('IDLE')
  const [countdown, setCountdown]   = useState(PREP_TIME)
  const [currentZone, setCurrentZone] = useState(0)
  const [zoneSeconds, setZoneSeconds] = useState(ZONE_TIME)
  const [scores, setScores]         = useState([0, 0, 0, 0])
  const [showPBBanner, setShowPBBanner] = useState(false)
  const [muted, setMuted]           = useState(false)

  // Ref so speakTarget always reads the latest mute state from inside effects/timeouts
  const mutedRef = useRef(false)

  function toggleMute() {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    if (next) window.speechSynthesis?.cancel()
  }

  function speakTarget(text) {
    if (mutedRef.current || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate  = 1.05
    utt.pitch = 1.0
    window.speechSynthesis.speak(utt)
  }

  // Cancel speech when the component unmounts
  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  // Speak when PREP begins or LOGGING opens
  useEffect(() => {
    if (phase === 'PREP')    speakTarget('Get ready. ' + ATW_ZONES[0].label + ' is first.')
    if (phase === 'LOGGING') speakTarget("Time's up. Log your hits.")
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Speak the active zone whenever it advances during PLAYING
  useEffect(() => {
    if (phase !== 'PLAYING') return
    const isLast = currentZone === ATW_ZONES.length - 1
    speakTarget(ATW_ZONES[currentZone].label + (isLast ? '. Last zone!' : '.'))
  }, [phase, currentZone]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ensures the score saves even if the user navigates away mid-PB banner
  const cleanupRef = useRef(null)
  useEffect(() => () => { cleanupRef.current?.() }, [])

  // PREP countdown — 1-second ticks via chained timeouts
  useEffect(() => {
    if (phase !== 'PREP') return
    if (countdown <= 0) {
      audioEngine.playSuccess()
      setPhase('PLAYING')
      setCurrentZone(0)
      setZoneSeconds(ZONE_TIME)
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  // PLAYING zone timer — auto-advances to next zone or LOGGING
  useEffect(() => {
    if (phase !== 'PLAYING') return
    if (zoneSeconds <= 0) {
      if (currentZone >= ATW_ZONES.length - 1) {
        audioEngine.playMp3('/ice-hockey-sports-buzzer.mp3', 0.85)
        setPhase('LOGGING')
      } else {
        audioEngine.playSuccess()
        setCurrentZone(z => z + 1)
        setZoneSeconds(ZONE_TIME)
      }
      return
    }
    const t = setTimeout(() => setZoneSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, zoneSeconds, currentZone])

  function startGame() {
    setScores([0, 0, 0, 0])
    setCountdown(PREP_TIME)
    setCurrentZone(0)
    setZoneSeconds(ZONE_TIME)
    setPhase('PREP')
  }

  function abortGame() {
    window.speechSynthesis?.cancel()
    cleanupRef.current = null
    setPhase('IDLE')
    setCountdown(PREP_TIME)
    setCurrentZone(0)
    setZoneSeconds(ZONE_TIME)
    setShowPBBanner(false)
  }

  function handleSubmit() {
    const sets     = ATW_ZONES.map((z, i) => ({ zone: z.id, hits: scores[i], ts: Date.now() }))
    const newScore = scores.reduce((a, b) => a + b, 0)
    const pb       = computePB(player, sessions)
    const isNewPB  = newScore > 0 && (pb === null || newScore > pb)

    // Offline interception — queue the payload for later sync.
    // Local state / XP updates still run unconditionally below.
    if (!navigator.onLine) {
      syncQueue.enqueue('LOG_SET_WORKOUT', {
        gameMode:   'atw',
        playerId:   player.id,
        sets,
        totalHits:  newScore,
      })
      alert('❄️ Saved offline! Your workout will sync automatically once you reach Wi-Fi.')
    }

    const doSubmit = () => {
      cleanupRef.current = null
      onSubmitGame(sets)
    }

    if (isNewPB) {
      setShowPBBanner(true)
      audioEngine.playSuccess()
      const t1 = setTimeout(() => audioEngine.playSuccess(), 240)
      const t2 = setTimeout(doSubmit, 1700)
      cleanupRef.current = () => {
        clearTimeout(t1)
        clearTimeout(t2)
        doSubmit()
      }
    } else {
      doSubmit()
    }
  }

  const inc = i => setScores(prev => prev.map((v, idx) => idx === i ? Math.min(v + 1, 10) : v))
  const dec = i => setScores(prev => prev.map((v, idx) => idx === i ? Math.max(v - 1, 0) : v))

  const pb = computePB(player, sessions)

  // ── IDLE ──────────────────────────────────────────────────────────────────────
  if (phase === 'IDLE') {
    return (
      <div style={{ padding: '12px 12px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0 12px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14 }}
          >
            <ChevronLeft size={18} /> Back to Games
          </button>
          <button
            onClick={toggleMute}
            style={{ background: 'none', border: '1px solid #1e3a5f', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: muted ? '#475569' : '#60a5fa', letterSpacing: '0.06em' }}
          >
            {muted ? '🔇 Coach Off' : '🔊 Coach On'}
          </button>
        </div>

        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '0.04em', marginBottom: 4 }}>
          Around the World
        </div>
        <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
          Zero-touch timer sequence. 4 corners. 12 seconds per zone.{' '}
          <span style={{ color: '#34d399' }}>Keep your gloves on until the end.</span>
        </div>

        {/* Onboarding hint */}
        <div style={{
          background: 'var(--card-bg)', border: 'var(--card-border)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 18, fontWeight: 500, color: 'var(--text-1)', lineHeight: 1.4 }}>
            Shoot as many pucks as you can before the timer goes off. Count your hits.
          </div>
        </div>

        {/* Personal Best card */}
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid #f59e0b',
          borderRadius: 12, padding: '16px 18px', marginBottom: 16,
          boxShadow: '0 0 20px #f59e0b18',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Trophy size={15} color="#f59e0b" />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.16em' }}>
              PERSONAL BEST
            </span>
          </div>
          {pb !== null ? (
            <>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 42, fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>
                {pb}
                <span style={{ fontSize: 18, fontWeight: 500, color: '#92400e', marginLeft: 6 }}>hits</span>
              </div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: '#d97706', marginTop: 5 }}>
                Current Record: {pb} Hits — Can you smash it?
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 800, color: '#92400e', lineHeight: 1 }}>
                No record yet.
              </div>
              <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: '#78350f', marginTop: 4 }}>
                Your first run sets the benchmark.
              </div>
            </>
          )}
        </div>

        {/* Zone sequence preview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[0, 1, 3, 2].map((zIdx, gridIdx) => (
            <div key={zIdx} style={{
              background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 12,
              padding: '14px 10px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>
                Zone {gridIdx + 1}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>
                {ATW_ZONES[zIdx].label}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#10b981', fontWeight: 700, marginTop: 2 }}>
                12 sec
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={startGame}
          style={{
            width: '100%', padding: '20px',
            background: 'linear-gradient(135deg,#059669,#10b981)',
            color: '#fff', border: 'none', borderRadius: 14,
            fontFamily: "'Barlow Condensed',sans-serif",
            fontWeight: 800, fontSize: 22, cursor: 'pointer',
            letterSpacing: '0.06em',
            boxShadow: '0 0 28px #10b98144',
          }}
        >
          START GAME
        </button>
      </div>
    )
  }

  // ── PREP countdown ────────────────────────────────────────────────────────────
  if (phase === 'PREP') {
    return (
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: '0 24px', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: muted ? '#475569' : '#60a5fa', cursor: 'pointer', padding: 8, fontSize: 16 }}>
            {muted ? '🔇' : '🔊'}
          </button>
          <button onClick={abortGame} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 8 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
          GET READY
        </div>
        <div style={{
          fontSize: 140, fontWeight: 900, lineHeight: 1,
          color: countdown <= 2 ? '#f59e0b' : '#10b981',
          fontFamily: "'Barlow Condensed',sans-serif",
          textShadow: `0 0 60px ${countdown <= 2 ? '#f59e0b66' : '#10b98166'}`,
          transition: 'color 0.2s, text-shadow 0.2s',
        }}>
          {countdown}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, color: 'var(--text-2)' }}>
          First zone: {ATW_ZONES[0].label}
        </div>

        {/* Onboarding hint */}
        <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 18, fontWeight: 500, color: 'var(--text-1)', textAlign: 'center', lineHeight: 1.4, maxWidth: 320 }}>
          Shoot as many pucks as you can before the timer goes off. Count your hits.
        </div>
      </div>
    )
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────────
  if (phase === 'PLAYING') {
    const zone     = ATW_ZONES[currentZone]
    const progress = (ZONE_TIME - zoneSeconds) / ZONE_TIME
    const isLast   = currentZone === ATW_ZONES.length - 1
    const urgent   = zoneSeconds <= 3

    return (
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '12px 20px 20px',
        position: 'relative', gap: 12,
      }}>
        {/* Abort + mute */}
        <div style={{ position: 'absolute', top: 12, right: 8, display: 'flex', alignItems: 'center', gap: 2 }}>
          <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: muted ? '#334155' : '#60a5fa', cursor: 'pointer', padding: 6, fontSize: 15 }}>
            {muted ? '🔇' : '🔊'}
          </button>
          <button onClick={abortGame} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Zone progress dots */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {ATW_ZONES.map((_, i) => (
            <div key={i} style={{
              width: i === currentZone ? 26 : 10,
              height: 10, borderRadius: 5,
              background: i < currentZone ? '#10b981' : i === currentZone ? '#34d399' : '#1e293b',
              border: i === currentZone ? '2px solid #10b981' : '1px solid #334155',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          ZONE {currentZone + 1} OF {ATW_ZONES.length}
        </div>

        {/* Active zone box — glowing emerald highlight */}
        <div style={{
          width: '100%', maxWidth: 380,
          background: 'var(--zone-box-bg)',
          border: '4px solid #10b981',
          borderRadius: 18, padding: '28px 16px',
          textAlign: 'center',
          boxShadow: '0 0 48px #10b98155, inset 0 0 24px #10b98118',
        }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 46, fontWeight: 900, color: '#34d399', letterSpacing: '0.04em' }}>
            {zone.label}
          </div>
        </div>

        {/* Countdown + reminder */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 88, fontWeight: 900, lineHeight: 1,
            color: urgent ? '#ef4444' : 'var(--text-1)',
            fontFamily: "'Barlow Condensed',sans-serif",
            textShadow: urgent ? '0 0 36px #ef444466' : 'none',
            transition: 'color 0.2s, text-shadow 0.2s',
          }}>
            {zoneSeconds}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.1em' }}>
            SECONDS LEFT
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6 }}>
            Rapid Fire! Count your hits.
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', maxWidth: 380, height: 6, background: 'var(--progress-track)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress * 100}%`,
            background: urgent ? '#ef4444' : '#10b981',
            transition: 'width 0.8s linear, background 0.2s',
            borderRadius: 3,
          }} />
        </div>

        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: isLast ? '#f59e0b' : 'var(--text-muted)' }}>
          {isLast ? 'Last zone!' : `Next: ${ATW_ZONES[currentZone + 1].label}`}
        </div>
      </div>
    )
  }

  // ── LOGGING — full-screen 2×2 stepper grid ────────────────────────────────────
  if (phase === 'LOGGING') {
    const totalHits = scores.reduce((a, b) => a + b, 0)
    const isBeatingPB = pb !== null && totalHits > pb

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 120px)', padding: '12px 10px 16px', position: 'relative' }}>

        {/* NEW PERSONAL BEST banner — overlays the logging screen */}
        {showPBBanner && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.82)',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>🏆</div>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 42, fontWeight: 900,
              color: '#fbbf24',
              letterSpacing: '0.06em',
              textShadow: '0 0 40px #f59e0b88',
              textAlign: 'center',
              lineHeight: 1.1,
            }}>
              NEW PERSONAL<br />BEST!
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, color: '#f1f5f9', marginTop: 12 }}>
              {totalHits} hits
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '0.05em' }}>
            LOG YOUR SHOTS
          </div>
          <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Tap to enter your hits per zone
          </div>
          {/* Live PB comparison */}
          {pb !== null && (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: isBeatingPB ? '#fbbf24' : 'var(--text-2)', marginTop: 4, letterSpacing: '0.06em' }}>
              {isBeatingPB ? `🏆 BEATING PB by ${totalHits - pb}!` : `PB: ${pb} hits`}
            </div>
          )}
        </div>

        {/* 2×2 stepper grid — net layout TL/TR over BL/BR */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1, minHeight: 0 }}>
          {GRID_ORDER.map(zIdx => {
            const zone = ATW_ZONES[zIdx]
            const val  = scores[zIdx]
            const hit  = val > 0

            return (
              <div key={zIdx} style={{
                background: 'var(--card-bg)',
                border: hit ? '2px solid #10b981' : 'var(--card-border)',
                borderRadius: 14, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                transition: 'border-color 0.15s',
              }}>
                {/* Zone label */}
                <div style={{
                  textAlign: 'center', padding: '10px 0 6px',
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 13, fontWeight: 700,
                  color: hit ? '#059669' : 'var(--text-muted)',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: hit ? '#dcfce7' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  {zone.label}
                </div>

                {/* + button — high-contrast in both modes */}
                <button
                  onPointerDown={() => inc(zIdx)}
                  style={{
                    flex: 1, minHeight: 80, width: '100%', border: 'none',
                    background: 'var(--stepper-btn-bg)', color: 'var(--stepper-pos-text)',
                    fontSize: 36, fontWeight: 900, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    touchAction: 'manipulation', userSelect: 'none',
                    transition: 'opacity 0.1s, transform 0.1s ease-out',
                  }}
                >
                  +
                </button>

                {/* Score */}
                <div style={{
                  textAlign: 'center', fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 56, fontWeight: 900, lineHeight: 1,
                  color: hit ? '#16a34a' : 'var(--score-inactive)', padding: '6px 0',
                  transition: 'color 0.15s',
                }}>
                  {val}
                </div>

                {/* − button — high-contrast in both modes */}
                <button
                  onPointerDown={() => dec(zIdx)}
                  style={{
                    flex: 1, minHeight: 80, width: '100%', border: 'none',
                    background: 'var(--stepper-btn-bg)',
                    color: val > 0 ? 'var(--stepper-neg-on)' : 'var(--stepper-neg-off)',
                    fontSize: 36, fontWeight: 900, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    touchAction: 'manipulation', userSelect: 'none',
                    transition: 'color 0.15s, transform 0.1s ease-out',
                  }}
                >
                  −
                </button>
              </div>
            )
          })}
        </div>

        {/* Total + submit */}
        <div style={{ marginTop: 12 }}>
          <div style={{ textAlign: 'center', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, color: 'var(--text-muted)', marginBottom: 10 }}>
            Total hits:{' '}
            <span style={{ color: isBeatingPB ? '#fbbf24' : '#34d399', fontSize: 22, fontWeight: 800 }}>{totalHits}</span>
          </div>
          <button
            onClick={handleSubmit}
            style={{
              width: '100%', padding: '20px',
              background: 'linear-gradient(135deg,#059669,#10b981)',
              color: '#fff', border: 'none', borderRadius: 14,
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 800, fontSize: 22, cursor: 'pointer',
              letterSpacing: '0.06em',
              boxShadow: '0 0 24px #10b98144',
            }}
          >
            SUBMIT GAME
          </button>
        </div>
      </div>
    )
  }

  return null
}
