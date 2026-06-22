/**
 * P-U-C-K Game Service (Hockey HORSE)
 * Firestore: teams/team_main/puckGames/{id}
 * Storage:   puckGames/{gameId}/{role}_{ts}.{ext}
 *
 * Turn logic:
 *   Setter MAKES → defender_pending  → if defender MISSES: letter + setter stays
 *   Setter MAKES → defender_pending  → if defender MAKES: no letter + setter stays
 *   Setter MISSES → no letter, turn flips to other player immediately
 */
import { db } from '../firebase.js'
import { collection, doc, addDoc, updateDoc, getDocs, runTransaction } from 'firebase/firestore'
import { upload } from '@vercel/blob/client'
import { calculateNewRatings } from '../utils/elo.js'

const TEAM_ID        = 'team_main'
const COL            = () => collection(db, 'teams', TEAM_ID, 'puckGames')
const LETTERS        = ['P', 'U', 'C', 'K']
const MAX_FILE_BYTES  = 150 * 1024 * 1024   // 150 MB — Vercel Blob client upload; no server body limit
const WARN_FILE_BYTES = 25 * 1024 * 1024    // show amber warning above this threshold
export { WARN_FILE_BYTES }

function playSfxAsync(url) {
  try { new Audio(url).play().catch(() => {}) } catch {}
}

function freshRound(setterPlayerId) {
  return {
    id:                `r_${Date.now()}`,
    setterPlayerId,
    zone:              null,
    trickStyle:        null,
    setterVideo:       null,
    setterMade:        null,
    defenderVideo:     null,
    defenderMade:      null,
    defenderDeadline:  null,
    status:            'awaiting_setter',
    createdAt:         Date.now(),
  }
}

