import { useState, useRef, useEffect } from 'react'
import { computeQuestProgress, parseQuestTarget, parseQuestSuffix } from '../../utils/questHelpers.js'
import { playCashRegister } from '../../utils/arcadeSounds.js'
import { getWeekStart } from '../../utils/stats.js'
import { audioEngine } from '../../services/audioEngine.js'
import { useAppStore } from '../../store/useAppStore.js'
import { usePlayer } from '../../context/PlayerContext.jsx'

// ── Quest pool — strictly achievable within 24 hours ─────────────────────────
const QUEST_POOL = {
  volume: [
    { text: 'Log 25 Total Shots Today',   tier: 'common',    reward: 10,  icon: '🏒' },
    { text: 'Log 50 Total Shots Today',   tier: 'rare',      reward: 25,  icon: '🏒' },
    { text: 'Log 100 Total Shots Today',  tier: 'epic',      reward: 50,  icon: '🏒' },
    { text: 'Log 30 Shots in Technique Only Mode',    tier: 'common',    reward: 10,  icon: '🎯' },
    { text: 'Log 75 Total Shots Today',   tier: 'rare',      reward: 25,  icon: '🏒' },
  ],
  technique: [
    { text: 'Log 25 Wrist Shots in Technique Mode Today',    tier: 'common', reward: 10,  icon: '🏒' },
    { text: 'Log 15 Backhand Shots in Technique Mode Today',  tier: 'rare',   reward: 25,  icon: '🎯' },
    { text: 'Log 20 Snap Shots in Technique Mode Today',      tier: 'common', reward: 10,  icon: '⚡' },
    { text: 'Log 10 Slap Shots in Technique Mode Today',      tier: 'epic',   reward: 50,  icon: '💥' },
  ],
  quality: [
    { text: 'Hit 40% Accuracy in a Target Practice Session', tier: 'common', reward: 10, icon: '📊' },
    { text: 'Hit 50% Accuracy in a Target Practice Session', tier: 'rare',   reward: 25, icon: '📈' },
    { text: 'Hit 60% Accuracy in a Target Practice Session', tier: 'epic',   reward: 50, icon: '🔥' },
    { text: 'Hit at Least 3/10 Targets in a Practice Set',  tier: 'epic',   reward: 50, icon: '💯' },
    { text: 'Score 8+ Hits in Any Zone in Target Practice',  tier: 'rare',   reward: 25, icon: '🎯' },
  ],
  social: [
    { text: 'Issue a Versus Challenge Today',                          tier: 'common',    reward: 10,  icon: '📣' },
    { text: 'Play 1 P-U-C-K Game Today',                              tier: 'rare',      reward: 25,  icon: '🎮' },
    { text: 'Win 1 Versus Quick Match Today',                          tier: 'epic',      reward: 50,  icon: '⚔️' },
    { text: 'Accept an Incoming Challenge',                            tier: 'common',    reward: 10,  icon: '🤝' },
    { text: 'Beat a Friend at P-U-C-K Today',                         tier: 'legendary', reward: 150, icon: '🏆' },
    { text: 'Win a P-U-C-K Game Using at Least One Backhand Shot',    tier: 'rare',      reward: 1,   icon: '🎨' },
  ],
}

