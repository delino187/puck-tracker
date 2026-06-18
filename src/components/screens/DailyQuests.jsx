import { useState, useRef, useEffect } from 'react'
import { computeQuestProgress, parseQuestTarget, parseQuestSuffix } from '../../utils/questHelpers.js'
import { playCashRegister } from '../../utils/arcadeSounds.js'
import { getWeekStart } from '../../utils/stats.js'
import questMusicUrl from '../../../public/quest-tab-music.mp3'

// ── Quest pool — strictly achievable within 24 hours ─────────────────────────
const QUEST_POOL = {
  volume: [
    { text: 'Log 25 Total Shots in Target Practice Mode',   tier: 'common',    reward: 10,  icon: '🏒' },
    { text: 'Log 50 Total Shots in Target Practice Mode',   tier: 'rare',      reward: 25,  icon: '🏒' },
    { text: 'Log 100 Total Shots in Target Practice Mode',  tier: 'epic',      reward: 50,  icon: '🏒' },
    { text: 'Log 30 Wrist Shots in Target Practice Mode',   tier: 'common',    reward: 10,  icon: '🎯' },
    { text: 'Log 75 Shots in Target Practice Mode Today',   tier: 'rare',      reward: 25,  icon: '🏒' },
  ],
  quality: [
    { text: 'Hit 70% Accuracy in a Target Practice Session', tier: 'common', reward: 10, icon: '📊' },
    { text: 'Hit 75% Accuracy in a Target Practice Session', tier: 'rare',   reward: 25, icon: '📈' },
    { text: 'Hit 80% Accuracy in a Target Practice Session', tier: 'epic',   reward: 50, icon: '🔥' },
    { text: 'Nail a Perfect 10/10 Set in Target Practice',   tier: 'epic',   reward: 50, icon: '💯' },
    { text: 'Score 8+ Hits in Any Zone in Target Practice',  tier: 'rare',   reward: 25, icon: '🎯' },
  ],
  social: [
    { text: 'Issue a Versus Challenge Today',  tier: 'common',    reward: 10,  icon: '📣' },
    { text: 'Play 1 P-U-C-K Game Today',       tier: 'rare',      reward: 25,  icon: '🎮' },
    { text: 'Win 1 Versus Showdown Today',     tier: 'epic',      reward: 50,  icon: '⚔️' },
    { text: 'Accept an Incoming Challenge',    tier: 'common',    reward: 10,  icon: '🤝' },
    { text: 'Beat a Friend at P-U-C-K Today', tier: 'legendary', reward: 150, icon: '🏆' },
  ],
}

// ── Weekly quest pool — fixed high-volume grinding challenges ────────────────
const WEEKLY_QUEST_POOL = [
  { id: 'wq_shots500', text: 'Log 500 Total Shots in Target Practice Mode this Week',    reward: 250, icon: '🏒', tier: 'red'    },
  { id: 'wq_acc85x5',  text: 'Hit 85% Accuracy across 5 different Sessions this Week',   reward: 150, icon: '🔥', tier: 'common' },
  { id: 'wq_back150',  text: 'Log 150 Backhand Shots in Target Practice Mode this Week', reward: 100, icon: '🎯', tier: 'red'    },
]

// ── Prize wheel segments ──────────────────────────────────────────────────────
const WHEEL_PRIZES = [
  { label: '50 💎',       diamonds: 50,  color: '#22c55e' },
  { label: '100 💎',      diamonds: 100, color: '#3b82f6' },
  { label: '75 💎',       diamonds: 75,  color: '#10b981' },
  { label: '150 💎',      diamonds: 150, color: '#a855f7' },
  { label: '50 💎',       diamonds: 50,  color: '#22c55e' },
  { label: '200 💎',      diamonds: 200, color: '#f59e0b' },
  { label: '100 💎',      diamonds: 100, color: '#3b82f6' },
  { label: '🛡️ SHIELD!',  eloShield: true, color: '#06b6d4' },
]

function pickWeeklyQuests() {
  return WEEKLY_QUEST_POOL.map(q => ({ ...q, currentProgress: 0, completed: false, claimed: false }))
}

function computeWeeklyQuestProgress(text, sessions, playerId) {
  const ws           = getWeekStart()
  const weekSessions = sessions.filter(s => s.playerId === playerId && new Date(s.date) >= ws)
  const weekSets     = weekSessions.flatMap(s => s.sets)
  const weekShots    = weekSets.length * 10

  if (/Log (\d+) Total Shots/i.test(text)) {
    const target = parseInt(text.match(/\d+/)[0])
    return { current: Math.min(weekShots, target), target }
  }
  if (/Log (\d+) Backhand Shots/i.test(text)) {
    const target = parseInt(text.match(/\d+/)[0])
    return { current: Math.min(weekShots, target), target }
  }
  const accAcross = text.match(/Hit (\d+)% Accuracy across (\d+)[^0-9]*Sessions/i)
  if (accAcross) {
    const minAcc = parseInt(accAcross[1]), target = parseInt(accAcross[2])
    const current = weekSessions.filter(s => {
      const shots = s.sets.length * 10
      if (!shots) return false
      return s.sets.reduce((a, x) => a + x.hits, 0) / shots * 100 >= minAcc
    }).length
    return { current: Math.min(current, target), target }
  }
  const sessMatch = text.match(/Complete (\d+) Training Sessions/i)
  if (sessMatch) { const t = parseInt(sessMatch[1]); return { current: Math.min(weekSessions.length, t), target: t } }
  const setsMatch = text.match(/Log (\d+) Sets/i)
  if (setsMatch) { const t = parseInt(setsMatch[1]); return { current: Math.min(weekSets.length, t), target: t } }
  const dayMatch  = text.match(/Log (\d+) Shots in a Single Day/i)
  if (dayMatch) {
    const target = parseInt(dayMatch[1])
    const byDay  = {}
    weekSessions.forEach(s => { const d = new Date(s.date).toDateString(); byDay[d] = (byDay[d] || 0) + s.sets.length * 10 })
    const best = Math.max(0, ...Object.values(byDay))
    return { current: Math.min(best, target), target }
  }
  return { current: 0, target: 1 }
}

