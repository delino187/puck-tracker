import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { upload } from '@vercel/blob/client'
import Avatar from '../shared/Avatar.jsx'
import { BADGES } from '../../constants/badges.js'
import { LEVELS } from '../../constants/levels.js'

// step: 'view' → 'confirm' → 'uploading' → back to 'view'
export default function ManageProfileModal({ player, stats, onPhotoUpload, onClose }) {
  const [step,       setStep]      = useState('view')
  const [uploadPct,  setUploadPct] = useState(0)
  const [uploadErr,  setUploadErr] = useState('')
  const fileInputRef = useRef(null)

  const level     = LEVELS[stats.li]
  const earnedIds = Object.keys(player.earnedBadges || {})
  const medals    = BADGES.filter(b => earnedIds.includes(b.id)).slice(0, 12)

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) { setStep('view'); return }
    const ext = file.name.split('.').pop() || 'jpg'
    setUploadErr('')
    setUploadPct(0)
    setStep('uploading')
    try {
      const blob = await upload(`profilePictures/${player.id}.${ext}`, file, {
        access:          'public',
        handleUploadUrl: '/api/avatar/upload',
        onUploadProgress: ({ percentage }) => setUploadPct(Math.round(percentage)),
      })
      onPhotoUpload(blob.url)
      setStep('view')
    } catch (err) {
      console.error('[ManageProfile] upload error:', err)
      setUploadErr('Upload failed — please try again.')
      setStep('view')
    } finally {
      e.target.value = ''
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
      {/* Hidden file input — opened programmatically after confirmation */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />

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
            <Avatar player={player} size={88} className="arcade-glow" style={{ borderRadius: '50%' }} />

            {/* Camera overlay button — opens confirmation step */}
            {step === 'view' && (
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
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.05em', color: '#f1f5f9', lineHeight: 1.1 }}>
              {player.name}
              {player.jerseyNum ? <span style={{ color: '#60a5fa' }}> #{player.jerseyNum}</span> : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <img src={level.img} alt={level.name} style={{ width: 16, height: 16, objectFit: 'cover', borderRadius: '50%' }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: level.color, letterSpacing: '0.06em' }}>
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
                onClick={() => fileInputRef.current?.click()}
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
                width: `${uploadPct}%`,
                background: 'linear-gradient(90deg,#0891b2,#06b6d4)',
                transition: 'width 0.15s ease-out',
              }} />
              <div style={{
                position: 'relative', zIndex: 1,
                padding: '12px', textAlign: 'center',
                fontFamily: "'Bangers',sans-serif", fontSize: 18,
                letterSpacing: '0.08em', color: '#fff',
              }}>
                UPLOADING… {uploadPct}%
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

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: '#0f172a', borderRadius: 12, padding: '12px 8px',
          marginBottom: medals.length > 0 ? 16 : 0, gap: 4,
        }}>
          {[
            { label: 'Shots',   value: (stats.totalShots ?? 0).toLocaleString() },
            { label: 'Hits',    value: (stats.totalHits  ?? 0).toLocaleString() },
            { label: 'Acc',     value: stats.acc > 0 ? `${stats.acc.toFixed(0)}%` : '—' },
            { label: 'Streak',  value: stats.streak > 0 ? `${stats.streak}d` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, letterSpacing: '0.04em', color: '#f1f5f9', lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 800, color: '#06b6d4', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Medals ────────────────────────────────────────────────────────── */}
        {medals.length > 0 && (
          <div style={{ width: '100%', overflow: 'hidden', padding: '0 2px' }}>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.12em', color: '#f1f5f9', textTransform: 'uppercase', marginBottom: 10 }}>
              Badges <span style={{ color: '#06b6d4' }}>({medals.length})</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, justifyItems: 'center', alignItems: 'center', width: '100%', maxWidth: '100%' }}>
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
      </div>
    </div>
  )
}
