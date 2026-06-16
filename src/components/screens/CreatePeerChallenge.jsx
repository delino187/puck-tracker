import { useState, useRef } from 'react'
import { ChevronLeft, Video, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { ZONES } from '../../constants/zones.js'
import { C } from '../../styles.js'
import { useAppStore } from '../../store/useAppStore.js'
import { uploadChallengeVideo, createChallenge } from '../../services/peerChallengeService.js'
import RecordingTipsModal from '../overlays/RecordingTipsModal.jsx'

const MAX_SECS = 10

export default function CreatePeerChallenge({ player, players, onBack, onSubmit }) {
  const [step,       setStep]       = useState(1)
  const [friendId,   setFriendId]   = useState('')
  const [zone,       setZone]       = useState(ZONES[0].id)
  const [shotCount,  setShotCount]  = useState(5)
  const [videoFile,  setVideoFile]  = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [myHits,     setMyHits]     = useState(3)
  const [error,      setError]      = useState('')
  const [uploading,  setUploading]  = useState(false)
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
      const videoUrl = await uploadChallengeVideo(videoFile, tempKey, 'challenger')
      const challenge = await createChallenge({
        challengerId:   player.id,
        challengerName: player.name,
        receiverId:     friend.id,
        receiverName:   friend.name,
        zone,
        shotCount,
        challengerHits: myHits,
        videoUrl,
      })
      // Award XP via technique shots — +1 XP per puck, shows in career total
      logTechniqueShots(player.id, shotCount)
      setStep(3)
      onSubmit({ challenge })
    } catch {
      setError('Upload failed — check your connection and try again.')
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
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, color: '#a855f7', letterSpacing: '0.06em', lineHeight: 1, textShadow: '0 0 16px #a855f755' }}>
              ISSUE A SHOWDOWN
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
          {myHits > 0 && (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#a855f7', textAlign: 'center', marginTop: 10, letterSpacing: '0.06em' }}>
              {friend?.name} must score {myHits}+ hits to win!
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={uploading}
          style={{ ...C.btnP, background: uploading ? '#1e293b' : 'linear-gradient(135deg,#6b21a8,#a855f7)', boxShadow: uploading ? 'none' : '0 0 20px #a855f740', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em' }}
        >
          {uploading ? '📡 UPLOADING...' : '⚔️ ISSUE SHOWDOWN'}
        </button>
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
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#64748b', marginBottom: 20 }}>They have 48 hours to respond.</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, marginBottom: 32 }}>
        <CheckCircle size={15} /> +{shotCount} XP credited to your total
      </div>
      <button onClick={onBack} style={{ ...C.btnP, background: '#a855f7', fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.08em' }}>
        BACK TO VERSUS
      </button>
    </div>
  )
}
