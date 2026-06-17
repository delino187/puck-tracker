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
import { db, storage } from '../firebase.js'
import { collection, doc, addDoc, updateDoc, getDocs } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

const TEAM_ID        = 'team_main'
const COL            = () => collection(db, 'teams', TEAM_ID, 'puckGames')
const LETTERS        = ['P', 'U', 'C', 'K']
const UPLOAD_MS      = 60_000
const MAX_FILE_BYTES = 15 * 1024 * 1024

function withUploadTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('UPLOAD_TIMEOUT')), UPLOAD_MS)
    ),
  ])
}

function playSfxAsync(url) {
  try {
    const a = new Audio(url)
    a.volume = 0.5
    a.play().catch(() => {})
  } catch {}
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

// ── Video upload — direct client-side resumable upload with progress ──────────
export async function uploadPuckVideo(file, gameId, role, onProgress) {
  if (file.size > MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE')

  const ext     = file.name.split('.').pop() || 'mp4'
  const fileRef = ref(storage, `puckGames/${gameId}/${role}_${Date.now()}.${ext}`)

  const task = uploadBytesResumable(fileRef, file)
  if (onProgress) {
    task.on('state_changed', snapshot => {
      const pct = snapshot.totalBytes > 0
        ? Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)
        : 0
      onProgress(pct)
    })
  }

  await withUploadTimeout(task)
  const url = await withUploadTimeout(getDownloadURL(fileRef))

  playSfxAsync('https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav')
  return url
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
export async function submitDefenderResponse(game, { videoUrl, made }) {
  const now          = Date.now()
  const isP1Setter   = game.setterPlayerId === game.p1Id
  const defenderKey  = isP1Setter ? 'p2Letters' : 'p1Letters'

  let p1Letters = [...game.p1Letters]
  let p2Letters = [...game.p2Letters]

  if (!made) {
    // Defender missed → gets the next letter; setter keeps going
    if (defenderKey === 'p1Letters') {
      p1Letters = [...p1Letters, LETTERS[p1Letters.length]]
    } else {
      p2Letters = [...p2Letters, LETTERS[p2Letters.length]]
    }
  }
  // If defender matched → no letter, setter stays

  const p1Out     = p1Letters.length >= 4
  const p2Out     = p2Letters.length >= 4
  const newStatus = p1Out ? 'p2_wins' : p2Out ? 'p1_wins' : 'active'

  const update = {
    p1Letters, p2Letters,
    status: newStatus,
    currentRound: newStatus === 'active'
      ? freshRound(game.setterPlayerId)
      : { ...game.currentRound, defenderVideo: videoUrl, defenderMade: made, status: 'complete' },
    lastActivityAt: now,
  }

  await updateDoc(doc(db, 'teams', TEAM_ID, 'puckGames', game.id), update)
  return { ...game, ...update }
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
