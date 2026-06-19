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
const MAX_FILE_BYTES = 15 * 1024 * 1024

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
    console.error('[Upload] Vercel Blob upload failed:', err)
    if (err?.message?.toLowerCase().includes('size') ||
        err?.message?.toLowerCase().includes('large')) {
      throw new Error('FILE_TOO_LARGE')
    }
    throw new Error('UPLOAD_FAILED')
  }
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function createPuckGame({ p1Id, p1Name, p2Id, p2Name }) {
  const now  = Date.now()
  const data = {
    p1Id, p1Name, p2Id, p2Name,
    p1Letters:       [],
    p2Letters:       [],
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

  let p1Letters = [...game.p1Letters]
  let p2Letters = [...game.p2Letters]
  let eloResult = null

  if (!made) {
    // Defender missed → setter gets the next letter (inverted HORSE mechanics)
    if (setterKey === 'p1Letters') {
      p1Letters = [...p1Letters, LETTERS[p1Letters.length]]
    } else {
      p2Letters = [...p2Letters, LETTERS[p2Letters.length]]
    }
  } else {
    // Defender matched → defender gives a letter to setter
    if (defenderKey === 'p1Letters') {
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

  // Calculate ELO if game is over
  if (winnerId) {
    const ratings = calculateNewRatings(
      game.p1Id === winnerId ? p1Elo : p2Elo,
      game.p1Id === winnerId ? p2Elo : p1Elo
    )
    eloResult = {
      p1Delta: game.p1Id === winnerId ? ratings.winner - p1Elo : ratings.loser - p1Elo,
      p2Delta: game.p2Id === winnerId ? ratings.winner - p2Elo : ratings.loser - p2Elo,
    }
  }

  const update = {
    p1Letters, p2Letters,
    status: newStatus,
    eloResult: eloResult || undefined,
    currentRound: newStatus === 'active'
      ? freshRound(game.setterPlayerId)
      : { ...game.currentRound, defenderVideo: videoUrl, defenderMade: made, status: 'complete' },
    lastActivityAt: now,
  }

  await updateDoc(doc(db, 'teams', TEAM_ID, 'puckGames', game.id), update)
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
