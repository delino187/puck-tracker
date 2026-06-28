import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { audioEngine } from '../../services/audioEngine.js'

// ── Default appearance configs ─────────────────────────────────────────────────
const RAGE_CONFIG = {
  imgSrc:       '/rage-bait.png',
  accentColor:  '#ef4444',
  accentRgb:    '239,68,68',
  sendBg:       'linear-gradient(135deg,#7f1d1d,#ef4444)',
  title:        'SEND RAGE BAIT 🔥',
  subtitle:     'Pick a victim. This cannot be undone.',
  targetEmoji:  '🎯',
  sendLabel:    'SEND IT 🔥',
  revealBorder: '#06b6d4',
  revealRgb:    '6,182,212',
  revealBg:     'linear-gradient(135deg,#164e63,#06b6d4)',
  dismissLabel: '😤 CLOSE',
  animName:     'mailReveal',
}

const COMPLIMENT_CONFIG = {
  imgSrc:       '/compliment.png',
  accentColor:  '#34d399',
  accentRgb:    '52,211,153',
  sendBg:       'linear-gradient(135deg,#064e3b,#10b981)',
  title:        'SEND A COMPLIMENT 💚',
  subtitle:     'Spread good vibes to a teammate!',
  targetEmoji:  '💚',
  sendLabel:    'SEND IT 💚',
  revealBorder: '#34d399',
  revealRgb:    '52,211,153',
  revealBg:     'linear-gradient(135deg,#064e3b,#34d399)',
  dismissLabel: '😊 CLOSE',
  animName:     'mailReveal',
}

