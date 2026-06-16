import { useState, useEffect, useRef } from 'react'

const QUEST_TEMPLATES = [
  { id: 'log-50-shots',  text: 'Log 50 Wrist Shots',    tier: 'common',    reward: 10,  icon: '🎯' },
  { id: 'log-100-shots', text: 'Log 100 Total Shots',    tier: 'common',    reward: 10,  icon: '🏒' },
  { id: 'win-1-versus',  text: 'Win 1 Versus Match',     tier: 'rare',      reward: 25,  icon: '⚔️' },
  { id: 'win-2-puck',    text: 'Win 2 P-U-C-K Games',    tier: 'rare',      reward: 25,  icon: '🎮' },
  { id: 'accuracy-75',   text: 'Hit 75% Accuracy',       tier: 'epic',      reward: 50,  icon: '📈' },
  { id: 'badge-unlock',  text: 'Unlock 1 New Badge',     tier: 'epic',      reward: 50,  icon: '🏆' },
  { id: 'streak-7',      text: 'Build 7-Day Streak',     tier: 'legendary', reward: 150, icon: '🔥' },
]

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

// Route a quest to the correct tab based on its text
function questTab(text) {
  if (/P-U-C-K|Versus/i.test(text))          return 'games'
  if (/Shots|Accuracy|Log|Streak/i.test(text)) return 'session'
  return null
}

// ── Quest row ─────────────────────────────────────────────────────────────────
function QuestRow({ quest, completed, isSpinning, shuffleText, onNavigate }) {
  const tc      = TIER_COLORS[quest.tier]
  const target  = questTab(isSpinning ? shuffleText : quest.text)

  return (
    <div
      onClick={() => { if (target && !isSpinning) onNavigate(target) }}
      style={{
        background: 'linear-gradient(135deg,#0f0c1a,#1a0f20)',
        border: `3px solid ${tc.border}`,
        borderRadius: 14,
        padding: '16px',
        marginBottom: 12,
        display: 'grid',
        gridTemplateColumns: '60px 1fr 80px',
        gap: 14,
        alignItems: 'center',
        boxShadow: `0 0 20px ${tc.glow}44`,
        cursor: target && !isSpinning ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (target && !isSpinning) { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = `0 0 32px ${tc.glow}66` } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 20px ${tc.glow}44` }}
    >
      {/* Left: hexagonal icon frame */}
      <div style={{
        width: 56, height: 56, flexShrink: 0,
        clipPath: 'polygon(30% 0%,70% 0%,100% 50%,70% 100%,30% 100%,0% 50%)',
        background: `linear-gradient(135deg,${tc.glow}33,${tc.glow}11)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26,
      }}>
        {quest.icon}
      </div>

      {/* Center: quest text + status badge */}
      <div>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700,
          color: completed ? '#22c55e' : 'var(--text-1)', letterSpacing: '0.06em',
          transition: 'color 0.3s',
        }}>
          {isSpinning ? shuffleText : quest.text}
        </div>
        <div style={{
          display: 'inline-block',
          marginTop: 5,
          padding: '2px 8px',
          borderRadius: 4,
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700,
          letterSpacing: '0.1em',
          background: completed ? '#14532d' : '#0f172a',
          color:      completed ? '#4ade80' : '#475569',
          border:     `1px solid ${completed ? '#22c55e' : '#1e293b'}`,
          boxShadow:  completed ? '0 0 8px #22c55e66' : 'none',
          transition: 'all 0.3s',
        }}>
          {completed ? '✅ COMPLETE!' : '⬜ INCOMPLETE'}
        </div>
        {target && !isSpinning && (
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#334155', marginTop: 4, letterSpacing: '0.06em' }}>
            TAP TO GO →
          </div>
        )}
      </div>

      {/* Right: pulsing diamond + reward */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, animation: 'diamondPulse 2s ease-in-out infinite', marginBottom: 2 }}>💎</div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 17, color: '#f1f5f9', letterSpacing: '0.04em' }}>
          +{quest.reward}
        </div>
      </div>
    </div>
  )
}