function timeUntilWeekReset() {
  const next = new Date(getWeekStart()); next.setDate(next.getDate() + 7)
  const diff = next - Date.now()
  if (diff <= 0) return { days: 0, hours: 0 }
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000) }
}

// ── Weekly slot machine — inline reel cabinet with mechanical lever ──────────
function WeeklySlotMachine({ weeklySpinAvailable, onWin }) {
  const N = WHEEL_PRIZES.length
  const [displayIdx,  setDisplayIdx]  = useState(0)
  const [spinning,    setSpinning]    = useState(false)
  const [winPrize,    setWinPrize]    = useState(null)
  const [leverPulled, setLeverPulled] = useState(false)
  const timerRef = useRef(null)
  const reelRef  = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handlePull() {
    if (!weeklySpinAvailable || spinning) return
    setLeverPulled(true)
    setTimeout(() => setLeverPulled(false), 600)

    const winIdx = Math.floor(Math.random() * N)
    setSpinning(true)
    setWinPrize(null)

    let tick = 0
    let idx  = 0
    const FAST = 22, SLOW = 14, TOTAL = FAST + SLOW

    function step() {
      tick++
      idx = (idx + 1) % N
      setDisplayIdx(idx)

      let delay
      if (tick < FAST) {
        delay = 58
      } else if (tick < TOTAL) {
        const t = (tick - FAST) / SLOW
        delay = 58 + t * t * 310
      } else {
        setDisplayIdx(winIdx)
        setSpinning(false)
        const prize = WHEEL_PRIZES[winIdx]
        setWinPrize(prize)
        playCashRegister()
        onWin?.(prize, reelRef.current?.getBoundingClientRect())
        return
      }
      timerRef.current = setTimeout(step, delay)
    }
    timerRef.current = setTimeout(step, 58)
  }

  const item     = WHEEL_PRIZES[displayIdx]
  const prevItem = WHEEL_PRIZES[(displayIdx - 1 + N) % N]
  const nextItem = WHEEL_PRIZES[(displayIdx + 1) % N]
  const isLocked = !weeklySpinAvailable
  const canPull  = weeklySpinAvailable && !spinning

  return (
    <div style={{ position: 'relative', marginRight: 32, marginBottom: 14 }}>

      {/* ── Mechanical lever ───────────────────────────────────────────────── */}
      <div
        onClick={handlePull}
        title={isLocked ? 'Spun this week' : spinning ? 'Spinning…' : 'Pull to spin!'}
        style={{
          position: 'absolute', right: -32, top: '50%',
          transform: 'translateY(-50%)', zIndex: 50,
          cursor: canPull ? 'pointer' : 'not-allowed',
          userSelect: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        {/* Mount bracket */}
        <div style={{
          width: 20, height: 52,
          background: isLocked
            ? 'linear-gradient(90deg,#3a3a3a,#1e1e1e,#3a3a3a)'
            : 'linear-gradient(90deg,#5a1a1a,#2e0a0a,#5a1a1a)',
          borderRadius: 10,
          border: `2px solid ${isLocked ? '#111' : '#3d0a0a'}`,
          boxShadow: '0 2px 8px #0008',
        }} />
        {/* Arm + ball */}
        <div style={{
          width: 12, height: 72, marginTop: -12,
          transformOrigin: 'top center',
          transform: `rotate(${isLocked ? 36 : leverPulled ? 40 : 0}deg)`,
          transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{
            width: 8, height: 54,
            background: isLocked
              ? 'linear-gradient(90deg,#444,#222,#444)'
              : 'linear-gradient(90deg,#cc2222,#880000,#cc2222)',
            borderRadius: 4,
            border: `1px solid ${isLocked ? '#1a1a1a' : '#5a0000'}`,
          }} />
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: isLocked
              ? 'radial-gradient(circle at 32% 28%,#555,#333)'
              : 'radial-gradient(circle at 32% 28%,#ff6060,#cc0000)',
            border: isLocked ? '2px solid #222' : '2px solid #880000',
            boxShadow: isLocked
              ? '0 1px 4px #0006, inset -2px -2px 4px rgba(0,0,0,0.4)'
              : '0 0 22px #ff000099, 0 0 44px #ff000055, inset -3px -3px 5px rgba(0,0,0,0.5)',
            marginTop: -4, flexShrink: 0,
            animation: canPull ? 'redBallPulse 1s ease-in-out infinite' : 'none',
          }} />
        </div>
      </div>

      {/* ── Cabinet shell ──────────────────────────────────────────────────── */}
      <div style={{
        background: isLocked
          ? 'linear-gradient(180deg,#0d0d0d,#111,#0d0d0d)'
          : 'linear-gradient(180deg,#180404,#2a0808,#180404)',
        border: `4px solid ${isLocked ? '#374151' : '#ef4444'}`,
        borderRadius: 20,
        padding: '20px 18px 18px',
        position: 'relative', overflow: 'hidden',
        animation: canPull ? 'redNeonPulse 1.8s ease-in-out infinite' : 'none',
        boxShadow: canPull
          ? '0 0 32px #ef444444, inset 0 0 16px #ef444411'
          : 'none',
      }}>

        {/* Corner orbs — only when available */}
        {canPull && [{ left: 14 }, { right: 14, animationDelay: '0.75s' }].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', top: 10, ...pos,
            width: 18, height: 18, borderRadius: '50%',
            background: 'radial-gradient(circle,#fca5a5,#ef4444)',
            boxShadow: '0 0 12px #ef4444, 0 0 28px #ef444466',
            animation: 'shimmer 1.5s ease-in-out infinite',
            animationDelay: pos.animationDelay || '0s',
          }} />
        ))}

        {/* Header label */}
        <div style={{
          fontFamily: "'Bangers',sans-serif", fontSize: 22, letterSpacing: '0.09em',
          color: isLocked ? '#4b5563' : '#fca5a5',
          textAlign: 'center', lineHeight: 1, marginBottom: 6,
          textShadow: isLocked ? 'none' : '0 0 18px #ef444466',
        }}>
          🎰 WEEKLY BONUS SPIN
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800,
          letterSpacing: '0.16em', textAlign: 'center', marginBottom: 14,
          color: isLocked ? '#374151' : '#ef4444',
        }}>
          {isLocked ? 'ONE SPIN PER WEEK' : 'WIN 50–200 💎 OR AN ELO SHIELD!'}
        </div>

        {/* ── Reel viewport ────────────────────────────────────────────────── */}
        <div ref={reelRef} style={{
          background: '#020202',
          border: `3px solid ${isLocked ? '#1f2937' : '#ef4444'}`,
          borderRadius: 10, height: 164, overflow: 'hidden',
          position: 'relative',
          boxShadow: isLocked
            ? 'inset 0 0 14px #00000088'
            : 'inset 0 0 20px #0a0000, 0 0 10px #ef444422',
        }}>

          {/* CRT scanlines */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
            background: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.09) 3px,rgba(0,0,0,0.09) 4px)',
          }} />

          {/* Center-row selector bracket */}
          <div style={{
            position: 'absolute', left: 8, right: 8,
            top: '50%', transform: 'translateY(-50%)',
            height: 60, borderRadius: 6, zIndex: 11, pointerEvents: 'none',
            border: `2px solid ${isLocked ? '#37415155' : '#ef444466'}`,
            boxShadow: isLocked ? 'none' : '0 0 12px #ef444433',
          }} />

          {/* Reel column: prev | center | next */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Top ghost */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: spinning ? 0.12 : 0.28, filter: 'blur(2px)',
              fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.06em',
              color: isLocked ? '#374151' : prevItem.color, pointerEvents: 'none',
            }}>
              {prevItem.label}
            </div>

            {/* Center slot — key forces CSS animation on every tick */}
            <div style={{
              height: 60, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <div
                key={displayIdx}
                style={{
                  fontFamily: "'Bangers',sans-serif",
                  fontSize: spinning ? 26 : 34,
                  letterSpacing: '0.1em',
                  color: isLocked ? '#374151' : item.color,
                  textShadow: (!isLocked && !spinning)
                    ? `0 0 24px ${item.color}99, 0 0 8px ${item.color}66`
                    : 'none',
                  animation: spinning
                    ? 'reelSlideIn 0.07s ease-out'
                    : winPrize ? 'winPrizePop 0.38s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                  transition: 'font-size 0.18s',
                }}
              >
                {item.label}
              </div>
            </div>

            {/* Bottom ghost */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: spinning ? 0.12 : 0.28, filter: 'blur(2px)',
              fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.06em',
              color: isLocked ? '#374151' : nextItem.color, pointerEvents: 'none',
            }}>
              {nextItem.label}
            </div>
          </div>

          {/* Locked overlay */}
          {isLocked && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 20,
              background: 'rgba(0,0,0,0.83)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <div style={{
                background: 'linear-gradient(135deg,#7f1d1d,#991b1b)',
                border: '2px solid #ef4444', borderRadius: 8,
                padding: '9px 18px',
                fontFamily: "'Bangers',sans-serif", fontSize: 17, letterSpacing: '0.1em',
                color: '#fca5a5', textAlign: 'center',
                boxShadow: '0 0 20px #ef444455',
              }}>
                🛡️ CABINET LOCKED
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800,
                color: '#6b7280', letterSpacing: '0.14em',
              }}>
                SPUN THIS WEEK
              </div>
            </div>
          )}

          {/* Win radial glow */}
          {winPrize && !spinning && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 12, pointerEvents: 'none',
              background: `radial-gradient(circle at 50% 50%,${winPrize.color}33,transparent 72%)`,
              animation: 'shimmer 1.2s ease-in-out infinite',
            }} />
          )}
        </div>

        {/* Win announcement */}
        {winPrize && !spinning && (
          <div style={{
            marginTop: 12, textAlign: 'center',
            fontFamily: "'Bangers',sans-serif", fontSize: 22, letterSpacing: '0.08em',
            color: '#fbbf24', textShadow: '0 0 18px #fbbf2466',
            animation: 'shimmer 1.2s ease-in-out infinite',
          }}>
            🎉 YOU WON: {winPrize.label}
          </div>
        )}

        {/* Pull prompt — only when idle + available */}
        {!winPrize && !spinning && canPull && (
          <div style={{
            marginTop: 10, textAlign: 'center',
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800,
            color: '#ef4444', letterSpacing: '0.16em',
            animation: 'shimmer 1s ease-in-out infinite',
          }}>
            ← PULL LEVER TO SPIN! 🚀
          </div>
        )}
      </div>
    </div>
  )
}

