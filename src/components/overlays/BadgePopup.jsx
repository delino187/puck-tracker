import { X, Lock } from 'lucide-react'
import { TIER } from '../../constants/badges.js'
import Particles from '../shared/Particles.jsx'

export default function BadgePopup({ badge, earned, earnedDate, onClose }) {
  const tc      = TIER[badge.tier]
  const IconC   = badge.Icon
  const inner   = earned ? badge.innerBg : 'linear-gradient(135deg,#1e293b,#334155)'
  const iconClr = earned ? badge.innerIcon : '#6b7280'

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {earned && <Particles type="confetti" />}
      <div style={{
        background: '#0f172a', border: `2px solid ${earned ? tc.ring : '#334155'}`,
        borderRadius: 24, padding: '28px 24px 24px', maxWidth: 360, width: '92%', textAlign: 'center',
        boxShadow: earned ? `0 0 80px ${tc.glow}55, 0 0 30px ${tc.glow}33` : 'none',
        zIndex: 1, position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
          <X size={18} />
        </button>

        {/* Tier label */}
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.15em', color: earned ? tc.ring : '#4b5563', marginBottom: 14 }}>
          {tc.label.toUpperCase()} {earned ? 'BADGE UNLOCKED' : 'BADGE'}
        </div>

        {/* Badge circle — 160×160, pop animation, tier-colored glow */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          {/*
            Intermediate wrapper holds the drop-shadow filter (which radiates OUTSIDE
            the element's bounds) and the pop animation class. It must NOT have
            overflow:hidden so the outer glow is visible.
          */}
          <div
            className="badge-pop"
            style={{
              filter: earned
                ? `drop-shadow(0 0 28px ${tc.ring}99) drop-shadow(0 0 12px ${tc.ring}55)`
                : 'none',
            }}
          >
            <div style={{
              width: 160, height: 160, borderRadius: '50%', overflow: 'hidden',
              background: inner,
              border: `4px solid ${earned ? tc.ring : '#334155'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: earned
                ? `0 0 40px ${tc.glow}, 0 0 70px ${tc.glow}44, inset 0 2px 0 rgba(255,255,255,0.12)`
                : 'none',
              position: 'relative', opacity: earned ? 1 : 0.55,
            }}>
              {badge.img ? (
                /* ── Photo asset ──────────────────────────────────────────── */
                <img
                  src={badge.img}
                  alt={badge.name}
                  className="rounded-full object-cover"
                  style={{
                    width: '100%', height: '100%',
                    transform: 'scale(1.08)',
                    filter: earned ? 'none' : 'grayscale(100%)',
                  }}
                />
              ) : (
                /* ── Lucide icon ──────────────────────────────────────────── */
                <>
                  {earned && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 30% 25%,rgba(255,255,255,0.20),transparent 60%)' }} />
                  )}
                  {!earned && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 8 }}>
                      <Lock size={18} color="#4b5563" />
                    </div>
                  )}
                  <IconC size={62} color={iconClr} strokeWidth={1.3} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Name */}
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 30, color: '#f1f5f9', marginBottom: 6 }}>
          {badge.name}
        </div>

        {/* Earned state */}
        {earned ? (
          <>
            <div style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 10 }}>{badge.desc}</div>
            <div style={{ color: tc.ring, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, letterSpacing: '0.08em', marginBottom: earnedDate ? 4 : 18 }}>
              +50 XP BONUS
            </div>
            {earnedDate && (
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 18, fontFamily: "'Barlow Condensed',sans-serif" }}>
                Unlocked on{' '}
                <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
                  {new Date(earnedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: '0.15em', color: '#4b5563', marginBottom: 6 }}>
                HOW TO UNLOCK
              </div>
              <div style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>{badge.desc}</div>
            </div>
            <div style={{ color: '#4b5563', fontSize: 11, marginBottom: 18, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.06em' }}>
              NOT YET EARNED
            </div>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            background: earned ? tc.ring : '#1e293b',
            color: earned ? '#000' : '#e2e8f0',
            border: earned ? 'none' : '1px solid #334155',
            borderRadius: 10, padding: '11px 28px',
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15,
            cursor: 'pointer', width: '100%',
          }}
        >
          {earned ? 'Awesome!' : 'Got it'}
        </button>
      </div>
    </div>
  )
}
