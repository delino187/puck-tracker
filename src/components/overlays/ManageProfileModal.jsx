import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import Avatar from '../shared/Avatar.jsx'
import { BADGES } from '../../constants/badges.js'
import { LEVELS } from '../../constants/levels.js'
import { useAppStore } from '../../store/useAppStore.js'
import { usePlayer } from '../../context/PlayerContext.jsx'
import { validateUsername } from '../../utils/moderation.js'

// ── Canvas compression ─────────────────────────────────────────────────────────
// Firestore documents are hard-capped at 1 MB.  A modern mobile camera produces
// 4–12 MB photos; base64-encoding adds ~33% on top.  This function downscales
// the image to exactly targetW×targetH using an off-screen canvas, then exports
// it as a JPEG at the given quality.  A 256×256 JPEG at q=0.7 reliably comes in
// under 50 KB as base64 — well inside the Firestore limit.
//
// White fill before drawImage: JPEG has no alpha channel, so transparent PNG pixels
// would otherwise render as black instead of white.
function compressImageToJpeg(file, targetW, targetH, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.onloadend = () => {
      const dataUrl = reader.result
      if (!dataUrl) { reject(new Error('Empty FileReader result')); return }

      const img = new Image()
      img.onerror = () => reject(new Error('Image decode error'))
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width  = targetW
          canvas.height = targetH
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#ffffff'           // white background for transparent source images
          ctx.fillRect(0, 0, targetW, targetH)
          ctx.drawImage(img, 0, 0, targetW, targetH)
          resolve(canvas.toDataURL('image/jpeg', quality))
        } catch (canvasErr) {
          reject(canvasErr)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

// step: 'view' → 'confirm' → 'uploading' → back to 'view'
export default function ManageProfileModal({ player, stats, onPhotoUpload, onResetCareer, onSwitchProfile, onClose }) {
  const { updatePlayerUsername } = usePlayer()

  const [step,       setStep]       = useState('view')
  const [uploadErr,  setUploadErr]  = useState('')
  const [previewURL, setPreviewURL] = useState(null)
  const fileInputRef = useRef(null)

  // ── Username editing ──────────────────────────────────────────────────────
  const [usernameInput,   setUsernameInput]   = useState(player.username ?? '')
  const [usernameErr,     setUsernameErr]     = useState('')
  const [usernameSaving,  setUsernameSaving]  = useState(false)
  const [usernameSuccess, setUsernameSuccess] = useState(false)

  // Live validation as player types
  function handleUsernameChange(val) {
    setUsernameInput(val)
    setUsernameSuccess(false)
    if (!val.trim()) { setUsernameErr(''); return }
    const result = validateUsername(val)
    setUsernameErr(result.valid ? '' : result.reason)
  }

  async function handleUsernameSave() {
    const result = validateUsername(usernameInput)
    if (!result.valid) { setUsernameErr(result.reason); return }
    if (result.username === player.username) { setUsernameErr(''); setUsernameSuccess(true); return }
    setUsernameSaving(true)
    setUsernameErr('')
    try {
      await updatePlayerUsername(player.id, usernameInput)
      setUsernameSuccess(true)
    } catch (err) {
      setUsernameErr(err.message)
    } finally {
      setUsernameSaving(false)
    }
  }

  const techniquePucks = useAppStore(s => s.techniqueByPlayer[player.id]?.totalPucks || 0)

  // Unified career total: session shots + technique-mode pucks (matches Dashboard's careerTotal)
  const careerShots = (stats.totalShots ?? 0) + techniquePucks
  // Authoritative streak: prefer the locally-computed value; fall back to player.streakCount
  // (set by updateStreak() in Firestore) when dailyLog hasn't hydrated yet.
  const displayStreak = Math.max(stats.streak ?? 0, player.streakCount ?? 0)

  const level     = LEVELS[stats.li]
  const earnedIds = Object.keys(player.earnedBadges || {})
  const medals    = BADGES
    .filter(b => earnedIds.includes(b.id))
    .sort((a, b) => (player.earnedBadges?.[b.id]?.ts || 0) - (player.earnedBadges?.[a.id]?.ts || 0))
    .slice(0, 8)

  const handleFileSelected = async (e) => {
    // These two guards must remain first — they prevent the iOS file-picker event
    // from bubbling up to the modal backdrop and triggering onClose mid-upload.
    e.preventDefault()
    e.stopPropagation()

    const file = e.target.files?.[0]
    if (!file) return

    setUploadErr('')

    // Reset the input value synchronously before entering any async pipeline.
    // On iOS Safari, holding the reference across an await can cause the browser
    // to recycle the file handle.  Resetting here also lets the user immediately
    // re-pick the same file if they want to retry without closing the modal first.
    e.target.value = ''

    try {
      // ── Canvas compression pipeline ───────────────────────────────────────
      // compressImageToJpeg downscales to 256×256 JPEG @ q=0.7 → ~20–40 KB as
      // base64.  Raw phone photos can be 4–12 MB; base64 adds another ~33% on
      // top of that, blowing past Firestore's hard 1 MB document size limit and
      // causing the write to fail with a 'Document exceeds maximum size' error.
      const compressed = await compressImageToJpeg(file, 256, 256, 0.7)

      setPreviewURL(compressed)
      setStep('uploading')
      try {
        await onPhotoUpload(compressed)
        setStep('view')
      } catch (err) {
        console.error('[ManageProfile] upload error:', err)
        setUploadErr('Upload failed — please try again.')
        setStep('view')
        setPreviewURL(null)
      }
    } catch (err) {
      console.error('[ManageProfile] compression error:', err)
      setUploadErr('Could not process photo — please try a different image.')
      setStep('view')
      setPreviewURL(null)
    }
  }

  return (
    <div
      onClick={step === 'uploading' ? undefined : onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          background: 'linear-gradient(160deg,#080b14,#0f1628)',
          border: '2px solid rgba(6,182,212,0.4)',
          borderRadius: 22,
          boxShadow: '0 0 40px rgba(6,182,212,0.18), 0 24px 48px rgba(0,0,0,0.6)',
          padding: '28px 20px 24px',
          position: 'relative',
        }}
      >
        {/* Hidden file input — inside stopPropagation boundary so events can't reach the backdrop's onClose */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />

        {/* Close — disabled while uploading */}
        {step !== 'uploading' && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'transparent', border: '1px solid #334155',
              borderRadius: 8, width: 28, height: 28,
              color: '#64748b', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}

        {/* ── Header label ──────────────────────────────────────────────────── */}
        <div style={{
          fontFamily: "'Bangers',sans-serif", fontSize: 22,
          letterSpacing: '0.16em', color: '#06b6d4',
          textAlign: 'center', textTransform: 'uppercase', marginBottom: 20,
          textShadow: '0 0 16px rgba(6,182,212,0.5)',
        }}>
          YOUR PROFILE
        </div>

        {/* ── Avatar with camera overlay ────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            {previewURL ? (
              <img
                src={previewURL}
                alt={player.name}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #06b6d4',
                  boxShadow: '0 0 20px rgba(6,182,212,0.4)',
                  opacity: step === 'uploading' ? 0.6 : 1,
                }}
              />
            ) : (
              <Avatar player={player} size={88} className="arcade-glow" glowActive={!!player.hasBorderGlow} style={{ borderRadius: '50%' }} />
            )}

            {/* Camera overlay — unlocked only after purchasing Custom PFP in the store */}
            {step === 'view' && player.canChangePfp && (
              <button
                onClick={() => setStep('confirm')}
                title="Change profile picture"
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#06b6d4', border: '2px solid #080b14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 0 10px rgba(6,182,212,0.6)',
                }}
              >
                <Camera size={13} color="#fff" />
              </button>
            )}

            {/* Lock overlay — shown when PFP change is not yet unlocked */}
            {step === 'view' && !player.canChangePfp && (
              <div
                title="Unlock Custom PFP in the Store for 50 💎"
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#1e293b,#0f172a)',
                  border: '2px solid #475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, cursor: 'default',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                }}
              >
                🔒
              </div>
            )}

            {/* Upload spinner overlay */}
            {step === 'uploading' && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 22, height: 22, border: '2px solid #06b6d4', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            {!player.canChangePfp && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(15,23,42,0.85)',
                border: '1px solid #334155',
                borderRadius: 24, padding: '5px 14px',
                marginBottom: 8,
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 10, fontWeight: 800,
                color: '#94a3b8', letterSpacing: '0.12em',
              }}>
                🔓 UNLOCK CUSTOM AVATAR IN THE STORE
              </div>
            )}
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.05em', color: '#f1f5f9', lineHeight: 1.1 }}>
              {player.name}
              {player.jerseyNum ? <span style={{ color: '#60a5fa' }}> #{player.jerseyNum}</span> : null}
            </div>

            {/* ── Rank coin + name — scaled up for prime visual importance ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <img
                src={level.img}
                alt={level.name}
                style={{
                  width: 56, height: 56,
                  objectFit: 'cover', borderRadius: '50%',
                  border: `3px solid ${level.color}`,
                  boxShadow: `0 0 20px ${level.glow}66, 0 0 6px ${level.glow}44`,
                }}
              />
              <span style={{
                fontFamily: "'Bangers',sans-serif",
                fontSize: 22, letterSpacing: '0.08em',
                color: level.color,
                textShadow: `0 0 14px ${level.glow}66`,
                lineHeight: 1,
              }}>
                {level.name}
              </span>
            </div>
          </div>
        </div>

        {/* ── Confirmation step ─────────────────────────────────────────────── */}
        {step === 'confirm' && (
          <div style={{
            background: '#0f172a', borderRadius: 12,
            padding: '14px 16px', marginBottom: 16,
            border: '1px solid rgba(6,182,212,0.3)',
          }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#cbd5e1', marginBottom: 12, lineHeight: 1.5 }}>
              <strong style={{ color: '#f1f5f9' }}>Change Profile Picture?</strong>
              <br />
              This will upload a new image to your account and replace the current photo.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  fileInputRef.current?.click()
                }}
                style={{
                  flex: 1, background: '#06b6d4', color: '#000',
                  border: 'none', borderRadius: 8, padding: '9px 12px',
                  fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.06em',
                  cursor: 'pointer',
                }}
              >
                ✓ CHOOSE PHOTO
              </button>
              <button
                onClick={() => setStep('view')}
                style={{
                  flex: 1, background: 'transparent', color: '#64748b',
                  border: '1px solid #334155', borderRadius: 8, padding: '9px 12px',
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Upload progress ───────────────────────────────────────────────── */}
        {step === 'uploading' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 10, background: '#0f172a',
              border: '1px solid rgba(6,182,212,0.4)',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg,#0891b2,#06b6d4)',
                animation: 'pulse 1s ease-in-out infinite',
              }} />
              <div style={{
                position: 'relative', zIndex: 1,
                padding: '12px', textAlign: 'center',
                fontFamily: "'Bangers',sans-serif", fontSize: 18,
                letterSpacing: '0.08em', color: '#fff',
              }}>
                UPLOADING…
              </div>
            </div>
          </div>
        )}

        {/* Upload error */}
        {uploadErr && step === 'view' && (
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#ef4444', textAlign: 'center', marginBottom: 12 }}>
            {uploadErr}
          </div>
        )}

        {/* ── Stats row — 2-col: Shots + Streak only ────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          background: '#0f172a', borderRadius: 14, padding: '18px 12px',
          marginBottom: medals.length > 0 ? 16 : 0, gap: 8,
        }}>
          {[
            { label: 'Shots',  value: careerShots.toLocaleString(),                    color: '#60a5fa' },
            { label: 'Streak', value: displayStreak > 0 ? `${displayStreak}d` : '—', color: '#f97316' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Bangers',sans-serif", fontSize: 38,
                letterSpacing: '0.04em', color, lineHeight: 1,
                textShadow: `0 0 18px ${color}44`,
              }}>
                {value}
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11,
                fontWeight: 800, color: '#475569',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 6,
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Medals ────────────────────────────────────────────────────────── */}
        {medals.length > 0 && (
          <div style={{ width: '100%' }}>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.12em', color: '#f1f5f9', textTransform: 'uppercase', marginBottom: 10 }}>
              Badges <span style={{ color: '#06b6d4' }}>({medals.length})</span>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-4 w-full px-4 pb-4">
              {medals.map(b => (
                <div
                  key={b.id}
                  title={`${b.name} — ${b.desc}`}
                  style={{
                    background: b.innerBg || '#1e293b',
                    borderRadius: '50%',
                    padding: 3,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {b.img ? (
                    <div className="badge-circle">
                      <img src={b.img} alt={b.name} />
                    </div>
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <b.Icon size={24} color={b.innerIcon || '#94a3b8'} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Username editor — only for username-registered players ─────── */}
        {player.username !== undefined && (
          <div style={{ marginTop: 16, width: '100%' }}>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 10, fontWeight: 800,
              color: '#475569', letterSpacing: '0.14em',
              marginBottom: 6,
            }}>
              CHANGE USERNAME
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={e => handleUsernameChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleUsernameSave() }}
                  placeholder="@username"
                  maxLength={15}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#0f172a',
                    border: `1.5px solid ${usernameErr ? '#ef4444' : usernameSuccess ? '#22c55e' : '#1e3a5f'}`,
                    borderRadius: 8, padding: '9px 12px',
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontSize: 14, fontWeight: 600,
                    color: '#f1f5f9',
                    outline: 'none',
                  }}
                />
                {usernameErr && (
                  <div style={{
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontSize: 11, fontWeight: 700,
                    color: '#ef4444', marginTop: 4, lineHeight: 1.4,
                  }}>
                    {usernameErr}
                  </div>
                )}
                {usernameSuccess && !usernameErr && (
                  <div style={{
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontSize: 11, fontWeight: 700,
                    color: '#22c55e', marginTop: 4,
                  }}>
                    ✓ Username updated!
                  </div>
                )}
              </div>
              <button
                onClick={handleUsernameSave}
                disabled={!!usernameErr || usernameSaving || !usernameInput.trim()}
                style={{
                  flexShrink: 0,
                  padding: '9px 14px',
                  background: (usernameErr || !usernameInput.trim()) ? '#1e293b' : '#0891b2',
                  border: 'none', borderRadius: 8,
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 13, fontWeight: 800, letterSpacing: '0.06em',
                  color: (usernameErr || !usernameInput.trim()) ? '#475569' : '#fff',
                  cursor: (usernameErr || !usernameInput.trim() || usernameSaving) ? 'not-allowed' : 'pointer',
                }}
              >
                {usernameSaving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* ── Switch Profile ───────────────────────────────────────────────── */}
        {onSwitchProfile && (
          <div style={{ marginTop: 16, width: '100%' }}>
            <button
              onClick={onSwitchProfile}
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'linear-gradient(135deg,#0c1a2e,#0f2040)',
                border: '1.5px solid #3b82f6',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 13, fontWeight: 800,
                color: '#60a5fa',
                letterSpacing: '0.1em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 0 12px #3b82f622',
              }}
            >
              🔄 SWITCH PROFILE
            </button>
          </div>
        )}

        {/* ── Alpha-test reset ──────────────────────────────────────────────── */}
        {onResetCareer && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e293b', width: '100%' }}>
            <button
              onClick={onResetCareer}
              style={{
                width: '100%',
                padding: '11px 14px',
                background: '#0f172a',
                border: '1px solid #ef444444',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 12, fontWeight: 800,
                color: '#ef4444',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              RESET MY CAREER (WIPE STATS) ⚠️
            </button>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 10, color: '#475569',
              textAlign: 'center', marginTop: 6,
              letterSpacing: '0.06em',
            }}>
              ALPHA TESTERS ONLY · CANNOT BE UNDONE
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