// ── Shared sender picker ───────────────────────────────────────────────────────
function MailboxSenderModal({ player, players, onSend, onCancel, cfg }) {
  const [targetId, setTargetId] = useState('')
  const [sending,  setSending]  = useState(false)

  const targets = players.filter(p => p.id !== player.id)

  async function handleSend() {
    if (!targetId || sending) return
    setSending(true)
    await onSend(targetId)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'linear-gradient(160deg,#080b14,#0f1628)',
        border: `2px solid rgba(${cfg.accentRgb},0.45)`,
        borderRadius: 20, padding: '28px 22px 24px',
        boxShadow: `0 0 40px rgba(${cfg.accentRgb},0.2), 0 24px 48px rgba(0,0,0,0.6)`,
        position: 'relative',
      }}>
        <button onClick={onCancel} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'transparent', border: '1px solid #334155',
          borderRadius: 8, width: 28, height: 28,
          color: '#64748b', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={14} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          {/* Border wrapper — sits outside the image so edge art is never clipped */}
          <div style={{
            border: `3px solid ${cfg.accentColor}66`,
            borderRadius: 14,
            boxShadow: `0 0 20px ${cfg.accentColor}30`,
            overflow: 'hidden',
            width: 120,
            aspectRatio: '1 / 1',
            background: '#0a0f1a',
          }}>
            <img
              src={cfg.imgSrc}
              alt={cfg.title}
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'contain',  // full image, no clipping
              }}
            />
          </div>
        </div>

        <div style={{
          fontFamily: "'Bangers',sans-serif", fontSize: 22,
          letterSpacing: '0.1em', color: cfg.accentColor, textAlign: 'center',
          textShadow: `0 0 16px ${cfg.accentColor}55`, marginBottom: 6,
        }}>
          {cfg.title}
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
          color: '#94a3b8', textAlign: 'center', marginBottom: 20,
          letterSpacing: '0.05em',
        }}>
          {cfg.subtitle}
        </div>

        {targets.length === 0 ? (
          <div style={{ textAlign: 'center', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#475569' }}>
            No other players on the roster.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {targets.map(p => (
                <button key={p.id} onClick={() => setTargetId(p.id)} style={{
                  background: targetId === p.id ? `rgba(${cfg.accentRgb},0.18)` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${targetId === p.id ? cfg.accentColor : '#1e293b'}`,
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 22 }}>{cfg.targetEmoji}</span>
                  <span style={{
                    fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700,
                    color: targetId === p.id ? cfg.accentColor : '#f1f5f9',
                  }}>
                    {p.name}{p.jerseyNum ? ` #${p.jerseyNum}` : ''}
                  </span>
                </button>
              ))}
            </div>

            <button onClick={handleSend} disabled={!targetId || sending} style={{
              width: '100%', padding: '13px',
              background: targetId && !sending ? cfg.sendBg : '#1e293b',
              color: targetId && !sending ? '#fff' : '#475569',
              border: 'none', borderRadius: 12, cursor: targetId ? 'pointer' : 'default',
              fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.1em',
              boxShadow: targetId && !sending ? `0 0 20px ${cfg.accentColor}40` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Send size={16} />
              {sending ? 'SENDING...' : cfg.sendLabel}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Shared receiver envelope + reveal ─────────────────────────────────────────
function MailboxReceiverModal({ notification, onDismiss, cfg }) {
  const [opened,       setOpened]       = useState(false)
  const [isImgLoading, setIsImgLoading] = useState(true)
  const animKey = cfg.animName

  return (
    <div
      onClick={(e) => {
        // Only dismiss on direct backdrop click, not on child elements
        if (e.target === e.currentTarget && opened) {
          onDismiss()
        }
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px',
      }}>
      {!opened ? (
        <div onClick={() => {
          if (notification.type === 'rage_bait') audioEngine.playRageBaitReveal()
          else if (notification.type === 'compliment') audioEngine.playComplimentReveal()
          setOpened(true)
        }} style={{
          width: '100%', maxWidth: 340,
          background: 'linear-gradient(160deg,#1e1b4b,#312e81)',
          border: '3px solid #fbbf24', borderRadius: 20,
          padding: '40px 28px 36px', textAlign: 'center', cursor: 'pointer',
          boxShadow: '0 0 60px #fbbf2433, 0 24px 48px rgba(0,0,0,0.7)',
        }}>
          <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 16 }}>✉️</div>
          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 28,
            letterSpacing: '0.08em', color: '#fbbf24',
            textShadow: '0 0 20px #fbbf2455', marginBottom: 10, lineHeight: 1.2,
          }}>
            YOU'VE GOT MAIL
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14,
            fontWeight: 700, color: '#c7d2fe', letterSpacing: '0.06em', marginBottom: 24,
          }}>
            from <strong style={{ color: '#fbbf24' }}>{notification.senderName}</strong>
          </div>
          <div style={{
            display: 'inline-block',
            background: '#fbbf24', color: '#1e1b4b',
            borderRadius: 30, padding: '10px 28px',
            fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.1em',
            boxShadow: '0 4px 0 #92400e',
          }}>
            TAP TO OPEN
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%', maxWidth: 340,
          background: 'linear-gradient(160deg,#080b14,#0f1628)',
          border: `3px solid ${cfg.revealBorder}`,
          borderRadius: 20, padding: '28px 22px 24px', textAlign: 'center',
          boxShadow: `0 0 50px rgba(${cfg.revealRgb},0.3), 0 24px 48px rgba(0,0,0,0.7)`,
          animation: `${animKey} 0.35s cubic-bezier(0.175,0.885,0.32,1.275) forwards`,
        }}>
          <style>{`
            @keyframes ${animKey} {
              from { transform: scale(0.75); opacity: 0; }
              to   { transform: scale(1);    opacity: 1; }
            }
          `}</style>

          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 18,
            letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 14,
          }}>
            from <span style={{ color: cfg.revealBorder, textShadow: `0 0 12px ${cfg.revealBorder}55` }}>
              {notification.senderName}
            </span>
          </div>

          {/* Border wrapper — fixed aspect-ratio square so skeleton has a defined
              height, but objectFit:contain on the img prevents edge clipping. */}
          <div style={{
            display: 'block',
            border: `4px solid ${cfg.revealBorder}`,
            borderRadius: 14,
            boxShadow: `0 0 28px ${cfg.revealBorder}55, inset 0 0 16px rgba(${cfg.revealRgb},0.08)`,
            marginBottom: 20, overflow: 'hidden',
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',   // square container without hard pixel height
            background: '#0a0f1a',  // dark fill behind any contain letterbox areas
          }}>
            {/* Skeleton spinner while image fetches */}
            {isImgLoading && (
              <div style={{
                position: 'absolute', inset: 0,
                background: '#1e293b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 36, height: 36,
                  border: `3px solid ${cfg.revealBorder}`,
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              </div>
            )}
            <img
              src={`/${notification.image}`}
              alt="mail"
              onLoad={() => setIsImgLoading(false)}
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'contain',  // show full image, no edge clipping
                opacity: isImgLoading ? 0 : 1,
                transition: 'opacity 0.3s ease',
              }}
            />
          </div>

          <button onClick={onDismiss} style={{
            width: '100%', padding: '13px',
            background: cfg.revealBg,
            color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
            fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.1em',
            boxShadow: `0 0 20px ${cfg.revealBorder}30`,
          }}>
            {cfg.dismissLabel}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Named exports for each item type ──────────────────────────────────────────
export function RageBaitSenderModal(props)   { return <MailboxSenderModal   {...props} cfg={RAGE_CONFIG}       /> }
export function RageBaitReceiverModal(props) { return <MailboxReceiverModal  {...props} cfg={RAGE_CONFIG}       /> }

export function ComplimentSenderModal(props)   { return <MailboxSenderModal   {...props} cfg={COMPLIMENT_CONFIG} /> }
export function ComplimentReceiverModal(props) { return <MailboxReceiverModal  {...props} cfg={COMPLIMENT_CONFIG} /> }
