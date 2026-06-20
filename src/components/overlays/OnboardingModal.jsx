import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

const SLIDES = [
  {
    emoji:   '🤝',
    title:   'THE HONOR SYSTEM',
    accentColor: '#06b6d4',
    accentGlow:  'rgba(6,182,212,0.35)',
    body: "Welcome to the Arena! This app runs entirely on the Honor System. Be honest with your puck tracking, train hard, and respect your rivals.",
  },
  {
    emoji:   '🎯',
    title:   'MODES & SHOP',
    accentColor: '#a855f7',
    accentGlow:  'rgba(168,85,247,0.35)',
    body: "Log shots in Target Practice or test your accuracy in Around the World to rack up stats, unlock milestone badges, and earn premium Diamonds!",
  },
  {
    emoji:   '⚔️',
    title:   'VERSUS MODE',
    accentColor: '#f97316',
    accentGlow:  'rgba(249,115,22,0.35)',
    body: "Spend your hard-earned diamonds in the Pro Shop to drop pranks like 'Rage Bait' or positive vibes like 'Compliments' straight to your friends' screens in real-time. Pull the lever in the Quests tab to unlock daily challenges!",
  },
]

export default function OnboardingModal({ onComplete }) {
  const [slide, setSlide] = useState(0)
  const s      = SLIDES[slide]
  const isLast = slide === SLIDES.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'linear-gradient(160deg,#080b14,#0f1628)',
        border: `2px solid ${s.accentColor}55`,
        borderRadius: 24,
        padding: '36px 24px 28px',
        boxShadow: `0 0 60px ${s.accentGlow}, 0 24px 48px rgba(0,0,0,0.7)`,
        position: 'relative',
        transition: 'border-color 0.4s, box-shadow 0.4s',
      }}>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              height: 6,
              width: i === slide ? 22 : 8,
              borderRadius: 3,
              background: i === slide ? s.accentColor : '#1e293b',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* Emoji icon */}
        <div style={{
          textAlign: 'center', fontSize: 56, lineHeight: 1,
          marginBottom: 18,
          filter: `drop-shadow(0 0 18px ${s.accentGlow})`,
        }}>
          {s.emoji}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "'Bangers',sans-serif", fontSize: 26,
          letterSpacing: '0.1em', lineHeight: 1.1,
          color: s.accentColor,
          textShadow: `0 0 20px ${s.accentGlow}`,
          textAlign: 'center', marginBottom: 14,
        }}>
          {s.title}
        </div>

        {/* Body */}
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 15, fontWeight: 600,
          color: '#cbd5e1', lineHeight: 1.65,
          letterSpacing: '0.02em',
          textAlign: 'center', marginBottom: 28,
        }}>
          {s.body}
        </div>

        {/* CTA */}
        {isLast ? (
          <button
            onClick={onComplete}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg,#7f1d1d,#ef4444)',
              color: '#fff', border: 'none', borderRadius: 14,
              cursor: 'pointer',
              fontFamily: "'Bangers',sans-serif", fontSize: 24,
              letterSpacing: '0.12em',
              boxShadow: '0 0 30px #ef444450, 0 4px 0 #7f1d1d',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              animation: 'enterArenaShake 0.6s ease-out',
            }}
          >
            ⚡ ENTER THE ARENA
          </button>
        ) : (
          <button
            onClick={() => setSlide(s => s + 1)}
            style={{
              width: '100%', padding: '14px',
              background: `linear-gradient(135deg,${s.accentColor}cc,${s.accentColor})`,
              color: '#fff', border: 'none', borderRadius: 14,
              cursor: 'pointer',
              fontFamily: "'Bangers',sans-serif", fontSize: 20,
              letterSpacing: '0.1em',
              boxShadow: `0 0 20px ${s.accentGlow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 0.3s',
            }}
          >
            NEXT <ChevronRight size={18} />
          </button>
        )}

        {/* Slide counter */}
        <div style={{
          textAlign: 'center', marginTop: 14,
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 10, fontWeight: 700,
          color: '#334155', letterSpacing: '0.14em',
        }}>
          {slide + 1} / {SLIDES.length}
        </div>
      </div>

      <style>{`
        @keyframes enterArenaShake {
          0%   { transform: scale(0.9);  opacity: 0; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
