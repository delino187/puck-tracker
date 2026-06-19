import { useState } from 'react'

/**
 * One-tap clipboard copy with a 2-second "Copied! ⚡" confirmation state.
 * Falls back to document.execCommand for browsers that block navigator.clipboard
 * (e.g. non-HTTPS origins in older WebViews).
 */
export default function CopyButton({ inviteText, style }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e) {
    e.stopPropagation()   // prevent card-level click handlers from firing
    try {
      await navigator.clipboard.writeText(inviteText)
    } catch {
      // execCommand fallback
      try {
        const el = document.createElement('textarea')
        el.value = inviteText
        el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
        document.body.appendChild(el)
        el.focus(); el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      } catch { return }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: copied ? 'rgba(34,197,94,0.12)' : 'transparent',
        border: `1px solid ${copied ? '#22c55e55' : '#334155'}`,
        borderRadius: 8, padding: '6px 12px',
        fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
        fontWeight: 700, letterSpacing: '0.06em',
        color: copied ? '#22c55e' : '#94a3b8',
        cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s, color 0.2s',
        ...style,
      }}
    >
      {copied ? 'Copied! ⚡' : 'Copy Invite Link 🔗'}
    </button>
  )
}

/** Build the correct invite string based on challenge type and match type. */
export function buildInviteText(type, matchType) {
  const url = window.location.origin
  if (type === 'puck') {
    return `I just challenged you to a match of P-U-C-K. First to spell it loses. Get in here: ${url}`
  }
  if (matchType === 'unranked') {
    return `I just challenged you to a casual match of Versus. Zero ELO risk, let's settle this: ${url}`
  }
  return `I just challenged you to a Ranked match of Versus. Don't be a benchwarmer, protect your ELO: ${url}`
}
