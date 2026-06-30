import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, Video, Upload, CheckCircle, AlertCircle, Trophy, Info, Play, Flag } from 'lucide-react'
import { ZONES } from '../../constants/zones.js'
import { C } from '../../styles.js'
import { useAppStore } from '../../store/useAppStore.js'
import { uploadChallengeVideo, respondToChallenge, WARN_FILE_BYTES } from '../../services/peerChallengeService.js'
import { tauntAudioPath } from '../../constants/taunts.js'
import { disputeChallenge } from '../../services/disputeService.js'
import { updateStreak } from '../../utils/streakService.js'
import RecordingTipsModal from '../overlays/RecordingTipsModal.jsx'
import VideoReportModal from '../overlays/VideoReportModal.jsx'
import { playScoreSound } from '../../utils/arcadeSounds.js'
import Avatar from '../shared/Avatar.jsx'
import DiamondClaimButton from '../shared/DiamondClaimButton.jsx'
import { usePlayer } from '../../context/PlayerContext.jsx'

// ── Rolling-number hook: animates from `startVal` toward `target` ─────────────
function useRollingValue(target, startVal, duration = 1800) {
  const [value, setValue] = useState(startVal)
  useEffect(() => {
    if (target === startVal) return
    let rafId
    let startTime = null
    const diff = target - startVal
    function animate(ts) {
      if (!startTime) startTime = ts
      const progress = Math.min(1, (ts - startTime) / duration)
      const eased    = 1 - Math.pow(1 - progress, 3)   // cubic ease-out
      setValue(Math.round(startVal + diff * eased))
      if (progress < 1) { rafId = requestAnimationFrame(animate) }
      else               { setValue(target) }
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, []) // eslint-disable-line
  return value
}

// ── Confetti particle shapes ───────────────────────────────────────────────────
const CONFETTI_COLORS = ['#fbbf24','#22c55e','#06b6d4','#a855f7','#ef4444','#f97316','#fff']

// ── Victory / Defeat full-screen overlay ──────────────────────────────────────
function VictoryOverlay({ won, player, opponent, eloData, myHits, shotCount, challenge, onBack, onClaimBonus, onDispute }) {
  const [bonusClaimed,   setBonusClaimed]   = useState(false)
  const [disputeFiled,   setDisputeFiled]   = useState(false)
  const [disputeToast,   setDisputeToast]   = useState(false)
  const [disputeLoading, setDisputeLoading] = useState(false)
  const oldElo     = player.elo ?? 1000
  const delta      = eloData?.receiverDelta ?? 0
  const newElo     = oldElo + delta
  const displayElo = useRollingValue(newElo, oldElo, 2000)

  const shieldSaved = eloData?.receiverShieldSaved ?? false

  // Audio: on defeat, play the winner's equipped taunt stamped on the challenge doc
  // (defeatAudioTrack), then fall back to live equippedTaunt lookup, then generic sting.
  useEffect(() => {
    let src, volume
    if (won) {
      src    = '/win-fanfare.mp3'
      volume = 0.7
    } else {
      const stamped    = challenge?.defeatAudioTrack ?? null
      const liveLookup = tauntAudioPath(opponent?.equippedTaunt)
      src    = stamped ?? liveLookup ?? '/streak-broken.mp3'
      volume = (stamped || liveLookup) ? 0.85 : 0.7
    }
    const audio = new Audio(src)
    audio.volume = volume
    audio.play().catch(() => {
      // Fallback CDN sounds if local files aren't present
      const fb = new Audio(won
        ? 'https://assets.mixkit.co/active_storage/sfx/2202/2202.mp3'
        : 'https://assets.mixkit.co/active_storage/sfx/2019/2019.mp3')
      fb.volume = 0.6
      fb.play().catch(() => {})
    })
    return () => { audio.pause() }
  }, []) // eslint-disable-line

  // Confetti seeds (win only)
  const confetti = won
    ? Array.from({ length: 26 }, (_, i) => ({
        id:       i,
        left:     `${(i / 26) * 100 + (Math.random() - 0.5) * 8}%`,
        delay:    `${(Math.random() * 1.8).toFixed(2)}s`,
        duration: `${(2.2 + Math.random() * 2).toFixed(2)}s`,
        color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size:     6 + Math.floor(Math.random() * 9),
        shape:    i % 3 === 0 ? '50%' : '2px',  // circle or square
      }))
    : []

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, overflowY: 'auto',
      background: won
        ? 'radial-gradient(ellipse at 50% 20%, #1a2e00 0%, #0a1200 60%, #060a00 100%)'
        : 'radial-gradient(ellipse at 50% 20%, #2a0000 0%, #150000 60%, #0a0000 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px 40px',
    }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-30px) rotate(0deg); opacity: 1 }
          80%  { opacity: 1 }
          100% { transform: translateY(110vh) rotate(600deg); opacity: 0 }
        }
        @keyframes redVignette {
          0%,100% { box-shadow: inset 0 0 90px 50px rgba(200,0,0,0.35) }
          50%     { box-shadow: inset 0 0 140px 80px rgba(200,0,0,0.55) }
        }
        @keyframes goldHalo {
          0%,100% { box-shadow: 0 0 60px 20px rgba(251,191,36,0.25), 0 0 120px 40px rgba(251,191,36,0.12) }
          50%     { box-shadow: 0 0 100px 40px rgba(251,191,36,0.40), 0 0 200px 80px rgba(251,191,36,0.20) }
        }
        @keyframes victoryTitle {
          0%,100% { text-shadow: 0 0 50px #fbbf2499, 0 2px 0 #78350f }
          50%     { text-shadow: 0 0 90px #fbbf24cc, 0 2px 0 #78350f }
        }
        @keyframes defeatTitle {
          0%,100% { text-shadow: 0 0 50px #ef444499, 0 2px 0 #7f1d1d }
          50%     { text-shadow: 0 0 90px #ef4444cc, 0 2px 0 #7f1d1d }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
        @keyframes eloCountPulse {
          0%,100% { transform: scale(1) }
          50%     { transform: scale(1.04) }
        }
      `}</style>

      {/* Red vignette pulse — loss only */}
      {!won && (
        <div style={{ position: 'fixed', inset: 0, animation: 'redVignette 1.6s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
      )}

      {/* Gold halo glow — win only */}
      {won && (
        <div style={{ position: 'fixed', inset: 0, animation: 'goldHalo 2s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
      )}

      {/* Confetti */}
      {confetti.map(p => (
        <div key={p.id} style={{
          position: 'fixed', left: p.left, top: '-10px', zIndex: 1,
          width: p.size, height: p.size,
          background: p.color, borderRadius: p.shape,
          animation: `confettiFall ${p.duration} ${p.delay} linear forwards`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Everything else sits above the effects */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 380 }}>

        {/* Avatar */}
        <div style={{ animation: 'slideUp 0.5s ease-out both', marginBottom: 16 }}>
          <Avatar
            player={player}
            size={72}
            glowActive={!!player.hasBorderGlow}
            style={{
              borderRadius: '50%',
              border: `4px solid ${won ? '#fbbf24' : '#ef4444'}`,
              boxShadow: won ? '0 0 30px #fbbf2466' : '0 0 30px #ef444466',
            }}
          />
        </div>

        {/* Win / Loss title */}
        <div style={{
          fontFamily: "'Bangers',sans-serif",
          fontSize: 'clamp(56px,15vw,88px)',
          letterSpacing: '0.08em', lineHeight: 0.95,
          textAlign: 'center',
          color: won ? '#fbbf24' : '#ef4444',
          animation: `${won ? 'victoryTitle' : 'defeatTitle'} 1.6s ease-in-out infinite, slideUp 0.4s ease-out both`,
          marginBottom: 6,
        }}>
          {won ? 'VICTORY!' : 'DEFEAT'}
        </div>
        <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 24, animation: 'slideUp 0.45s ease-out 0.05s both' }}>
          {won ? '🏆' : '💀'}
        </div>

        {/* Score */}
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700,
          color: '#cbd5e1', marginBottom: 26, textAlign: 'center',
          animation: 'slideUp 0.5s ease-out 0.15s both',
        }}>
          <span style={{ color: '#94a3b8' }}>{challenge.challengerName}: </span>
          <strong style={{ color: '#f1f5f9' }}>{challenge.challengerHits}/{shotCount}</strong>
          <span style={{ color: '#475569' }}>  ·  </span>
          <span style={{ color: '#94a3b8' }}>You: </span>
          <strong style={{ color: won ? '#4ade80' : '#f97316' }}>{myHits}/{shotCount}</strong>
        </div>

        {/* ELO card */}
        {eloData && (
          <div style={{
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
            border: `2px solid ${eloData.unranked ? '#06b6d433' : won ? '#fbbf2444' : '#ef444433'}`,
            borderRadius: 20, padding: '20px 36px',
            textAlign: 'center', marginBottom: 28, width: '100%',
            animation: 'slideUp 0.55s ease-out 0.3s both',
          }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#475569', letterSpacing: '0.22em', marginBottom: 10 }}>
              ELO RATING
            </div>

            {eloData.unranked ? (
              /* ── Unranked: ELO frozen ──────────────────────────────────── */
              <>
                <div style={{
                  fontFamily: "'Bangers',sans-serif", fontSize: 44,
                  letterSpacing: '0.04em', lineHeight: 1,
                  color: '#06b6d4', marginBottom: 10,
                }}>
                  {displayElo}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(6,182,212,0.12)',
                  border: '1px solid #06b6d455',
                  borderRadius: 20, padding: '6px 16px',
                  fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.06em',
                  color: '#06b6d4',
                }}>
                  🛡️ ELO PROTECTED
                </div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#475569', letterSpacing: '0.06em', marginTop: 8 }}>
                  Casual match · no rating change
                </div>
              </>
            ) : (
              /* ── Ranked: full rolling counter ──────────────────────────── */
              <>
                <div style={{
                  fontFamily: "'Bangers',sans-serif", fontSize: 64,
                  letterSpacing: '0.04em', lineHeight: 1,
                  color: won ? '#fbbf24' : '#ef4444',
                  animation: 'eloCountPulse 0.4s ease-in-out infinite',
                }}>
                  {displayElo}
                </div>
                {/* Delta badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: delta > 0 ? 'rgba(34,197,94,0.15)' : delta < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.1)',
                  border: `1px solid ${delta > 0 ? '#22c55e55' : delta < 0 ? '#ef444455' : '#33415555'}`,
                  borderRadius: 20, padding: '4px 14px', marginTop: 10,
                  fontFamily: "'Bangers',sans-serif", fontSize: 22, letterSpacing: '0.06em',
                  color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#94a3b8',
                }}>
                  {delta > 0 ? `▲ +${delta} ELO` : delta < 0 ? `▼ ${delta} ELO` : shieldSaved ? '🛡️ SHIELDED — 0 ELO' : '— 0 ELO'}
                </div>
                {/* Streak bonus line */}
                {eloData.streakBonus > 0 && (
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 800, color: '#f97316', letterSpacing: '0.08em', marginTop: 10 }}>
                    🔥 +{eloData.streakBonus} STREAK BONUS ({eloData.streakBonusPct}%)
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* XP credit */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: '#34d399', fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 13, fontWeight: 700, marginBottom: 28,
          animation: 'slideUp 0.5s ease-out 0.45s both',
        }}>
          <CheckCircle size={15} /> +2 XP credited to your total
        </div>

        {/* ── Win bonus diamond claim — hidden if dispute filed ────────── */}
        {won && onClaimBonus && !bonusClaimed && !disputeFiled && (
          <div style={{ marginBottom: 22, animation: 'slideUp 0.5s ease-out 0.5s both' }}>
            <DiamondClaimButton
              onClaimed={() => {
                onClaimBonus()
                setBonusClaimed(true)
              }}
            />
          </div>
        )}

        {/* Back button — always visible for losses; visible after claim for wins */}
        {(!won || bonusClaimed || !onClaimBonus) && (
          <button
            onClick={onBack}
            style={{
              background: won
                ? 'linear-gradient(135deg,#aa6600,#fbbf24)'
                : 'linear-gradient(135deg,#7f1d1d,#ef4444)',
              color: won ? '#000' : '#fff',
              border: 'none', borderRadius: 18, padding: '16px 52px',
              fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.1em',
              cursor: 'pointer',
              boxShadow: won ? '0 0 36px #fbbf2455, 0 4px 0 #92400e' : '0 0 36px #ef444455, 0 4px 0 #7f1d1d',
              animation: 'slideUp 0.5s ease-out 0.6s both',
            }}
          >
            BACK TO VERSUS
          </button>
        )}

        {/* Dispute button — visible once result is shown, hidden after filing */}
        {!disputeFiled && onDispute && (
          <button
            disabled={disputeLoading}
            onClick={async () => {
              setDisputeLoading(true)
              try {
                await onDispute()
                setDisputeFiled(true)
                setDisputeToast(true)
                setTimeout(() => setDisputeToast(false), 4000)
              } catch {
                setDisputeLoading(false)
              }
            }}
            style={{
              marginTop: 14,
              background: 'transparent',
              border: '1px solid #ef444455',
              borderRadius: 12, padding: '10px 24px',
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
              fontWeight: 800, letterSpacing: '0.1em',
              color: '#ef4444', cursor: disputeLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: disputeLoading ? 0.5 : 0.8,
              animation: 'slideUp 0.5s ease-out 0.75s both',
            }}
          >
            <Flag size={12} /> {disputeLoading ? 'FILING…' : 'DISPUTE RESULT'}
          </button>
        )}

        {/* Toast — shown after dispute is filed */}
        {(disputeToast || disputeFiled) && (
          <div style={{
            marginTop: 12,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid #ef444455',
            borderRadius: 10, padding: '10px 16px',
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
            fontWeight: 700, color: '#fca5a5', letterSpacing: '0.06em',
            textAlign: 'center',
            animation: 'slideUp 0.3s ease-out both',
          }}>
            ⚠️ Match sent to Coach for review. Reward frozen pending decision.
          </div>
        )}
      </div>
    </div>
  )
}

const MAX_SECS = 45

function uploadErrMsg(err) {
  if (err?.message === 'FILE_TOO_LARGE')
    return 'Video exceeds 150 MB — trim it down in your phone\'s editor, then re-upload. Videos can be up to 45 seconds long!'
  if (err?.message === 'UPLOAD_TIMEOUT')
    return 'Network timed out! Move closer to Wi-Fi and try again.'
  return 'Upload failed — check your connection and try again.'
}

export default function RespondToChallenge({ player, challenge, onBack, onSubmit, onClaimVictoryBonus, completedChallenge }) {
  const { st } = usePlayer()
  const shotCount = challenge.shotCount ?? 5

  const [videoFile,  setVideoFile]  = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [myHits,     setMyHits]     = useState(null)
  const [error,      setError]      = useState('')
  const [uploading,      setUploading]      = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fileWarnMb,     setFileWarnMb]     = useState(null)
  const [done,             setDone]             = useState(false)
  const [won,              setWon]              = useState(false)
  const [showTips,         setShowTips]         = useState(false)
  const [eloData,          setEloData]          = useState(null)
  const [resolvedChallenge, setResolvedChallenge] = useState(null)
  const [tapPulse,    setTapPulse]    = useState(null)
  const [bothPlaying, setBothPlaying] = useState(false)
  const [reportTarget, setReportTarget] = useState(null)  // { videoUrl, context } | null
  const fileInputRef  = useRef(null)
  const challVideoRef = useRef(null)
  const myVideoRef    = useRef(null)

  const logTechniqueShots = useAppStore(s => s.logTechniqueShots)
  const zoneName = ZONES.find(z => z.id === challenge.zone)?.label ?? challenge.zone

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
        setError(`Videos can be up to 45 seconds long! Trim it in your phone's video editor first.`)
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

      // Determine the winner at submit time so their taunt path gets stamped onto
      // the Firestore doc — authoritative even if they later change their selection.
      const receiverWins      = myHits > challenge.challengerHits
      const isTieCheck        = myHits === challenge.challengerHits
      let   defeatAudioTrack  = null
      if (!isTieCheck) {
        const winnerId      = receiverWins ? player.id : challenge.challengerId
        const winnerProfile = winnerId === player.id
          ? player
          : (st?.players?.find(p => p.id === winnerId) ?? null)
        defeatAudioTrack = tauntAudioPath(winnerProfile?.equippedTaunt)
      }

      const updated  = await respondToChallenge(challenge, myHits, videoUrl, defeatAudioTrack)
      logTechniqueShots(player.id, shotCount, 2)   // shotCount pucks, flat 2 XP for completion
      updateStreak(player.id).catch(() => {})
      const didWin = updated.winnerId === player.id
      setWon(didWin)
      if (updated.eloResult) setEloData(updated.eloResult)
      setResolvedChallenge(updated)
      setDone(true)
      onSubmit({ challenge: updated })
    } catch (err) {
      setError(uploadErrMsg(err))
      setUploading(false)
    }
  }

  // ── Result — full-screen VictoryOverlay ───────────────────────────────────
  if (done) {
    // Look up the challenger's profile so VictoryOverlay can play their equipped
    // defeat taunt (e.g. Sad Trombone) if the receiver lost.
    const challenger = st?.players?.find(p => p.id === challenge.challengerId) ?? null
    return (
      <VictoryOverlay
        won={won}
        player={player}
        opponent={challenger}
        eloData={eloData}
        myHits={myHits}
        shotCount={shotCount}
        challenge={resolvedChallenge ?? challenge}
        onBack={onBack}
        onClaimBonus={won ? onClaimVictoryBonus : undefined}
        onDispute={resolvedChallenge
          ? () => disputeChallenge(resolvedChallenge, player.id)
          : undefined}
      />
    )
  }

  // ── Challenger spectator view — read-only, no input controls ──────────────
  // This guard is the primary access-control gate. The challenger must never see
  // the response form regardless of how this screen was opened.
  const isReceiver = player.id === challenge.receiverId
  if (!isReceiver) {
    const opponentName = challenge.receiverName ?? 'your opponent'
    const zoneName2    = ZONES.find(z => z.id === challenge.zone)?.label ?? challenge.zone
    return (
      <div style={{ padding: '20px 16px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <ChevronLeft size={22} />
          </button>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 24, letterSpacing: '0.06em', color: '#60a5fa' }}>
            CHALLENGE SENT
          </div>
        </div>

        {/* Waiting card */}
        <div style={{
          background: 'linear-gradient(135deg,#0d1526,#0f1e3a)',
          border: '2px solid #3b82f655',
          borderRadius: 20, padding: '32px 24px',
          textAlign: 'center', marginBottom: 20,
          boxShadow: '0 0 40px #3b82f618',
        }}>
          <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>⏳</div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 28, letterSpacing: '0.08em', color: '#60a5fa', marginBottom: 8 }}>
            AWAITING RESPONSE
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 600, color: '#94a3b8', lineHeight: 1.6 }}>
            Challenge sent to <span style={{ color: '#f1f5f9', fontWeight: 800 }}>{opponentName}</span>.
            <br />Waiting for them to lay down their score.
          </div>
        </div>

        {/* Challenge details — read only */}
        <div style={{ background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#475569', letterSpacing: '0.18em', marginBottom: 14 }}>
            CHALLENGE DETAILS
          </div>
          {[
            { label: 'Zone',   value: zoneName2 },
            { label: 'Shots',  value: `${shotCount} shots` },
            { label: 'Your Score', value: `${challenge.challengerHits}/${shotCount}` },
            { label: 'Match Type', value: challenge.matchType === 'unranked' ? '🤝 Casual' : '🏆 Ranked' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em' }}>
                {label}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Proof video — read only */}
        {challenge.challengerVideo && (
          <div style={{ background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 16, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#475569', letterSpacing: '0.18em', marginBottom: 10 }}>
              YOUR PROOF VIDEO
            </div>
            <video src={challenge.challengerVideo} controls playsInline style={{ width: '100%', borderRadius: 10, maxHeight: 220 }} />
            <button
              onClick={() => setReportTarget({ videoUrl: challenge.challengerVideo, context: `Versus – ${challenge.challengerName} vs ${challenge.receiverName}` })}
              style={{ marginTop: 8, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#ef444488', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700 }}
            >
              <Flag size={11} /> Report Inappropriate Video
            </button>
          </div>
        )}

        <button
          onClick={onBack}
          style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg,#1d3a6e,#1e40af)',
            border: '1.5px solid #3b82f6',
            borderRadius: 14,
            fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em',
            color: '#fff', cursor: 'pointer',
            boxShadow: '0 0 20px #3b82f640',
          }}
        >
          ← BACK TO VERSUS
        </button>
      </div>
    )
  }

  // ── Response screen ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 16px 80px' }}>
      {showTips && <RecordingTipsModal onClose={() => setShowTips(false)} />}
      {reportTarget && (
        <VideoReportModal
          videoUrl={reportTarget.videoUrl}
          videoContext={reportTarget.context}
          onClose={() => setReportTarget(null)}
        />
      )}

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
              <button
                onClick={() => setReportTarget({ videoUrl: challenge.challengerVideo, context: `Versus – ${challenge.challengerName} vs ${challenge.receiverName}` })}
                style={{ marginTop: 8, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#ef444488', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700 }}
              >
                <Flag size={11} /> Report Inappropriate Video
              </button>
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
          disabled={myHits === null}
          style={{ ...C.btnP, background: myHits === null ? '#1e293b' : 'linear-gradient(135deg,#6b21a8,#a855f7)', boxShadow: myHits === null ? 'none' : '0 0 20px #a855f740', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em', opacity: myHits === null ? 0.45 : 1, cursor: myHits === null ? 'not-allowed' : 'pointer' }}
        >
          ⚔️ SUBMIT RESPONSE
        </button>
      )}
    </div>
  )
}