// ── Weekly quest pool — large pool for random 3-pick each week ──────────────
const WEEKLY_QUEST_POOL = [
  { id: 'wq_shots500', text: 'Log 500 Total Shots This Week',       reward: 250, icon: '🏒', tier: 'red'    },
  { id: 'wq_shots300', text: 'Log 300 Total Shots This Week',       reward: 150, icon: '🏒', tier: 'red'    },
  { id: 'wq_shots200', text: 'Log 200 Total Shots This Week',       reward: 100, icon: '🏒', tier: 'red'    },
  { id: 'wq_acc85x5',  text: 'Hit 50% Accuracy across 5 different Sessions this Week',      reward: 175, icon: '🔥', tier: 'common' },
  { id: 'wq_acc80x3',  text: 'Hit 50% Accuracy across 3 different Sessions this Week',      reward: 100, icon: '📊', tier: 'common' },
  { id: 'wq_acc75x5',  text: 'Hit 40% Accuracy across 5 different Sessions this Week',      reward: 125, icon: '📈', tier: 'common' },
  { id: 'wq_back200',  text: 'Log 200 Backhand Shots in Technique Only Mode this Week',     reward: 125, icon: '🎯', tier: 'red'    },
  { id: 'wq_back150',  text: 'Log 150 Backhand Shots in Technique Only Mode this Week',     reward: 100, icon: '🎯', tier: 'red'    },
  { id: 'wq_sess7',    text: 'Complete 7 Training Sessions this Week',                       reward: 175, icon: '📅', tier: 'epic'   },
  { id: 'wq_sess5',    text: 'Complete 5 Training Sessions this Week',                       reward: 100, icon: '📅', tier: 'epic'   },
  { id: 'wq_shots400', text: 'Log 400 Total Shots This Week',       reward: 200, icon: '🏒', tier: 'red'    },
  { id: 'wq_acc90x3',  text: 'Hit 50% Accuracy across 3 different Sessions this Week',      reward: 150, icon: '💯', tier: 'common' },
]

// ── Fast text for the quest-row shuffle blur ──────────────────────────────────
const WEEKLY_SHUFFLE_POOL = [
  'Log 500 Shots', 'Hit 50% Accuracy', 'Log 200 Backhands',
  'Complete 7 Sessions', 'Log 300 Shots', '50% x5 Sessions',
  'Log 150 Backhands', '50% x3 Sessions', 'Log 400 Shots',
  'Complete 5 Sessions', '40% x5 Sessions', 'Log 100 Wristers',
  'Hit 50% x5', 'Log 200 Shots', '50% x3 Sessions',
]

function pickWeeklyQuests() {
  const shuffled = [...WEEKLY_QUEST_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3).map(q => ({ ...q, currentProgress: 0, completed: false, claimed: false }))
}

function computeWeeklyQuestProgress(text, sessions, playerId, puckGames = [], peerChallenges = [], techniqueByPlayer = null) {
  const ws           = getWeekStart()
  const weekSessions = sessions.filter(s => s.playerId === playerId && new Date(s.date) >= ws)
  const weekSets     = weekSessions.flatMap(s => s.sets)
  // Count all training: Target Practice sets (10 shots each) + Technique Only pucks
  const weekShots    = weekSets.length * 10 + weekSessions.reduce((sum, s) => sum + (s.pucks ?? 0), 0)

  if (/Log (\d+) Total Shots/i.test(text)) {
    const target = parseInt(text.match(/\d+/)[0])
    return { current: Math.min(weekShots, target), target }
  }
  // "Log N Backhand Shots in Technique Only Mode this Week"
  // Reads from the techniqueByPlayer map passed as a parameter — never calls a hook.
  if (/Log (\d+) Backhand Shots/i.test(text)) {
    const target   = parseInt(text.match(/\d+/)[0])
    const dailyLog = techniqueByPlayer?.[playerId]?.dailyLog || {}

    let backhandShots = 0
    Object.values(dailyLog).forEach(dayEntry => {
      if (typeof dayEntry === 'object' && dayEntry?.breakdown?.['Backhand']) {
        backhandShots += dayEntry.breakdown['Backhand']
      }
    })

    return { current: Math.min(backhandShots, target), target }
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
  // Fallback — unknown quest pattern
  return { current: 0, target: 1 }
}

function timeUntilWeekReset() {
  const next = new Date(getWeekStart()); next.setDate(next.getDate() + 7)
  const diff = next - Date.now()
  if (diff <= 0) return { days: 0, hours: 0 }
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000) }
}


