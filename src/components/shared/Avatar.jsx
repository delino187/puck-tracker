const DEFAULT_PFP = '/default-profile-pic.png'

// Circular player avatar.
// Shows a custom photoURL only when canChangePfp is true and a URL is set.
// All other cases fall back to the shared default-profile-pic silhouette.
export default function Avatar({ player, size = 28, style = {}, className = '', glowActive = false }) {
  const glowClass = glowActive ? ' neon-border-glow' : ''
  const src = (player?.canChangePfp && player?.photoURL) ? player.photoURL : DEFAULT_PFP

  return (
    <img
      src={src}
      alt={player?.name ?? ''}
      className={className + glowClass}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