// ── Lever — lives outside the billboard so it never gets clipped ──────────────
function StadiumLever({ disabled, onSpin, isSpinning }) {
  const [pulled, setPulled] = useState(false)

  function handlePull() {
    if (disabled || isSpinning || pulled) return
    setPulled(true)
    onSpin()
    // Spring back after 500ms
    setTimeout(() => setPulled(false), 500)
  }

  return (
    <div
      onClick={handlePull}
      title={disabled ? 'Already spun today' : 'Pull to spin!'}
      style={{
        position: 'absolute',
        right: -28,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 50,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'opacity 0.3s',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}
    >
      {/* Housing base */}
      <div style={{
        width: 18, height: 50,
        background: 'linear-gradient(90deg,#5a5a5a,#2e2e2e,#5a5a5a)',
        borderRadius: 9,
        border: '2px solid #111',
        boxShadow: '0 2px 8px #0008',
      }} />

      {/* Arm + red ball */}
      <div style={{
        width: 12, height: 70,
        marginTop: -12,
        transformOrigin: 'top center',
        transform: `rotate(${pulled ? -40 : 0}deg)`,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}>
        <div style={{
          width: 8, height: 52,
          background: 'linear-gradient(90deg,#666,#333,#666)',
          borderRadius: 4,
          border: '1px solid #1a1a1a',
          boxShadow: '0 1px 4px #0006',
        }} />
        <div style={{
          width: 30, height: 30,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 32% 28%,#ff7070,#cc0000)',
          border: '2px solid #880000',
          boxShadow: '0 0 14px #ff222288, inset -3px -3px 5px rgba(0,0,0,0.5)',
          marginTop: -4,
          flexShrink: 0,
        }} />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DailyQuests({ player, onNavigate, onDiamondEarn, onSpinComplete }) {
  const [spinning,      setSpinning]      = useState(false)
  const [currentQuests, setCurrentQuests] = useState(
    player.daily_quests?.length ? player.daily_quests : []
  )
  const [shuffleIdx, setShuffleIdx] = useState(0)
  const intervalRef = useRef(null)

  const today        = new Date().toDateString()
  const lastSpin     = player.last_quest_spin
  const spinAvailable = lastSpin !== today
  const { h, m }    = timeUntilReset()
  const totalDiamonds = player.diamonds || 0

  // If returning player has no quests from today but spun already, pick from saved
  useEffect(() => {
    if (!spinAvailable && currentQuests.length === 0 && player.daily_quests?.length) {
      setCurrentQuests(player.daily_quests)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSpin() {
    if (!spinAvailable || spinning) return
    setSpinning(true)

    let idx = 0
    intervalRef.current = setInterval(() => {
      setShuffleIdx(idx % QUEST_TEMPLATES.length)
      idx++
    }, 80)

    setTimeout(() => {
      clearInterval(intervalRef.current)
      // Pick 3 distinct quests
      const shuffled = [...QUEST_TEMPLATES].sort(() => Math.random() - 0.5)
      const picked   = shuffled.slice(0, 3)
      setCurrentQuests(picked)
      setShuffleIdx(0)
      setSpinning(false)
      onSpinComplete?.(picked)
    }, 2000)
  }

  return (
    <div style={{ padding: '16px 16px 80px', position: 'relative' }}>
      <style>{`
        @keyframes shimmer     { 0%,100%{ opacity:1; } 50%{ opacity:0.6; } }
        @keyframes diamondPulse{ 0%,100%{ opacity:1; transform:scale(1); } 50%{ opacity:0.7; transform:scale(1.12); } }
      `}</style>

      {/* ── Fixed diamond counter bottom-left ──────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 80, left: 16, zIndex: 45,
        background: 'linear-gradient(135deg,#2a1a4a,#1a0a2a)',
        border: '2px solid #fbbf24', borderRadius: 12,
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 0 20px #fbbf2444',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 26 }}>💎</div>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#fbbf24', letterSpacing: '0.12em' }}>
            DIAMONDS
          </div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, color: '#fbbf24', lineHeight: 1, textShadow: '0 0 10px #fbbf2466' }}>
            {totalDiamonds}
          </div>
        </div>
      </div>

      {/* ── Billboard + lever wrapper — overflow-visible so lever shows ──────── */}
      <div style={{ position: 'relative', marginRight: 28, overflowVisible: true }}>

        {/* Lever sits on the wrapper, not inside the billboard */}
        <StadiumLever disabled={!spinAvailable} onSpin={handleSpin} isSpinning={spinning} />

        {/* Main billboard */}
        <div style={{
          background: 'linear-gradient(135deg,#0a0810,#1a0f25)',
          border: '4px solid #fbbf24',
          borderRadius: 20,
          padding: '32px 18px 20px',
          marginBottom: 20,
          boxShadow: '0 0 40px #fbbf2444, inset 0 0 20px #fbbf2211',
          position: 'relative',
          overflow: 'visible',
        }}>

          {/* Stadium light towers */}
          {[{ left: 14 }, { right: 14, animationDelay: '0.75s' }].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', top: 10,
              ...pos,
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

          {/* Countdown capsule */}
          <div style={{
            background: '#0f0a04', border: '2px solid #fbbf24',
            borderRadius: 20, padding: '8px 16px',
            textAlign: 'center', marginBottom: 18,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            fontWeight: 700, color: '#fbbf24', letterSpacing: '0.14em',
          }}>
            🕛 RESETS IN: {h}H {m}M
          </div>

          {/* Quest rows */}
          {currentQuests.length > 0
            ? currentQuests.map((quest, i) => (
                <QuestRow
                  key={i}
                  quest={quest}
                  completed={false}
                  isSpinning={spinning}
                  shuffleText={spinning ? QUEST_TEMPLATES[shuffleIdx].text : quest.text}
                  onNavigate={onNavigate}
                />
              ))
            : (
              // Pre-spin placeholder rows
              [0,1,2].map(i => (
                <div key={i} style={{
                  background: '#0f0c1a', border: '3px solid #1e293b',
                  borderRadius: 14, padding: '20px 16px', marginBottom: 12,
                  textAlign: 'center',
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13,
                  color: '#334155', letterSpacing: '0.08em',
                }}>
                  — PULL THE LEVER TO REVEAL QUEST {i + 1} —
                </div>
              ))
            )
          }

          {/* Spin / locked button — always visible */}
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
              borderRadius: 12,
              padding: '14px',
              fontFamily: "'Bangers',sans-serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: spinAvailable && !spinning ? 'pointer' : 'not-allowed',
              boxShadow: spinAvailable && !spinning ? '0 0 20px #fbbf2455' : 'none',
              transition: 'all 0.3s',
            }}
          >
            {spinning
              ? '🎰 SHUFFLING...'
              : spinAvailable
              ? '🎰 SPIN THE LEVER!'
              : '🔒 QUESTS LOCKED IN FOR TODAY'}
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
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#d8b4fe', marginBottom: 12, lineHeight: 1.5 }}>
          Saves your shooting streak if you miss a day. Auto-consumed before your streak breaks.
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#a855f7', marginBottom: 10, letterSpacing: '0.06em' }}>
          OWNED: <strong>{player.streak_freezes || 0} ❄️</strong>
        </div>
        <button
          disabled={totalDiamonds < 50}
          style={{
            width: '100%',
            background: totalDiamonds >= 50 ? 'linear-gradient(135deg,#6b21a8,#a855f7)' : '#1e293b',
            color: '#fff',
            border: 'none', borderRadius: 10, padding: '10px',
            fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.06em',
            cursor: totalDiamonds >= 50 ? 'pointer' : 'not-allowed',
            boxShadow: totalDiamonds >= 50 ? '0 0 16px #a855f744' : 'none',
            opacity: totalDiamonds >= 50 ? 1 : 0.5,
          }}
        >
          BUY STREAK FREEZE — 50 💎 {totalDiamonds >= 50 ? '→' : '(NEED MORE 💎)'}
        </button>
      </div>
    </div>
  )
}
