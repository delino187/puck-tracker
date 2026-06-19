import { useState, useRef, useEffect } from 'react'
import { Flame, Users } from 'lucide-react'
import { playerStats } from '../utils/stats.js'
import storeMusicUrl from '../../public/store-music.mp3'

const FREEZE_COST    = 50
const SHIELD_COST    = 100
const ELO_RESET_COST = 200
const GLOW_COST      = 150
const PFP_COST       = 50
const BASE_ELO       = 1000

// ── Individual showcase card inside the stall grid ────────────────────────────
function ItemCard({ emoji, name, desc, tag, cost, canBuy, isOwned, owned, onBuy, onInsufficientFunds, isEquipped, onEquip }) {
  // Three mutually exclusive states when owned:
  //   isOwned + onEquip → equippable toggle (border glow)
  //   isOwned only      → permanently consumed (shield, pfp, etc.)
  const showEquipToggle = isOwned && typeof onEquip === 'function'

  return (
    <div style={{
      background: 'linear-gradient(180deg,#fef9ee,#fef3c7)',
      border: `3px solid ${isOwned ? '#22c55e' : '#d97706'}`,
      borderRadius: 18,
      padding: '14px 8px 10px',
      textAlign: 'center',
      boxShadow: isOwned
        ? '0 4px 12px rgba(0,0,0,0.35), 0 0 14px #22c55e44, inset 0 1px 0 rgba(255,255,255,0.9)'
        : '0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.9)',
      position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    }}>
      {/* Status badge (top-right) */}
      {isOwned && !showEquipToggle && (
        <div style={{
          position: 'absolute', top: -8, right: -8,
          background: '#22c55e', border: '2px solid #15803d',
          borderRadius: 20, padding: '1px 7px',
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
          color: '#fff', letterSpacing: '0.08em',
        }}>OWNED</div>
      )}
      {showEquipToggle && (
        <div style={{
          position: 'absolute', top: -8, right: -8,
          background: isEquipped ? '#22c55e' : '#6b7280',
          border: `2px solid ${isEquipped ? '#15803d' : '#4b5563'}`,
          borderRadius: 20, padding: '1px 7px',
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
          color: '#fff', letterSpacing: '0.08em',
        }}>{isEquipped ? 'ON' : 'OFF'}</div>
      )}
      {tag && !isOwned && (
        <div style={{
          position: 'absolute', top: -8, right: -8,
          background: '#f97316', border: '2px solid #c2410c',
          borderRadius: 20, padding: '1px 7px',
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
          color: '#fff', letterSpacing: '0.08em',
        }}>{tag}</div>
      )}

      {/* Big item emoji */}
      <div style={{ fontSize: 44, lineHeight: 1, filter: isOwned ? 'drop-shadow(0 0 6px #22c55e88)' : 'none' }}>
        {emoji}
      </div>

      {/* Name */}
      <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 15, letterSpacing: '0.04em', color: '#7c2d12', lineHeight: 1.1 }}>
        {name}
      </div>

      {/* Description */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 700, color: '#92400e', letterSpacing: '0.04em', lineHeight: 1.3, minHeight: 22 }}>
        {desc}
      </div>

      {/* Owned count / status label */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: owned > 0 || isOwned ? '#15803d' : '#94a3b8', letterSpacing: '0.06em' }}>
        {showEquipToggle
          ? (isEquipped ? '✅ EQUIPPED' : '⬜ UNEQUIPPED')
          : isOwned
            ? '✅ OWNED'
            : `x${owned} owned`}
      </div>

      {/* CTA button — equip toggle, buy, or can't-afford */}
      {showEquipToggle ? (
        <button
          onClick={onEquip}
          style={{
            width: '100%', marginTop: 4,
            background: isEquipped
              ? 'linear-gradient(180deg,#6b7280,#4b5563)'
              : 'linear-gradient(180deg,#a855f7,#7c3aed)',
            border: isEquipped ? '2px solid #374151' : '2px solid #6d28d9',
            borderRadius: 20, padding: '7px 6px',
            fontFamily: "'Bangers',sans-serif", fontSize: 15, letterSpacing: '0.06em',
            color: '#fff', cursor: 'pointer',
            boxShadow: isEquipped ? 'none' : '0 3px 0 #6d28d9, 0 0 12px #a855f755',
            textShadow: '0 1px 2px rgba(0,0,0,0.35)',
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {isEquipped ? 'UNEQUIP' : '✨ EQUIP'}
        </button>
      ) : (
        <button
          disabled={isOwned}
          onClick={isOwned ? undefined : canBuy ? onBuy : onInsufficientFunds}
          style={{
            width: '100%', marginTop: 4,
            background: isOwned
              ? '#6b7280'
              : canBuy
                ? 'linear-gradient(180deg,#4ade80,#16a34a)'
                : 'linear-gradient(180deg,#ef4444,#b91c1c)',
            border: isOwned
              ? '2px solid #4b5563'
              : canBuy
                ? '2px solid #15803d'
                : '2px solid #7f1d1d',
            borderRadius: 20, padding: '7px 6px',
            fontFamily: "'Bangers',sans-serif", fontSize: 15, letterSpacing: '0.06em',
            color: '#fff',
            cursor: isOwned ? 'not-allowed' : 'pointer',
            boxShadow: canBuy && !isOwned ? '0 3px 0 #15803d, 0 0 10px #4ade8055' : 'none',
            textShadow: '0 1px 2px rgba(0,0,0,0.35)',
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => { if (!isOwned) e.currentTarget.style.transform = 'scale(0.96)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {isOwned ? '— MAX —' : canBuy ? `${cost} 💎` : 'NEED MORE 💎'}
        </button>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StreakHub({ player, stats, sessions, players, onPurchaseItem, onNavigate }) {
  const totalDiamonds    = player.diamonds         || 0
  const hasEloShield     = player.hasEloShield     || false
  const boughtBorderGlow = player.boughtBorderGlow || false
  const hasBorderGlow    = player.hasBorderGlow    || false
  const canChangePfp     = player.canChangePfp     || false
  const [showLowBalance, setShowLowBalance] = useState(false)

  // ── Store background music ────────────────────────────────────────────────
  const bgMusicRef = useRef(null)
  const mutedRef   = useRef(localStorage.getItem('appAudioMuted') === 'true')
  const [musicMuted, setMusicMuted] = useState(mutedRef.current)

  useEffect(() => {
    const audio = new Audio(storeMusicUrl)
    audio.loop   = true
    audio.volume = 0.22
    bgMusicRef.current = audio
    if (!mutedRef.current) {
      audio.play().catch(() => {
        const resume = () => { audio.play().catch(() => {}); window.removeEventListener('click', resume) }
        window.addEventListener('click', resume)
      })
    }
    return () => { audio.pause(); audio.currentTime = 0; bgMusicRef.current = null }
  }, []) // eslint-disable-line

  function handleMuteToggle() {
    const nowMuted = !mutedRef.current
    mutedRef.current = nowMuted
    setMusicMuted(nowMuted)
    try { localStorage.setItem('appAudioMuted', String(nowMuted)) } catch {}
    const audio = bgMusicRef.current
    if (!audio) return
    if (nowMuted) { audio.pause() } else { audio.play().catch(() => {}) }
  }

  const streakBoard = [...players]
    .map(p => { const s = playerStats(p, sessions); return { ...p, streak: s.streak } })
    .filter(p => p.streak > 0)
    .sort((a, b) => b.streak - a.streak)

  return (
    <div style={{ padding: '14px 14px 80px' }}>

      {/* ── Tab header: music mute toggle ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button
          onClick={handleMuteToggle}
          title={musicMuted ? 'Unmute store music' : 'Mute store music'}
          style={{
            background: musicMuted ? 'rgba(15,23,42,0.7)' : 'rgba(251,191,36,0.12)',
            border: `1px solid ${musicMuted ? '#334155' : '#fbbf2444'}`,
            borderRadius: 8, padding: '4px 9px', cursor: 'pointer',
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

      {/* ── Low-balance modal ─────────────────────────────────────────────── */}
      {showLowBalance && (
        <div
          onClick={() => setShowLowBalance(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg,#1e1b4b,#312e81)',
              border: '4px solid #fbbf24',
              borderRadius: 24,
              padding: '28px 24px 24px',
              textAlign: 'center',
              maxWidth: 320, width: '100%',
              boxShadow: '0 0 60px #fbbf2444, 0 20px 60px rgba(0,0,0,0.7)',
            }}
          >
            {/* Icon */}
            <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 10 }}>💎</div>

            {/* Title */}
            <div style={{
              fontFamily: "'Bangers',sans-serif", fontSize: 32,
              letterSpacing: '0.08em', lineHeight: 1,
              color: '#fbbf24',
              textShadow: '2px 2px 0 #78350f, 0 0 20px #fbbf2466',
              marginBottom: 12,
            }}>
              OUT OF DIAMONDS!
            </div>

            {/* Body */}
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14,
              fontWeight: 600, color: '#e2e8f0', lineHeight: 1.55,
              marginBottom: 22,
            }}>
              You don't have enough diamonds to buy this item yet. Go complete some daily quests to fill up your vault!
            </div>

            {/* CTA */}
            <button
              onClick={() => { setShowLowBalance(false); onNavigate?.('quests') }}
              style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(180deg,#4ade80,#16a34a)',
                border: '3px solid #15803d',
                borderRadius: 30,
                fontFamily: "'Bangers',sans-serif", fontSize: 22,
                letterSpacing: '0.1em', color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #15803d, 0 0 20px #4ade8055',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              GO TO QUESTS 🚀
            </button>

            {/* Dismiss */}
            <button
              onClick={() => setShowLowBalance(false)}
              style={{
                marginTop: 12, background: 'transparent', border: 'none',
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
                fontWeight: 700, color: '#64748b', cursor: 'pointer',
                letterSpacing: '0.08em',
              }}
            >
              MAYBE LATER
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          WOODEN SHOP STALL
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(180deg,#6b3a1f 0%,#4a2610 100%)',
        borderRadius: 24,
        border: '4px solid #3d1f0a',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,200,100,0.12)',
        marginBottom: 22,
        overflow: 'hidden',
      }}>

        {/* ── Striped awning ──────────────────────────────────────────────── */}
        <div style={{ position: 'relative', height: 52, flexShrink: 0 }}>
          {/* Red/white stripes */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(90deg,#ef4444 0px,#ef4444 22px,#f8fafc 22px,#f8fafc 44px)',
          }} />
          {/* Bottom shadow band */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: 'rgba(0,0,0,0.28)' }} />
        </div>

        {/* ── PRO SHOP sign ───────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: -6, marginBottom: 14, paddingTop: 2 }}>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(180deg,#a16207,#78350f)',
            border: '4px solid #451a03',
            borderRadius: 14,
            padding: '6px 30px 2px',
            boxShadow: '0 5px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}>
            <div style={{
              fontFamily: "'Bangers',sans-serif", fontSize: 40,
              letterSpacing: '0.14em', lineHeight: 1,
              color: '#fbbf24',
              textShadow: '2px 2px 0 #451a03, 4px 4px 4px rgba(0,0,0,0.4), 0 0 24px #fbbf2477',
            }}>
              PRO SHOP
            </div>
          </div>

          {/* Diamond balance pill */}
          <div style={{ marginTop: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: 22, padding: '4px 14px',
              fontFamily: "'Bangers',sans-serif", fontSize: 17,
              color: '#fbbf24', letterSpacing: '0.08em',
              textShadow: '0 0 10px #fbbf2455',
            }}>
              💎 {totalDiamonds.toLocaleString()} DIAMONDS
            </span>
          </div>
        </div>

        {/* ── Inner wood-grain panel with item grid ───────────────────────── */}
        <div style={{ padding: '0 14px 4px' }}>
          <div style={{
            background: 'repeating-linear-gradient(180deg,rgba(0,0,0,0) 0px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0) 4px), linear-gradient(180deg,#8b5e3c,#5c3a1e)',
            borderRadius: 18, padding: '16px 12px',
            border: '3px solid #3d1f0a',
            boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

              {/* ── Row 1: Core protections ──────────────────────────────── */}
              <ItemCard
                emoji="🧊"
                name="Streak Freeze"
                desc="Auto-saves your streak on a missed day"
                tag="HOT"
                cost={FREEZE_COST}
                owned={player.streak_freezes || 0}
                canBuy={totalDiamonds >= FREEZE_COST}
                isOwned={false}
                onBuy={() => onPurchaseItem?.('streakFreeze', FREEZE_COST)}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
              <ItemCard
                emoji="🛡️"
                name="ELO Shield"
                desc="Blocks ELO loss on your next defeat"
                cost={SHIELD_COST}
                owned={hasEloShield ? 1 : 0}
                canBuy={!hasEloShield && totalDiamonds >= SHIELD_COST}
                isOwned={hasEloShield}
                onBuy={() => onPurchaseItem?.('eloShield', SHIELD_COST)}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />

              {/* ── Row 2: Competitive + cosmetic ────────────────────────── */}
              <ItemCard
                emoji="📈"
                name="ELO RESET"
                desc="Instantly reset your competitive rating back to the baseline starting ELO rank"
                tag="NEW"
                cost={ELO_RESET_COST}
                owned={0}
                canBuy={totalDiamonds >= ELO_RESET_COST}
                isOwned={false}
                onBuy={() => onPurchaseItem?.('eloReset', ELO_RESET_COST)}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
              <ItemCard
                emoji="✨"
                name="NEON BORDER GLOW"
                desc="Flashing premium neon animated border aura on your profile picture"
                tag={boughtBorderGlow ? undefined : 'NEW'}
                cost={GLOW_COST}
                owned={boughtBorderGlow ? 1 : 0}
                canBuy={!boughtBorderGlow && totalDiamonds >= GLOW_COST}
                isOwned={boughtBorderGlow}
                isEquipped={hasBorderGlow}
                onEquip={boughtBorderGlow ? () => onPurchaseItem?.('toggleBorderGlow', 0) : undefined}
                onBuy={() => onPurchaseItem?.('borderGlow', GLOW_COST)}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />

              {/* ── Row 3: Profile unlock (centred via auto-placement) ────── */}
              <ItemCard
                emoji="🎭"
                name="CUSTOM PFP"
                desc="Unlock the ability to set a custom profile avatar image in your profile settings"
                tag={canChangePfp ? undefined : 'NEW'}
                cost={PFP_COST}
                owned={canChangePfp ? 1 : 0}
                canBuy={!canChangePfp && totalDiamonds >= PFP_COST}
                isOwned={canChangePfp}
                onBuy={() => onPurchaseItem?.('unlockPfp', PFP_COST)}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />

            </div>
          </div>
        </div>
      </div>

      {/* ── Streak Leaderboard ────────────────────────────────────────────── */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.16em', marginBottom: 10 }}>
        ACTIVE STREAKS — ALL PLAYERS
      </div>

      {streakBoard.length === 0 ? (
        <div style={{
          background: 'var(--card-bg)', border: 'var(--card-border)',
          borderRadius: 12, textAlign: 'center', padding: '20px 18px',
        }}>
          <Users size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            No active streaks yet — hit the driveway!
          </div>
        </div>
      ) : (
        <div>
          {streakBoard.map((p, i) => {
            const isMe = p.id === player.id
            return (
              <div
                key={p.id}
                style={{
                  background: isMe ? 'rgba(249,115,22,0.1)' : 'var(--card-bg)',
                  border: isMe ? '1px solid #f9731633' : 'var(--card-border)',
                  borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 800, color: i === 0 ? '#f59e0b' : 'var(--text-muted)', minWidth: 22, textAlign: 'center' }}>
                  {i === 0 ? '🥇' : `#${i + 1}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: isMe ? '#f97316' : 'var(--text-1)' }}>
                    {p.name}{p.jerseyNum ? ` #${p.jerseyNum}` : ''}{isMe ? ' 👈' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {Array.from({ length: Math.min(p.streak, 7) }).map((_, fi) => (
                    <Flame key={fi} size={10} color={`rgba(249,115,22,${1 - fi * 0.1})`} />
                  ))}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 900, color: '#f97316', lineHeight: 1 }}>{p.streak}</div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>DAYS</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
