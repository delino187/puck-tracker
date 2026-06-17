// Circular player avatar — shows photoURL image or first-initial fallback.
export default function Avatar({ player, size = 28, style = {} }) {
  const initial = player?.name?.[0]?.toUpperCase() ?? '?'
  const fontSize = Math.round(size * 0.42)

  if (player?.photoURL) {
    return (
      <img
        src={player.photoURL}
        alt={player?.name ?? ''}
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

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: '#1e3a5f',
      border: '1px solid #3b82f644',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontFamily: "'Bangers',sans-serif",
      fontSize,
      color: '#60a5fa',
      ...style,
    }}>
      {initial}
    </div>
  )
}