// Fast dummy text for the shuffle blur — gives the slot-machine feel
const SHUFFLE_POOL = [
  'Log 20 Backhands', 'Hit 90% Accuracy', 'Win a Match',
  'Score 15 Wrist Shots', 'Play 2 P-U-C-K', 'Hit 85% Accuracy',
  'Log 30 Shots', 'Win 1 Versus', 'Score a Bar Down',
  'Log 75 Shots', 'Hit 70% in a Session', 'Challenge a Friend',
  'Get 8 Hits Top-Left', 'Snap Shot Barrage', 'Perfect 10/10 Set',
  'Log 50 Slap Shots', 'Accuracy Grind 80%', 'Dominate Versus Tab',
]

function pickQuests() {
  const pick  = arr => arr[Math.floor(Math.random() * arr.length)]
  const stamp = q => ({
    ...q,
    targetProgress:  parseQuestTarget(q.text),
    currentProgress: 0,
    completed:       false,
    claimed:         false,
    suffix:          parseQuestSuffix(q.text),
  })
  return [
    stamp(pick(QUEST_POOL.volume)),
    stamp(pick(QUEST_POOL.quality)),
    stamp(pick(QUEST_POOL.social)),
  ]
}

const TIER_COLORS = {
  common:    { border: '#22c55e', glow: '#22c55e' },
  rare:      { border: '#3b82f6', glow: '#3b82f6' },
  epic:      { border: '#a855f7', glow: '#a855f7' },
  legendary: { border: '#fbbf24', glow: '#fbbf24' },
  red:       { border: '#ef4444', glow: '#ef4444' },
}

