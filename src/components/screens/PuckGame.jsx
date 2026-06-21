import { useState, useRef } from 'react'
import { ChevronLeft, Video, Upload, AlertCircle, Zap } from 'lucide-react'
import { ZONES } from '../../constants/zones.js'
import { C } from '../../styles.js'
import { useAppStore } from '../../store/useAppStore.js'
import {
  createPuckGame, uploadPuckVideo,
  submitSetterShot, submitDefenderResponse,
  loadPuckGamesForPlayer, getGameAction, PUCK_LETTERS, createRematch,
  concedePuckGame,
  WARN_FILE_BYTES,
} from '../../services/puckGameService.js'
import PuckGameOverlay from '../overlays/PuckGameOverlay.jsx'
import CopyButton, { buildInviteText } from '../shared/CopyButton.jsx'
import { updateStreak } from '../../utils/streakService.js'
import { audioEngine } from '../../services/audioEngine.js'

function uploadErrMsg(err) {
  if (err?.message === 'FILE_TOO_LARGE')
    return 'Video exceeds 150 MB — trim it to just your shots (5-10 s) in your phone\'s editor, then re-upload.'
  if (err?.message === 'UPLOAD_TIMEOUT')
    return 'Network timed out! Move closer to Wi-Fi and try again.'
  return 'Upload failed — check your connection and try again.'
}

const TRICK_STYLES = ['Forehand', 'Backhand', 'One-Timer', 'Slap Shot', 'Snap Shot', 'Wrist Shot', 'Toe Drag', 'Inside Foot', 'Outside Foot']
const MAX_SECS     = 30   // up to 30 seconds allowed

