import { useState, useEffect } from 'react'
import { Zap, Target, Trophy } from 'lucide-react'

const QUEST_TEMPLATES = [
  { id: 'log-50-shots', text: 'Log 50 Wrist Shots', tier: 'common', reward: 10, icon: '🎯' },
  { id: 'log-100-shots', text: 'Log 100 Total Shots', tier: 'common', reward: 10, icon: '🏒' },
  { id: 'win-1-versus', text: 'Win 1 Versus Match', tier: 'rare', reward: 25, icon: '⚔️' },
  { id: 'win-2-puck', text: 'Win 2 P-U-C-K Games', tier: 'rare', reward: 25, icon: '🎮' },
  { id: 'accuracy-75', text: 'Hit 75% Accuracy', tier: 'epic', reward: 50, icon: '📈' },
  { id: 'badge-unlock', text: 'Unlock 1 New Badge', tier: 'epic', reward: 50, icon: '🏆' },
  { id: 'streak-7', text: 'Build 7-Day Streak', tier: 'legendary', reward: 150, icon: '🔥' },
]

const TIER_COLORS = {
  common:   { border: '#22c55e', glow: '#22c55e', text: '🟢 COMMON' },
  rare:    { border: '#3b82f6', glow: '#3b82f6', text: '🔵 RARE' },
  epic:    { border: '#a855f7', glow: '#a855f7', text: '🟣 EPIC' },
  legendary: { border: '#fbbf24', glow: '#fbbf24', text: '⭐ LEGENDARY' },
}

function timeUntilReset() {
  const now = new Date()
  const reset = new Date(now)
  reset.setHours(24, 0, 0, 0)
  const ms = reset.getTime() - now.getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return { h, m }
}

