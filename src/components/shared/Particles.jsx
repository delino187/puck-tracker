export default function Particles({ type }) {
  const items =
    type === 'fire'    ? ['🔥', '⚡', '💥'] :
    type === 'levelup' ? ['⭐', '✨', '🏒', '🌟'] :
                         ['🎉', '✨', '🏒', '⭐']

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 998, overflow: 'hidden' }}>
      <style>{`@keyframes ptUp{to{top:-10%;opacity:0}}`}</style>
      {Array.from({ length: 22 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: '108%',
            fontSize: 14 + Math.random() * 14,
            animation: `ptUp ${0.9 + Math.random()}s ${Math.random() * 0.4}s ease-out forwards`,
          }}
        >
          {items[i % items.length]}
        </div>
      ))}
    </div>
  )
}
