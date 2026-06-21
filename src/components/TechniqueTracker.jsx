import { useState } from 'react'
import { ChevronLeft, Zap, X } from 'lucide-react'

const TECHNIQUE_MODAL_KEY = 'puck_seenTechniqueModal'
import confetti from 'canvas-confetti'
import { C } from '../styles.js'
import { useAppStore } from '../store/useAppStore.js'
import { audioEngine } from '../services/audioEngine.js'

const QUICK_ADDS    = [10, 25, 50]
const SESSION_LIMIT = 100

export default function TechniqueTracker({ player, onBack, onGoalReached }) {
  const [showModal,    setShowModal]    = useState(() => !localStorage.getItem(TECHNIQUE_MODAL_KEY))
  const [sessionPucks, setSessionPucks] = useState(0)

  function dismissModal() {
    localStorage.setItem(TECHNIQUE_MODAL_KEY, '1')
    setShowModal(false)
  }
  const [lastAdd,      setLastAdd]      = useState(null)
  const [honorMsg,     setHonorMsg]     = useState(false)

  const logTechniqueShots = useAppStore(state => state.logTechniqueShots)
  const techEntry         = useAppStore(state => state.techniqueByPlayer[player.id])
  const careerPucks       = techEntry?.totalPucks || 0
  const careerXP          = techEntry?.bonusXP    || 0

  function addShots(n) {
    if (sessionPucks + n > SESSION_LIMIT) {
      setHonorMsg(true)
      setTimeout(() => setHonorMsg(false), 3500)
      return
    }

    audioEngine.play('hit')
    confetti({
      particleCount: n <= 10 ? 22 : n <= 25 ? 30 : 40,
      spread: 52,
      origin: { y: 0.62 },
      ticks: 65,
      scalar: 0.72,
      colors: ['#34d399', '#10b981', '#6ee7b7', '#a7f3d0', '#ffffff'],
    })

    logTechniqueShots(player.id, n)
    setSessionPucks(prev => {
      const next = prev + n
      if (prev < 10 && next >= 10) onGoalReached?.('techniqueOnly10')
      return next
    })
    setLastAdd(n)
    setTimeout(() => setLastAdd(null), 800)
  }

  return (
    <div style={{ padding: '20px 16px 80px' }}>

      {/* ── Onboarding modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: 'rgba(0,0,0,0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 20px',
        }}>
          <div style={{
            width: '100%', maxWidth: 380,
            background: 'linear-gradient(160deg,#060d14,#0c1a24)',
            border: '2px solid #10b981',
            borderRadius: 22,
            padding: '30px 24px 24px',
            boxShadow: '0 0 60px #10b98133, 0 24px 48px rgba(0,0,0,0.7)',
            position: 'relative',
          }}>
            {/* Close X */}
            <button
              onClick={dismissModal}
              style={{
                position: 'absolute', top: 14, right: 14,
                background: 'rgba(16,185,129,0.12)', border: '1px solid #10b98144',
                borderRadius: 8, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#6ee7b7',
              }}
            >
              <X size={15} />
            </button>

            {/* Icon */}
            <div style={{ textAlign: 'center', fontSize: 46, lineHeight: 1, marginBottom: 16, filter: 'drop-shadow(0 0 18px rgba(16,185,129,0.5))' }}>
              🏒
            </div>

            {/* Title */}
            <div style={{
              fontFamily: "'Bangers',sans-serif",
              fontSize: 24, letterSpacing: '0.08em', lineHeight: 1.15,
              color: '#34d399',
              textShadow: '0 0 20px rgba(52,211,153,0.4)',
              textAlign: 'center', marginBottom: 16,
            }}>
              Welcome to Technique Only Mode!
            </div>

            {/* Body */}
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 15, fontWeight: 600,
              color: '#e2e8f0', lineHeight: 1.65,
              letterSpacing: '0.02em',
              textAlign: 'center', marginBottom: 24,
            }}>
              This mode is for working on your power and technique. Don't worry about hitting a specific target, just work on a smooth release. Great for getting some practice on your snapshot or slapshot, and your total pucks still count toward your totals!
            </div>

            {/* Got It button */}
            <button
              onClick={dismissModal}
              style={{
                width: '100%', padding: '15px',
                background: 'linear-gradient(135deg,#065f46,#10b981)',
                color: '#fff', border: 'none', borderRadius: 14,
                cursor: 'pointer',
                fontFamily: "'Bangers',sans-serif", fontSize: 22,
                letterSpacing: '0.1em',
                boxShadow: '0 0 28px #10b98144, 0 4px 0 #065f46',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              ✅ GOT IT — LET'S TRAIN!
            </button>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14 }}
        >
          <ChevronLeft size={18} /> Back
        </button>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '0.18em' }}>
          🏒 TECHNIQUE MODE
        </div>
      </div>

      {/* ── Session counter hero ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card-bg)',
        border: '2px solid #10b981',
        borderRadius: 18, padding: '28px 20px', marginBottom: 20,
        textAlign: 'center',
        boxShadow: sessionPucks > 0 ? '0 0 40px #10b98118' : 'none',
        transition: 'box-shadow 0.4s',
      }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#059669', letterSpacing: '0.2em', marginBottom: 6 }}>
          THIS SESSION
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 80, fontWeight: 900,
          color: sessionPucks > 0 ? '#34d399' : 'var(--score-inactive)', lineHeight: 1,
          textShadow: sessionPucks > 0 ? '0 0 40px #10b98144' : 'none',
          transition: 'color 0.2s, text-shadow 0.2s',
        }}>
          {sessionPucks}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 4 }}>
          SHOTS LOGGED
        </div>
        {sessionPucks > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginTop: 10, background: '#052e16', borderRadius: 8, padding: '4px 12px',
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#34d399', letterSpacing: '0.08em',
          }}>
            <Zap size={11} /> +{sessionPucks} XP earned this session
          </div>
        )}
        {/* Flash badge when a batch is added */}
        {lastAdd && !honorMsg && (
          <div style={{
            marginTop: 8,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 900,
            color: '#10b981', letterSpacing: '0.06em',
          }}>
            +{lastAdd} ✓
          </div>
        )}
        {/* Honor-system nudge when they try to log over the session limit */}
        {honorMsg && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: '#1c1400', border: '1px solid #f59e0b55',
            borderRadius: 10,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13,
            color: '#fbbf24', lineHeight: 1.45, letterSpacing: '0.03em',
          }}>
            🏒 This app uses the honor system. Shoot some more pucks and then log them after!
          </div>
        )}
      </div>

      {/* ── Rapid-add buttons ─────────────────────────────────────────────────── */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.16em', marginBottom: 10 }}>
        LOG SHOTS
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {QUICK_ADDS.map(n => (
          <button
            key={n}
            onPointerDown={() => addShots(n)}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid #10b98144',
              borderRadius: 14, padding: '22px 8px',
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 900, fontSize: 26,
              color: '#34d399', cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 4px 20px #10b98110',
              touchAction: 'manipulation', userSelect: 'none',
              transition: 'transform 0.08s, background 0.1s',
            }}
            onPointerEnter={e => { e.currentTarget.style.background = '#052e16' }}
            onPointerLeave={e => { e.currentTarget.style.background = 'var(--card-bg)' }}
          >
            +{n}
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.06em' }}>
              SHOTS
            </div>
          </button>
        ))}
      </div>

      {/* ── Career stats ──────────────────────────────────────────────────────── */}
      <div style={{ ...C.card, padding: '16px 18px' }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.16em', marginBottom: 12 }}>
          CAREER TECHNIQUE STATS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 900, color: '#34d399', lineHeight: 1 }}>
              {careerPucks.toLocaleString()}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 3 }}>
              TOTAL PUCKS
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>
              {careerXP.toLocaleString()}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 3 }}>
              BONUS XP EARNED
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, fontFamily: 'Barlow,sans-serif', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
        Pure volume training · no accuracy tracked · +1 XP per puck
      </div>
    </div>
  )
}