// ── Video upload ──────────────────────────────────────────────────────────────
// Vercel Blob client upload — no Firebase Storage, no CORS preflight blocks.
export async function uploadPuckVideo(file, gameId, role, onProgress) {
  if (file.size > MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE')

  const ext      = file.name.split('.').pop() || 'mp4'
  const pathname = `puckGames/${gameId}/${role}_${Date.now()}.${ext}`

  try {
    const blob = await upload(pathname, file, {
      access:          'public',
      handleUploadUrl: '/api/avatar/upload',
      onUploadProgress: ({ percentage }) => {
        onProgress?.(Math.round(percentage))
      },
    })

    onProgress?.(100)
    playSfxAsync('https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav')
    return blob.url
  } catch (err) {
    // Expose the raw failure details so the coach/dev can diagnose permission
    // errors, malformed paths, or network timeouts from the console.
    console.error('🚨 CRITICAL UPLOAD FAILURE DETAILED ERROR:', err, err?.code, err?.message)
    if (err?.message?.toLowerCase().includes('size') ||
        err?.message?.toLowerCase().includes('large') ||
        err?.message?.toLowerCase().includes('too big')) {
      throw new Error('FILE_TOO_LARGE')
    }
    // Preserve the original error so callers can inspect err.cause
    const wrapped = new Error('UPLOAD_FAILED')
    wrapped.cause = err
    throw wrapped
  }
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function createPuckGame({ p1Id, p1Name, p2Id, p2Name }) {
  const now  = Date.now()
  const data = {
    p1Id, p1Name, p2Id, p2Name,
    p1Letters:       [],
    p2Letters:       [],
    // Accumulates every trickStyle the setter used when they made a shot.
    // Used for the "Backhand Beauty" quest check on game-over.
    p1Techniques:    [],
    p2Techniques:    [],
    status:          'active',
    setterPlayerId:  p1Id,
    currentRound:    freshRound(p1Id),
    createdAt:       now,
    lastActivityAt:  now,
  }
  const ref_ = await addDoc(COL(), data)
  return { id: ref_.id, ...data }
}

// ── Setter submits their shot ─────────────────────────────────────────────────
export async function submitSetterShot(game, { zone, trickStyle, videoUrl, made }) {
  const now          = Date.now()
  const otherPlayer  = game.setterPlayerId === game.p1Id ? game.p2Id : game.p1Id

  // Only record the technique when the setter actually makes the shot — a miss
  // doesn't count toward quest tracking since no point was contested.
  const isP1Setter   = game.setterPlayerId === game.p1Id
  const techKey      = isP1Setter ? 'p1Techniques' : 'p2Techniques'
  const prevTechs    = (isP1Setter ? game.p1Techniques : game.p2Techniques) || []

  const update = made
    ? {
        currentRound: {
          ...game.currentRound,
          zone, trickStyle,
          setterVideo:      videoUrl,
          setterMade:       true,
          defenderDeadline: now + 24 * 60 * 60 * 1000,
          status:           'awaiting_defender',
        },
        [techKey]:      [...prevTechs, trickStyle],
        lastActivityAt: now,
      }
    : {
        setterPlayerId: otherPlayer,        // turn flips on miss
        currentRound:   freshRound(otherPlayer),
        lastActivityAt: now,
      }

  await updateDoc(doc(db, 'teams', TEAM_ID, 'puckGames', game.id), update)
  return { ...game, ...update }
}

// ── Defender submits their response ───────────────────────────────────────────
export async function submitDefenderResponse(game, { videoUrl, made, p1Elo = 1600, p2Elo = 1600 }) {
  const now          = Date.now()
  const isP1Setter   = game.setterPlayerId === game.p1Id
  const setterKey    = isP1Setter ? 'p1Letters' : 'p2Letters'
  const defenderKey  = isP1Setter ? 'p2Letters' : 'p1Letters'

  // Guard against older game records that may lack these arrays
  let p1Letters = [...(game.p1Letters ?? [])]
  let p2Letters = [...(game.p2Letters ?? [])]
  let eloResult = null

  if (!made) {
    // Defender missed (loses) → setter wins, gives letter to defender
    if (defenderKey === 'p1Letters') {
      p1Letters = [...p1Letters, LETTERS[p1Letters.length]]
    } else {
      p2Letters = [...p2Letters, LETTERS[p2Letters.length]]
    }
  } else {
    // Defender matched (wins) → defender wins, gives letter to setter
    if (setterKey === 'p1Letters') {
      p1Letters = [...p1Letters, LETTERS[p1Letters.length]]
    } else {
      p2Letters = [...p2Letters, LETTERS[p2Letters.length]]
    }
  }

  const p1Out     = p1Letters.length >= 4
  const p2Out     = p2Letters.length >= 4
  let newStatus   = 'active'
  let winnerId    = null

  if (p1Out) {
    newStatus = 'p2_wins'
    winnerId = game.p2Id
  } else if (p2Out) {
    newStatus = 'p1_wins'
    winnerId = game.p1Id
  }

  // Calculate ELO if game is over (ratingA = winner, ratingB = loser, outcome = 1)
  if (winnerId) {
    const isP1Winner = game.p1Id === winnerId
    const { deltaA, deltaB } = calculateNewRatings(
      isP1Winner ? p1Elo : p2Elo,
      isP1Winner ? p2Elo : p1Elo,
      1
    )
    eloResult = {
      p1Delta: isP1Winner ? deltaA : deltaB,
      p2Delta: isP1Winner ? deltaB : deltaA,
    }
  }

  // For the next round: the defender becomes the new setter
  // (P1 was setter, P2 defended → P2 becomes next setter, P1 defends)
  const nextSetterPlayerId = game.setterPlayerId === game.p1Id ? game.p2Id : game.p1Id

  const update = {
    p1Letters, p2Letters,
    status: newStatus,
    currentRound: newStatus === 'active'
      ? freshRound(nextSetterPlayerId)
      : { ...game.currentRound, defenderVideo: videoUrl, defenderMade: made, status: 'complete' },
    lastActivityAt: now,
  }

  // Only add eloResult if it exists — never write explicit undefined to Firestore
  if (eloResult) {
    update.eloResult = eloResult
  }

  try {
    await updateDoc(doc(db, 'teams', TEAM_ID, 'puckGames', game.id), update)
  } catch (err) {
    console.error('🚨 CRITICAL DATABASE SAVE ERROR (submitDefenderResponse):', {
      gameId: game.id,
      gameStatus: game.status,
      newStatus,
      updateKeys: Object.keys(update),
      errorCode: err?.code,
      errorMessage: err?.message,
      fullError: err,
    })
    throw err
  }
  return { ...game, ...update }
}

// ── Rematch ───────────────────────────────────────────────────────────────────
export async function createRematch(game) {
  return createPuckGame({
    p1Id:   game.p2Id,
    p1Name: game.p2Name,
    p2Id:   game.p1Id,
    p2Name: game.p1Name,
  })
}

// ── Concede ───────────────────────────────────────────────────────────────────
export async function concedePuckGame(game, concedingPlayerId, { p1Elo = 1600, p2Elo = 1600 } = {}) {
  const isP1Conceding = game.p1Id === concedingPlayerId
  const winnerId      = isP1Conceding ? game.p2Id : game.p1Id
  const status        = winnerId === game.p1Id ? 'p1_wins' : 'p2_wins'

  // ELO: conceder loses, opponent wins
  const { deltaA, deltaB } = calculateNewRatings(
    isP1Conceding ? p2Elo : p1Elo,   // ratingA = winner
    isP1Conceding ? p1Elo : p2Elo,   // ratingB = loser
    1
  )
  const eloResult = {
    p1Delta: isP1Conceding ? deltaB : deltaA,
    p2Delta: isP1Conceding ? deltaA : deltaB,
  }

  const ref = doc(COL(), game.id)
  await updateDoc(ref, { status, eloResult, lastActivityAt: Date.now() })
  return { ...game, status, eloResult, lastActivityAt: Date.now() }
}

// ── Load ──────────────────────────────────────────────────────────────────────
export async function loadPuckGamesForPlayer(playerId) {
  try {
    const snap   = await getDocs(COL())
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000  // keep last 7d of finished games
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(g =>
        (g.p1Id === playerId || g.p2Id === playerId) &&
        (g.status === 'active' || g.lastActivityAt > cutoff)
      )
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
  } catch (err) {
    console.warn('[PuckGame] load failed:', err.message)
    return []
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export { LETTERS as PUCK_LETTERS }

export function getGameAction(game, playerId) {
  if (game.status !== 'active') return 'over'
  const r = game.currentRound
  if (!r) return 'waiting'
  if (r.status === 'awaiting_setter') {
    return r.setterPlayerId === playerId ? 'set' : 'waiting_set'
  }
  if (r.status === 'awaiting_defender') {
    const isDefender = game.setterPlayerId !== playerId
    if (!isDefender) return 'waiting_match'
    return Date.now() > r.defenderDeadline ? 'expired' : 'match'
  }
  return 'waiting'
}
