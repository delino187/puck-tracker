import { useState, useRef } from 'react'
import { ChevronLeft, Video, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { ZONES } from '../../constants/zones.js'
import { C } from '../../styles.js'
import { useAppStore } from '../../store/useAppStore.js'
import { uploadChallengeVideo, createChallenge, WARN_FILE_BYTES } from '../../services/peerChallengeService.js'
import CopyButton, { buildInviteText } from '../shared/CopyButton.jsx'
import { updateStreak } from '../../utils/streakService.js'
import RecordingTipsModal from '../overlays/RecordingTipsModal.jsx'
import { playScoreSound } from '../../utils/arcadeSounds.js'

const MAX_SECS = 10

function uploadErrMsg(err) {
  if (err?.message === 'FILE_TOO_LARGE')
    return 'Video exceeds 150 MB — trim it to just your shots (5-10 s) in your phone\'s editor, then re-upload.'
  if (err?.message === 'UPLOAD_TIMEOUT')
    return 'Network timed out! Move closer to Wi-Fi and try again.'
  return 'Upload failed — check your connection and try again.'
}

export default function CreatePeerChallenge({ player, players, onBack, onSubmit }) {
  const [step,       setStep]       = useState(1)
  const [friendId,   setFriendId]   = useState('')
  const [zone,       setZone]       = useState(ZONES[0].id)
  const [shotCount,  setShotCount]  = useState(5)
  const [videoFile,  setVideoFile]  = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [myHits,     setMyHits]     = useState(3)
  const [tapPulse,   setTapPulse]   = useState(null)
  const [error,      setError]      = useState('')
  const [matchType,       setMatchType]       = useState('ranked')
  const [uploading,       setUploading]       = useState(false)
  const [uploadProgress,  setUploadProgress]  = useState(0)
  const [fileWarnMb,      setFileWarnMb]      = useState(null)
  const [showTips,   setShowTips]   = useState(false)
  const fileInputRef = useRef(null)

  const logTechniqueShots = useAppStore(s => s.logTechniqueShots)
  const friends   = players.filter(p => p.id !== player.id)
  const friend    = players.find(p => p.id === friendId)
  const zoneName  = ZONES.find(z => z.id === zone)?.label ?? zone

  function handleVideoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setFileWarnMb(null)
    const objectUrl = URL.createObjectURL(file)
    const vid       = document.createElement('video')
    vid.preload     = 'metadata'
    vid.onloadedmetadata = () => {
      if (vid.duration > MAX_SECS + 1.5) {
        URL.revokeObjectURL(objectUrl)
        setError(`Video must be ${MAX_SECS} seconds or less. Trim it in your phone's video editor first!`)
        return
      }
      setVideoFile(file)
      setPreviewUrl(objectUrl)
      if (file.size > WARN_FILE_BYTES) {
        setFileWarnMb((file.size / (1024 * 1024)).toFixed(1))
      }
    }
    vid.src = objectUrl
  }

  async function handleSubmit() {
    if (!friend)    { setError('Select a friend to challenge.'); return }
    if (!videoFile) { setError('Record or upload your proof video.'); return }
    setError('')
    setUploading(true)
    try {
      const tempKey  = `${player.id}_${Date.now()}`
      const videoUrl = await uploadChallengeVideo(videoFile, tempKey, 'challenger', setUploadProgress)
      const challenge = await createChallenge({
        challengerId:   player.id,
        challengerName: player.name,
        receiverId:     friend.id,
        receiverName:   friend.name,
        zone,
        shotCount,
        challengerHits: myHits,
        videoUrl,
        matchType,
      })
      // Award XP via technique shots — +1 XP per puck, shows in career total
      logTechniqueShots(player.id, shotCount)
      updateStreak(player.id).catch(() => {})
      setStep(3)
      onSubmit({ challenge })
    } catch (err) {
      setError(uploadErrMsg(err))
      setUploading(false)
    }
  }

  // ── Step 1: Setup ──────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={{ padding: '20px 16px 80px' }}>
        {showTips && <RecordingTipsModal onClose={() => setShowTips(false)} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <ChevronLeft size={22} />
          </button>
          <div style={{ flex: 1 }}>
            <div className="text-3d-purple" style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.06em', lineHeight: 1 }}>
              ISSUE A CHALLENGE
            </div>
          </div>
          <button onClick={() => setShowTips(true)} style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11 }}>
            <Info size={12} /> TIPS
          </button>
        </div>

        {/* Friend */}
        <div style={C.card}>
          <label style={C.label}>Opponent</label>
          {friends.length === 0 ? (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No other players on the roster.</div>
          ) : (
            <select value={friendId} onChange={e => setFriendId(e.target.value)} style={{ ...C.inp, marginBottom: 0 }}>
              <option value="">— Select a player —</option>
              {friends.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.jerseyNum ? ` #${p.jerseyNum}` : ''}</option>
              ))}
            </select>
          )}
        </div>

        {/* Zone */}
        <div style={C.card}>
          <label style={C.label}>Target Zone</label>
          <select value={zone} onChange={e => setZone(e.target.value)} style={{ ...C.inp, marginBottom: 0 }}>
            {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        </div>

        {/* Shot count */}
        <div style={C.card}>
          <label style={C.label}>Shot Count</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[3, 5].map(n => (
              <button
                key={n}
                onClick={() => { setShotCount(n); setMyHits(Math.min(myHits, n)) }}
                style={{ background: shotCount === n ? '#a855f7' : '#0f172a', color: shotCount === n ? '#000' : '#94a3b8', border: `2px solid ${shotCount === n ? '#a855f7' : '#334155'}`, borderRadius: 10, padding: '16px', fontFamily: "'Bangers',sans-serif", fontSize: 28, cursor: 'pointer', boxShadow: shotCount === n ? '0 0 14px #a855f740' : 'none' }}
              >
                {n} SHOTS
              </button>
            ))}
          </div>
        </div>

        {/* Match type toggle */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.16em', marginBottom: 8 }}>MATCH TYPE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { id: 'ranked',   label: 'RANKED 🏆',   sub: 'Affects ELO & rank',      activeColor: '#fbbf24', activeBg: 'linear-gradient(135deg,#78350f,#b45309)', glow: '#fbbf24' },
              { id: 'unranked', label: 'UNRANKED 🤝',  sub: 'Casual · zero ELO risk',   activeColor: '#22c55e', activeBg: 'linear-gradient(135deg,#14532d,#15803d)', glow: '#22c55e' },
            ].map(opt => {
              const active = matchType === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setMatchType(opt.id)}
                  style={{
                    background: active ? opt.activeBg : '#0f172a',
                    border: `2px solid ${active ? opt.glow : '#334155'}`,
                    borderRadius: 12, padding: '12px 8px',
                    cursor: 'pointer', textAlign: 'center',
                    boxShadow: active ? `0 0 18px ${opt.glow}55` : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 17, letterSpacing: '0.06em', color: active ? opt.activeColor : '#64748b', lineHeight: 1 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: active ? `${opt.activeColor}cc` : '#475569', marginTop: 3, letterSpacing: '0.04em' }}>
                    {opt.sub}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
          {friend && <>You'll challenge <strong style={{ color: '#a855f7' }}>{friend.name}</strong> to match your score at <strong style={{ color: '#f1f5f9' }}>{zoneName}</strong>.</>}
        </div>

        <button
          style={{ ...C.btnP, background: friendId ? 'linear-gradient(135deg,#6b21a8,#a855f7)' : '#1e293b', fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.06em', boxShadow: friendId ? '0 0 20px #a855f740' : 'none' }}
          onClick={() => { if (!friendId) { setError('Pick an opponent first.'); return } setError(''); setStep(2) }}
        >
          NEXT: RECORD PROOF →
        </button>
        {error && <div style={{ color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, textAlign: 'center', marginTop: 6 }}>{error}</div>}
      </div>
    )
  }

  // ── Step 2: Video + hits ───────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div style={{ padding: '20px 16px 80px' }}>
        {showTips && <RecordingTipsModal onClose={() => setShowTips(false)} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <ChevronLeft size={22} />
          </button>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 24, color: '#a855f7', letterSpacing: '0.06em' }}>
            RECORD YOUR PROOF
          </div>
          <button onClick={() => setShowTips(true)} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11 }}>
            <Info size={12} /> TIPS
          </button>
        </div>

        {/* Zone + shot count reminder */}
        <div style={{ ...C.card, textAlign: 'center', borderColor: '#a855f744', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 4 }}>ZONE</div>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#a855f7', letterSpacing: '0.04em' }}>{zoneName.toUpperCase()}</div>
            </div>
            <div style={{ width: 1, background: '#1e293b' }} />
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 4 }}>SHOTS</div>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#a855f7', letterSpacing: '0.04em' }}>{shotCount}</div>
            </div>
            <div style={{ width: 1, background: '#1e293b' }} />
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 4 }}>MAX</div>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#64748b', letterSpacing: '0.04em' }}>{MAX_SECS}S</div>
            </div>
          </div>
        </div>

        {/* Video input */}
        <div style={C.card}>
          <label style={C.label}>Proof Video (≤ {MAX_SECS}s)</label>
          <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/*" capture="environment" onChange={handleVideoSelect} style={{ display: 'none' }} />

          {!previewUrl ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => { fileInputRef.current?.setAttribute('capture','environment'); fileInputRef.current?.click() }}
                style={{ background: '#0f172a', border: '1px solid #a855f744', borderRadius: 10, padding: '18px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#d8b4fe', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700 }}
              >
                <Video size={24} color="#a855f7" /> RECORD NOW
              </button>
              <button
                onClick={() => { fileInputRef.current?.removeAttribute('capture'); fileInputRef.current?.click() }}
                style={{ background: '#0f172a', border: '1px solid #3b82f644', borderRadius: 10, padding: '18px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#93c5fd', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700 }}
              >
                <Upload size={24} color="#3b82f6" /> UPLOAD FILE
              </button>
            </div>
          ) : (
            <div>
              <video src={previewUrl} controls playsInline style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 220 }} />
              <button onClick={() => { setVideoFile(null); setPreviewUrl(null) }} style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#94a3b8' }}>
                Change Video
              </button>
            </div>
          )}

          {fileWarnMb && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '8px 12px' }}>
              <AlertCircle size={13} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
                <strong>{fileWarnMb} MB</strong> — large file detected. Upload may take 30–90 s on mobile. Keep your Wi-Fi strong!
              </span>
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10, color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, lineHeight: 1.4 }}>
              <AlertCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} /> {error}
            </div>
          )}
        </div>

        {/* Hits selector */}
        <div style={C.card}>
          <label style={C.label}>How many did you hit? (0 – {shotCount})</label>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${shotCount + 1},1fr)`, gap: 8 }}>
            {Array.from({ length: shotCount + 1 }, (_, n) => (
              <button
                key={n}
                className={tapPulse === n ? 'score-tap' : ''}
                onClick={() => { setMyHits(n); playScoreSound(n); navigator.vibrate?.(50); setTapPulse(n); setTimeout(() => setTapPulse(null), 220) }}
                style={{ background: myHits === n ? '#a855f7' : '#0f172a', color: myHits === n ? '#000' : '#94a3b8', border: `1px solid ${myHits === n ? '#a855f7' : '#334155'}`, borderRadius: 8, padding: '12px 4px', fontFamily: "'Bangers',sans-serif", fontSize: 22, cursor: 'pointer' }}
              >
                {n}
              </button>
            ))}
          </div>
          {myHits > 0 && (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#a855f7', textAlign: 'center', marginTop: 10, letterSpacing: '0.06em' }}>
              {friend?.name} must score {myHits}+ hits to win!
            </div>
          )}
        </div>

        {uploading ? (
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, background: '#0f172a', border: '2px solid #a855f7' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${uploadProgress}%`, background: 'linear-gradient(90deg,#6b21a8,#a855f7)', transition: 'width 0.15s ease-out' }} />
            <div style={{ position: 'relative', zIndex: 1, padding: '14px 14px 6px', textAlign: 'center', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em', color: '#fff' }}>
              🛰️ UPLOADING... {uploadProgress}%
            </div>
            {videoFile && (
              <div style={{ position: 'relative', zIndex: 1, paddingBottom: 10, textAlign: 'center', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#c4b5fd', letterSpacing: '0.06em' }}>
                {(videoFile.size * uploadProgress / 100 / (1024 * 1024)).toFixed(1)} MB&nbsp;/&nbsp;{(videoFile.size / (1024 * 1024)).toFixed(1)} MB transferred
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            style={{ ...C.btnP, background: 'linear-gradient(135deg,#6b21a8,#a855f7)', boxShadow: '0 0 20px #a855f740', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em' }}
          >
            ⚔️ ISSUE SHOWDOWN
          </button>
        )}
      </div>
    )
  }

  // ── Step 3: Success ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🏒</div>
      <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 40, color: '#a855f7', letterSpacing: '0.08em', textShadow: '0 0 30px #a855f755', marginBottom: 10 }}>
        SHOWDOWN ISSUED!
      </div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, color: '#cbd5e1', marginBottom: 8, lineHeight: 1.6 }}>
        <strong style={{ color: '#f1f5f9' }}>{friend?.name}</strong> must match{' '}
        <strong style={{ color: '#a855f7' }}>{myHits}/{shotCount}</strong> in{' '}
        <strong style={{ color: '#a855f7' }}>{zoneName}</strong>
      </div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#64748b', marginBottom: 16 }}>They have 48 hours to respond.</div>
      <CopyButton
        inviteText={buildInviteText('versus', matchType)}
        style={{ marginBottom: 20 }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, marginBottom: 32 }}>
        <CheckCircle size={15} /> +{shotCount} XP credited to your total
      </div>
      <button onClick={onBack} style={{ ...C.btnP, background: '#a855f7', fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.08em' }}>
        BACK TO VERSUS
      </button>
    </div>
  )
}
