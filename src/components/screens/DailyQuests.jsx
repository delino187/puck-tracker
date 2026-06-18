import { useState, useRef, useEffect } from 'react'
import { computeQuestProgress, parseQuestTarget, parseQuestSuffix } from '../../utils/questHelpers.js'
import { playCashRegister } from '../../utils/arcadeSounds.js'
import { getWeekStart } from '../../utils/stats.js'

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

// ── Weekly quest pool — high-volume multi-session challenges ─────────────────
const WEEKLY_QUEST_POOL = [
  { id: 'wq1', text: 'Log 500 Total Shots in Target Practice this Week',    reward: 250, icon: '🏒' },
  { id: 'wq2', text: 'Log 300 Total Shots in Target Practice this Week',    reward: 150, icon: '🏒' },
  { id: 'wq3', text: 'Complete 7 Training Sessions this Week',              reward: 125, icon: '📅' },
  { id: 'wq4', text: 'Complete 5 Training Sessions this Week',              reward: 75,  icon: '📅' },
  { id: 'wq5', text: 'Hit 75% Accuracy across 3 Sessions this Week',        reward: 175, icon: '📊' },
  { id: 'wq6', text: 'Hit 85% Accuracy across 5 Sessions this Week',        reward: 250, icon: '🔥' },
  { id: 'wq7', text: 'Log 200 Shots in a Single Day this Week',             reward: 200, icon: '💥' },
  { id: 'wq8', text: 'Log 50 Sets in Target Practice this Week',            reward: 100, icon: '🎯' },
  { id: 'wq9', text: 'Hit 80% Accuracy across 5 Sessions this Week',        reward: 200, icon: '🔥' },
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
  const shuffled = [...WEEKLY_QUEST_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3).map(q => ({ ...q, currentProgress: 0, completed: false, claimed: false }))
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
  const accAcross = text.match(/Hit (\d+)% Accuracy across (\d+) Sessions/i)
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

// ── Prize wheel modal sub-component ─────────────────────────────────────────
function WheelModal({ onResult, onClose }) {
  const [angle,    setAngle]    = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result,   setResult]   = useState(null)
  const N       = WHEEL_PRIZES.length
  const segSize = 360 / N

  function spin() {
    if (spinning || result) return
    const idx        = Math.floor(Math.random() * N)
    const finalAngle = -(5 * 360 + idx * segSize + segSize / 2)
    setAngle(finalAngle)
    setSpinning(true)
    setTimeout(() => { setSpinning(false); setResult(WHEEL_PRIZES[idx]) }, 4500)
  }

  const conicGrad = WHEEL_PRIZES.map((p, i) =>
    `${p.color} ${i * segSize}deg ${(i + 1) * segSize}deg`
  ).join(', ')

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'linear-gradient(180deg,#1a0a2a,#2d1050)', border: '4px solid #fbbf24', borderRadius: 26, padding: '28px 20px 24px', textAlign: 'center', maxWidth: 340, width: '100%', boxShadow: '0 0 70px #fbbf2444' }}
      >
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 28, letterSpacing: '0.1em', color: '#fbbf24', textShadow: '2px 2px 0 #78350f', marginBottom: 6 }}>
          🎰 WEEKLY BONUS SPIN
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#a78bfa', letterSpacing: '0.12em', marginBottom: 18 }}>
          ONE SPIN PER WEEK — WIN BIG PRIZES
        </div>

        {/* Wheel */}
        <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto 16px' }}>
          {/* Pointer */}
          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '22px solid #fbbf24', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
          {/* Rotating wheel */}
          <div style={{ width: 220, height: 220, borderRadius: '50%', background: `conic-gradient(from 0deg, ${conicGrad})`, transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 4.5s cubic-bezier(0.15, 0.85, 0.2, 1)' : 'none', border: '4px solid #fbbf24', boxShadow: '0 0 30px #fbbf2444, inset 0 0 20px rgba(0,0,0,0.3)' }} />
          {/* Center hub */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#1e293b,#0f172a)', border: '3px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bangers',sans-serif", fontSize: 9, color: '#fbbf24', letterSpacing: '0.06em' }}>
            SPIN
          </div>
        </div>

        {/* Prize legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
          {WHEEL_PRIZES.filter((p, i, a) => a.findIndex(x => x.label === p.label) === i).map(p => (
            <span key={p.label} style={{ background: p.color, color: '#fff', borderRadius: 10, padding: '2px 8px', fontFamily: "'Bangers',sans-serif", fontSize: 12, letterSpacing: '0.05em' }}>{p.label}</span>
          ))}
        </div>

        {/* Result reveal */}
        {result && !spinning && (
          <div style={{ background: 'rgba(251,191,36,0.1)', border: '2px solid #fbbf24', borderRadius: 14, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 24, color: '#fbbf24', letterSpacing: '0.08em' }}>
              🎉 YOU WON: {result.label}
            </div>
          </div>
        )}

        {/* Action button */}
        {!result ? (
          <button
            onClick={spin}
            disabled={spinning}
            style={{ width: '100%', padding: '14px', background: spinning ? '#374151' : 'linear-gradient(180deg,#fbbf24,#d97706)', border: spinning ? '2px solid #4b5563' : '3px solid #92400e', borderRadius: 28, fontFamily: "'Bangers',sans-serif", fontSize: 22, color: spinning ? '#9ca3af' : '#1a0a00', cursor: spinning ? 'not-allowed' : 'pointer', boxShadow: spinning ? 'none' : '0 4px 0 #92400e, 0 0 20px #fbbf2455' }}
          >
            {spinning ? '🌀 SPINNING...' : '🎰 SPIN NOW!'}
          </button>
        ) : (
          <button
            onClick={() => { onResult(result); onClose() }}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(180deg,#4ade80,#16a34a)', border: '3px solid #15803d', borderRadius: 28, fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 0 #15803d, 0 0 20px #4ade8055' }}
          >
            CLAIM IT! 🎉
          </button>
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
  const [weeklyQuests,   setWeeklyQuests]   = useState(player.weekly_quests || [])
  const [showWheelModal, setShowWheelModal] = useState(false)

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
    const audio = new Audio('/quest-tab-music.mp3')
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
        @keyframes shimmer      { 0%,100%{ opacity:1 } 50%{ opacity:0.6 } }
        @keyframes diamondPulse { 0%,100%{ opacity:1; transform:scale(1) } 50%{ opacity:0.7; transform:scale(1.14) } }
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

      {/* Prize wheel modal */}
      {showWheelModal && (
        <WheelModal
          onResult={prize => {
            fireBurst({ left: window.innerWidth / 2 - 50, top: window.innerHeight / 2 - 80, width: 100, height: 10 })
            playCashRegister()
            onWeeklySpinComplete?.(prize)
          }}
          onClose={() => setShowWheelModal(false)}
        />
      )}

      {/* Section header */}
      <div style={{ marginTop: 28, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.08em', color: '#f1f5f9', lineHeight: 1 }}>
            WEEKLY QUESTS 📆
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#22d3ee', letterSpacing: '0.14em', marginTop: 3 }}>
            RESETS IN: {wDays}d {wHours}h
          </div>
        </div>
      </div>

      {/* Weekly Bonus Spin card */}
      <div style={{
        background: weeklySpinAvailable
          ? 'linear-gradient(135deg,#2d1050,#1a0a2a)'
          : 'rgba(15,23,42,0.6)',
        border: `2px solid ${weeklySpinAvailable ? '#a855f7' : '#1e293b'}`,
        borderRadius: 16, padding: '14px 16px', marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        boxShadow: weeklySpinAvailable ? '0 0 24px #a855f733' : 'none',
      }}>
        <div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, color: weeklySpinAvailable ? '#e879f9' : '#475569', letterSpacing: '0.07em', lineHeight: 1 }}>
            🎰 WEEKLY BONUS SPIN
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: weeklySpinAvailable ? '#d8b4fe' : '#334155', letterSpacing: '0.08em', marginTop: 3 }}>
            {weeklySpinAvailable ? 'Win 50–200 💎 or an ELO Shield!' : '🔒 SPUN THIS WEEK'}
          </div>
        </div>
        <button
          disabled={!weeklySpinAvailable}
          onClick={() => weeklySpinAvailable && setShowWheelModal(true)}
          style={{
            flexShrink: 0,
            background: weeklySpinAvailable ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#1e293b',
            border: weeklySpinAvailable ? 'none' : '1px solid #334155',
            borderRadius: 12, padding: '8px 14px',
            fontFamily: "'Bangers',sans-serif", fontSize: 15, letterSpacing: '0.06em',
            color: weeklySpinAvailable ? '#fff' : '#475569',
            cursor: weeklySpinAvailable ? 'pointer' : 'not-allowed',
            boxShadow: weeklySpinAvailable ? '0 0 16px #a855f755' : 'none',
          }}
        >
          {weeklySpinAvailable ? 'SPIN!' : '—'}
        </button>
      </div>

      {/* Weekly quest rows */}
      {displayWeeklyQuests.length === 0 ? (
        <div style={{ background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 12, padding: '20px', textAlign: 'center', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'var(--text-muted)' }}>
          Weekly quests loading…
        </div>
      ) : displayWeeklyQuests.map((quest, idx) => {
        const pct = quest.targetProgress > 0
          ? Math.min(100, Math.round((quest.currentProgress / quest.targetProgress) * 100))
          : 0
        const isClaimable = quest.completed && !quest.claimed

        return (
          <div
            key={quest.id || idx}
            style={{
              background: quest.claimed
                ? 'rgba(15,23,42,0.4)'
                : isClaimable
                  ? 'linear-gradient(135deg,#1a2e1a,#0d1f0d)'
                  : 'var(--card-bg)',
              border: quest.claimed
                ? '1px solid #1e293b'
                : isClaimable
                  ? '2px solid #22c55e'
                  : '1px solid #334155',
              borderRadius: 14, padding: '14px 16px', marginBottom: 10,
              opacity: quest.claimed ? 0.55 : 1,
              boxShadow: isClaimable ? '0 0 16px #22c55e22' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{quest.icon || '📆'}</span>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: quest.claimed ? '#475569' : 'var(--text-1)', lineHeight: 1.3 }}>
                    {quest.text}
                  </span>
                </div>
                {/* Progress fraction */}
                {!quest.claimed && (
                  <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, color: quest.completed ? '#4ade80' : '#22d3ee', letterSpacing: '0.04em', lineHeight: 1 }}>
                    {quest.currentProgress ?? 0} / {quest.targetProgress ?? '?'}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: '#fbbf24', letterSpacing: '0.05em' }}>
                  +{quest.reward} 💎
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {!quest.claimed && (
              <div style={{ background: '#1e293b', borderRadius: 6, height: 6, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{
                  height: '100%', borderRadius: 6,
                  background: quest.completed
                    ? 'linear-gradient(90deg,#22c55e,#4ade80)'
                    : 'linear-gradient(90deg,#06b6d4,#22d3ee)',
                  width: `${pct}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            )}

            {/* Claim / status */}
            {quest.claimed ? (
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: '0.1em' }}>
                ✅ CLAIMED
              </div>
            ) : isClaimable ? (
              <button
                className="claim-pulse"
                onClick={e => handleClaimWeekly(idx, e.currentTarget.getBoundingClientRect())}
                style={{ width: '100%', padding: '8px', borderRadius: 10, fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.06em', color: '#fbbf24', cursor: 'pointer' }}
              >
                ✨ TAP TO CLAIM!
              </button>
            ) : (
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.1em' }}>
                {pct}% COMPLETE
              </div>
            )}
          </div>
        )
      })}

    </div>
  )
}
