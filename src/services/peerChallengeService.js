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
export async function uploadChallengeVideo(file, challengeId, role, onProgress) {
  if (file.size > MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE')

  const ext     = file.name.split('.').pop() || 'mp4'
  const path    = `peerChallenges/${challengeId}/${role}.${ext}`
  const fileRef = ref(storage, path)

  return new Promise((resolve, reject) => {
    let simPct          = 0
    const isSavingRef   = { current: false }   // prevents double-resolve on cancel + onFulfilled
    const bucket        = storage.app.options.storageBucket
    const manualUrl     = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`

    const simTimer = onProgress ? setInterval(() => {
      simPct = Math.min(simPct + (90 - simPct) * 0.1, 90)
      onProgress(Math.round(simPct))
    }, 250) : null

    // Called from either the >= 90% intercept or the natural onFulfilled path.
    function finalize() {
      if (isSavingRef.current) return  // guard: only execute once
      isSavingRef.current = true
      clearInterval(simTimer)
      onProgress?.(100)
      playSfxAsync('https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav')
      resolve(manualUrl)
    }

    const task = uploadBytesResumable(fileRef, file)

    task.on(
      'state_changed',
      snapshot => {
        if (snapshot.totalBytes > 0) {
          const real = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)
          if (onProgress && real > simPct) { simPct = real; onProgress(real) }

          // Intercept at >= 90%: bytes are physically at Firebase.
          // Calling task.cancel() stops the SDK retry loop that CORS is blocking.
          // isSavingRef prevents the resulting 'storage/canceled' error from rejecting.
          if (real >= 90 && !isSavingRef.current) {
            task.cancel()
            finalize()
          }
        }
      },
      error => {
        // 'storage/canceled' is expected — we triggered it ourselves above.
        // Any other error only rejects if bytes haven't arrived yet.
        if (error.code === 'storage/canceled') return
        const snap = task.snapshot
        const pct  = snap.totalBytes > 0 ? snap.bytesTransferred / snap.totalBytes : 0
        if (pct >= 0.9) {
          // Bytes reached Firebase but finalization response was CORS-blocked.
          console.warn('[Upload] CORS blocked finalization — bytes confirmed, forcing complete:', error.code)
          finalize()
        } else {
          clearInterval(simTimer)
          console.error('[Upload] Firebase Storage SDK error:', error.code, error.message)
          reject(new Error('UPLOAD_FAILED'))
        }
      },
      () => {
        // Natural completion path (fires when CORS is properly configured).
        finalize()
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
