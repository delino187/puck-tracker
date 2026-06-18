import { useState, useRef } from 'react'

// ── Quest pool — strictly achievable within 24 hours ─────────────────────────
const QUEST_POOL = {
  volume: [
    { text: 'Log 25 Total Shots Today',   tier: 'common',    reward: 10,  icon: '🏒' },
    { text: 'Log 50 Total Shots Today',   tier: 'rare',      reward: 25,  icon: '🏒' },
    { text: 'Log 100 Total Shots Today',  tier: 'epic',      reward: 50,  icon: '🏒' },
    { text: 'Log 30 Wrist Shots Today',   tier: 'common',    reward: 10,  icon: '🎯' },
    { text: 'Log 75 Shots Before Dinner', tier: 'rare',      reward: 25,  icon: '🏒' },
  ],
  quality: [
    { text: 'Hit 70% Accuracy in a Session', tier: 'common', reward: 10, icon: '📊' },
    { text: 'Hit 75% Accuracy in a Session', tier: 'rare',   reward: 25, icon: '📈' },
    { text: 'Hit 80% Accuracy in a Session', tier: 'epic',   reward: 50, icon: '🔥' },
    { text: 'Nail a Perfect 10/10 Set',      tier: 'epic',   reward: 50, icon: '💯' },
    { text: 'Score 8+ Hits in Any Zone',     tier: 'rare',   reward: 25, icon: '🎯' },
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
  const pick = arr => arr[Math.floor(Math.random() * arr.length)]
  return [
    pick(QUEST_POOL.volume),
    pick(QUEST_POOL.quality),
    pick(QUEST_POOL.social),
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
  if (/P-U-C-K|Versus/i.test(text))                return 'games'
  if (/Shots|Accuracy|Log|Session|Set/i.test(text)) return 'session'
  return null
}

/**
 * Calculates live progress for a quest based on today's session data.
 * Returns { current, target, suffix? } where suffix is '%' for accuracy quests.
 * Binary / social quests that can't be auto-tracked return { current: 0, target: 1 }.
 */
function getQuestProgress(text, sessions) {
  const today     = new Date().toDateString()
  const todaySets = sessions
    .filter(s => new Date(s.date).toDateString() === today)
    .flatMap(s => s.sets)
  const todayShots = todaySets.length * 10

  // "Log N Total Shots Today" / "Log N Wrist Shots Today" / "Log N Shots Before Dinner"
  if (/Log (\d+)/i.test(text)) {
    const target = parseInt(text.match(/\d+/)[0])
    return { current: todayShots, target }
  }

  // "Hit N% Accuracy in a Session"
  if (/Hit (\d+)%/i.test(text)) {
    const target   = parseInt(text.match(/\d+/)[0])
    const bestAcc  = sessions
      .filter(s => new Date(s.date).toDateString() === today)
      .reduce((best, s) => {
        const shots = s.sets.length * 10
        if (!shots) return best
        return Math.max(best, Math.round(s.sets.reduce((a, x) => a + x.hits, 0) / shots * 100))
      }, 0)
    return { current: bestAcc, target, suffix: '%' }
  }

  // "Nail a Perfect 10/10 Set"
  if (/Perfect 10/i.test(text)) {
    return { current: todaySets.some(s => s.hits === 10) ? 1 : 0, target: 1 }
  }

  // "Score 8+ Hits in Any Zone"
  if (/8\+ Hits/i.test(text)) {
    const best = todaySets.reduce((max, s) => Math.max(max, s.hits), 0)
    return { current: best, target: 8 }
  }

  // Social / binary quests — can't auto-track without peerChallenges/puckGames data
  return { current: 0, target: 1 }
}

// ── Quest row ─────────────────────────────────────────────────────────────────
function QuestRow({ quest, progress, isSpinning, shuffleText, onNavigate }) {
  const tc          = TIER_COLORS[quest.tier] || TIER_COLORS.common
  const label       = isSpinning ? shuffleText : quest.text
  const tabTarget   = questTab(label)
  const isPlaceholder = quest.reward === '?'
  const isDone      = !isPlaceholder && progress ? progress.current >= progress.target : false
  const sfx         = progress?.suffix || ''

  return (
    <div
      onClick={() => { if (tabTarget && !isSpinning) onNavigate(tabTarget) }}
      style={{
        background: isDone
          ? 'linear-gradient(135deg,#091a0a,#0c200d)'
          : 'linear-gradient(135deg,#0f0c1a,#1a0f20)',
        border: `3px solid ${isDone ? '#22c55e' : tc.border}`,
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 10,
        display: 'grid',
        gridTemplateColumns: '52px 1fr 72px',
        gap: 12,
        alignItems: 'center',
        boxShadow: isDone ? '0 0 22px #22c55e33' : `0 0 18px ${tc.glow}44`,
        cursor: tabTarget && !isSpinning ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (tabTarget && !isSpinning) { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = isDone ? '0 0 32px #22c55e55' : `0 0 30px ${tc.glow}66` } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = isDone ? '0 0 22px #22c55e33' : `0 0 18px ${tc.glow}44` }}
    >
      {/* Left: hex icon */}
      <div style={{
        width: 52, height: 52, flexShrink: 0,
        clipPath: 'polygon(30% 0%,70% 0%,100% 50%,70% 100%,30% 100%,0% 50%)',
        background: isDone
          ? 'linear-gradient(135deg,#14532d66,#22c55e22)'
          : `linear-gradient(135deg,${tc.glow}33,${tc.glow}11)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
        transition: 'font-size 0.06s',
      }}>
        {isSpinning ? '⚡' : quest.icon}
      </div>

      {/* Center */}
      <div>
        {/* Quest title — always bright white against the dark card */}
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: isSpinning ? 13 : 15,
          fontWeight: 800,
          color: isSpinning ? tc.border : isDone ? '#4ade80' : '#ffffff',
          letterSpacing: '0.06em',
          transition: 'color 0.06s',
          minHeight: 18,
          lineHeight: 1.2,
        }}>
          {label}
        </div>

        {/* Status badge + counter on the same row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          {/* Status badge */}
          <div style={{
            display: 'inline-block',
            padding: '3px 9px', borderRadius: 5,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800,
            letterSpacing: '0.12em',
            background: isDone ? '#14532d' : '#0c1a26',
            color:      isDone ? '#4ade80' : isSpinning ? '#475569' : '#22d3ee',
            border:     `1px solid ${isDone ? '#22c55e66' : isSpinning ? '#1e293b' : '#0e749066'}`,
            boxShadow:  isDone ? '0 0 8px #22c55e44' : isSpinning ? 'none' : '0 0 6px #22d3ee22',
            transition: 'all 0.06s',
          }}>
            {isSpinning ? '⏳ ROLLING...' : isDone ? '✅ COMPLETE!' : '⬜ INCOMPLETE'}
          </div>

          {/* Live counter — right next to the badge */}
          {!isSpinning && !isPlaceholder && progress && (
            <span style={{
              fontFamily: "'Bangers',sans-serif",
              fontSize: 17,
              letterSpacing: '0.05em',
              lineHeight: 1,
              color: isDone ? '#fbbf24' : '#22d3ee',
              textShadow: isDone ? '0 0 10px #fbbf2444' : '0 0 8px #22d3ee44',
            }}>
              {isDone
                ? '✨ COMPLETED'
                : `${progress.current}${sfx} / ${progress.target}${sfx}`}
            </span>
          )}
        </div>

        {tabTarget && !isSpinning && !isDone && (
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 700, color: '#22d3ee', marginTop: 4, letterSpacing: '0.1em' }}>
            TAP TO GO →
          </div>
        )}
      </div>

      {/* Right: diamond reward */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, animation: 'diamondPulse 2s ease-in-out infinite', marginBottom: 2 }}>💎</div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: '#f1f5f9', letterSpacing: '0.04em' }}>
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
const SHIELD_COST = 100
const FREEZE_COST = 50

export default function DailyQuests({ player, sessions = [], onNavigate, onDiamondEarn, onSpinComplete, onPurchaseItem }) {
  const [spinning,       setSpinning]       = useState(false)
  const [currentQuests,  setCurrentQuests]  = useState(
    player.daily_quests?.length ? player.daily_quests : []
  )
  // Three independent shuffle strings, one per row
  const [shuffleTexts,  setShuffleTexts]   = useState(['','',''])
  const intervalRef  = useRef(null)
  const spinAudioRef = useRef(null)

  const today         = new Date().toDateString()
  const spinAvailable = player.last_quest_spin !== today
  const { h, m }      = timeUntilReset()
  const totalDiamonds = player.diamonds || 0
  const hasEloShield  = player.hasEloShield || false

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

      {/* ── Fixed diamond counter ──────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 80, left: 16, zIndex: 45,
        background: 'linear-gradient(135deg,#2a1a4a,#1a0a2a)',
        border: '2px solid #fbbf24', borderRadius: 12,
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 0 20px #fbbf2444', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 26 }}>💎</div>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#fbbf24', letterSpacing: '0.12em' }}>DIAMONDS</div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, color: '#fbbf24', lineHeight: 1, textShadow: '0 0 10px #fbbf2466' }}>{totalDiamonds}</div>
        </div>
      </div>

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

      {/* ── Streak Freeze shop ─────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#1a0620,#2a0f30)',
        border: '2px solid #a855f7', borderRadius: 14,
        padding: '16px 18px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, color: '#a855f7', marginBottom: 6, letterSpacing: '0.06em' }}>
          🧊 STREAK FREEZE
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#d8b4fe', marginBottom: 10, lineHeight: 1.5 }}>
          Auto-consumed if you miss a shooting day — saves your streak instantly.
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#a855f7', marginBottom: 10, letterSpacing: '0.06em' }}>
          OWNED: <strong>{player.streak_freezes || 0} ❄️</strong>
        </div>
        <button
          disabled={totalDiamonds < FREEZE_COST}
          onClick={() => totalDiamonds >= FREEZE_COST && onPurchaseItem?.('streakFreeze', FREEZE_COST)}
          style={{
            width: '100%',
            background: totalDiamonds >= FREEZE_COST ? 'linear-gradient(135deg,#6b21a8,#a855f7)' : '#1e293b',
            color: '#fff', border: 'none', borderRadius: 10, padding: '10px',
            fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.06em',
            cursor: totalDiamonds >= FREEZE_COST ? 'pointer' : 'not-allowed',
            boxShadow: totalDiamonds >= FREEZE_COST ? '0 0 16px #a855f744' : 'none',
            opacity: totalDiamonds >= FREEZE_COST ? 1 : 0.5,
          }}
        >
          BUY STREAK FREEZE — {FREEZE_COST} 💎 {totalDiamonds >= FREEZE_COST ? '→' : '(NEED MORE 💎)'}
        </button>
      </div>

      {/* ── ELO Shield shop ────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 14,
        background: hasEloShield
          ? 'linear-gradient(135deg,#061a10,#0c2a1a)'
          : 'linear-gradient(135deg,#050d1a,#091828)',
        border: `2px solid ${hasEloShield ? '#22c55e' : '#06b6d4'}`,
        borderRadius: 14,
        padding: '16px 18px', textAlign: 'center',
        boxShadow: hasEloShield ? '0 0 20px #22c55e22' : '0 0 20px #06b6d422',
      }}>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.06em', marginBottom: 6, color: hasEloShield ? '#22c55e' : '#06b6d4' }}>
          🛡️ ELO SHIELD
        </div>

        {hasEloShield && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#14532d', border: '1px solid #22c55e44',
            borderRadius: 20, padding: '3px 10px', marginBottom: 10,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800,
            color: '#4ade80', letterSpacing: '0.1em',
          }}>
            ✅ SHIELD ACTIVE — absorbs your next defeat
          </div>
        )}

        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#7dd3fc', marginBottom: 10, lineHeight: 1.55 }}>
          Protect your rank! Prevents ELO loss on your next matchup defeat. One-time use. Does not stack.
        </div>

        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#64748b', marginBottom: 12, letterSpacing: '0.06em' }}>
          COST: <strong style={{ color: '#06b6d4' }}>{SHIELD_COST} 💎</strong>
          {'  ·  '}
          BALANCE: <strong style={{ color: totalDiamonds >= SHIELD_COST ? '#34d399' : '#f87171' }}>{totalDiamonds} 💎</strong>
        </div>

        <button
          disabled={hasEloShield || totalDiamonds < SHIELD_COST}
          onClick={() => {
            if (!hasEloShield && totalDiamonds >= SHIELD_COST) {
              onPurchaseItem?.('eloShield', SHIELD_COST)
            }
          }}
          style={{
            width: '100%',
            background: hasEloShield
              ? '#14532d'
              : totalDiamonds >= SHIELD_COST
                ? 'linear-gradient(135deg,#0e7490,#06b6d4)'
                : '#0f172a',
            color: hasEloShield ? '#4ade80' : '#fff',
            border: hasEloShield ? '2px solid #22c55e44' : 'none',
            borderRadius: 10, padding: '10px',
            fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.06em',
            cursor: hasEloShield || totalDiamonds < SHIELD_COST ? 'not-allowed' : 'pointer',
            boxShadow: !hasEloShield && totalDiamonds >= SHIELD_COST ? '0 0 16px #06b6d444' : 'none',
            opacity: hasEloShield ? 1 : totalDiamonds >= SHIELD_COST ? 1 : 0.45,
          }}
        >
          {hasEloShield
            ? '🛡️ ALREADY EQUIPPED — ONE SHIELD MAX'
            : totalDiamonds >= SHIELD_COST
              ? `BUY ELO SHIELD — ${SHIELD_COST} 💎 →`
              : `NEED ${SHIELD_COST - totalDiamonds} MORE 💎`}
        </button>
      </div>
    </div>
  )
}
