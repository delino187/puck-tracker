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
// No firebase/storage SDK needed for uploads — XHR hits the REST endpoint directly.

const TEAM_ID        = 'team_main'
const COL            = () => collection(db, 'teams', TEAM_ID, 'peerChallenges')
const EXPIRY_MS      = 48 * 60 * 60 * 1000
const XHR_TIMEOUT_MS = 60_000
const MAX_FILE_BYTES = 15 * 1024 * 1024

function playSfxAsync(url) {
  try { new Audio(url).play().catch(() => {}) } catch {}
}

/**
 * Direct XHR upload to Firebase Storage REST API.
 *
 * Why XHR instead of uploadBytesResumable:
 *   The Firebase SDK chunks files and only emits a state_changed event per chunk
 *   (~5 MB). For small videos the single chunk == the whole file, so the only
 *   progress event is 100% — the bar never moves. XHR's xhr.upload.onprogress
 *   fires on every packet boundary, giving real-time byte tracking.
 *
 * Upload URL is derived from storage.app.options.storageBucket before XHR starts
 * (the "presigned URL acquisition" step) so the progress animation only begins
 * once the binary push is actually underway.
 */
function xhrUpload(file, storagePath, bucket, onProgress) {
  // Step 1 — compute the endpoint (synchronous, no network) before touching XHR.
  const safeName  = encodeURIComponent(storagePath)
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${safeName}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Step 2 — wire progress listener BEFORE open/send so it catches every packet.
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round(e.loaded / e.total * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result  = JSON.parse(xhr.responseText)
          const token   = result.downloadTokens ?? ''
          const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${safeName}?alt=media`
          resolve(token ? `${baseUrl}&token=${token}` : baseUrl)
        } catch {
          reject(new Error('UPLOAD_FAILED'))
        }
      } else {
        reject(new Error('UPLOAD_FAILED'))
      }
    }

    xhr.onerror   = () => reject(new Error('UPLOAD_FAILED'))
    xhr.ontimeout = () => reject(new Error('UPLOAD_TIMEOUT'))
    xhr.timeout   = XHR_TIMEOUT_MS

    // Step 3 — open and send; progress events now fire as bytes leave the device.
    xhr.open('POST', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
    xhr.send(file)
  })
}

// ── Video upload ──────────────────────────────────────────────────────────────
export async function uploadChallengeVideo(file, challengeId, role, onProgress) {
  if (file.size > MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE')

  const ext    = file.name.split('.').pop() || 'mp4'
  const path   = `peerChallenges/${challengeId}/${role}.${ext}`
  const bucket = storage.app.options.storageBucket

  const url = await xhrUpload(file, path, bucket, onProgress)
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
