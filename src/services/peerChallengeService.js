/**
 * Peer Challenge Service
 * Firestore: teams/team_main/peerChallenges/{id}
 * Storage:   peerChallenges/{challengeId}/{role}.{ext}
 *
 * NOTE: Firebase Storage rules must allow authenticated or open writes to
 *   /peerChallenges/** for video uploads to succeed.
 */
import { db, storage } from '../firebase.js'
import {
  collection, doc, addDoc, updateDoc, getDocs,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

const TEAM_ID        = 'team_main'
const COL            = () => collection(db, 'teams', TEAM_ID, 'peerChallenges')
const EXPIRY_MS      = 48 * 60 * 60 * 1000   // 48 hours
const UPLOAD_MS      = 60_000                  // 60-second timeout for mobile networks
const MAX_FILE_BYTES = 15 * 1024 * 1024       // 15 MB

// Races a promise against a timeout; rejects with a tagged error on expiry.
function withUploadTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('UPLOAD_TIMEOUT')), UPLOAD_MS)
    ),
  ])
}

// Fire-and-forget audio helper — never blocks the upload promise chain.
function playSfxAsync(url) {
  try {
    const a = new Audio(url)
    a.volume = 0.5
    a.play().catch(() => {})
  } catch {}
}

// ── Video upload — direct client-side resumable upload with progress ──────────
export async function uploadChallengeVideo(file, challengeId, role, onProgress) {
  if (file.size > MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE')

  const ext     = file.name.split('.').pop() || 'mp4'
  const path    = `peerChallenges/${challengeId}/${role}.${ext}`
  const fileRef = ref(storage, path)

  // uploadBytesResumable streams directly from the browser to Storage,
  // bypassing any serverless function timeout. It also exposes byte-level progress.
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
export async function createChallenge({
  challengerId, challengerName,
  receiverId,   receiverName,
  zone, challengerHits, videoUrl,
}) {
  const now  = Date.now()
  const data = {
    challengerId, challengerName,
    receiverId,   receiverName,
    zone,
    challengerHits,
    challengerVideo: videoUrl,
    status:          'pending',
    receiverHits:    null,
    receiverVideo:   null,
    winnerId:        null,
    createdAt:       now,
    expiresAt:       now + EXPIRY_MS,
    respondedAt:     null,
  }
  const docRef = await addDoc(COL(), data)
  return { id: docRef.id, ...data }
}

// ── Respond ───────────────────────────────────────────────────────────────────
export async function respondToChallenge(challenge, receiverHits, videoUrl) {
  const winnerId = receiverHits >= challenge.challengerHits
    ? challenge.receiverId
    : challenge.challengerId

  await updateDoc(doc(db, 'teams', TEAM_ID, 'peerChallenges', challenge.id), {
    receiverHits,
    receiverVideo: videoUrl,
    winnerId,
    status:        'completed',
    respondedAt:   Date.now(),
  })

  return { ...challenge, receiverHits, receiverVideo: videoUrl, winnerId, status: 'completed' }
}

// ── Load ──────────────────────────────────────────────────────────────────────
export async function loadChallengesForPlayer(playerId) {
  try {
    const snap = await getDocs(COL())
    const cutoff = Date.now() - 24 * 60 * 60 * 1000   // keep 24 h past expiry for results
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c =>
        (c.challengerId === playerId || c.receiverId === playerId) &&
        c.expiresAt > cutoff
      )
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch (err) {
    console.warn('[PeerChallenge] load failed:', err.message)
    return []
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function formatCountdown(expiresAt) {
  const ms   = Math.max(0, expiresAt - Date.now())
  if (ms === 0) return 'EXPIRED'
  const h    = Math.floor(ms / 3_600_000)
  const m    = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}H ${m}M REMAINING`
}
