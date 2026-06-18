import { useState, useRef, useEffect } from 'react'
import { computeQuestProgress, parseQuestTarget, parseQuestSuffix } from '../../utils/questHelpers.js'
import { playCashRegister } from '../../utils/arcadeSounds.js'

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
export default function DailyQuests({ player, sessions = [], onNavigate, onDiamondEarn, onSpinComplete, onClaimQuest }) {
  const [spinning,      setSpinning]      = useState(false)
  const [currentQuests, setCurrentQuests] = useState(
    player.daily_quests?.length ? player.daily_quests : []
  )
  const [shuffleTexts, setShuffleTexts] = useState(['','',''])
  const [burst,        setBurst]        = useState(null)   // diamond particle array
  const intervalRef  = useRef(null)
  const spinAudioRef = useRef(null)
  const bgMusicRef   = useRef(null)
  const mutedRef     = useRef(false)          // ref so closure callbacks see latest value
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

  const today         = new Date().toDateString()
  const spinAvailable = player.last_quest_spin !== today
  const { h, m }      = timeUntilReset()

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

    </div>
  )
}
