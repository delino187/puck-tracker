import { useState } from 'react'
import { audioEngine } from '../services/audioEngine.js'

const FREEZE_COST       = 75
const WEEK_FREEZE_COST  = 400
const DOUBLE_XP_COST    = 200
const TROMBONE_COST     = 300
const RAGE_BAIT_COST    = 15
const COMPLIMENT_COST   = 15
const SHIELD_COST       = 100
const ELO_RESET_COST    = 200
const GLOW_COST         = 150
const PFP_COST          = 50
const BASE_ELO       = 1000

// ── Individual showcase card inside the stall grid ────────────────────────────
function ItemCard({ emoji, imgSrc, name, desc, tag, cost, balance, canBuy, isOwned, owned, onBuy, onInsufficientFunds, isEquipped, onEquip }) {
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

      {/* Big item icon — either an image preview or an emoji */}
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={name}
          style={{
            width: 56, height: 56, objectFit: 'cover', borderRadius: 8,
            border: isOwned ? '2px solid #22c55e' : '2px solid #d97706',
            filter: isOwned ? 'drop-shadow(0 0 6px #22c55e88)' : 'none',
          }}
        />
      ) : (
        <div style={{ fontSize: 44, lineHeight: 1, filter: isOwned ? 'drop-shadow(0 0 6px #22c55e88)' : 'none' }}>
          {emoji}
        </div>
      )}

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
          {isOwned ? '— MAX —' : canBuy ? `${cost} 💎` : `need ${cost - balance} more 💎`}
        </button>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StreakHub({ player, stats, onPurchaseItem, onNavigate }) {
  const totalDiamonds       = player.diamonds            || 0
  const hasEloShield        = player.hasEloShield        || false
  const boughtBorderGlow    = player.boughtBorderGlow    || false
  const hasBorderGlow       = player.hasBorderGlow       || false
  const canChangePfp        = player.canChangePfp        || false
  const weekFreezeQty       = player.week_streak_freezes || 0
  const doubleXpQty         = player.doubleXpTokens      || 0
  const hasTrombone         = player.sadTromboneUnlocked || false

  // Plays the purchase chime then fires the purchase handler
  function buyItem(itemId, cost) {
    audioEngine.playMp3('/retro-game-notification.mp3', 0.85)
    onPurchaseItem?.(itemId, cost)
  }
  const [showLowBalance, setShowLowBalance] = useState(false)

  return (
    <div style={{ padding: '14px 14px 80px' }}>

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

            {/* ── Consumables label ─────────────────────────────────────── */}
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
              color: 'rgba(254,243,199,0.55)', letterSpacing: '0.22em',
              textTransform: 'uppercase', textAlign: 'center', marginBottom: 10,
            }}>
              ⚡ CONSUMABLES &amp; POWER-UPS
            </div>

            {/* ── 3-col responsive grid for the new consumable items ────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 14 }}>
              <ItemCard
                emoji="🧊"
                name="1-DAY FREEZE"
                desc="Chills your streak for 24 hours if you miss a day on the ice. Ingested automatically upon a missed day."
                tag="HOT"
                cost={FREEZE_COST}
                owned={player.streak_freezes || 0}
                canBuy={totalDiamonds >= FREEZE_COST}
                isOwned={false}
                onBuy={() => buyItem('streakFreeze', FREEZE_COST)}
                balance={totalDiamonds}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
              <ItemCard
                emoji="🌨️"
                name="1-WEEK FREEZE"
                desc="Going away for a tournament or vacation? Locks your daily streak perfectly safe for 7 days straight!"
                tag="PREMIUM"
                cost={WEEK_FREEZE_COST}
                owned={weekFreezeQty}
                canBuy={totalDiamonds >= WEEK_FREEZE_COST}
                isOwned={false}
                onBuy={() => buyItem('weekStreakFreeze', WEEK_FREEZE_COST)}
                balance={totalDiamonds}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
              <ItemCard
                emoji="⚡"
                name="DOUBLE-XP TOKEN"
                desc="Supercharge your grind! Earn 2x XP on all pucks logged for your next shooting session or next 50 shots."
                tag="NEW"
                cost={DOUBLE_XP_COST}
                owned={doubleXpQty}
                canBuy={totalDiamonds >= DOUBLE_XP_COST}
                isOwned={false}
                onBuy={() => buyItem('doubleXpToken', DOUBLE_XP_COST)}
                balance={totalDiamonds}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
              <ItemCard
                imgSrc="/rage-bait.png"
                name="RAGE BAIT"
                desc="Send a hilarious reality check straight to a friend's screen. One-time use!"
                tag="NEW"
                cost={RAGE_BAIT_COST}
                owned={0}
                canBuy={totalDiamonds >= RAGE_BAIT_COST}
                isOwned={false}
                onBuy={() => buyItem('rageBait', RAGE_BAIT_COST)}
                balance={totalDiamonds}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
              <ItemCard
                imgSrc="/compliment.png"
                name="COMPLIMENT"
                desc="Send some positive reinforcement straight to a friend's screen. One-time use!"
                tag="NEW"
                cost={COMPLIMENT_COST}
                owned={0}
                canBuy={totalDiamonds >= COMPLIMENT_COST}
                isOwned={false}
                onBuy={() => buyItem('compliment', COMPLIMENT_COST)}
                balance={totalDiamonds}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
            </div>

            {/* ── Divider ───────────────────────────────────────────────── */}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.35)', margin: '4px 0 14px' }} />

            {/* ── Competitive + cosmetic (2-col) ────────────────────────── */}
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
              color: 'rgba(254,243,199,0.55)', letterSpacing: '0.22em',
              textTransform: 'uppercase', textAlign: 'center', marginBottom: 10,
            }}>
              🏒 COMPETITIVE &amp; COSMETICS
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ItemCard
                emoji="🛡️"
                name="ELO Shield"
                desc="Blocks ELO loss on your next defeat"
                cost={SHIELD_COST}
                owned={hasEloShield ? 1 : 0}
                canBuy={!hasEloShield && totalDiamonds >= SHIELD_COST}
                isOwned={hasEloShield}
                onBuy={() => buyItem('eloShield', SHIELD_COST)}
                balance={totalDiamonds}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
              <ItemCard
                emoji="📈"
                name="ELO RESET"
                desc="Instantly reset your competitive rating back to the baseline starting ELO rank"
                tag="NEW"
                cost={ELO_RESET_COST}
                owned={0}
                canBuy={totalDiamonds >= ELO_RESET_COST}
                isOwned={false}
                onBuy={() => buyItem('eloReset', ELO_RESET_COST)}
                balance={totalDiamonds}
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
                onBuy={() => buyItem('borderGlow', GLOW_COST)}
                balance={totalDiamonds}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
              <ItemCard
                emoji="🎭"
                name="CUSTOM AVATAR"
                desc="Unlock the ability to set a custom profile avatar image in your profile settings"
                tag={canChangePfp ? undefined : 'NEW'}
                cost={PFP_COST}
                owned={canChangePfp ? 1 : 0}
                canBuy={!canChangePfp && totalDiamonds >= PFP_COST}
                isOwned={canChangePfp}
                onBuy={() => buyItem('unlockPfp', PFP_COST)}
                balance={totalDiamonds}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
              <ItemCard
                emoji="🎺"
                name="SAD TROMBONE TAUNT"
                desc="When you defeat an opponent in HORSE or Versus, they will automatically hear this sad trombone blast over their phone!"
                tag={hasTrombone ? undefined : 'HOT'}
                cost={TROMBONE_COST}
                owned={hasTrombone ? 1 : 0}
                canBuy={!hasTrombone && totalDiamonds >= TROMBONE_COST}
                isOwned={hasTrombone}
                onBuy={() => buyItem('sadTrombone', TROMBONE_COST)}
                balance={totalDiamonds}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Consumable inventory ──────────────────────────────────────────── */}
      {(player.streak_freezes > 0 || weekFreezeQty > 0 || doubleXpQty > 0) && (
        <div style={{
          background: 'var(--card-bg)', border: 'var(--card-border)',
          borderRadius: 16, padding: '16px 18px', marginBottom: 14,
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800,
            color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 12,
          }}>
            YOUR CONSUMABLES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(player.streak_freezes || 0) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🧊</span>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>1-Day Streak Freeze</div>
                    <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>Auto-activates on a missed day</div>
                  </div>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: '#60a5fa' }}>
                  {player.streak_freezes}
                </div>
              </div>
            )}
            {weekFreezeQty > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🌨️</span>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>1-Week Streak Freeze</div>
                    <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>7-day streak protection</div>
                  </div>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: '#818cf8' }}>
                  {weekFreezeQty}
                </div>
              </div>
            )}
            {doubleXpQty > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>⚡</span>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Double-XP Token</div>
                    <div style={{ fontFamily: 'Barlow,sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>2x XP on next session</div>
                  </div>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: '#fbbf24' }}>
                  {doubleXpQty}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