// ── Letter display ─────────────────────────────────────────────────────────────
function LetterRow({ letters, label, isYou }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: isYou ? '#22c55e' : '#94a3b8', letterSpacing: '0.12em', marginBottom: 4, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {['P','U','C','K'].map((l, i) => (
          <span key={l} style={{
            fontFamily: "'Bangers',sans-serif",
            fontSize: 32,
            letterSpacing: '0.02em',
            color: i < letters.length ? '#ef4444' : '#1a2540',
            textShadow: i < letters.length ? '0 0 18px #ef444499' : 'none',
            transition: 'color 0.3s',
          }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

// ── Small video picker ─────────────────────────────────────────────────────────
function VideoPicker({ previewUrl, onSelect, onClear, error, maxSecs = MAX_SECS }) {
  const inputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url  = URL.createObjectURL(file)
    const vid  = document.createElement('video')
    vid.preload = 'metadata'
    vid.onloadedmetadata = () => {
      if (vid.duration > maxSecs + 1.5) { URL.revokeObjectURL(url); onSelect(null, null, `Videos can be up to 30 seconds long! Trim it in your phone's video editor first.`); return }
      onSelect(file, url, null)
    }
    vid.src = url
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
      {!previewUrl ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={() => { inputRef.current?.setAttribute('capture','environment'); inputRef.current?.click() }} style={{ background: '#0f172a', border: '1px solid #ef444444', borderRadius: 10, padding: '14px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: '#fca5a5', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700 }}>
            <Video size={22} color="#ef4444" /> RECORD NOW
          </button>
          <button onClick={() => { inputRef.current?.removeAttribute('capture'); inputRef.current?.click() }} style={{ background: '#0f172a', border: '1px solid #3b82f644', borderRadius: 10, padding: '14px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: '#93c5fd', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700 }}>
            <Upload size={22} color="#3b82f6" /> UPLOAD
          </button>
        </div>
      ) : (
        <div>
          <video src={previewUrl} controls playsInline style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 180 }} />
          <button onClick={onClear} style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#94a3b8' }}>
            Change
          </button>
        </div>
      )}
      {error && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 8, color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, lineHeight: 1.4 }}><AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PuckGame({ player, players, puckGames, onBack, onUpdate, onConcede }) {
  const [view,          setView]         = useState('list')   // 'list' | 'new' | 'game' | 'set' | 'match'
  const [selectedGame,  setSelectedGame] = useState(null)
  // Tracks which game's trombone has already played so it only fires once per loss view
  const trombonePlayedRef = useRef(null)
  const [showOverlay,   setShowOverlay]  = useState(false)
  const [friendId,      setFriendId]     = useState('')
  const [zone,          setZone]         = useState(ZONES[0].id)
  const [trick,         setTrick]        = useState(TRICK_STYLES[0])
  const [videoFile,     setVideoFile]    = useState(null)
  const [previewUrl,    setPreviewUrl]   = useState(null)
  const [videoError,    setVideoError]   = useState('')
  const [fileWarnMb,    setFileWarnMb]   = useState(null)
  const [submitting,     setSubmitting]    = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error,         setError]        = useState('')
  const [rematchLoading,  setRematchLoading]  = useState(false)
  const [concedeTarget,   setConcedeTarget]   = useState(null)  // game to concede (pending confirm)
  const [concedeToast,    setConcedeToast]    = useState(false)
  const concedeToastTimer                      = useRef(null)

  const logTechniqueShots = useAppStore(s => s.logTechniqueShots)
  const friends = players.filter(p => p.id !== player.id)

  function resetVideo() { setVideoFile(null); setPreviewUrl(null); setVideoError(''); setFileWarnMb(null) }

  function handleVideoSelect(file, url, err) {
    setVideoError(err || '')
    setVideoFile(file || null)
    setPreviewUrl(url || null)
    setFileWarnMb(file && file.size > WARN_FILE_BYTES ? (file.size / (1024 * 1024)).toFixed(1) : null)
  }

  function friendName(game) {
    return game.p1Id === player.id ? game.p2Name : game.p1Name
  }

  function myLetters(game) {
    return game.p1Id === player.id ? game.p1Letters : game.p2Letters
  }

  function theirLetters(game) {
    return game.p1Id === player.id ? game.p2Letters : game.p1Letters
  }

  async function refresh(updatedGame) {
    onUpdate(updatedGame)
    setSelectedGame(updatedGame)
    resetVideo()
    setSubmitting(false)
    setError('')
    setView('game')
    // Show overlay if game just ended
    if (updatedGame.status !== 'active') {
      setShowOverlay(true)
    }
  }

  // ── Start new game ────────────────────────────────────────────────────────
  async function handleCreateGame() {
    const friend = players.find(p => p.id === friendId)
    if (!friend) { setError('Select a friend to challenge.'); return }
    setSubmitting(true)
    try {
      const game = await createPuckGame({ p1Id: player.id, p1Name: player.name, p2Id: friend.id, p2Name: friend.name })
      onUpdate(game)
      setSelectedGame(game)
      setView('game')
    } catch { setError('Failed to start game — check your connection.') }
    setSubmitting(false)
  }

  // ── Setter submits ────────────────────────────────────────────────────────
  async function handleSetterSubmit(made) {
    if (!videoFile) { setError('Upload your video first.'); return }
    setSubmitting(true); setError('')
    try {
      const url = await uploadPuckVideo(videoFile, selectedGame.id, `setter_${player.id}`, setUploadProgress)
      logTechniqueShots(player.id, 3)   // all 3 shots logged → +3 XP
      updateStreak(player.id).catch(() => {})
      const updated = await submitSetterShot(selectedGame, { zone, trickStyle: trick, videoUrl: url, made })
      await refresh(updated)
    } catch (err) { setError(uploadErrMsg(err)); setSubmitting(false) }
  }

  // ── Defender submits ──────────────────────────────────────────────────────
  async function handleDefenderSubmit(made) {
    if (!videoFile) { setError('Upload your video first.'); return }
    setSubmitting(true); setError('')
    try {
      const url = await uploadPuckVideo(videoFile, selectedGame.id, `defender_${player.id}`, setUploadProgress)
      logTechniqueShots(player.id, 3)   // all 3 shots logged → +3 XP
      updateStreak(player.id).catch(() => {})
      const p1 = players.find(p => p.id === selectedGame.p1Id)
      const p2 = players.find(p => p.id === selectedGame.p2Id)
      const updated = await submitDefenderResponse(selectedGame, { videoUrl: url, made, p1Elo: p1?.elo || 1600, p2Elo: p2?.elo || 1600 })
      await refresh(updated)
    } catch (err) { setError(uploadErrMsg(err)); setSubmitting(false) }
  }

  // ── Expired defender auto-loss ────────────────────────────────────────────
  async function handleExpiredMiss() {
    setSubmitting(true)
    try {
      const updated = await submitDefenderResponse(selectedGame, { videoUrl: null, made: false })
      await refresh(updated)
      setShowOverlay(true)
    } catch { setSubmitting(false) }
  }

  // ── Handle rematch ────────────────────────────────────────────────────────
  async function handleRematch() {
    setRematchLoading(true)
    try {
      const newGame = await createRematch(selectedGame)
      onUpdate(newGame)
      setSelectedGame(newGame)
      setShowOverlay(false)
      resetVideo()
    } catch {
      setError('Rematch failed — try again.')
      setRematchLoading(false)
    }
  }

  // ─────────────────────────── VIEWS ────────────────────────────────────────

  // NEW GAME
  if (view === 'new') {
    return (
      <div style={{ padding: '20px 16px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <button onClick={() => { setView('list'); setError('') }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}><ChevronLeft size={22} /></button>
          <div className="text-3d-red" style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, letterSpacing: '0.06em' }}>START A P-U-C-K GAME</div>
        </div>
        <div style={C.card}>
          <label style={C.label}>Challenge</label>
          {friends.length === 0
            ? <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'var(--text-muted)' }}>No other players on the roster.</div>
            : <select value={friendId} onChange={e => setFriendId(e.target.value)} style={{ ...C.inp, marginBottom: 0 }}>
                <option value="">— Select a player —</option>
                {friends.map(p => <option key={p.id} value={p.id}>{p.name}{p.jerseyNum ? ` #${p.jerseyNum}` : ''}</option>)}
              </select>
          }
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
          First to spell P-U-C-K loses. You'll set the first shot.
        </div>
        <button onClick={handleCreateGame} disabled={submitting} style={{ ...C.btnP, background: friendId ? 'linear-gradient(135deg,#7f1d1d,#ef4444)' : '#1e293b', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em', boxShadow: friendId ? '0 0 20px #ef444440' : 'none' }}>
          {submitting ? 'STARTING...' : '⚡ LACE UP!'}
        </button>
        {error && <div style={{ color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, textAlign: 'center', marginTop: 6 }}>{error}</div>}
      </div>
    )
  }

  // ACTIVE GAME VIEW
  if (view === 'game' && selectedGame) {
    const g        = selectedGame
    const action   = getGameAction(g, player.id)
    const myL      = myLetters(g)
    const theirL   = theirLetters(g)
    const fName    = friendName(g)
    const isSetter = g.currentRound?.setterPlayerId === player.id
    const round    = g.currentRound

    // GAME OVER
    if (g.status !== 'active') {
      const iWon = (g.status === 'p1_wins' && g.p1Id === player.id) || (g.status === 'p2_wins' && g.p2Id === player.id)
      const playerElo = {
        delta: g.p1Id === player.id ? g.eloResult?.p1Delta || 0 : g.eloResult?.p2Delta || 0,
      }

      // Sad Trombone taunt — plays once when the loser first opens this result screen
      if (!iWon && trombonePlayedRef.current !== g.id) {
        const winnerId = g.status === 'p1_wins' ? g.p1Id : g.p2Id
        const winner   = players.find(p => p.id === winnerId)
        if (winner?.sadTromboneUnlocked) {
          trombonePlayedRef.current = g.id
          setTimeout(() => audioEngine.playTauntTrombone(), 400)
        }
      }

      return (
        <>
          {showOverlay && (
            <PuckGameOverlay
              game={g}
              playerElo={playerElo}
              onRematch={() => handleRematch()}
              onClose={() => { setView('list'); setSelectedGame(null); setShowOverlay(false) }}
            />
          )}
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>{iWon ? '🏆' : '💀'}</div>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 48, letterSpacing: '0.08em', color: iWon ? '#22c55e' : '#ef4444', textShadow: `0 0 40px ${iWon ? '#22c55e55' : '#ef444455'}`, marginBottom: 12, lineHeight: 1 }}>
              {iWon ? 'KNOCKOUT!' : 'WASTED!'}
            </div>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#f1f5f9', letterSpacing: '0.04em', marginBottom: 32 }}>
              {iWon ? 'YOU WIN!' : `DEFEATED BY ${fName.toUpperCase()}`}
            </div>
            <div style={{ display: 'flex', gap: 28, marginBottom: 40 }}>
              <LetterRow letters={myL}    label="You"    isYou />
              <LetterRow letters={theirL} label={fName}  isYou={false} />
            </div>
            <button onClick={() => setShowOverlay(true)} style={{ ...C.btnP, background: 'linear-gradient(135deg,#7f1d1d,#ef4444)', fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.06em', boxShadow: '0 0 20px #ef444440', marginBottom: 10 }}>
              🏆 VIEW RESULTS
            </button>
            <button onClick={() => { setView('list'); setSelectedGame(null); setShowOverlay(false) }} style={{ ...C.btnP, background: '#1e293b', fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.06em' }}>
              ← BACK TO GAMES
            </button>
          </div>
        </>
      )
    }

    // ACTIVE GAME — ACTION VIEW
    return (
      <div style={{ padding: '16px 16px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <button onClick={() => { setView('list'); setSelectedGame(null); resetVideo() }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}><ChevronLeft size={22} /></button>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#ef4444', letterSpacing: '0.06em' }}>P-U-C-K vs {fName.toUpperCase()}</div>
        </div>

        {/* Score card */}
        <div style={{ background: '#0a0d1a', border: '2px solid #ef444433', borderRadius: 16, padding: '18px', marginBottom: 18, display: 'flex', justifyContent: 'space-around' }}>
          <LetterRow letters={myL}    label="You"    isYou />
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 28, color: '#334155', alignSelf: 'center' }}>VS</div>
          <LetterRow letters={theirL} label={fName}  isYou={false} />
        </div>

        {/* SET SHOT */}
        {action === 'set' && (
          <>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, color: '#22c55e', letterSpacing: '0.08em', marginBottom: 16, textShadow: '0 0 20px #22c55e55' }}>
              🏒 SET YOUR TRICK SHOT!
            </div>

            <div style={C.card}>
              <label style={C.label}>Target Zone</label>
              <select value={zone} onChange={e => setZone(e.target.value)} style={{ ...C.inp, marginBottom: 0 }}>
                {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </div>

            <div style={C.card}>
              <label style={C.label}>Trick Style</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {TRICK_STYLES.map(t => (
                  <button key={t} onClick={() => setTrick(t)} style={{ background: trick === t ? '#22c55e' : '#0f172a', color: trick === t ? '#000' : '#94a3b8', border: `1px solid ${trick === t ? '#22c55e' : '#334155'}`, borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700 }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={C.card}>
              <label style={C.label}>Your Video — 3 Shots (up to {MAX_SECS}s)</label>
              <div style={{ background: '#0a1a0a', border: '1px solid #22c55e22', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontFamily: "'Bangers',sans-serif", fontSize: 14, color: '#22c55e', letterSpacing: '0.04em' }}>
                🏒 You get 3 shots to hit the target — make at least 1 to count as a SUCCESS!
              </div>
              <VideoPicker previewUrl={previewUrl} onSelect={handleVideoSelect} onClear={resetVideo} error={videoError} />
            </div>

            {fileWarnMb && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                <AlertCircle size={13} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
                  <strong>{fileWarnMb} MB</strong> — large file. May take 30–90 s on mobile. Keep Wi-Fi strong!
                </span>
              </div>
            )}
            {error && <div style={{ color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, marginBottom: 10 }}>{error}</div>}

            {submitting ? (
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => handleSetterSubmit(true)} disabled={!videoFile} style={{ background: videoFile ? 'linear-gradient(135deg,#14532d,#22c55e)' : '#0f172a', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em', cursor: videoFile ? 'pointer' : 'default', boxShadow: videoFile ? '0 0 16px #22c55e40' : 'none' }}>
                  ✅ I MADE IT!
                </button>
                <button onClick={() => handleSetterSubmit(false)} disabled={!videoFile} style={{ background: videoFile ? 'linear-gradient(135deg,#7f1d1d,#ef4444)' : '#0f172a', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em', cursor: videoFile ? 'pointer' : 'default', boxShadow: videoFile ? '0 0 16px #ef444440' : 'none' }}>
                  ❌ I MISSED
                </button>
              </div>
            )}
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 10 }}>
              Hit 1-of-3 = ✅ MADE IT · Miss all 3 = ❌ MISSED (turn flips, no letter)
            </div>
          </>
        )}

        {/* MATCH SHOT */}
        {(action === 'match' || action === 'expired') && round && (
          <>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, color: '#f97316', letterSpacing: '0.08em', marginBottom: 16, textShadow: '0 0 20px #f9731655' }}>
              ⚡ MATCH THIS SHOT!
            </div>

            <div style={{ ...C.card, borderColor: '#f9731644' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 8 }}>SETTER'S ATTEMPT</div>
              {round.setterVideo && <video src={round.setterVideo} controls playsInline style={{ width: '100%', borderRadius: 8, marginBottom: 10, maxHeight: 180 }} />}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, color: '#f97316', letterSpacing: '0.04em' }}>{ZONES.find(z => z.id === round.zone)?.label?.toUpperCase()}</div>
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, color: '#fbbf24', letterSpacing: '0.04em' }}>{round.trickStyle?.toUpperCase()}</div>
              </div>
            </div>

            {action === 'expired' ? (
              <>
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, color: '#ef4444', textAlign: 'center', marginBottom: 16, letterSpacing: '0.06em' }}>TIME'S UP! YOU GET A LETTER.</div>
                <button onClick={handleExpiredMiss} disabled={submitting} style={{ ...C.btnP, background: '#ef4444', fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.08em' }}>
                  {submitting ? '...' : 'TAKE THE LETTER →'}
                </button>
              </>
            ) : (
              <>
                <div style={C.card}>
                  <label style={C.label}>Your Response — 3 Shots (up to {MAX_SECS}s)</label>
                  <div style={{ background: '#0a1a0a', border: '1px solid #22c55e22', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontFamily: "'Bangers',sans-serif", fontSize: 14, color: '#22c55e', letterSpacing: '0.04em' }}>
                    🏒 You get 3 shots to hit the target — make at least 1 to count as a MATCH!
                  </div>
                  <VideoPicker previewUrl={previewUrl} onSelect={handleVideoSelect} onClear={resetVideo} error={videoError} />
                </div>
                {fileWarnMb && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                    <AlertCircle size={13} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
                      <strong>{fileWarnMb} MB</strong> — large file. May take 30–90 s on mobile. Keep Wi-Fi strong!
                    </span>
                  </div>
                )}
                {error && <div style={{ color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, marginBottom: 10 }}>{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {submitting ? (
                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, background: '#0f172a', border: '2px solid #a855f7', gridColumn: '1 / -1' }}>
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
                    <>
                      <button onClick={() => handleDefenderSubmit(true)} disabled={!videoFile} style={{ background: videoFile ? 'linear-gradient(135deg,#14532d,#22c55e)' : '#0f172a', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em', cursor: videoFile ? 'pointer' : 'default', boxShadow: videoFile ? '0 0 16px #22c55e40' : 'none' }}>
                        ✅ I MADE IT!
                      </button>
                      <button onClick={() => handleDefenderSubmit(false)} disabled={!videoFile} style={{ background: videoFile ? 'linear-gradient(135deg,#7f1d1d,#ef4444)' : '#0f172a', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em', cursor: videoFile ? 'pointer' : 'default', boxShadow: videoFile ? '0 0 16px #ef444440' : 'none' }}>
                        ❌ I MISSED
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* WAITING */}
        {(action === 'waiting_set' || action === 'waiting_match') && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#64748b', letterSpacing: '0.06em', marginBottom: 8 }}>
              {action === 'waiting_set' ? `WAITING FOR ${fName.toUpperCase()} TO SET` : `WAITING FOR ${fName.toUpperCase()} TO MATCH`}
            </div>
            {action === 'waiting_match' && round?.defenderDeadline && (
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#475569', marginBottom: 16 }}>
                Deadline: {new Date(round.defenderDeadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            )}
            <CopyButton inviteText={buildInviteText('puck')} style={{ marginTop: 8 }} />
          </div>
        )}
      </div>
    )
  }

  // LIST VIEW (default)
  const activeGames    = puckGames.filter(g => g.status === 'active')
  const completedGames = puckGames.filter(g => g.status !== 'active').slice(0, 3)

  return (
    <div style={{ padding: '16px 14px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}><ChevronLeft size={22} /></button>
          <div>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 30, color: '#ef4444', letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 0 24px #ef444455' }}>
              P-U-C-K
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#64748b', letterSpacing: '0.12em' }}>HOCKEY HORSE · FIRST TO SPELL IT LOSES</div>
          </div>
        </div>
        {friends.length > 0 && (
          <button onClick={() => { setFriendId(''); setError(''); setView('new') }} style={{ background: 'linear-gradient(135deg,#7f1d1d,#ef4444)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.06em', boxShadow: '0 0 16px #ef444440' }}>
            + GAME
          </button>
        )}
      </div>

      {/* Active games */}
      {activeGames.length === 0 && (
        <div style={{ background: 'linear-gradient(135deg,#100406,#1a0608)', borderRadius: 14, padding: '24px 20px', border: '1px dashed #ef444433', textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏒</div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#ef4444', letterSpacing: '0.06em', marginBottom: 6 }}>NO ACTIVE GAMES</div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#64748b' }}>
            {friends.length > 0 ? 'Tap + GAME to start a P-U-C-K showdown with a teammate!' : 'Add teammates to the roster to unlock P-U-C-K.'}
          </div>
        </div>
      )}

      {activeGames.map(g => {
        const action = getGameAction(g, player.id)
        const myL    = myLetters(g)
        const theirL = theirLetters(g)
        const fName  = friendName(g)
        const urgent = action === 'set' || action === 'match' || action === 'expired'

        return (
          <div key={g.id} onClick={() => { setSelectedGame(g); resetVideo(); setView('game') }} style={{ background: urgent ? 'linear-gradient(135deg,#100406,#1c0608)' : 'var(--card-bg)', border: `2px solid ${urgent ? '#ef444455' : '#1e293b'}`, borderRadius: 14, padding: '16px 18px', marginBottom: 12, cursor: 'pointer', boxShadow: urgent ? '0 0 24px #ef444418' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#94a3b8', letterSpacing: '0.06em' }}>vs {fName}</div>
              {urgent && (
                <div style={{ background: '#ef4444', color: '#fff', borderRadius: 6, padding: '2px 8px', fontFamily: "'Bangers',sans-serif", fontSize: 13, letterSpacing: '0.06em', animation: 'none' }}>
                  {action === 'set' ? '🏒 YOUR SHOT' : action === 'match' ? '⚡ MATCH IT' : '⏰ TIME\'S UP'}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 12 }}>
              <LetterRow letters={myL}    label="You"    isYou />
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, color: '#1e293b', alignSelf: 'center' }}>VS</div>
              <LetterRow letters={theirL} label={fName}  isYou={false} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: urgent ? '#22c55e' : '#475569', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Zap size={11} color={urgent ? '#22c55e' : '#475569'} />
                {action === 'set'          ? 'YOUR TURN TO SET A TRICK SHOT →'
                 : action === 'match'      ? 'YOU NEED TO MATCH THIS SHOT →'
                 : action === 'expired'    ? 'DEADLINE PASSED — TAP TO TAKE THE LETTER'
                 : action === 'waiting_set'   ? `Waiting for ${fName} to set...`
                 : action === 'waiting_match' ? `Waiting for ${fName} to match...`
                 : ''}
              </div>
              <button
                onClick={e => { e.stopPropagation(); setConcedeTarget(g) }}
                style={{
                  background: 'transparent', border: '1px solid #ef444433',
                  borderRadius: 6, padding: '3px 9px',
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10,
                  fontWeight: 700, letterSpacing: '0.08em',
                  color: '#ef4444aa', cursor: 'pointer',
                }}
              >
                CONCEDE
              </button>
            </div>
          </div>
        )
      })}

      {/* Recent completed */}
      {completedGames.length > 0 && (
        <>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10, marginTop: 8 }}>Completed</div>
          {completedGames.map(g => {
            const iWon = (g.status === 'p1_wins' && g.p1Id === player.id) || (g.status === 'p2_wins' && g.p2Id === player.id)
            return (
              <div key={g.id} onClick={() => { setSelectedGame(g); setView('game') }} style={{ background: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'var(--text-muted)' }}>vs {friendName(g)}</span>
                <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: iWon ? '#22c55e' : '#ef4444', letterSpacing: '0.06em' }}>{iWon ? 'WON' : 'LOST'}</span>
              </div>
            )
          })}
        </>
      )}

      {/* ── Concede confirmation modal ──────────────────────────────────────── */}
      {concedeTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px',
        }}>
          <div style={{
            width: '100%', maxWidth: 340,
            background: 'linear-gradient(160deg,#0f0406,#1a060a)',
            border: '2px solid #ef444466', borderRadius: 20,
            padding: '28px 22px 22px',
            boxShadow: '0 0 40px #ef444433',
          }}>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, color: '#ef4444', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 14 }}>
              🏳️ CONCEDE GAME?
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 600, color: '#cbd5e1', lineHeight: 1.6, textAlign: 'center', marginBottom: 22 }}>
              Are you sure you want to concede this PUCK game? This will count as a loss and clear it from your dashboard.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConcedeTarget(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: '#0f172a', border: '1px solid #334155',
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700,
                  color: '#64748b', cursor: 'pointer', letterSpacing: '0.06em',
                }}
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  const g = concedeTarget
                  setConcedeTarget(null)
                  // Best-effort Firestore write — if the opponent account is
                  // deleted or the game doc is orphaned, swallow the error and
                  // still clear the card from the UI.
                  try {
                    await concedePuckGame(g, player.id)
                  } catch (err) {
                    console.warn('[concede] backend update failed, clearing locally:', err.message)
                  }
                  // Always fire regardless of backend success/failure
                  onConcede?.(g.id)
                  clearTimeout(concedeToastTimer.current)
                  setConcedeToast(true)
                  concedeToastTimer.current = setTimeout(() => setConcedeToast(false), 4000)
                }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: 'linear-gradient(135deg,#7f1d1d,#ef4444)',
                  border: 'none',
                  fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.08em',
                  color: '#fff', cursor: 'pointer',
                  boxShadow: '0 0 18px #ef444455',
                }}
              >
                YES, CONCEDE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Concede toast ───────────────────────────────────────────────────── */}
      {concedeToast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 400,
          background: 'linear-gradient(135deg,#0f172a,#1e293b)',
          border: '1.5px solid #64748b',
          borderRadius: 14, padding: '10px 18px',
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700,
          color: '#e2e8f0', letterSpacing: '0.04em',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          whiteSpace: 'nowrap',
        }}>
          🧹 PUCK game conceded. Screen cleared!
        </div>
      )}
    </div>
  )
}
