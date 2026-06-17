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
// firebase/storage SDK no longer needed for uploads — backend issues signed URLs,
// XHR PUTs directly to GCS, bypassing Firebase SDK CORS entirely.

const TEAM_ID        = 'team_main'
const COL            = () => collection(db, 'teams', TEAM_ID, 'peerChallenges')
const EXPIRY_MS      = 48 * 60 * 60 * 1000
const MAX_FILE_BYTES = 15 * 1024 * 1024

function playSfxAsync(url) {
  try { new Audio(url).play().catch(() => {}) } catch {}
}

// ── Video upload ──────────────────────────────────────────────────────────────
// Two-phase approach:
//   Phase 1 — fetch() to /api/upload-url  → backend signs a GCS URL (no CORS issue,
//             happens before the progress bar appears)
//   Phase 2 — XHR PUT to that signed URL → xhr.upload.onprogress fires on every
//             packet, giving true 0→100% progress. GCS signed URLs are pre-authorized
//             so no preflight block occurs.
export async function uploadChallengeVideo(file, challengeId, role, onProgress) {
  if (file.size > MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE')

  const ext         = file.name.split('.').pop() || 'mp4'
  const storagePath = `peerChallenges/${challengeId}/${role}.${ext}`
  const contentType = file.type || 'video/mp4'
  const bucket      = storage.app.options.storageBucket
  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media`

  // ── Phase 1: Acquire signed URL from backend (before UI shows progress) ───
  let signedUrl
  try {
    const resp = await fetch('/api/upload-url', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ storagePath, contentType }),
    })
    if (!resp.ok) {
      const text = await resp.text()
      console.error('[Upload] /api/upload-url returned', resp.status, text)
      throw new Error('UPLOAD_FAILED')
    }
    ;({ signedUrl } = await resp.json())
  } catch (err) {
    if (err.message === 'UPLOAD_FAILED') throw err
    console.error('[Upload] Could not reach /api/upload-url:', err)
    throw new Error('UPLOAD_FAILED')
  }

  // ── Phase 2: XHR PUT directly to signed GCS URL ───────────────────────────
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Real per-packet progress — no simulation needed, GCS signed URLs stream fine.
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round(e.loaded / e.total * 100))
      }
    }

    // 100% hard completion trigger — GCS status 200 means bucket confirmed receipt.
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        playSfxAsync('https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav')
        resolve(downloadUrl)
      } else {
        console.error('[Upload] Signed PUT failed:', xhr.status, xhr.statusText, xhr.responseText)
        reject(new Error('UPLOAD_FAILED'))
      }
    }

    xhr.onerror   = () => { console.error('[Upload] XHR network error');        reject(new Error('UPLOAD_FAILED'))  }
    xhr.ontimeout = () => { console.error('[Upload] XHR timed out after 60s');  reject(new Error('UPLOAD_TIMEOUT')) }
    xhr.timeout   = 60_000

    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('Content-Type', contentType)  // must match what the backend signed
    xhr.send(file)                                       // raw File blob — NOT FormData
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
