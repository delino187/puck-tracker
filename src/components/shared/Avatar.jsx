const DEFAULT_PFP = '/default-profile-pic.png'

// Circular player avatar.
// Shows a custom photoURL only when canChangePfp is true and a URL is set.
// All other cases — no flag, no URL, or a broken/expired URL — show DEFAULT_PFP.
// If player.isAdmin is true, a gold "A" badge is overlaid on the bottom-right corner.
export default function Avatar({ player, size = 28, style = {}, className = '', glowActive = false }) {
  const glowClass = glowActive ? ' neon-border-glow' : ''
  const src       = (player?.canChangePfp && player?.photoURL) ? player.photoURL : DEFAULT_PFP
  const isAdmin   = !!player?.isAdmin

  // Badge scales with avatar size: 36% of diameter, min 14px
  const badgeSize = Math.max(14, Math.round(size * 0.36))
  const badgeFontSize = Math.max(8, Math.round(size * 0.20))

  return (
    <div style={{
      position: 'relative',
      display: 'inline-block',
      width: size,
      height: size,
      flexShrink: 0,
    }}>
      <img
        src={src}
        alt={player?.name ?? ''}
        className={className + glowClass}
        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_PFP }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          ...style,
        }}
      />
      {isAdmin && (
        <div
          title="Admin"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width:  badgeSize,
            height: badgeSize,
            borderRadius: '50%',
            background: '#f59e0b',
            border: '1.5px solid #0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: badgeFontSize,
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: 0,
            zIndex: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >A</div>
      )}
    </div>
  )
}
