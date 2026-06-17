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
import { ref, uploadBytesResumable } from 'firebase/storage'

const TEAM_ID        = 'team_main'
const COL            = () => collection(db, 'teams', TEAM_ID, 'peerChallenges')
const EXPIRY_MS      = 48 * 60 * 60 * 1000
const MAX_FILE_BYTES = 15 * 1024 * 1024

function playSfxAsync(url) {
  try { new Audio(url).play().catch(() => {}) } catch {}
}

// ── Video upload ──────────────────────────────────────────────────────────────
// Uses the official Firebase SDK (uploadBytesResumable) which handles auth tokens,
// CORS, and retry logic internally — no raw XHR needed.
//
// Progress note: for files under ~5 MB the SDK sends a single chunk, so the only
// real state_changed event fires at 100%. A smooth simulation runs in parallel
// (capped at 90%) so the bar visually fills during the transfer. The completion
// callback (onFulfilled) drives it to 100% and holds loading state until
// getDownloadURL fully resolves.
export async function uploadChallengeVideo(file, challengeId, role, onProgress) {
  if (file.size > MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE')

  const ext      = file.name.split('.').pop() || 'mp4'
  const path     = `peerChallenges/${challengeId}/${role}.${ext}`
  const fileRef  = ref(storage, path)

  return new Promise((resolve, reject) => {
    // Smooth progress simulation — fills to ~90% while the SDK transfers bytes.
    // Real state_changed events override whenever they report a higher value.
    let simPct   = 0
    const simTimer = onProgress ? setInterval(() => {
      simPct = Math.min(simPct + (90 - simPct) * 0.1, 90)
      onProgress(Math.round(simPct))
    }, 250) : null

    const task = uploadBytesResumable(fileRef, file)

    task.on(
      'state_changed',
      snapshot => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const real = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)
          // Only update if the real value is ahead of the simulation.
          if (real > simPct) { simPct = real; onProgress(real) }
        }
      },
      error => {
        clearInterval(simTimer)
        console.error('[Upload] Firebase Storage SDK error:', error.code, error.message)
        reject(new Error(error.code === 'storage/canceled' ? 'UPLOAD_TIMEOUT' : 'UPLOAD_FAILED'))
      },
      () => {
        // Completion callback.
        // getDownloadURL triggers a second CORS preflight that Firebase blocks in some
        // configurations, so we build the download URL directly from the known path.
        // Format: /v0/b/{bucket}/o/{encodedPath}?alt=media
        // Firebase Storage security rules control read access; no token required when
        // rules allow `allow read: if true`.
        clearInterval(simTimer)
        onProgress?.(100)
        const bucket  = storage.app.options.storageBucket
        const url     = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`
        playSfxAsync('https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav')
        resolve(url)
      }
    )
  })
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
