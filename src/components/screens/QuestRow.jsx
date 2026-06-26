import { TIER_COLORS } from '../../constants/questPools.js'
import { questTab }    from '../../utils/questEngine.js'

export default function QuestRow({ quest, progress, isSpinning, shuffleText, onNavigate, onClaim }) {
  const tc            = TIER_COLORS[quest.tier] || TIER_COLORS.common
  const label         = isSpinning ? shuffleText : quest.text
  const tabTarget     = questTab(label)
  const isPlaceholder = quest.reward === '?'

  if (quest.isNewDayPlaceholder) {
    return (
      <div style={{
        background: 'rgba(15,23,42,0.6)',
        border: '1.5px solid #1e293b',
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
        opacity: 0.55,
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>🔒</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, color: '#475569', letterSpacing: '0.04em' }}>
            ????
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#334155', marginTop: 3 }}>
            Spin today's wheel to unlock
          </div>
        </div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: '#334155' }}>? 💎</div>
      </div>
    )
  }

  const isDone      = quest.completed || (!isPlaceholder && progress ? progress.current >= progress.target : false)
  const isClaimed   = quest.claimed || false
  const isClaimable = isDone && !isClaimed && !isPlaceholder && !isSpinning
  const sfx         = progress?.suffix || quest.suffix || ''

  function handleClick(e) {
    if (isClaimable) {
      onClaim?.(e.currentTarget.getBoundingClientRect())
    } else if (tabTarget && !isSpinning) {
      onNavigate(tabTarget)
    }
  }

  const cardBg     = isClaimable ? 'linear-gradient(135deg,#1c0e00,#2d1500)'
                   : isClaimed   ? 'linear-gradient(135deg,#091a0a,#0c200d)'
                   : isDone      ? 'linear-gradient(135deg,#091a0a,#0c200d)'
                   :               'linear-gradient(135deg,#0f0c1a,#1a0f20)'
  const cardBorder = isClaimable ? '#fbbf24' : isClaimed ? '#22c55e' : isDone ? '#22c55e' : tc.border
  const cardShadow = isClaimable ? '0 0 26px #fbbf2444'
                   : isClaimed   ? '0 0 22px #22c55e33'
                   : isDone      ? '0 0 22px #22c55e33'
                   :               `0 0 18px ${tc.glow}44`

  return (
    <div
      onClick={handleClick}
      style={{
        background: cardBg,
        border: `3px solid ${cardBorder}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 10,
        display: 'grid', gridTemplateColumns: '52px 1fr 72px', gap: 12,
        alignItems: 'center',
        boxShadow: cardShadow,
        cursor: (isClaimable || (tabTarget && !isSpinning)) ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        if (isClaimable) { e.currentTarget.style.transform = 'scale(1.015)'; e.currentTarget.style.boxShadow = '0 0 40px #fbbf2466' }
        else if (tabTarget && !isSpinning) { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = `0 0 30px ${cardBorder}66` }
      }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = cardShadow }}
    >
      {/* Left: hex icon */}
      <div style={{
        width: 52, height: 52, flexShrink: 0,
        clipPath: 'polygon(30% 0%,70% 0%,100% 50%,70% 100%,30% 100%,0% 50%)',
        background: isClaimable ? 'linear-gradient(135deg,#92400e66,#fbbf2422)'
          : isDone ? 'linear-gradient(135deg,#14532d66,#22c55e22)'
          : `linear-gradient(135deg,${tc.glow}33,${tc.glow}11)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, transition: 'font-size 0.06s',
      }}>
        {isSpinning ? '⚡' : quest.icon}
      </div>

      {/* Center */}
      <div>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: isSpinning ? 13 : 15, fontWeight: 800,
          color: isSpinning ? tc.border : isClaimable ? '#fef3c7' : isClaimed ? '#4ade80' : isDone ? '#4ade80' : '#ffffff',
          letterSpacing: '0.06em', transition: 'color 0.06s', minHeight: 18, lineHeight: 1.2,
        }}>
          {label}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <div
            className={isClaimable ? 'claim-pulse' : ''}
            style={{
              display: 'inline-block', padding: '3px 9px', borderRadius: 5,
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800,
              letterSpacing: '0.12em',
              background: isClaimed ? '#14532d' : isClaimable ? '#92400e' : isDone ? '#14532d' : '#0c1a26',
              color: isClaimed ? '#4ade80' : isClaimable ? '#fbbf24' : isDone ? '#4ade80' : isSpinning ? '#475569' : '#22d3ee',
              border: `1px solid ${isClaimed ? '#22c55e66' : isClaimable ? '#f59e0b' : isDone ? '#22c55e66' : isSpinning ? '#1e293b' : '#0e749066'}`,
              boxShadow: isClaimed ? '0 0 8px #22c55e44' : isDone && !isClaimable ? '0 0 8px #22c55e44' : isSpinning ? 'none' : '0 0 6px #22d3ee22',
              transition: 'all 0.06s',
            }}
          >
            {isSpinning ? '⏳ ROLLING...' : isClaimed ? '✅ CLAIMED!' : isClaimable ? '✨ TAP TO CLAIM!' : isDone ? '✅ COMPLETE!' : '⬜ INCOMPLETE'}
          </div>

          {!isSpinning && !isPlaceholder && (progress || quest.targetProgress) && (
            <span style={{
              fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.05em', lineHeight: 1,
              color: isClaimed ? '#4ade80' : isClaimable ? '#fbbf24' : isDone ? '#fbbf24' : '#4ade80',
              textShadow: (isClaimed || isDone) ? '0 0 10px #fbbf2444' : '0 0 8px #4ade8044',
            }}>
              {(isClaimed || isDone)
                ? '✨ COMPLETED'
                : progress
                  ? `${progress.current}${sfx} / ${progress.target}${sfx}`
                  : `${quest.currentProgress || 0} / ${quest.targetProgress}`}
            </span>
          )}
        </div>

        {!isSpinning && !isClaimed && (
          isClaimable ? (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#fbbf24', marginTop: 5, letterSpacing: '0.1em' }}>
              💎 +{quest.reward} DIAMONDS READY TO COLLECT
            </div>
          ) : !isDone && tabTarget && (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#fbbf24', marginTop: 5, letterSpacing: '0.1em' }}>
              {tabTarget === 'challenges' ? '⚔️ TAP → VERSUS TAB' : /P-U-C-K/i.test(quest.text) ? '🎮 TAP → SHOOT TAB' : /Log (\d+) Total Shots/i.test(quest.text) ? '🏒 Any game mode counts!' : '🏒 TAP → TARGET PRACTICE'}
            </div>
          )
        )}
      </div>

      {/* Right: diamond reward */}
      <div style={{ textAlign: 'center', opacity: isClaimed ? 0.35 : 1 }}>
        <div style={{ fontSize: 20, animation: isClaimable ? 'diamondPulse 0.8s ease-in-out infinite' : 'diamondPulse 2s ease-in-out infinite', marginBottom: 2 }}>💎</div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: isClaimable ? '#fbbf24' : '#f1f5f9', letterSpacing: '0.04em' }}>
          +{quest.reward}
        </div>
      </div>
    </div>
  )
}
