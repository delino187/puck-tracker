import { useState, useRef } from 'react'
import { ChevronLeft, Video, Upload, CheckCircle, AlertCircle, Trophy, Info, Play } from 'lucide-react'
import { ZONES } from '../../constants/zones.js'
import { C } from '../../styles.js'
import { useAppStore } from '../../store/useAppStore.js'
import { uploadChallengeVideo, respondToChallenge } from '../../services/peerChallengeService.js'
import RecordingTipsModal from '../overlays/RecordingTipsModal.jsx'
import { playScoreSound } from '../../utils/arcadeSounds.js'

const MAX_SECS = 10

function uploadErrMsg(err) {
  if (err?.message === 'FILE_TOO_LARGE')
    return 'Video file is too large! Please clip your video down to just the 5-10 seconds of your actual shots before uploading.'
  if (err?.message === 'UPLOAD_TIMEOUT')
    return 'Network connection timed out! Try moving closer to your Wi-Fi router.'
  return 'Upload failed — check your connection and try again.'
}

export default function RespondToChallenge({ player, challenge, onBack, onSubmit }) {
  const shotCount = challenge.shotCount ?? 5

  const [videoFile,  setVideoFile]  = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [myHits,     setMyHits]     = useState(null)
  const [error,      setError]      = useState('')
  const [uploading,      setUploading]      = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [done,       setDone]       = useState(false)
  const [won,        setWon]        = useState(false)
  const [showTips,   setShowTips]   = useState(false)
  const [eloData,    setEloData]    = useState(null)
  const [tapPulse,   setTapPulse]   = useState(null)  // score button being animated
  const [bothPlaying, setBothPlaying] = useState(false)
  const fileInputRef  = useRef(null)
  const challVideoRef = useRef(null)
  const myVideoRef    = useRef(null)

  const logTechniqueShots = useAppStore(s => s.logTechniqueShots)
  const zoneName = ZONES.find(z => z.id === challenge.zone)?.label ?? challenge.zone

  function handleVideoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const objectUrl = URL.createObjectURL(file)
    const vid       = document.createElement('video')
    vid.preload     = 'metadata'
    vid.onloadedmetadata = () => {
      if (vid.duration > MAX_SECS + 1.5) {
        URL.revokeObjectURL(objectUrl)
        setError(`Trim your video to ${MAX_SECS} seconds or less first!`)
        return
      }
      setVideoFile(file)
      setPreviewUrl(objectUrl)
    }
    vid.src = objectUrl
  }

  function handleHitSelect(n) {
    setMyHits(n)
    playScoreSound(n)
    navigator.vibrate?.(50)
    setTapPulse(n)
    setTimeout(() => setTapPulse(null), 220)
  }

  function playBoth() {
    const cv = challVideoRef.current
    const mv = myVideoRef.current
    if (!cv || !mv) return
    cv.currentTime = 0
    mv.currentTime = 0
    Promise.all([cv.play(), mv.play()]).catch(() => {})
    setBothPlaying(true)
  }

  async function handleSubmit() {
    if (!videoFile) { setError('Record or upload your proof video.'); return }
    setError('')
    setUploading(true)
    try {
      const tempKey  = `${player.id}_${Date.now()}`
      const videoUrl = await uploadChallengeVideo(videoFile, tempKey, 'receiver', setUploadProgress)
      const updated  = await respondToChallenge(challenge, myHits, videoUrl)
      logTechniqueShots(player.id, shotCount)
      const didWin = updated.winnerId === player.id
      setWon(didWin)
      if (updated.eloResult) setEloData(updated.eloResult)
      setDone(true)
      onSubmit({ challenge: updated })
    } catch (err) {
      setError(uploadErrMsg(err))
      setUploading(false)
    }
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (done) {
    const showElo          = !!eloData
    const eloDelta         = eloData?.receiverDelta        ?? 0
    const baseDelta        = eloData?.baseDelta             ?? 0
    const streakBonus      = eloData?.streakBonus           ?? 0
    const bonusPct         = eloData?.streakBonusPct        ?? 0
    const shieldSaved      = eloData?.receiverShieldSaved   ?? false
    const shieldConsumed   = eloData?.receiverShieldConsumed ?? false
    const shieldBaseLoss   = eloData?.shieldBaseLoss        ?? 0   // raw loss (negative)

    return (
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{won ? '🏆' : shieldSaved ? '🛡️' : '💪'}</div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 40, letterSpacing: '0.08em', color: won ? '#22c55e' : shieldSaved ? '#06b6d4' : '#f59e0b', textShadow: `0 0 30px ${won ? '#22c55e55' : shieldSaved ? '#06b6d455' : '#f59e0b55'}`, marginBottom: 10 }}>
          {won ? 'SHOWDOWN WON!' : shieldSaved ? 'SHIELDED!' : 'NICE EFFORT!'}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, color: '#cbd5e1', marginBottom: 6 }}>
          {challenge.challengerName}: <strong style={{ color: '#f1f5f9' }}>{challenge.challengerHits}/{shotCount}</strong>
          {'  ·  '}
          You: <strong style={{ color: won ? '#22c55e' : '#f59e0b' }}>{myHits}/{shotCount}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, marginTop: 16, marginBottom: showElo ? 16 : 32 }}>
          <CheckCircle size={15} /> +{shotCount} XP credited to your total
        </div>

        {showElo && (
          <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${shieldSaved ? '#06b6d444' : '#1e3a5f'}`, borderRadius: 14, padding: '16px 24px', marginBottom: 28, minWidth: 220 }}>
            {won ? (
              <>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 6 }}>
                  BASE ELO: +{baseDelta}
                </div>
                {streakBonus > 0 && (
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: '#fb923c', marginBottom: 6 }}>
                    🔥 STREAK BONUS (+{bonusPct}%): +{streakBonus}
                  </div>
                )}
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.06em', color: '#06b6d4', textShadow: '0 0 18px #06b6d488', lineHeight: 1.1 }}>
                  TOTAL GAINED: +{eloDelta} ELO
                </div>
                {shieldConsumed && (
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginTop: 10, borderTop: '1px solid #1e3a5f', paddingTop: 8 }}>
                    🛡️ ELO Shield consumed.
                  </div>
                )}
              </>
            ) : shieldSaved ? (
              <>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: '#7f1d1d', marginBottom: 6 }}>
                  BASE LOSS: {shieldBaseLoss} ELO
                </div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: '#06b6d4', textShadow: '0 0 10px #06b6d444', marginBottom: 6 }}>
                  🛡️ ELO SHIELD ACTIVE: +{Math.abs(shieldBaseLoss)} BREAK
                </div>
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.06em', color: '#f1f5f9', lineHeight: 1.1 }}>
                  TOTAL ADJUSTMENT: 0 ELO
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b' }}>
                ELO: {eloDelta}
              </div>
            )}
          </div>
        )}

        <button onClick={onBack} style={{ ...C.btnP, background: won ? '#22c55e' : shieldSaved ? '#06b6d4' : '#f59e0b', color: '#000', fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.08em' }}>
          BACK TO VERSUS
        </button>
      </div>
    )
  }

  // ── Response screen ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px 80px' }}>
      {showTips && <RecordingTipsModal onClose={() => setShowTips(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <ChevronLeft size={22} />
        </button>
        <div className="text-3d-purple" style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.06em' }}>
          MATCH THE SCORE!
        </div>
        <button onClick={() => setShowTips(true)} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11 }}>
          <Info size={12} /> TIPS
        </button>
      </div>

      {/* Target score */}
      <div style={{ ...C.card, borderColor: '#a855f744', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 6 }}>BEAT THIS SCORE</div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 56, color: '#a855f7', lineHeight: 1, textShadow: '0 0 30px #a855f755' }}>
          {challenge.challengerHits}<span style={{ fontSize: 28, color: '#64748b' }}>/{shotCount}</span>
        </div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: '#f1f5f9', letterSpacing: '0.04em', marginTop: 4 }}>
          {zoneName.toUpperCase()} · by {challenge.challengerName}
        </div>
      </div>

      {/* ── Video section — split-screen when both clips are available ──────── */}
      {challenge.challengerVideo && previewUrl ? (
        <div style={C.card}>
          <label style={{ ...C.label, color: '#a855f7', textAlign: 'center', letterSpacing: '0.1em', marginBottom: 10 }}>
            ⚔️ SIDE-BY-SIDE SHOWDOWN
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#64748b', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {challenge.challengerName}
                </div>
                <video
                  ref={challVideoRef}
                  src={challenge.challengerVideo}
                  playsInline
                  style={{ width: '100%', borderRadius: 8, aspectRatio: '9/16', objectFit: 'cover', background: '#000' }}
                />
              </div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#64748b', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                  YOU
                </div>
                <video
                  ref={myVideoRef}
                  src={previewUrl}
                  playsInline
                  style={{ width: '100%', borderRadius: 8, aspectRatio: '9/16', objectFit: 'cover', background: '#000' }}
                />
              </div>
            </div>
            {/* Central PLAY overlay — triggers both videos simultaneously */}
            {!bothPlaying && (
              <button
                onClick={playBoth}
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(168,85,247,0.92)', border: '2px solid #a855f7', borderRadius: '50%', width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 28px #a855f7', zIndex: 10 }}
              >
                <Play size={22} color="#fff" fill="#fff" />
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/*" capture="environment" onChange={handleVideoSelect} style={{ display: 'none' }} />
          <button onClick={() => { setVideoFile(null); setPreviewUrl(null); setBothPlaying(false) }} style={{ marginTop: 10, background: 'transparent', border: '1px solid #334155', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#94a3b8' }}>
            Change Video
          </button>
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8, color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, lineHeight: 1.4 }}>
              <AlertCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} /> {error}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Challenger's proof — shown alone until user picks their video */}
          {challenge.challengerVideo && (
            <div style={C.card}>
              <label style={C.label}>Their Proof</label>
              <video src={challenge.challengerVideo} controls playsInline style={{ width: '100%', borderRadius: 8, maxHeight: 200 }} />
            </div>
          )}

          {/* Own video — record or upload */}
          <div style={C.card}>
            <label style={C.label}>Your Proof (≤ {MAX_SECS}s)</label>
            <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/*" capture="environment" onChange={handleVideoSelect} style={{ display: 'none' }} />
            {!previewUrl ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => { fileInputRef.current?.setAttribute('capture','environment'); fileInputRef.current?.click() }} style={{ background: '#0f172a', border: '1px solid #a855f744', borderRadius: 10, padding: '18px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#d8b4fe', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700 }}>
                  <Video size={24} color="#a855f7" /> RECORD NOW
                </button>
                <button onClick={() => { fileInputRef.current?.removeAttribute('capture'); fileInputRef.current?.click() }} style={{ background: '#0f172a', border: '1px solid #3b82f644', borderRadius: 10, padding: '18px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#93c5fd', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700 }}>
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
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 10, color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, lineHeight: 1.4 }}>
                <AlertCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} /> {error}
              </div>
            )}
          </div>
        </>
      )}

      {/* Hits selector */}
      <div style={C.card}>
        <label style={C.label}>How many did you hit? (0 – {shotCount})</label>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${shotCount + 1},1fr)`, gap: 8 }}>
          {Array.from({ length: shotCount + 1 }, (_, n) => (
            <button
              key={n}
              className={tapPulse === n ? 'score-tap' : ''}
              onClick={() => handleHitSelect(n)}
              style={{ background: myHits === n ? '#a855f7' : '#0f172a', color: myHits === n ? '#000' : '#94a3b8', border: `1px solid ${myHits === n ? '#a855f7' : '#334155'}`, borderRadius: 8, padding: '12px 4px', fontFamily: "'Bangers',sans-serif", fontSize: 22, cursor: 'pointer' }}
            >
              {n}
            </button>
          ))}
        </div>
        {myHits !== null && myHits >= challenge.challengerHits && myHits > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, color: '#22c55e', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12 }}>
            <Trophy size={13} /> That's a WIN — you matched or beat the score!
          </div>
        )}
      </div>

      {uploading ? (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, background: '#0f172a', border: '2px solid #a855f7' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${uploadProgress}%`, background: 'linear-gradient(90deg,#6b21a8,#a855f7)', transition: 'width 0.15s ease-out' }} />
          <div style={{ position: 'relative', zIndex: 1, padding: '14px', textAlign: 'center', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em', color: '#fff' }}>
            🛰️ UPLOADING... {uploadProgress}%
          </div>
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={myHits === null}
          style={{ ...C.btnP, background: myHits === null ? '#1e293b' : 'linear-gradient(135deg,#6b21a8,#a855f7)', boxShadow: myHits === null ? 'none' : '0 0 20px #a855f740', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em', opacity: myHits === null ? 0.45 : 1, cursor: myHits === null ? 'not-allowed' : 'pointer' }}
        >
          ⚔️ SUBMIT RESPONSE
        </button>
      )}
    </div>
  )
}