// Fast dummy text for the shuffle blur — gives the slot-machine feel
const SHUFFLE_POOL = [
  'Log 20 Backhands', 'Hit 50% Accuracy', 'Win a Match',
  'Score 15 Wrist Shots', 'Play 2 P-U-C-K', 'Hit 40% Accuracy',
  'Log 30 Shots', 'Win 1 Versus', 'Score a Bar Down',
  'Log 75 Shots', 'Hit 40% in a Session', 'Challenge a Friend',
  'Get 8 Hits Top-Left', 'Snap Shot Barrage', 'Perfect 10/10 Set',
  'Log 50 Slap Shots', 'Accuracy Grind 50%', 'Dominate Versus Tab',
]

function pickQuests(sessions = []) {
  // Capture the player's current shot total at the exact moment the wheel spins.
  // This becomes the baseline so quests always start at 0/N progress even if the
  // player already had shots logged today before pulling the lever.
  const today = new Date().toDateString()
  const todaySessions   = sessions.filter(s => new Date(s.date).toDateString() === today)
  const todaySets       = todaySessions.flatMap(s => s.sets)
  const spinTimeShots   = todaySets.length * 10
    + todaySessions.reduce((sum, s) => sum + (s.pucks ?? 0), 0)

  const pick  = arr => arr[Math.floor(Math.random() * arr.length)]
  const stamp = q => ({
    ...q,
    targetProgress:  parseQuestTarget(q.text),
    currentProgress: 0,
    completed:       false,
    claimed:         false,
    suffix:          parseQuestSuffix(q.text),
    // Only shot-count quests need a baseline; binary/social quests start at 0 naturally
    baseline: /Log (\d+)/i.test(q.text) ? spinTimeShots : 0,
  })
  // 50% chance to pick a technique quest instead of volume quest
  const volumeOrTechnique = Math.random() > 0.5 ? QUEST_POOL.technique : QUEST_POOL.volume
  return [
    stamp(pick(volumeOrTechnique)),
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

// Pure helper — no hooks.  techniqueByPlayer is read once at the top level
// of DailyQuests and passed in so this function is safe to call from .map().
function getQuestProgress(quest, sessions, playerId, puckGames, peerChallenges, techniqueByPlayer) {
  const dailyLog       = techniqueByPlayer?.[playerId]?.dailyLog || {}
  const today          = new Date().toDateString()
  const todayEntry     = dailyLog[today]
  const todayTechPucks = typeof todayEntry === 'number' ? todayEntry : (todayEntry?.total ?? 0)
  return computeQuestProgress(quest.text, sessions, todayTechPucks, quest.baseline ?? 0, puckGames, peerChallenges, techniqueByPlayer, playerId)
}

// ── Quest row ─────────────────────────────────────────────────────────────────
function QuestRow({ quest, progress, isSpinning, shuffleText, onNavigate, onClaim }) {
  const tc            = TIER_COLORS[quest.tier] || TIER_COLORS.common
  const label         = isSpinning ? shuffleText : quest.text
  const tabTarget     = questTab(label)
  const isPlaceholder = quest.reward === '?'
  // New-day locked placeholder — shows "????" until the player spins the wheel
  if (quest.isNewDayPlaceholder) {
    return (
      <div style={{
        background: 'rgba(15,23,42,0.6)',
        border: '1.5px solid #1e293b',
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
        opacity: 0.55,
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>🔒</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, color: '#475569', letterSpacing: '0.04em' }}>
            ????
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#334155', marginTop: 3 }}>
            Spin today's wheel to unlock
          </div>
        </div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: '#334155' }}>? 💎</div>
      </div>
    )
  }

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
  onNavigate, onDiamondEarn, onSpinComplete, onClaimQuest,
  onClaimWeeklyQuest, onWeeklySpinComplete, onInitWeeklyQuests,
  peerChallenges = [], puckGames = [],
}) {
  const { activePlayer: player, st } = usePlayer()
  const sessions = st?.sessions || []
  // Read quests DIRECTLY from PlayerContext — do NOT copy into local state
  // Local state causes conflicts with the real-time Firestore listener
  const currentQuests = player?.daily_quests || []
  const weeklyQuests  = player?.weekly_quests || []

  const [spinning,      setSpinning]      = useState(false)
  const [shuffleTexts, setShuffleTexts] = useState(['','',''])
  const [burst,        setBurst]        = useState(null)

  // ── Weekly quest state ────────────────────────────────────────────────────
  const [weeklyShuffleTexts, setWeeklyShuffleTexts] = useState(['', '', ''])
  const [slotSpinning,       setSlotSpinning]       = useState(false)
  const [slotLeverPulled,    setSlotLeverPulled]    = useState(false)
  const slotTimerRef          = useRef(null)
  const weeklyShuffleInterval = useRef(null)
  useEffect(() => () => {
    clearTimeout(slotTimerRef.current)
    clearInterval(weeklyShuffleInterval.current)
  }, []) // eslint-disable-line

  const intervalRef  = useRef(null)
  const spinAudioRef = useRef(null)

  // NOTE: Removed sync effects that updated local state.
  // currentQuests and weeklyQuests now read DIRECTLY from usePlayer()
  // so they always reflect the real-time Firestore data. No need to sync.

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

    console.log('[DailyQuests.handleClaim] Claim button clicked', {
      questIndex,
      questText: quest?.text,
      questClaimed: quest?.claimed,
      questCompleted: quest?.completed,
    })

    if (!quest || quest.claimed) {
      console.warn('[DailyQuests.handleClaim] Quest invalid or already claimed')
      return
    }

    // Use getQuestProgress — the same function the display uses
    const prog   = quest.reward !== '?' ? getQuestProgress(quest, sessions, player.id, puckGames, peerChallenges, techniqueByPlayer) : null
    const isDone = quest.completed || (prog ? prog.current >= prog.target : false)
    if (!isDone) {
      console.warn('[DailyQuests.handleClaim] Quest not complete yet')
      return
    }

    // Use quest.text as the SINGLE source of truth for identification
    const questText = quest.text
    const rewardAmount = quest.reward

    console.log(`[DailyQuests.handleClaim] ✓ Quest validated, sending to parent`, {
      questText,
      rewardAmount,
    })

    // Play feedback IMMEDIATELY for snappy feel
    playCashRegister()
    fireBurst(rect)

    // Pass quest text (the stable identifier) to parent
    console.log(`[DailyQuests.handleClaim] → Calling onClaimQuest('${questText}', ${rewardAmount})`)
    onClaimQuest?.(questText, rewardAmount)
  }

  function handleClaimWeekly(questIndex, rect) {
    const quest = displayWeeklyQuests[questIndex]

    console.log('[DailyQuests.handleClaimWeekly] Claim button clicked', {
      questIndex,
      questText: quest?.text,
      questClaimed: quest?.claimed,
      questCompleted: quest?.completed,
    })

    if (!quest?.completed || quest.claimed) {
      console.warn('[DailyQuests.handleClaimWeekly] Quest invalid or already claimed')
      return
    }

    // Use quest.text as the SINGLE source of truth for identification
    const questText = quest.text
    const rewardAmount = quest.reward

    console.log(`[DailyQuests.handleClaimWeekly] ✓ Quest validated, sending to parent`, {
      questText,
      rewardAmount,
    })

    // Play feedback IMMEDIATELY
    playCashRegister()
    fireBurst(rect)

    // Pass quest text (the stable identifier) to parent
    console.log(`[DailyQuests.handleClaimWeekly] → Calling onClaimWeeklyQuest('${questText}', ${rewardAmount})`)
    onClaimWeeklyQuest?.(questText, rewardAmount)
  }

  function handleWeeklyPull() {
    if (isWeeklyLocked || slotSpinning) return
    setSlotLeverPulled(true)
    setTimeout(() => setSlotLeverPulled(false), 600)

    audioEngine.playQuestSpin()

    const picked = pickWeeklyQuests()
    setSlotSpinning(true)

    // Spin audio — same pattern as Daily Quests
    const spinAudio = new Audio('/store-spin.mp3')
    spinAudio.loop = true; spinAudio.volume = 0.3
    try { spinAudio.play().catch(() => {}) } catch {}

    // Fast shuffle on all 3 quest rows simultaneously
    weeklyShuffleInterval.current = setInterval(() => {
      setWeeklyShuffleTexts([
        WEEKLY_SHUFFLE_POOL[Math.floor(Math.random() * WEEKLY_SHUFFLE_POOL.length)],
        WEEKLY_SHUFFLE_POOL[Math.floor(Math.random() * WEEKLY_SHUFFLE_POOL.length)],
        WEEKLY_SHUFFLE_POOL[Math.floor(Math.random() * WEEKLY_SHUFFLE_POOL.length)],
      ])
    }, 60)

    // After 2.5s: stop shuffle, lock in picked quests, play win sound
    slotTimerRef.current = setTimeout(() => {
      clearInterval(weeklyShuffleInterval.current)
      spinAudio.pause()

      const lockAudio = new Audio('/retro-game-notification.mp3')
      lockAudio.volume = 0.6
      try { lockAudio.play().catch(() => {}) } catch {}

      const safeQuests = picked || []
      setWeeklyShuffleTexts(['', '', ''])
      setSlotSpinning(false)
      // Persist to Firestore via parent — sets last_weekly_quest_pick to today
      // DO NOT call setWeeklyQuests here — parent callback updates PlayerContext
      // which triggers re-render with real-time data
      onInitWeeklyQuests?.(safeQuests)
    }, 2500)
  }

  const today          = new Date().toDateString()
  const spinAvailable  = player.last_quest_spin !== today
  const { h, m }       = timeUntilReset()
  const { days: wDays, hours: wHours } = timeUntilWeekReset()

  // Weekly quests are "locked in" once the player has pulled the lever this week
  const isWeeklyLocked = player.last_weekly_quest_pick === getWeekStart().toDateString()
  const slotCanPull    = !isWeeklyLocked && !slotSpinning

  // Only display stored quests if they're from this week
  const techniqueByPlayer = useAppStore(s => s.techniqueByPlayer || {})
  const displayWeeklyQuests = isWeeklyLocked
    ? weeklyQuests.map(q => {
        if (q.claimed) return q
        const prog = computeWeeklyQuestProgress(q.text, sessions, player.id, puckGames, peerChallenges, techniqueByPlayer)
        return { ...q, currentProgress: prog.current, targetProgress: prog.target, completed: prog.current >= prog.target }
      })
    : []
  const allWeeklyClaimed = displayWeeklyQuests.length > 0 && displayWeeklyQuests.every(q => q.claimed)

  function handleSpin() {
    if (!spinAvailable || spinning) return

    audioEngine.playQuestSpin()

    // ── Audio: must be created inside user-gesture handler for mobile ─────────
    const spinAudio = new Audio('/store-spin.mp3')
    spinAudio.loop   = true
    spinAudio.volume = 0.35
    try { spinAudio.play().catch(() => {}) } catch {}
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
      const lockAudio = new Audio('/retro-game-notification.mp3')
      lockAudio.volume = 0.6
      try { lockAudio.play().catch(() => {}) } catch {}

      const picked = pickQuests(sessions) || []  // pass sessions so baseline is captured now
      setShuffleTexts(['', '', ''])
      setSpinning(false)
      // DO NOT call setCurrentQuests here — parent callback updates PlayerContext
      // which triggers re-render with real-time data
      console.log(`[handleSpin] Spin complete. Persisting ${picked.length} quests to Firestore.`)
      onSpinComplete?.(picked.length ? picked : [])
    }, 2000)
  }

  // Placeholder row shown before first spin (never spun yet)
  const placeholders = [0, 1, 2].map(i => ({
    id: `placeholder-${i}`,
    text: '— PULL THE LEVER —',
    tier: 'common',
    reward: '?',
    icon: '❓',
  }))

  // New-day placeholder cards ("????") shown when the player has quests from
  // yesterday but hasn't spun for today yet.  Prevents stale completed quests
  // from appearing claimable or partially pre-filled on a fresh day.
  const newDayPlaceholders = [0, 1, 2].map(i => ({
    id: `newday-${i}`,
    text: '????',
    tier: 'common',
    reward: '?',
    icon: '🔒',
    isNewDayPlaceholder: true,
  }))

  // If it's a new day AND the player has stored quests from yesterday, hide
  // those stale cards and show locked "????" rows instead.
  const isNewDayWithStaleQuests = spinAvailable && currentQuests.length > 0
  const displayQuests = isNewDayWithStaleQuests
    ? newDayPlaceholders
    : (currentQuests || []).length
      ? currentQuests
      : placeholders || []

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

          {/* Quest rows — always 3; blurred behind overlay when unseen */}
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
                  progress={quest.reward !== '?' ? getQuestProgress(quest, sessions, player.id, puckGames, peerChallenges, techniqueByPlayer) : null}
                  isSpinning={spinning}
                  shuffleText={shuffleTexts[i] || SHUFFLE_POOL[0]}
                  onNavigate={onNavigate}
                  onClaim={rect => handleClaim(i, rect)}
                />
              ))}
            </div>

            {/* Pre-spin CTA overlay — visible only on a new day before the lever is pulled */}
            {spinAvailable && !currentQuests.length && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10, pointerEvents: 'none',
              }}>
                <div style={{
                  background: 'rgba(10,8,18,0.72)',
                  backdropFilter: 'blur(4px)',
                  border: '2px solid #fbbf24',
                  borderRadius: 16,
                  padding: '18px 24px',
                  textAlign: 'center',
                  boxShadow: '0 0 40px #fbbf2455',
                  animation: 'shimmer 1.4s ease-in-out infinite',
                }}>
                  <div style={{
                    fontFamily: "'Bangers',sans-serif", fontSize: 22,
                    color: '#fbbf24', letterSpacing: '0.08em', lineHeight: 1.2,
                    textShadow: '0 0 24px #fbbf2488',
                  }}>
                    🕹️ PULL LEVER TO SPIN
                  </div>
                  <div style={{
                    fontFamily: "'Bangers',sans-serif", fontSize: 17,
                    color: '#fbbf24cc', letterSpacing: '0.06em', lineHeight: 1.3, marginTop: 4,
                  }}>
                    & UNLOCK TODAY'S QUESTS!
                  </div>
                </div>
              </div>
            )}
          </div>

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

      {/* ── Single unified red cabinet — lever on right edge, slot inside ── */}
      <div style={{ position: 'relative', marginRight: 32 }}>

        {/* ── Mechanical lever — mirrors Daily's gold lever, in red ──────── */}
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
            background: isWeeklyLocked
              ? 'linear-gradient(90deg,#3a3a3a,#1e1e1e,#3a3a3a)'
              : 'linear-gradient(90deg,#5a1a1a,#2e0a0a,#5a1a1a)',
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
              background: isWeeklyLocked
                ? 'linear-gradient(90deg,#444,#222,#444)'
                : 'linear-gradient(90deg,#cc2222,#880000,#cc2222)',
              borderRadius: 4,
              border: `1px solid ${isWeeklyLocked ? '#1a1a1a' : '#5a0000'}`,
            }} />
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: isWeeklyLocked
                ? 'radial-gradient(circle at 32% 28%,#555,#333)'
                : 'radial-gradient(circle at 32% 28%,#ff6060,#cc0000)',
              border: isWeeklyLocked ? '2px solid #222' : '2px solid #880000',
              boxShadow: isWeeklyLocked
                ? '0 1px 4px #0006, inset -2px -2px 4px rgba(0,0,0,0.4)'
                : '0 0 22px #ff000099, 0 0 44px #ff000055, inset -3px -3px 5px rgba(0,0,0,0.5)',
              marginTop: -4, flexShrink: 0,
              animation: slotCanPull ? 'redBallPulse 1s ease-in-out infinite' : 'none',
            }} />
          </div>
        </div>

        {/* ── Red cabinet shell ───────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg,#0a0508,#1a0a10)',
          border: '4px solid #ef4444', borderRadius: 20,
          padding: '32px 18px 20px', marginBottom: 20,
          boxShadow: '0 0 40px #ef444444, inset 0 0 20px #ef444411',
          position: 'relative', overflow: 'visible',
        }}>

          {/* Red corner orbs */}
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

          {/* Title — same Bangers/42px/gold spec as DAILY QUESTS */}
          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 42, color: '#fbbf24',
            textAlign: 'center', letterSpacing: '0.08em',
            textShadow: '0 0 30px #fbbf2466, 0 2px 0 #7a5a00',
            marginBottom: 10, lineHeight: 1,
          }}>
            WEEKLY QUESTS 📆
          </div>

          {/* Reset pill — red, matches Daily gold pill structure */}
          <div style={{
            background: '#140203', border: '2px solid #ef4444',
            borderRadius: 20, padding: '8px 16px',
            textAlign: 'center', marginBottom: 18,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            fontWeight: 700, color: '#fca5a5', letterSpacing: '0.14em',
          }}>
            🗓️ RESETS IN: {wDays} DAYS {wHours} HOURS
          </div>

          {/* Spinning status banner — same as Daily "ROLLING YOUR QUESTS..." */}
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

          {/* Pull prompt — shown when unlocked and idle */}
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

          {/* Quest rows — 3 states: placeholder (not yet spun), shuffling, or locked-in */}
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

          {/* Footer bar — clickable when lever hasn't been pulled yet */}
          <button
            onClick={slotCanPull ? handleWeeklyPull : undefined}
            disabled={!slotCanPull}
            style={{
              width: '100%',
              background: allWeeklyClaimed
                ? 'linear-gradient(135deg,#14532d,#166534)'
                : isWeeklyLocked
                  ? '#1e0a0a'
                  : slotSpinning
                    ? '#1e0a0a'
                    : 'linear-gradient(135deg,#7a0f0f,#b91c1c)',
              color: allWeeklyClaimed
                ? '#4ade80'
                : isWeeklyLocked
                  ? '#6b2020'
                  : slotSpinning
                    ? '#ef444488'
                    : '#ffffff',
              border: allWeeklyClaimed
                ? '2px solid #22c55e'
                : isWeeklyLocked
                  ? '2px solid #3d1010'
                  : slotSpinning
                    ? '2px solid #ef444433'
                    : '2px solid #ef4444',
              borderRadius: 12, padding: '14px',
              fontFamily: "'Bangers',sans-serif", fontSize: 20, fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: slotCanPull ? 'pointer' : 'not-allowed',
              boxShadow: allWeeklyClaimed
                ? '0 0 16px #22c55e44'
                : isWeeklyLocked
                  ? 'none'
                  : slotSpinning
                    ? '0 0 12px #ef444422'
                    : '0 0 28px #ef444466',
              transition: 'all 0.2s',
              transform: 'scale(1)',
            }}
            onMouseEnter={e => { if (slotCanPull) e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onTouchStart={e => { if (slotCanPull) e.currentTarget.style.transform = 'scale(0.97)' }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {allWeeklyClaimed
              ? '✅ ALL WEEKLY QUESTS COMPLETE!'
              : slotSpinning
                ? '🎰 ROLLING...'
                : isWeeklyLocked
                  ? '🔒 WEEKLY QUESTS LOCKED IN'
                  : '🎰 TAP HERE TO SPIN WEEKLY QUESTS!'}
          </button>
        </div>
      </div>

    </div>
  )
}