function timeUntilReset() {
  const now   = new Date()
  const reset = new Date(now)
  reset.setHours(24, 0, 0, 0)
  const ms = reset.getTime() - now.getTime()
  return { h: Math.floor(ms / 3600000), m: Math.floor((ms % 3600000) / 60000) }
}

function questTab(text) {
  if (/Versus/i.test(text))                                   return 'challenges'
  if (/P-U-C-K/i.test(text))                                 return 'session'
  if (/Shots|Accuracy|Log|Session|Set|Practice/i.test(text)) return 'session'
  return null
}

// Thin wrapper — delegates to the shared helper so display and reward logic
// always use the same computation.
const getQuestProgress = (text, sessions) => computeQuestProgress(text, sessions)

// ── Quest row ─────────────────────────────────────────────────────────────────
function QuestRow({ quest, progress, isSpinning, shuffleText, onNavigate, onClaim }) {
  const tc          = TIER_COLORS[quest.tier] || TIER_COLORS.common
  const label       = isSpinning ? shuffleText : quest.text
  const tabTarget   = questTab(label)
  const isPlaceholder = quest.reward === '?'

  const isDone      = quest.completed || (!isPlaceholder && progress ? progress.current >= progress.target : false)
  const isClaimed   = quest.claimed || false
  const isClaimable = isDone && !isClaimed && !isPlaceholder && !isSpinning
  const sfx         = progress?.suffix || quest.suffix || ''

  function handleClick(e) {
    if (isClaimable) {
      onClaim?.(e.currentTarget.getBoundingClientRect())
    } else if (tabTarget && !isSpinning) {
      onNavigate(tabTarget)
    }
  }

  // Card chrome adapts to state
  const cardBg     = isClaimable ? 'linear-gradient(135deg,#1c0e00,#2d1500)'
                   : isClaimed   ? 'linear-gradient(135deg,#091a0a,#0c200d)'
                   : isDone      ? 'linear-gradient(135deg,#091a0a,#0c200d)'
                   :               'linear-gradient(135deg,#0f0c1a,#1a0f20)'
  const cardBorder = isClaimable ? '#fbbf24'
                   : isClaimed   ? '#22c55e'
                   : isDone      ? '#22c55e'
                   :               tc.border
  const cardShadow = isClaimable ? '0 0 26px #fbbf2444'
                   : isClaimed   ? '0 0 22px #22c55e33'
                   : isDone      ? '0 0 22px #22c55e33'
                   :               `0 0 18px ${tc.glow}44`

  return (
    <div
      onClick={handleClick}
      style={{
        background: cardBg,
        border: `3px solid ${cardBorder}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 10,
        display: 'grid', gridTemplateColumns: '52px 1fr 72px', gap: 12,
        alignItems: 'center',
        boxShadow: cardShadow,
        cursor: (isClaimable || (tabTarget && !isSpinning)) ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        if (isClaimable) { e.currentTarget.style.transform = 'scale(1.015)'; e.currentTarget.style.boxShadow = '0 0 40px #fbbf2466' }
        else if (tabTarget && !isSpinning) { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = `0 0 30px ${cardBorder}66` }
      }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = cardShadow }}
    >
      {/* Left: hex icon */}
      <div style={{
        width: 52, height: 52, flexShrink: 0,
        clipPath: 'polygon(30% 0%,70% 0%,100% 50%,70% 100%,30% 100%,0% 50%)',
        background: isClaimable ? 'linear-gradient(135deg,#92400e66,#fbbf2422)'
          : isDone ? 'linear-gradient(135deg,#14532d66,#22c55e22)'
          : `linear-gradient(135deg,${tc.glow}33,${tc.glow}11)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, transition: 'font-size 0.06s',
      }}>
        {isSpinning ? '⚡' : quest.icon}
      </div>

      {/* Center */}
      <div>
        {/* Quest title */}
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: isSpinning ? 13 : 15, fontWeight: 800,
          color: isSpinning ? tc.border
            : isClaimable   ? '#fef3c7'
            : isClaimed     ? '#4ade80'
            : isDone        ? '#4ade80'
            :                 '#ffffff',
          letterSpacing: '0.06em', transition: 'color 0.06s', minHeight: 18, lineHeight: 1.2,
        }}>
          {label}
        </div>

        {/* Status badge + counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          {/* Status badge */}
          <div
            className={isClaimable ? 'claim-pulse' : ''}
            style={{
              display: 'inline-block', padding: '3px 9px', borderRadius: 5,
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800,
              letterSpacing: '0.12em',
              background: isClaimed   ? '#14532d'
                : isClaimable         ? '#92400e'
                : isDone              ? '#14532d'
                : isSpinning          ? '#0c1a26'
                :                       '#0c1a26',
              color: isClaimed   ? '#4ade80'
                : isClaimable    ? '#fbbf24'
                : isDone         ? '#4ade80'
                : isSpinning     ? '#475569'
                :                  '#22d3ee',
              border: `1px solid ${isClaimed ? '#22c55e66' : isClaimable ? '#f59e0b' : isDone ? '#22c55e66' : isSpinning ? '#1e293b' : '#0e749066'}`,
              boxShadow: isClaimed ? '0 0 8px #22c55e44' : isDone && !isClaimable ? '0 0 8px #22c55e44' : isSpinning ? 'none' : '0 0 6px #22d3ee22',
              transition: 'all 0.06s',
            }}
          >
            {isSpinning   ? '⏳ ROLLING...'
             : isClaimed  ? '✅ CLAIMED!'
             : isClaimable? '✨ TAP TO CLAIM!'
             : isDone     ? '✅ COMPLETE!'
             :              '⬜ INCOMPLETE'}
          </div>

          {/* Live counter */}
          {!isSpinning && !isPlaceholder && (progress || quest.targetProgress) && (
            <span style={{
              fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.05em', lineHeight: 1,
              color: isClaimed ? '#4ade80' : isClaimable ? '#fbbf24' : isDone ? '#fbbf24' : '#4ade80',
              textShadow: (isClaimed || isDone) ? '0 0 10px #fbbf2444' : '0 0 8px #4ade8044',
            }}>
              {(isClaimed || isDone)
                ? '✨ COMPLETED'
                : progress
                  ? `${progress.current}${sfx} / ${progress.target}${sfx}`
                  : `${quest.currentProgress || 0} / ${quest.targetProgress}`}
            </span>
          )}
        </div>

        {/* Nav hint / claim reward hint */}
        {!isSpinning && !isClaimed && (
          isClaimable ? (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#fbbf24', marginTop: 5, letterSpacing: '0.1em' }}>
              💎 +{quest.reward} DIAMONDS READY TO COLLECT
            </div>
          ) : !isDone && tabTarget && (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#fbbf24', marginTop: 5, letterSpacing: '0.1em' }}>
              {tabTarget === 'challenges'
              ? '⚔️ TAP → VERSUS TAB'
              : /P-U-C-K/i.test(quest.text)
                ? '🎮 TAP → SHOOT TAB'
                : '🏒 TAP → TARGET PRACTICE'}
            </div>
          )
        )}
      </div>

      {/* Right: diamond reward */}
      <div style={{ textAlign: 'center', opacity: isClaimed ? 0.35 : 1 }}>
        <div style={{ fontSize: 20, animation: isClaimable ? 'diamondPulse 0.8s ease-in-out infinite' : 'diamondPulse 2s ease-in-out infinite', marginBottom: 2 }}>💎</div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: isClaimable ? '#fbbf24' : '#f1f5f9', letterSpacing: '0.04em' }}>
          +{quest.reward}
        </div>
      </div>
    </div>
  )
}

