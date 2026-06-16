import { useState, useRef } from 'react'
import { ChevronLeft, Video, Upload, CheckCircle, AlertCircle, Trophy, Info } from 'lucide-react'
import { ZONES } from '../../constants/zones.js'
import { C } from '../../styles.js'
import { useAppStore } from '../../store/useAppStore.js'
import { uploadChallengeVideo, respondToChallenge } from '../../services/peerChallengeService.js'
import RecordingTipsModal from '../overlays/RecordingTipsModal.jsx'

const MAX_SECS = 10

export default function RespondToChallenge({ player, challenge, onBack, onSubmit }) {
  const shotCount = challenge.shotCount ?? 5

  const [videoFile,  setVideoFile]  = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [myHits,     setMyHits]     = useState(challenge.challengerHits)
  const [error,      setError]      = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [done,       setDone]       = useState(false)
  const [won,        setWon]        = useState(false)
  const [showTips,   setShowTips]   = useState(false)
  const fileInputRef = useRef(null)

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

  async function handleSubmit() {
    if (!videoFile) { setError('Record or upload your proof video.'); return }
    setError('')
    setUploading(true)
    try {
      const tempKey  = `${player.id}_${Date.now()}`
      const videoUrl = await uploadChallengeVideo(videoFile, tempKey, 'receiver')
      const updated  = await respondToChallenge(challenge, myHits, videoUrl)
      logTechniqueShots(player.id, shotCount)
      setWon(updated.winnerId === player.id)
      setDone(true)
      onSubmit({ challenge: updated })
    } catch {
      setError('Upload failed — check your connection and try again.')
      setUploading(false)
    }
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{won ? '🏆' : '💪'}</div>
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 40, letterSpacing: '0.08em', color: won ? '#22c55e' : '#f59e0b', textShadow: `0 0 30px ${won ? '#22c55e55' : '#f59e0b55'}`, marginBottom: 10 }}>
          {won ? 'SHOWDOWN WON!' : 'NICE EFFORT!'}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, color: '#cbd5e1', marginBottom: 6 }}>
          {challenge.challengerName}: <strong style={{ color: '#f1f5f9' }}>{challenge.challengerHits}/{shotCount}</strong>
          {'  ·  '}
          You: <strong style={{ color: won ? '#22c55e' : '#f59e0b' }}>{myHits}/{shotCount}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, marginTop: 16, marginBottom: 32 }}>
          <CheckCircle size={15} /> +{shotCount} XP credited to your total
        </div>
        <button onClick={onBack} style={{ ...C.btnP, background: won ? '#22c55e' : '#f59e0b', color: '#000', fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.08em' }}>
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
        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, color: '#a855f7', letterSpacing: '0.06em' }}>
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

      {/* Challenger's proof */}
      {challenge.challengerVideo && (
        <div style={C.card}>
          <label style={C.label}>Their Proof</label>
          <video src={challenge.challengerVideo} controls playsInline style={{ width: '100%', borderRadius: 8, maxHeight: 200 }} />
        </div>
      )}

      {/* Own video */}
      <div style={C.card}>
        <label style={C.label}>Your Proof (≤ {MAX_SECS}s)</label>
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
              onClick={() => setMyHits(n)}
              style={{ background: myHits === n ? '#a855f7' : '#0f172a', color: myHits === n ? '#000' : '#94a3b8', border: `1px solid ${myHits === n ? '#a855f7' : '#334155'}`, borderRadius: 8, padding: '12px 4px', fontFamily: "'Bangers',sans-serif", fontSize: 22, cursor: 'pointer' }}
            >
              {n}
            </button>
          ))}
        </div>
        {myHits >= challenge.challengerHits && myHits > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, color: '#22c55e', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12 }}>
            <Trophy size={13} /> That's a WIN — you matched or beat the score!
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={uploading}
        style={{ ...C.btnP, background: uploading ? '#1e293b' : 'linear-gradient(135deg,#6b21a8,#a855f7)', boxShadow: uploading ? 'none' : '0 0 20px #a855f740', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em' }}
      >
        {uploading ? '📡 UPLOADING...' : '⚔️ SUBMIT RESPONSE'}
      </button>
    </div>
  )
}
