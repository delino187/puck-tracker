import { useState } from 'react'
import { ChevronLeft, Zap } from 'lucide-react'
import { C } from '../styles.js'
import { useAppStore } from '../store/useAppStore.js'

const QUICK_ADDS = [10, 25, 50]

export default function TechniqueTracker({ player, onBack }) {
  const [sessionPucks, setSessionPucks] = useState(0)
  const [lastAdd,      setLastAdd]      = useState(null)

  const logTechniqueShots = useAppStore(state => state.logTechniqueShots)
  const techEntry         = useAppStore(state => state.techniqueByPlayer[player.id])
  const careerPucks       = techEntry?.totalPucks || 0
  const careerXP          = techEntry?.bonusXP    || 0

  function addShots(n) {
    logTechniqueShots(player.id, n)
    setSessionPucks(p => p + n)
    setLastAdd(n)
    setTimeout(() => setLastAdd(null), 800)
  }

  return (
    <div style={{ padding: '20px 16px 80px' }}>

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
        {lastAdd && (
          <div style={{
            marginTop: 8,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 900,
            color: '#10b981', letterSpacing: '0.06em',
            animation: 'none',
          }}>
            +{lastAdd} ✓
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