// ── Lever ─────────────────────────────────────────────────────────────────────
function StadiumLever({ disabled, onSpin, isSpinning }) {
  const [pulled, setPulled] = useState(false)

  function handlePull() {
    if (disabled || isSpinning || pulled) return
    setPulled(true)
    onSpin()
    setTimeout(() => setPulled(false), 500)
  }

  return (
    <div
      onClick={handlePull}
      title={disabled ? 'Already spun today' : 'Pull to spin!'}
      style={{
        position: 'absolute', right: -28, top: '50%',
        transform: 'translateY(-50%)', zIndex: 50,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'opacity 0.3s',
        userSelect: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
    >
      <div style={{
        width: 18, height: 50,
        background: 'linear-gradient(90deg,#5a5a5a,#2e2e2e,#5a5a5a)',
        borderRadius: 9, border: '2px solid #111',
        boxShadow: '0 2px 8px #0008',
      }} />
      <div style={{
        width: 12, height: 70, marginTop: -12,
        transformOrigin: 'top center',
        transform: `rotate(${pulled ? -40 : 0}deg)`,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 8, height: 52,
          background: 'linear-gradient(90deg,#666,#333,#666)',
          borderRadius: 4, border: '1px solid #1a1a1a',
        }} />
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'radial-gradient(circle at 32% 28%,#ff7070,#cc0000)',
          border: '2px solid #880000',
          boxShadow: '0 0 14px #ff222288, inset -3px -3px 5px rgba(0,0,0,0.5)',
          marginTop: -4, flexShrink: 0,
        }} />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DailyQuests({
  player, sessions = [], onNavigate, onDiamondEarn, onSpinComplete, onClaimQuest,
  onClaimWeeklyQuest, onWeeklySpinComplete, onInitWeeklyQuests,
}) {
  const [spinning,      setSpinning]      = useState(false)
  const [currentQuests, setCurrentQuests] = useState(
    player.daily_quests?.length ? player.daily_quests : []
  )
  const [shuffleTexts, setShuffleTexts] = useState(['','',''])
  const [burst,        setBurst]        = useState(null)

  // ── Weekly quest state ────────────────────────────────────────────────────
  const [weeklyQuests, setWeeklyQuests] = useState(player.weekly_quests || [])

  const intervalRef  = useRef(null)
  const spinAudioRef = useRef(null)
  const bgMusicRef   = useRef(null)
  const mutedRef     = useRef(false)
  const [musicMuted, setMusicMuted] = useState(false)

  // ── Quest tab background music ────────────────────────────────────────────
  // Single persistent Audio instance stored in a ref. Attempts immediate play
  // on mount; if the browser blocks autoplay, a window click listener retries
  // every time the user clicks anywhere until it succeeds. Full cleanup on
  // unmount: listener removed, track paused, timeline reset.
  useEffect(() => {
    const audio = new Audio(questMusicUrl)
    audio.loop   = true
    audio.volume = 0.25
    bgMusicRef.current = audio

    audio.addEventListener('error', e =>
      console.error('Quest Music Error Code:', e.target.error)
    )

    const playAudio = () => {
      if (audio.paused && !mutedRef.current) {
        audio.play().catch(err => console.log('Autoplay blocked, waiting for click...', err))
      }
    }

    // Persistent window listener — retries on every click until playing
    window.addEventListener('click', playAudio)

    // Attempt immediate play (works when user has previously interacted)
    playAudio()

    return () => {
      window.removeEventListener('click', playAudio)
      audio.pause()
      audio.currentTime = 0
      bgMusicRef.current = null
    }
  }, []) // eslint-disable-line

  // Toggle: pause for real when muted, resume play when unmuted
  function handleMuteToggle() {
    const nowMuted = !mutedRef.current
    mutedRef.current = nowMuted
    setMusicMuted(nowMuted)
    const audio = bgMusicRef.current
    if (!audio) return
    if (nowMuted) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }

  // Sync completed/claimed flags written by the session-end path back into
  // local display state without triggering during the spin animation.
  const questStateKey = (player.daily_quests || [])
    .map(q => `${q.completed ? 1 : 0}${q.claimed ? 1 : 0}${q.currentProgress || 0}`)
    .join(',')
  useEffect(() => {
    if (spinning || !player.daily_quests?.length) return
    setCurrentQuests(player.daily_quests)
  }, [questStateKey]) // eslint-disable-line

  // ── Auto-init weekly quests on new week ────────────────────────────────────
  useEffect(() => {
    const weekStart = getWeekStart().toDateString()
    if (player.last_weekly_quest_pick !== weekStart) {
      const newQ = pickWeeklyQuests()
      setWeeklyQuests(newQ)
      onInitWeeklyQuests?.(newQ)
    }
  }, []) // eslint-disable-line

  // Sync weekly quests from parent (e.g. after claim persisted to Firestore)
  const weeklyQuestStateKey = (player.weekly_quests || [])
    .map(q => `${q.completed ? 1 : 0}${q.claimed ? 1 : 0}`)
    .join(',')
  useEffect(() => {
    if (player.weekly_quests?.length) setWeeklyQuests(player.weekly_quests)
  }, [weeklyQuestStateKey]) // eslint-disable-line

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
        dy:    Math.round(Math.sin(angle) * dist - 35),  // bias upward
        delay: (Math.random() * 0.18).toFixed(2),
        size:  Math.round(18 + Math.random() * 12),
      }
    })
    setBurst(particles)
    setTimeout(() => setBurst(null), 1400)
  }

  function handleClaim(questIndex, rect) {
    const quest = currentQuests[questIndex]
    if (!quest?.completed || quest.claimed) return

    // Optimistic local update — instant visual feedback
    setCurrentQuests(prev =>
      prev.map((q, i) => i === questIndex ? { ...q, claimed: true } : q)
    )

    playCashRegister()
    fireBurst(rect)

    // Persist: award diamonds + mark claimed in Firestore via parent
    onClaimQuest?.(questIndex)
  }

  function handleClaimWeekly(questIndex, rect) {
    const quest = displayWeeklyQuests[questIndex]
    if (!quest?.completed || quest.claimed) return
    setWeeklyQuests(prev => prev.map((q, i) => i === questIndex ? { ...q, claimed: true } : q))
    playCashRegister()
    fireBurst(rect)
    onClaimWeeklyQuest?.(questIndex, quest.reward)
  }

  const today              = new Date().toDateString()
  const spinAvailable      = player.last_quest_spin !== today
  const { h, m }           = timeUntilReset()
  const weeklySpinAvailable = !player.lastWeeklySpin || new Date(player.lastWeeklySpin) < getWeekStart()
  const { days: wDays, hours: wHours } = timeUntilWeekReset()

  // Compute live weekly progress from sessions (pure, recalculated each render)
  const displayWeeklyQuests = weeklyQuests.map(q => {
    if (q.claimed) return q
    const prog = computeWeeklyQuestProgress(q.text, sessions, player.id)
    return { ...q, currentProgress: prog.current, targetProgress: prog.target, completed: prog.current >= prog.target }
  })
  const allWeeklyClaimed = displayWeeklyQuests.length > 0 && displayWeeklyQuests.every(q => q.claimed)

  function handleSpin() {
    if (!spinAvailable || spinning) return

    // ── Audio: must be created inside user-gesture handler for mobile ─────────
    const spinAudio = new Audio('https://actions.google.com/sounds/v1/science_fiction/glitchy_digital_texture.ogg')
    spinAudio.loop   = true
    spinAudio.volume = 0.35
    spinAudio.play().catch(err => console.log('spin audio blocked:', err))
    spinAudioRef.current = spinAudio

    setSpinning(true)

    // 60ms shuffle — all 3 rows update independently
    intervalRef.current = setInterval(() => {
      setShuffleTexts([
        SHUFFLE_POOL[Math.floor(Math.random() * SHUFFLE_POOL.length)],
        SHUFFLE_POOL[Math.floor(Math.random() * SHUFFLE_POOL.length)],
        SHUFFLE_POOL[Math.floor(Math.random() * SHUFFLE_POOL.length)],
      ])
    }, 60)

    // After 2 seconds: stop shuffle, lock in real quests, play win sound
    setTimeout(() => {
      clearInterval(intervalRef.current)

      // Stop spin audio
      if (spinAudioRef.current) {
        spinAudioRef.current.pause()
        spinAudioRef.current = null
      }

      // Lock/win sound
      const lockAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav')
      lockAudio.volume = 0.6
      lockAudio.play().catch(err => console.log('lock audio blocked:', err))

      const picked = pickQuests()
      setCurrentQuests(picked)
      setShuffleTexts(['', '', ''])
      setSpinning(false)
      onSpinComplete?.(picked)
    }, 2000)
  }

  // Placeholder row shown before first spin
  const placeholders = [0, 1, 2].map(i => ({
    id: `placeholder-${i}`,
    text: '— PULL THE LEVER —',
    tier: 'common',
    reward: '?',
    icon: '❓',
  }))

  const displayQuests = currentQuests.length ? currentQuests : placeholders

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

      {/* ── Tab header row: label + music toggle (outside the gold frame) ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.2em' }}>
          DAILY QUESTS
        </div>
        <button
          onClick={handleMuteToggle}
          title={musicMuted ? 'Unmute quest music' : 'Mute quest music'}
          style={{
            background: musicMuted ? 'rgba(15,23,42,0.7)' : 'rgba(251,191,36,0.12)',
            border: `1px solid ${musicMuted ? '#334155' : '#fbbf2444'}`,
            borderRadius: 8, padding: '4px 9px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9,
            fontWeight: 800, letterSpacing: '0.1em',
            color: musicMuted ? '#475569' : '#fbbf24',
            transition: 'all 0.15s',
          }}
        >
          <span>{musicMuted ? '🔇' : '🎵'}</span>
          <span>{musicMuted ? 'OFF' : 'ON'}</span>
        </button>
      </div>

      {/* ── Diamond burst particles ────────────────────────────────────────── */}
      {burst && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 900, pointerEvents: 'none' }}>
          {burst.map(p => (
            <div
              key={p.id}
              style={{
                position: 'fixed',
                left: p.left,
                top:  p.top,
                fontSize: p.size,
                lineHeight: 1,
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                animation: `diamondBurst 1.2s ease-out ${p.delay}s both`,
              }}
            >
              💎
            </div>
          ))}
        </div>
      )}

      {/* ── Billboard + lever wrapper ─────────────────────────────────────── */}
      <div style={{ position: 'relative', marginRight: 28 }}>

        <StadiumLever disabled={!spinAvailable} onSpin={handleSpin} isSpinning={spinning} />

        <div style={{
          background: 'linear-gradient(135deg,#0a0810,#1a0f25)',
          border: '4px solid #fbbf24', borderRadius: 20,
          padding: '32px 18px 20px', marginBottom: 20,
          boxShadow: '0 0 40px #fbbf2444, inset 0 0 20px #fbbf2211',
          position: 'relative', overflow: 'visible',
        }}>

          {/* Stadium light orbs */}
          {[{ left: 14 }, { right: 14, animationDelay: '0.75s' }].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', top: 10, ...pos,
              width: 22, height: 22, borderRadius: '50%',
              background: 'radial-gradient(circle,#ffd700,#f59e0b)',
              boxShadow: '0 0 18px #fbbf24, 0 0 40px #fbbf2466',
              animation: `shimmer 1.5s ease-in-out infinite`,
              animationDelay: pos.animationDelay || '0s',
            }} />
          ))}

          {/* Header */}
          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 42, color: '#fbbf24',
            textAlign: 'center', letterSpacing: '0.08em',
            textShadow: '0 0 30px #fbbf2466, 0 2px 0 #7a5a00',
            marginBottom: 10, lineHeight: 1,
          }}>
            DAILY QUESTS
          </div>

          {/* Countdown */}
          <div style={{
            background: '#0f0a04', border: '2px solid #fbbf24',
            borderRadius: 20, padding: '8px 16px',
            textAlign: 'center', marginBottom: 18,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            fontWeight: 700, color: '#fbbf24', letterSpacing: '0.14em',
          }}>
            🕛 RESETS IN: {h}H {m}M
          </div>

          {/* Spinning status banner */}
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

          {/* Quest rows — always 3 */}
          {displayQuests.map((quest, i) => (
            <QuestRow
              key={i}
              quest={quest}
              progress={quest.reward !== '?' ? getQuestProgress(quest.text, sessions) : null}
              isSpinning={spinning}
              shuffleText={shuffleTexts[i] || SHUFFLE_POOL[0]}
              onNavigate={onNavigate}
              onClaim={rect => handleClaim(i, rect)}
            />
          ))}

          {/* Spin / locked button */}
          <button
            onClick={spinAvailable && !spinning ? handleSpin : undefined}
            disabled={!spinAvailable || spinning}
            style={{
              width: '100%',
              background: spinAvailable && !spinning
                ? 'linear-gradient(135deg,#aa6600,#fbbf24)'
                : '#1e2335',
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

      {/* ══════════════════════════════════════════════════════════════════
          WEEKLY QUESTS
      ══════════════════════════════════════════════════════════════════ */}

      {/* ── Red separator ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 20px' }}>
        <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,transparent,#ef4444,transparent)' }} />
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: '0.2em' }}>● ● ●</div>
        <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,transparent,#ef4444,transparent)' }} />
      </div>

      {/* ── Weekly Bonus Spin slot machine — above the main quest card ─── */}
      <WeeklySlotMachine
        weeklySpinAvailable={weeklySpinAvailable}
        onWin={(prize, rect) => {
          if (rect) fireBurst(rect)
          onWeeklySpinComplete?.(prize)
        }}
      />

      {/* ── Main weekly quests cabinet — mirrors Daily Quests card exactly ── */}
      <div style={{
        background: 'linear-gradient(135deg,#0a0508,#1a0a10)',
        border: '4px solid #ef4444', borderRadius: 20,
        padding: '32px 18px 20px', marginBottom: 20,
        boxShadow: '0 0 40px #ef444444, inset 0 0 20px #ef444411',
        position: 'relative', overflow: 'visible',
      }}>

        {/* Red corner orbs — identical placement to Daily gold orbs */}
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

        {/* Title — identical Bangers/size/color as DAILY QUESTS */}
        <div style={{
          fontFamily: "'Bangers',sans-serif", fontSize: 42, color: '#fbbf24',
          textAlign: 'center', letterSpacing: '0.08em',
          textShadow: '0 0 30px #fbbf2466, 0 2px 0 #7a5a00',
          marginBottom: 10, lineHeight: 1,
        }}>
          WEEKLY QUESTS 📆
        </div>

        {/* Reset countdown — red pill matching Daily's gold pill */}
        <div style={{
          background: '#140203', border: '2px solid #ef4444',
          borderRadius: 20, padding: '8px 16px',
          textAlign: 'center', marginBottom: 18,
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
          fontWeight: 700, color: '#fca5a5', letterSpacing: '0.14em',
        }}>
          🗓️ RESETS IN: {wDays} DAYS {wHours} HOURS
        </div>

        {/* Quest rows — reuse QuestRow for full visual/font parity with Daily */}
        {displayWeeklyQuests.length === 0 ? (
          <div style={{ textAlign: 'center', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#475569', padding: '20px 0' }}>
            Weekly quests loading…
          </div>
        ) : displayWeeklyQuests.map((quest, idx) => (
          <QuestRow
            key={quest.id || idx}
            quest={quest}
            progress={{ current: quest.currentProgress ?? 0, target: quest.targetProgress ?? 1 }}
            isSpinning={false}
            shuffleText=""
            onNavigate={onNavigate}
            onClaim={rect => handleClaimWeekly(idx, rect)}
          />
        ))}

        {/* Footer locked bar — mirrors Daily's bottom button in red */}
        <button
          disabled
          style={{
            width: '100%',
            background: allWeeklyClaimed
              ? 'linear-gradient(135deg,#14532d,#166534)'
              : '#1e0a0a',
            color:  allWeeklyClaimed ? '#4ade80' : '#6b2020',
            border: allWeeklyClaimed ? '2px solid #22c55e' : '2px solid #3d1010',
            borderRadius: 12, padding: '14px',
            fontFamily: "'Bangers',sans-serif", fontSize: 20, fontWeight: 700,
            letterSpacing: '0.08em', cursor: 'not-allowed',
            boxShadow: allWeeklyClaimed ? '0 0 16px #22c55e44' : 'none',
            transition: 'all 0.3s',
          }}
        >
          {allWeeklyClaimed
            ? '✅ ALL WEEKLY QUESTS COMPLETE!'
            : `🔒 QUESTS LOCKED — RESETS IN ${wDays}D ${wHours}H`}
        </button>
      </div>

    </div>
  )
}
