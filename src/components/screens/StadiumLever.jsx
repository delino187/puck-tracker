import { useState } from 'react'

export default function StadiumLever({ disabled, onSpin, isSpinning }) {
  const [pulled, setPulled] = useState(false)

  function handlePull() {
    if (disabled || isSpinning || pulled) return
    setPulled(true)
    onSpin()
    setTimeout(() => setPulled(false), 500)
  }

  return (
    <div
      onClick={handlePull}
      title={disabled ? 'Already spun today' : 'Pull to spin!'}
      style={{
        position: 'absolute', right: -28, top: '50%',
        transform: 'translateY(-50%)', zIndex: 50,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'opacity 0.3s',
        userSelect: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
    >
      <div style={{
        width: 18, height: 50,
        background: 'linear-gradient(90deg,#5a5a5a,#2e2e2e,#5a5a5a)',
        borderRadius: 9, border: '2px solid #111',
        boxShadow: '0 2px 8px #0008',
      }} />
      <div style={{
        width: 12, height: 70, marginTop: -12,
        transformOrigin: 'top center',
        transform: `rotate(${pulled ? -40 : 0}deg)`,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 8, height: 52,
          background: 'linear-gradient(90deg,#666,#333,#666)',
          borderRadius: 4, border: '1px solid #1a1a1a',
        }} />
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'radial-gradient(circle at 32% 28%,#ff7070,#cc0000)',
          border: '2px solid #880000',
          boxShadow: '0 0 14px #ff222288, inset -3px -3px 5px rgba(0,0,0,0.5)',
          marginTop: -4, flexShrink: 0,
        }} />
      </div>
    </div>
  )
}
