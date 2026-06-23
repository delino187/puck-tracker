import { useState } from 'react'
import { Volume2, CheckCircle } from 'lucide-react'
import { audioEngine } from '../services/audioEngine.js'
import PageHelpButton from './shared/PageHelpButton.jsx'
import { playerStats } from '../utils/stats.js'
import { useAppStore } from '../store/useAppStore.js'
import { usePlayer } from '../context/PlayerContext.jsx'
import { useUI } from '../context/UIContext.jsx'

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

// ── Cosmetic items inventory ────────────────────────────────────────────────
const COSMETIC_ITEMS = {
  'sad_trombone': {
    id: 'sad_trombone',
    name: 'Sad Trombone',
    emoji: '🎺',
    desc: 'Plays when opponent wins',
    audioPath: '/sad-game-over-trombone.mp3',
  },
}

// ── Individual showcase card inside the stall grid ────────────────────────────
function ItemCard({ emoji, imgSrc, name, desc, tag, cost, balance, canBuy, isOwned, owned, onBuy, onInsufficientFunds, isEquipped, onEquip, onPreview, processing }) {
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

      {/* Big item icon — either an image preview or an emoji.
          When onPreview is provided the icon becomes a tappable audio preview button. */}
      {onPreview ? (
        <button
          onClick={e => { e.stopPropagation(); onPreview() }}
          title="Tap to preview sound"
          style={{
            background: 'rgba(0,0,0,0.08)', border: '1px dashed #d97706',
            borderRadius: 10, padding: '6px 8px 2px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}
        >
          <div style={{ fontSize: 38, lineHeight: 1 }}>{emoji}</div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 7, fontWeight: 800,
            color: '#b45309', letterSpacing: '0.1em',
          }}>
            ▶ PREVIEW
          </div>
        </button>
      ) : imgSrc ? (
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
          disabled={isOwned || processing}
          onClick={isOwned || processing ? undefined : canBuy ? onBuy : onInsufficientFunds}
          className="active:scale-95 transition-transform"
          style={{
            width: '100%', marginTop: 4,
            background: isOwned || processing
              ? '#6b7280'
              : canBuy
                ? 'linear-gradient(180deg,#4ade80,#16a34a)'
                : 'linear-gradient(180deg,#ef4444,#b91c1c)',
            border: isOwned || processing
              ? '2px solid #4b5563'
              : canBuy
                ? '2px solid #15803d'
                : '2px solid #7f1d1d',
            borderRadius: 20, padding: '7px 6px',
            fontFamily: "'Bangers',sans-serif", fontSize: 15, letterSpacing: '0.06em',
            color: '#fff',
            cursor: isOwned || processing ? 'not-allowed' : 'pointer',
            boxShadow: canBuy && !isOwned && !processing ? '0 3px 0 #15803d, 0 0 10px #4ade8055' : 'none',
            textShadow: '0 1px 2px rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {processing ? (
            <>
              <div style={{ width: 10, height: 10, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              ...
            </>
          ) : isOwned ? '— MAX —' : canBuy ? `${cost} 💎` : `need ${cost - balance} more 💎`}
        </button>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StreakHub({ onPurchaseItem, onNavigate, onEquipTaunt }) {
  const { activePlayer: player, st, upd } = usePlayer()
  const { setRookieToast, rookieToastTimer } = useUI()
  const techBonusXP = useAppStore(s => s.techniqueByPlayer[player?.id]?.bonusXP ?? 0)
  const stats = playerStats(player, st.sessions, techBonusXP)
  const totalDiamonds       = player.diamonds            || 0
  const hasEloShield        = player.hasEloShield        || false
  const boughtBorderGlow    = player.boughtBorderGlow    || false
  const hasBorderGlow       = player.hasBorderGlow       || false
  const canChangePfp        = player.canChangePfp        || false
  const weekFreezeQty       = player.week_streak_freezes || 0
  const doubleXpQty         = player.doubleXpTokens      || 0
  const hasTrombone         = player.sadTromboneUnlocked || false

  // Safe defaults for inventory tracking
  const ownedItems = player.ownedItems || (hasTrombone ? ['sad_trombone'] : [])
  const equippedTaunt = player.equippedTaunt || 'standard'

  const [showLowBalance,       setShowLowBalance]       = useState(false)
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false)

  // Plays the purchase chime then fires the purchase handler.
  // Locks for 600 ms to prevent accidental double-billing.
  function buyItem(itemId, cost) {
    if (isProcessingPurchase) return
    setIsProcessingPurchase(true)
    audioEngine.playMp3('/retro-game-notification.mp3', 0.85)
    onPurchaseItem?.(itemId, cost)

    // Add item to ownedItems if it's a taunt
    if (itemId === 'sadTrombone' && !ownedItems.includes('sad_trombone')) {
      upd({
        players: st.players.map(p =>
          p.id === player.id
            ? { ...p, ownedItems: [...ownedItems, 'sad_trombone'] }
            : p
        ),
      })
    }

    setTimeout(() => setIsProcessingPurchase(false), 600)
  }

  // Update the player's equipped taunt and show success notification
  function equipTaunt(tauntId) {
    onEquipTaunt?.(tauntId)
    audioEngine.playMp3('/retro-game-notification.mp3', 0.5)

    // Update equipped taunt locally
    upd({
      players: st.players.map(p =>
        p.id === player.id
          ? { ...p, equippedTaunt: tauntId }
          : p
      ),
    })

    // Show success toast
    clearTimeout(rookieToastTimer.current)
    const itemName = tauntId === 'standard' ? 'Standard' : COSMETIC_ITEMS[tauntId]?.name || tauntId
    setRookieToast({ label: `${itemName} Equipped!`, reward: 0, icon: '✨' })
    rookieToastTimer.current = setTimeout(() => setRookieToast(null), 3500)
  }

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

          {/* Diamond balance pill + help button */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
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
            <PageHelpButton
              title="Pro Shop"
              content="Welcome to the Pro Shop! Spend your earned diamonds to unlock premium taunts, or buy consumable items like 'Rage Bait' and 'Compliments' to send interactive pranks or positive vibes straight to your friends' screens in real-time."
            />
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
                name="STREAK SHIELD"
                desc="Streak Shield! Automatically protects your daily streak if you miss a day on the ice. Use it to keep your hard work alive!"
                tag="HOT"
                cost={FREEZE_COST}
                owned={player.streak_freezes || 0}
                canBuy={totalDiamonds >= FREEZE_COST}
                isOwned={false}
                onBuy={() => buyItem('streakFreeze', FREEZE_COST)}
                balance={totalDiamonds}
                processing={isProcessingPurchase}
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
                processing={isProcessingPurchase}
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
                processing={isProcessingPurchase}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
              <ItemCard
                imgSrc="/rage-bait.png"
                name="RAGE BAIT"
                desc="Be a little stinker by sending rage bait to a friend's screen. One-time use!"
                tag="NEW"
                cost={RAGE_BAIT_COST}
                owned={0}
                canBuy={totalDiamonds >= RAGE_BAIT_COST}
                isOwned={false}
                onBuy={() => buyItem('rageBait', RAGE_BAIT_COST)}
                balance={totalDiamonds}
                processing={isProcessingPurchase}
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
                processing={isProcessingPurchase}
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
                processing={isProcessingPurchase}
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
                processing={isProcessingPurchase}
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
                processing={isProcessingPurchase}
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
                processing={isProcessingPurchase}
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
                isEquipped={player.equippedTaunt === 'sad_trombone'}
                onPreview={() => audioEngine.playTauntTrombone()}
                onBuy={() => buyItem('sadTrombone', TROMBONE_COST)}
                onEquip={() => equipTaunt(hasTrombone ? 'sad_trombone' : 'standard')}
                balance={totalDiamonds}
                processing={isProcessingPurchase}
                onInsufficientFunds={() => setShowLowBalance(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Streak zero-state motivational banner ────────────────────────── */}
      {(stats?.streak ?? 0) === 0 && (
        <div style={{
          background: 'linear-gradient(135deg,#0c1a2e,#1e3a5f)',
          border: '1px dashed #3b82f644',
          borderRadius: 14, padding: '16px 18px', marginBottom: 14,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔥</div>
          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 18,
            letterSpacing: '0.08em', color: '#f97316', marginBottom: 6,
          }}>
            GET TO WORK TO IGNITE YOUR STREAK!
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            color: '#64748b', lineHeight: 1.5,
          }}>
            Log at least 10 pucks in Target Practice today to start your streak. Then come back here to protect it with a Streak Freeze!
          </div>
        </div>
      )}

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

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      {ownedItems.length > 0 && (
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#334155,transparent)', marginBottom: 18, marginTop: 12 }} />
      )}

      {/* ── Your Locker Room: Cosmetic Items ────────────────────────────────── */}
      {ownedItems.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg,#081b3d,#0f172a)',
          border: '1px solid #334155',
          borderRadius: 16, padding: '16px 18px', marginBottom: 14,
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800,
            color: '#60a5fa', letterSpacing: '0.18em', marginBottom: 14, textTransform: 'uppercase',
          }}>
            🎒 YOUR LOCKER ROOM
          </div>

          {/* Owned items grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ownedItems.map(itemId => {
              const item = COSMETIC_ITEMS[itemId]
              if (!item) return null

              const isEquipped = equippedTaunt === itemId
              const canPreview = item.audioPath

              return (
                <div
                  key={itemId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: isEquipped ? 'rgba(34, 197, 94, 0.08)' : 'rgba(30, 58, 95, 0.4)',
                    border: isEquipped ? '2px solid #22c55e' : '1px solid #334155',
                    borderRadius: 12,
                    position: 'relative',
                  }}
                >
                  {/* Badge */}
                  {isEquipped && (
                    <div style={{
                      position: 'absolute', top: -10, right: -10,
                      background: '#22c55e', border: '2px solid #16a34a',
                      borderRadius: 20, padding: '2px 8px',
                      fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, fontWeight: 900,
                      color: '#000', letterSpacing: '0.1em',
                    }}>
                      ACTIVE
                    </div>
                  )}

                  {/* Item info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <span style={{ fontSize: 24, lineHeight: 1 }}>{item.emoji}</span>
                    <div>
                      <div style={{
                        fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 800,
                        color: isEquipped ? '#34d399' : '#e2e8f0', letterSpacing: '0.04em',
                      }}>
                        {item.name}
                      </div>
                      <div style={{
                        fontFamily: "'Barlow',sans-serif", fontSize: 10, color: '#64748b',
                      }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Preview button */}
                    {canPreview && (
                      <button
                        onClick={() => {
                          try {
                            new Audio(item.audioPath).play().catch(() => {})
                          } catch {}
                        }}
                        title="Preview sound"
                        style={{
                          background: '#1e3a5f',
                          border: '1px solid #334155',
                          borderRadius: 8,
                          padding: '6px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#3b5a7a'
                          e.currentTarget.style.borderColor = '#60a5fa'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#1e3a5f'
                          e.currentTarget.style.borderColor = '#334155'
                        }}
                      >
                        <Volume2 size={16} color="#60a5fa" />
                      </button>
                    )}

                    {/* Equip/Unequip button */}
                    <button
                      onClick={() => equipTaunt(isEquipped ? 'standard' : itemId)}
                      style={{
                        background: isEquipped
                          ? '#1e3a5f'
                          : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                        border: isEquipped ? '1px solid #334155' : '1px solid #1e40af',
                        borderRadius: 8,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontFamily: "'Barlow Condensed',sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        color: isEquipped ? '#64748b' : '#fff',
                        letterSpacing: '0.05em',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        if (!isEquipped) {
                          e.currentTarget.style.boxShadow = '0 0 12px #3b82f655'
                          e.currentTarget.style.transform = 'scale(1.05)'
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = 'none'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      {isEquipped ? '✓ EQUIPPED' : '⬜ EQUIP'}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Standard (default) option */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: equippedTaunt === 'standard' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(30, 58, 95, 0.4)',
                border: equippedTaunt === 'standard' ? '2px solid #22c55e' : '1px solid #334155',
                borderRadius: 12,
                position: 'relative',
              }}
            >
              {equippedTaunt === 'standard' && (
                <div style={{
                  position: 'absolute', top: -10, right: -10,
                  background: '#22c55e', border: '2px solid #16a34a',
                  borderRadius: 20, padding: '2px 8px',
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, fontWeight: 900,
                  color: '#000', letterSpacing: '0.1em',
                }}>
                  ACTIVE
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <span style={{ fontSize: 24, lineHeight: 1 }}>🎮</span>
                <div>
                  <div style={{
                    fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 800,
                    color: equippedTaunt === 'standard' ? '#34d399' : '#e2e8f0', letterSpacing: '0.04em',
                  }}>
                    Standard
                  </div>
                  <div style={{
                    fontFamily: "'Barlow',sans-serif", fontSize: 10, color: '#64748b',
                  }}>
                    Default defeat sound
                  </div>
                </div>
              </div>

              {equippedTaunt === 'standard' && (
                <button
                  onClick={() => equipTaunt('sad_trombone')}
                  style={{
                    background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                    border: '1px solid #1e40af',
                    borderRadius: 8,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.05em',
                  }}
                >
                  ⬜ SWITCH
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