function QuestRow({ quest, completed, onComplete, isSpinning, shuffleText }) {
  const tc = TIER_COLORS[quest.tier]
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f0c1a,#1a0f20)',
      border: `3px solid ${tc.border}`,
      borderRadius: 14,
      padding: '16px',
      marginBottom: 12,
      display: 'grid',
      gridTemplateColumns: '60px 1fr 100px',
      gap: 14,
      alignItems: 'center',
      boxShadow: `0 0 20px ${tc.glow}44`,
      position: 'relative',
    }}>
      {/* Left: Hexagonal frame with icon */}
      <div style={{
        width: 60,
        height: 60,
        clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
        background: `linear-gradient(135deg,${tc.glow}33,${tc.glow}11)`,
        border: `2px solid ${tc.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        boxShadow: `inset 0 0 10px ${tc.glow}22`,
      }}>
        {quest.icon}
      </div>

      {/* Center: Quest text */}
      <div>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 14,
          fontWeight: 700,
          color: completed ? '#22c55e' : 'var(--text-1)',
          letterSpacing: '0.06em',
          transition: 'color 0.3s',
        }}>
          {isSpinning ? shuffleText : quest.text}
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 10,
          color: completed ? '#22c55e' : '#64748b',
          letterSpacing: '0.08em',
          marginTop: 3,
          transition: 'color 0.3s',
        }}>
          {completed ? '✅ COMPLETE!' : '⬜ INCOMPLETE'}
        </div>
      </div>

      {/* Right: Diamond reward */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          animation: 'pulse 2s ease-in-out infinite',
          fontSize: 24,
          marginBottom: 4,
        }}>💎</div>
        <div style={{
          fontFamily: "'Bangers',sans-serif",
          fontSize: 18,
          color: '#f1f5f9',
          letterSpacing: '0.04em',
        }}>
          +{quest.reward}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  )
}

function StadiumLever({ disabled, onSpin, isSpinning }) {
  const [leverAngle, setLeverAngle] = useState(0)

  const handlePull = () => {
    if (disabled || isSpinning) return
    setLeverAngle(-45)
    onSpin()
    setTimeout(() => setLeverAngle(0), 500)
  }

  return (
    <div
      onClick={handlePull}
      style={{
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      {/* Lever base */}
      <div style={{
        width: 14,
        height: 60,
        background: 'linear-gradient(90deg,#4a4a4a,#2a2a2a,#4a4a4a)',
        borderRadius: 7,
        margin: '0 auto',
        border: '1px solid #1a1a1a',
      }} />

      {/* Lever arm and ball */}
      <div
        style={{
          position: 'relative',
          width: 12,
          height: 80,
          margin: '-20px auto 0',
          transformOrigin: 'top center',
          transform: `rotate(${leverAngle}deg)`,
          transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 10,
          height: 50,
          background: 'linear-gradient(90deg,#555,#333,#555)',
          borderRadius: 5,
          border: '1px solid #222',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%,#ff6b6b,#dd1111)',
          border: '2px solid #aa0000',
          boxShadow: '0 0 12px #ff333399,inset -2px -2px 4px rgba(0,0,0,0.5)',
        }} />
      </div>
    </div>
  )
}

export default function DailyQuests({ player, onDiamondEarn }) {
  const [spinning, setSpinning] = useState(false)
  const [currentQuests, setCurrentQuests] = useState(player.daily_quests || [])
  const [shuffleIndex, setShuffleIndex] = useState(0)

  const today = new Date().toDateString()
  const lastSpin = player.last_quest_spin ? new Date(player.last_quest_spin).toDateString() : null
  const spinAvailable = lastSpin !== today
  const { h, m } = timeUntilReset()

  // Initialize quests on load if needed
  useEffect(() => {
    if (!spinAvailable && (!currentQuests || currentQuests.length === 0)) {
      const newQuests = QUEST_TEMPLATES.sort(() => Math.random() - 0.5).slice(0, 3)
      setCurrentQuests(newQuests)
    }
  }, [spinAvailable])

  function handleSpin() {
    setSpinning(true)
    let index = 0
    const interval = setInterval(() => {
      setShuffleIndex(index % QUEST_TEMPLATES.length)
      index++
    }, 100)

    setTimeout(() => {
      clearInterval(interval)
      const newQuests = QUEST_TEMPLATES.sort(() => Math.random() - 0.5).slice(0, 3)
      setCurrentQuests(newQuests)
      setSpinning(false)
    }, 2000)
  }

  const totalDiamonds = player.diamonds || 0

  return (
    <div style={{ padding: '16px 16px 80px', position: 'relative' }}>
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Diamond counter at bottom left */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: 20,
        background: 'linear-gradient(135deg,#2a1a4a,#1a0a2a)',
        border: '2px solid #fbbf24',
        borderRadius: 12,
        padding: '12px 16px',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 0 20px #fbbf2444',
      }}>
        <div style={{ fontSize: 28 }}>💎</div>
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 10,
            color: '#fbbf24',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Diamonds
          </div>
          <div style={{
            fontFamily: "'Bangers',sans-serif",
            fontSize: 20,
            color: '#fbbf24',
            lineHeight: 1,
            textShadow: '0 0 10px #fbbf2466',
          }}>
            {totalDiamonds}
          </div>
        </div>
      </div>

      {/* Main billboard */}
      <div style={{
        background: 'linear-gradient(135deg,#0a0810,#1a0f25)',
        border: '4px solid #fbbf24',
        borderRadius: 20,
        padding: '32px 20px 24px',
        marginBottom: 24,
        position: 'relative',
        boxShadow: '0 0 40px #fbbf2444, inset 0 0 20px #fbbf2211',
      }}>
        {/* Light towers */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 20,
          width: 24,
          height: 24,
          background: 'radial-gradient(circle,#fbbf24,#f59e0b)',
          borderRadius: '50%',
          boxShadow: '0 0 16px #fbbf24',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          top: 12,
          right: 20,
          width: 24,
          height: 24,
          background: 'radial-gradient(circle,#fbbf24,#f59e0b)',
          borderRadius: '50%',
          boxShadow: '0 0 16px #fbbf24',
          animation: 'shimmer 1.5s ease-in-out infinite',
          animationDelay: '0.75s',
        }} />

        {/* Header */}
        <div style={{
          fontFamily: "'Bangers',sans-serif",
          fontSize: 44,
          color: '#fbbf24',
          textAlign: 'center',
          letterSpacing: '0.08em',
          textShadow: '0 0 30px #fbbf2466',
          marginBottom: 8,
          lineHeight: 1,
        }}>
          DAILY QUESTS
        </div>

        {/* Countdown */}
        <div style={{
          background: 'linear-gradient(135deg,#1a1410,#2a1a0a)',
          border: '2px solid #fbbf24',
          borderRadius: 10,
          padding: '10px 16px',
          textAlign: 'center',
          marginBottom: 20,
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 12,
          fontWeight: 700,
          color: '#fbbf24',
          letterSpacing: '0.12em',
        }}>
          RESETS IN: {h}h {m}m
        </div>

        {/* Lever */}
        <StadiumLever disabled={!spinAvailable} onSpin={handleSpin} isSpinning={spinning} />

        {/* Quest rows */}
        {currentQuests.map((quest, i) => (
          <QuestRow
            key={i}
            quest={quest}
            completed={false}
            isSpinning={spinning}
            shuffleText={spinning ? QUEST_TEMPLATES[shuffleIndex].text : quest.text}
          />
        ))}

        {spinAvailable && !spinning && (
          <button
            onClick={handleSpin}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg,#aa6600,#fbbf24)',
              color: '#000',
              border: 'none',
              borderRadius: 12,
              padding: '14px',
              fontFamily: "'Bangers',sans-serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              boxShadow: '0 0 20px #fbbf2455',
              transition: 'all 0.3s',
            }}
            onMouseOver={e => e.target.style.transform = 'scale(1.02)'}
            onMouseOut={e => e.target.style.transform = 'scale(1)'}
          >
            🎰 SPIN THE LEVER!
          </button>
        )}
      </div>

      {/* Streak Freeze buy button */}
      <div style={{
        background: 'linear-gradient(135deg,#1a0620,#2a0f30)',
        border: '2px solid #a855f7',
        borderRadius: 14,
        padding: '16px 18px',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Bangers',sans-serif",
          fontSize: 18,
          color: '#a855f7',
          marginBottom: 8,
          letterSpacing: '0.06em',
        }}>
          🧊 STREAK FREEZE
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 12,
          color: '#d8b4fe',
          marginBottom: 10,
          lineHeight: 1.5,
        }}>
          Save your shooting streak by automatically freezing it when you miss a day.
        </div>
        <button
          style={{
            width: '100%',
            background: totalDiamonds >= 50 ? 'linear-gradient(135deg,#6b21a8,#a855f7)' : '#1e293b',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px',
            fontFamily: "'Bangers',sans-serif",
            fontSize: 16,
            letterSpacing: '0.06em',
            cursor: totalDiamonds >= 50 ? 'pointer' : 'default',
            boxShadow: totalDiamonds >= 50 ? '0 0 16px #a855f744' : 'none',
            opacity: totalDiamonds >= 50 ? 1 : 0.5,
          }}
        >
          BUY (50 💎) {totalDiamonds >= 50 ? '→' : 'LOCKED'}
        </button>
      </div>
    </div>
  )
}
