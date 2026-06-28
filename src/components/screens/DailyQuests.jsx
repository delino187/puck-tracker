import { useState, useRef, useEffect, useMemo } from 'react'
import { playCashRegister } from '../../utils/arcadeSounds.js'
import { audioEngine }      from '../../services/audioEngine.js'
import { useAppStore }      from '../../store/useAppStore.js'
import { usePlayer }        from '../../context/PlayerContext.jsx'
import { getWeekStart, localDateStr } from '../../utils/stats.js'
import {
  SHUFFLE_POOL, WEEKLY_SHUFFLE_POOL,
} from '../../constants/questPools.js'
import {
  pickQuests, pickWeeklyQuests,
  getDailyQuestProgress, getWeeklyQuestProgress,
  timeUntilReset, timeUntilWeekReset,
} from '../../utils/questEngine.js'
import QuestRow     from './QuestRow.jsx'
import StadiumLever from './StadiumLever.jsx'

export default function DailyQuests({
  onNavigate, onSpinComplete, onClaimQuest,
  onClaimWeeklyQuest, onInitWeeklyQuests,
  peerChallenges = [], puckGames = [],
}) {
  const { activePlayer: player, st } = usePlayer()
  const sessions          = st?.sessions || []
  // CRITICAL: declare before any function that references it
  const techniqueByPlayer = useAppStore(s => s.techniqueByPlayer || {})

  // Read DIRECTLY from PlayerContext — no local copies to avoid sync conflicts
  const currentQuests = player?.daily_quests || []
  const weeklyQuests  = player?.weekly_quests || []

  // ── Animation-only state (never touches Firestore) ────────────────────────
  const [spinning,           setSpinning]           = useState(false)
  const [shuffleTexts,       setShuffleTexts]       = useState(['', '', ''])
  const [burst,              setBurst]              = useState(null)
  const [weeklyShuffleTexts, setWeeklyShuffleTexts] = useState(['', '', ''])
  const [slotSpinning,       setSlotSpinning]       = useState(false)
  const [slotLeverPulled,    setSlotLeverPulled]    = useState(false)

  // Refs: all timers stored so cleanup is complete on unmount
  const intervalRef           = useRef(null)
  const spinAudioRef          = useRef(null)
  const spinTimerRef          = useRef(null)   // fixed: was anonymous, causing memory leak
  const slotTimerRef          = useRef(null)
  const weeklyShuffleInterval = useRef(null)
  // sessionsRef: capture sessions at spin time to avoid stale closure in timeout
  const sessionsRef           = useRef(sessions)
  sessionsRef.current = sessions

  useEffect(() => () => {
    clearTimeout(spinTimerRef.current)
    clearTimeout(slotTimerRef.current)
    clearInterval(intervalRef.current)
    clearInterval(weeklyShuffleInterval.current)
    if (spinAudioRef.current) { spinAudioRef.current.pause(); spinAudioRef.current = null }
  }, [])

  // ── Derived display data ──────────────────────────────────────────────────
  // Use localDateStr() (YYYY-MM-DD, local timezone) instead of toDateString() for spin
  // gate keys.  toDateString() is locale-dependent and changes when the device language
  // or timezone is switched — a trivial exploit that lets players re-spin on demand.
  const spinDateKey     = localDateStr()
  const weekStartKey    = localDateStr(getWeekStart())
  const spinAvailable   = player.last_quest_spin !== spinDateKey
  const isWeeklyLocked  = player.last_weekly_quest_pick === weekStartKey
  const slotCanPull     = !isWeeklyLocked && !slotSpinning

  const placeholders = useMemo(() => [0, 1, 2].map(i => ({
    id: `placeholder-${i}`, text: '— PULL THE LEVER —', tier: 'common', reward: '?', icon: '❓',
  })), [])

  const newDayPlaceholders = useMemo(() => [0, 1, 2].map(i => ({
    id: `newday-${i}`, text: '????', tier: 'common', reward: '?', icon: '🔒', isNewDayPlaceholder: true,
  })), [])

  const isNewDayWithStaleQuests = spinAvailable && currentQuests.length > 0
  const displayQuests = isNewDayWithStaleQuests
    ? newDayPlaceholders
    : currentQuests.length ? currentQuests : placeholders

  // Memoized progress — avoids re-running regex on every parent re-render
  const questProgressList = useMemo(() =>
    displayQuests.map(q =>
      q.reward !== '?' ? getDailyQuestProgress(q, sessions, player.id, puckGames, peerChallenges, techniqueByPlayer) : null
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [currentQuests, sessions, player.id, puckGames, peerChallenges, techniqueByPlayer])

  const displayWeeklyQuests = useMemo(() =>
    isWeeklyLocked ? weeklyQuests.map(q => {
      if (q.claimed) return q
      const prog = getWeeklyQuestProgress(q.text, sessions, player.id, puckGames, peerChallenges, techniqueByPlayer)
      return { ...q, currentProgress: prog.current, targetProgress: prog.target, completed: prog.current >= prog.target }
    }) : [],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [isWeeklyLocked, weeklyQuests, sessions, player.id, puckGames, peerChallenges, techniqueByPlayer])

  const allWeeklyClaimed = displayWeeklyQuests.length > 0 && displayWeeklyQuests.every(q => q.claimed)

  // ── Particle burst ────────────────────────────────────────────────────────
  function fireBurst(rect) {
    const cx = rect.left + rect.width / 2
    const cy = rect.top  + rect.height / 2
    const particles = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 2 * Math.PI + (Math.random() * 0.4 - 0.2)
      const dist  = 55 + Math.random() * 75
      return {
        id:    i,
        left:  cx,
        top:   cy,
        dx:    Math.round(Math.cos(angle) * dist),
        dy:    Math.round(Math.sin(angle) * dist - 35),
        delay: (Math.random() * 0.18).toFixed(2),
        size:  Math.round(18 + Math.random() * 12),
      }
    })
    setBurst(particles)
    setTimeout(() => setBurst(null), 1400)
  }

  // ── Claim handlers ────────────────────────────────────────────────────────
  function handleClaim(questIndex, rect) {
    const quest    = currentQuests[questIndex]
    const progress = questProgressList[questIndex]
    if (!quest || quest.claimed) return
    const isDone = quest.completed || (progress ? progress.current >= progress.target : false)
    if (!isDone) return
    playCashRegister()
    fireBurst(rect)
    onClaimQuest?.(quest.text, quest.reward)
  }

  function handleClaimWeekly(questIndex, rect) {
    const quest = displayWeeklyQuests[questIndex]
    if (!quest?.completed || quest.claimed) return
    playCashRegister()
    fireBurst(rect)
    onClaimWeeklyQuest?.(quest.text, quest.reward)
  }

  // ── Daily spin ────────────────────────────────────────────────────────────
  function handleSpin() {
    if (!spinAvailable || spinning) return

    audioEngine.playQuestSpin()

    const spinAudio = new Audio('/store-spin.mp3')
    spinAudio.loop = true; spinAudio.volume = 0.35
    try { spinAudio.play().catch(() => {}) } catch {}
    spinAudioRef.current = spinAudio

    setSpinning(true)

    intervalRef.current = setInterval(() => {
      setShuffleTexts([
        SHUFFLE_POOL[Math.floor(Math.random() * SHUFFLE_POOL.length)],
        SHUFFLE_POOL[Math.floor(Math.random() * SHUFFLE_POOL.length)],
        SHUFFLE_POOL[Math.floor(Math.random() * SHUFFLE_POOL.length)],
      ])
    }, 60)

    // Store in ref so unmount cleanup can cancel it
    spinTimerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current)
      if (spinAudioRef.current) { spinAudioRef.current.pause(); spinAudioRef.current = null }

      const lockAudio = new Audio('/retro-game-notification.mp3')
      lockAudio.volume = 0.6
      try { lockAudio.play().catch(() => {}) } catch {}

      // Use sessionsRef.current — captures sessions at spin time, not from stale closure
      const picked = pickQuests(sessionsRef.current) || []
      setShuffleTexts(['', '', ''])
      setSpinning(false)
      onSpinComplete?.(picked.length ? picked : [])
    }, 2000)
  }

  // ── Weekly spin ───────────────────────────────────────────────────────────
  function handleWeeklyPull() {
    if (isWeeklyLocked || slotSpinning) return
    setSlotLeverPulled(true)
    setTimeout(() => setSlotLeverPulled(false), 600)

    audioEngine.playQuestSpin()

    const picked = pickWeeklyQuests()
    setSlotSpinning(true)

    const spinAudio = new Audio('/store-spin.mp3')
    spinAudio.loop = true; spinAudio.volume = 0.3
    try { spinAudio.play().catch(() => {}) } catch {}

    weeklyShuffleInterval.current = setInterval(() => {
      setWeeklyShuffleTexts([
        WEEKLY_SHUFFLE_POOL[Math.floor(Math.random() * WEEKLY_SHUFFLE_POOL.length)],
        WEEKLY_SHUFFLE_POOL[Math.floor(Math.random() * WEEKLY_SHUFFLE_POOL.length)],
        WEEKLY_SHUFFLE_POOL[Math.floor(Math.random() * WEEKLY_SHUFFLE_POOL.length)],
      ])
    }, 60)

    slotTimerRef.current = setTimeout(() => {
      clearInterval(weeklyShuffleInterval.current)
      spinAudio.pause()

      const lockAudio = new Audio('/retro-game-notification.mp3')
      lockAudio.volume = 0.6
      try { lockAudio.play().catch(() => {}) } catch {}

      setWeeklyShuffleTexts(['', '', ''])
      setSlotSpinning(false)
      onInitWeeklyQuests?.(picked || [])
    }, 2500)
  }

  const { h, m }                   = timeUntilReset()
  const { days: wDays, hours: wHours } = timeUntilWeekReset()

  return (
    <div style={{ padding: '16px 16px 80px', position: 'relative' }}>
      <style>{`
        @keyframes shimmer       { 0%,100%{ opacity:1 } 50%{ opacity:0.6 } }
        @keyframes diamondPulse  { 0%,100%{ opacity:1; transform:scale(1) } 50%{ opacity:0.7; transform:scale(1.14) } }
        @keyframes redNeonPulse  { 0%,100%{ box-shadow:0 0 20px #ef444433,inset 0 0 10px #ef444411 } 50%{ box-shadow:0 0 52px #ef4444aa,0 0 90px #ef444455,inset 0 0 22px #ef444422 } }
        @keyframes redBallPulse  { 0%,100%{ box-shadow:0 0 14px #ef444488,0 0 30px #ef444444,inset -3px -3px 5px rgba(0,0,0,0.5) } 50%{ box-shadow:0 0 30px #ef4444cc,0 0 60px #ef444499,inset -3px -3px 5px rgba(0,0,0,0.5) } }
        @keyframes reelSlideIn   { from{ transform:translateY(38px);opacity:0 } to{ transform:translateY(0);opacity:1 } }
        @keyframes winPrizePop   { 0%{ transform:scale(0.65);opacity:0 } 70%{ transform:scale(1.14) } 100%{ transform:scale(1);opacity:1 } }
      `}</style>

      {/* ── Diamond burst particles ──────────────────────────────────────── */}
      {burst && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 900, pointerEvents: 'none' }}>
          {burst.map(p => (
            <div
              key={p.id}
              style={{
                position: 'fixed', left: p.left, top: p.top,
                fontSize: p.size, lineHeight: 1,
                '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
                animation: `diamondBurst 1.2s ease-out ${p.delay}s both`,
              }}
            >💎</div>
          ))}
        </div>
      )}

      {/* ── Daily cabinet ───────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginRight: 28 }}>
        <StadiumLever disabled={!spinAvailable} onSpin={handleSpin} isSpinning={spinning} />

        <div style={{
          background: 'linear-gradient(135deg,#0a0810,#1a0f25)',
          border: '4px solid #fbbf24', borderRadius: 20,
          padding: '32px 18px 20px', marginBottom: 20,
          boxShadow: '0 0 40px #fbbf2444, inset 0 0 20px #fbbf2211',
          position: 'relative', overflow: 'visible',
        }}>
          {[{ left: 14 }, { right: 14, animationDelay: '0.75s' }].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', top: 10, ...pos,
              width: 22, height: 22, borderRadius: '50%',
              background: 'radial-gradient(circle,#ffd700,#f59e0b)',
              boxShadow: '0 0 18px #fbbf24, 0 0 40px #fbbf2466',
              animation: 'shimmer 1.5s ease-in-out infinite',
              animationDelay: pos.animationDelay || '0s',
            }} />
          ))}

          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 42, color: '#fbbf24',
            textAlign: 'center', letterSpacing: '0.08em',
            textShadow: '0 0 30px #fbbf2466, 0 2px 0 #7a5a00',
            marginBottom: 10, lineHeight: 1,
          }}>
            DAILY QUESTS
          </div>

          <div style={{
            background: '#0f0a04', border: '2px solid #fbbf24',
            borderRadius: 20, padding: '8px 16px',
            textAlign: 'center', marginBottom: 18,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            fontWeight: 700, color: '#fbbf24', letterSpacing: '0.14em',
          }}>
            🕛 RESETS IN: {h}H {m}M
          </div>

          {spinning && (
            <div style={{
              background: 'linear-gradient(90deg,#0f0a04,#1a1000,#0f0a04)',
              border: '2px solid #fbbf24', borderRadius: 10,
              padding: '8px 14px', marginBottom: 12,
              fontFamily: "'Bangers',sans-serif", fontSize: 16,
              color: '#fbbf24', letterSpacing: '0.12em', textAlign: 'center',
              animation: 'shimmer 0.4s ease-in-out infinite',
            }}>
              🎰 ROLLING YOUR QUESTS...
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <div style={{
              filter:        (spinAvailable && !currentQuests.length) ? 'blur(3px) saturate(0.25)' : 'none',
              pointerEvents: (spinAvailable && !currentQuests.length) ? 'none' : 'auto',
              transition: 'filter 0.3s',
            }}>
              {displayQuests.map((quest, i) => (
                <QuestRow
                  key={i}
                  quest={quest}
                  progress={questProgressList[i]}
                  isSpinning={spinning}
                  shuffleText={shuffleTexts[i] || SHUFFLE_POOL[0]}
                  onNavigate={onNavigate}
                  onClaim={rect => handleClaim(i, rect)}
                />
              ))}
            </div>

            {spinAvailable && !currentQuests.length && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10, pointerEvents: 'none',
              }}>
                <div style={{
                  background: 'rgba(10,8,18,0.72)', backdropFilter: 'blur(4px)',
                  border: '2px solid #fbbf24', borderRadius: 16,
                  padding: '18px 24px', textAlign: 'center',
                  boxShadow: '0 0 40px #fbbf2455',
                  animation: 'shimmer 1.4s ease-in-out infinite',
                }}>
                  <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#fbbf24', letterSpacing: '0.08em', lineHeight: 1.2, textShadow: '0 0 24px #fbbf2488' }}>
                    🕹️ PULL LEVER TO SPIN
                  </div>
                  <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 17, color: '#fbbf24cc', letterSpacing: '0.06em', lineHeight: 1.3, marginTop: 4 }}>
                    & UNLOCK TODAY'S QUESTS!
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={spinAvailable && !spinning ? handleSpin : undefined}
            disabled={!spinAvailable || spinning}
            style={{
              width: '100%',
              background: spinAvailable && !spinning ? 'linear-gradient(135deg,#aa6600,#fbbf24)' : '#1e2335',
              color:  spinAvailable && !spinning ? '#000' : '#4a5568',
              border: spinAvailable && !spinning ? 'none' : '2px solid #2d3748',
              borderRadius: 12, padding: '14px',
              fontFamily: "'Bangers',sans-serif", fontSize: 20, fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: spinAvailable && !spinning ? 'pointer' : 'not-allowed',
              boxShadow: spinAvailable && !spinning ? '0 0 20px #fbbf2455' : 'none',
              transition: 'all 0.3s',
            }}
          >
            {spinning ? '🎰 ROLLING...' : spinAvailable ? '🎰 SPIN THE LEVER!' : '🔒 QUESTS LOCKED IN FOR TODAY'}
          </button>
        </div>
      </div>

      {/* ── Separator ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 20px' }}>
        <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,transparent,#ef4444,transparent)' }} />
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: '0.2em' }}>● ● ●</div>
        <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,transparent,#ef4444,transparent)' }} />
      </div>

      {/* ── Weekly cabinet ───────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginRight: 32 }}>

        {/* Weekly lever (inline — red variant, different lock behavior) */}
        <div
          onClick={handleWeeklyPull}
          title={isWeeklyLocked ? 'Spun this week' : slotSpinning ? 'Spinning…' : 'Pull to spin!'}
          style={{
            position: 'absolute', right: -32, top: '50%',
            transform: 'translateY(-50%)', zIndex: 50,
            cursor: slotCanPull ? 'pointer' : 'not-allowed',
            userSelect: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
        >
          <div style={{
            width: 20, height: 52,
            background: isWeeklyLocked ? 'linear-gradient(90deg,#3a3a3a,#1e1e1e,#3a3a3a)' : 'linear-gradient(90deg,#5a1a1a,#2e0a0a,#5a1a1a)',
            borderRadius: 10,
            border: `2px solid ${isWeeklyLocked ? '#111' : '#3d0a0a'}`,
            boxShadow: '0 2px 8px #0008',
          }} />
          <div style={{
            width: 12, height: 72, marginTop: -12,
            transformOrigin: 'top center',
            transform: `rotate(${isWeeklyLocked ? 36 : slotLeverPulled ? 40 : 0}deg)`,
            transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              width: 8, height: 54,
              background: isWeeklyLocked ? 'linear-gradient(90deg,#444,#222,#444)' : 'linear-gradient(90deg,#cc2222,#880000,#cc2222)',
              borderRadius: 4,
              border: `1px solid ${isWeeklyLocked ? '#1a1a1a' : '#5a0000'}`,
            }} />
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: isWeeklyLocked ? 'radial-gradient(circle at 32% 28%,#555,#333)' : 'radial-gradient(circle at 32% 28%,#ff6060,#cc0000)',
              border: isWeeklyLocked ? '2px solid #222' : '2px solid #880000',
              boxShadow: isWeeklyLocked ? '0 1px 4px #0006, inset -2px -2px 4px rgba(0,0,0,0.4)' : '0 0 22px #ff000099, 0 0 44px #ff000055, inset -3px -3px 5px rgba(0,0,0,0.5)',
              marginTop: -4, flexShrink: 0,
              animation: slotCanPull ? 'redBallPulse 1s ease-in-out infinite' : 'none',
            }} />
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg,#0a0508,#1a0a10)',
          border: '4px solid #ef4444', borderRadius: 20,
          padding: '32px 18px 20px', marginBottom: 20,
          boxShadow: '0 0 40px #ef444444, inset 0 0 20px #ef444411',
          position: 'relative', overflow: 'visible',
        }}>
          {[{ left: 14 }, { right: 14, animationDelay: '0.75s' }].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', top: 10, ...pos,
              width: 22, height: 22, borderRadius: '50%',
              background: 'radial-gradient(circle,#fca5a5,#ef4444)',
              boxShadow: '0 0 18px #ef4444, 0 0 40px #ef444466',
              animation: 'shimmer 1.5s ease-in-out infinite',
              animationDelay: pos.animationDelay || '0s',
            }} />
          ))}

          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 42, color: '#fbbf24',
            textAlign: 'center', letterSpacing: '0.08em',
            textShadow: '0 0 30px #fbbf2466, 0 2px 0 #7a5a00',
            marginBottom: 10, lineHeight: 1,
          }}>
            WEEKLY QUESTS 📆
          </div>

          <div style={{
            background: '#140203', border: '2px solid #ef4444',
            borderRadius: 20, padding: '8px 16px',
            textAlign: 'center', marginBottom: 18,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            fontWeight: 700, color: '#fca5a5', letterSpacing: '0.14em',
          }}>
            🗓️ RESETS IN: {wDays} DAYS {wHours} HOURS
          </div>

          {slotSpinning && (
            <div style={{
              background: 'linear-gradient(90deg,#140203,#200408,#140203)',
              border: '2px solid #ef4444', borderRadius: 10,
              padding: '8px 14px', marginBottom: 12,
              fontFamily: "'Bangers',sans-serif", fontSize: 16,
              color: '#ef4444', letterSpacing: '0.12em', textAlign: 'center',
              animation: 'shimmer 0.4s ease-in-out infinite',
            }}>
              🎰 ROLLING YOUR WEEKLY QUESTS...
            </div>
          )}

          {slotCanPull && (
            <div style={{
              marginBottom: 14, textAlign: 'center',
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800,
              color: '#ef4444', letterSpacing: '0.16em',
              animation: 'shimmer 1s ease-in-out infinite',
            }}>
              ← PULL LEVER TO GENERATE WEEKLY QUESTS! 🚀
            </div>
          )}

          {(slotSpinning || !isWeeklyLocked
            ? [0, 1, 2].map(i => ({ id: `wq-ph-${i}`, text: '— PULL THE LEVER —', tier: 'red', reward: '?', icon: '❓' }))
            : displayWeeklyQuests
          ).map((quest, idx) => (
            <QuestRow
              key={quest.id || idx}
              quest={quest}
              progress={isWeeklyLocked && !slotSpinning && quest.reward !== '?'
                ? { current: quest.currentProgress ?? 0, target: quest.targetProgress ?? 1 }
                : null}
              isSpinning={slotSpinning}
              shuffleText={weeklyShuffleTexts[idx] || WEEKLY_SHUFFLE_POOL[0]}
              onNavigate={onNavigate}
              onClaim={rect => handleClaimWeekly(idx, rect)}
            />
          ))}

          <button
            onClick={slotCanPull ? handleWeeklyPull : undefined}
            disabled={!slotCanPull}
            style={{
              width: '100%',
              background: allWeeklyClaimed
                ? 'linear-gradient(135deg,#14532d,#166534)'
                : isWeeklyLocked ? '#1e0a0a'
                : slotSpinning   ? '#1e0a0a'
                :                  'linear-gradient(135deg,#7a0f0f,#b91c1c)',
              color: allWeeklyClaimed ? '#4ade80' : isWeeklyLocked ? '#6b2020' : slotSpinning ? '#ef444488' : '#ffffff',
              border: allWeeklyClaimed ? '2px solid #22c55e' : isWeeklyLocked ? '2px solid #3d1010' : slotSpinning ? '2px solid #ef444433' : '2px solid #ef4444',
              borderRadius: 12, padding: '14px',
              fontFamily: "'Bangers',sans-serif", fontSize: 20, fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: slotCanPull ? 'pointer' : 'not-allowed',
              boxShadow: allWeeklyClaimed ? '0 0 16px #22c55e44' : isWeeklyLocked ? 'none' : slotSpinning ? '0 0 12px #ef444422' : '0 0 28px #ef444466',
              transition: 'all 0.2s',
              transform: 'scale(1)',
            }}
            onMouseEnter={e => { if (slotCanPull) e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onTouchStart={e => { if (slotCanPull) e.currentTarget.style.transform = 'scale(0.97)' }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {allWeeklyClaimed ? '✅ ALL WEEKLY QUESTS COMPLETE!' : slotSpinning ? '🎰 ROLLING...' : isWeeklyLocked ? '🔒 WEEKLY QUESTS LOCKED IN' : '🎰 TAP HERE TO SPIN WEEKLY QUESTS!'}
          </button>
        </div>
      </div>
    </div>
  )
}
