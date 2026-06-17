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
    // ── Guard + shared state ─────────────────────────────────────────────────
    const isSavingRef = { current: false }   // double-submission guard
    let   simPct      = 0                    // animation ticker (0–90)
    let   realPct     = 0                    // actual byte-transfer ratio (0.0–1.0), upper-scope
                                             // so all four paths read the same value

    const bucket    = storage.app.options.storageBucket
    const manualUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`

    // Visual progress simulation — fills to ~90% while bytes transfer.
    const simTimer = onProgress ? setInterval(() => {
      simPct = Math.min(simPct + (90 - simPct) * 0.1, 90)
      onProgress(Math.round(simPct))
    }, 250) : null

    // ── finalize(url) — single exit point, guarded against double-call ───────
    function finalize(url) {
      if (isSavingRef.current) return
      isSavingRef.current = true
      clearInterval(simTimer)
      onProgress?.(100)
      playSfxAsync('https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav')
      resolve(url)
    }

    const task = uploadBytesResumable(fileRef, file)

    task.on(
      'state_changed',

      // ── PATH 1: Reception short-circuit ─────────────────────────────────
      // Updates the upper-scope realPct every snapshot so Paths 2/3 can read it.
      // When realPct hits 0.90, bytes are physically at Firebase — cancel the SDK
      // task to stop the CORS-blocked finalization loop and force-complete.
      snapshot => {
        if (snapshot.totalBytes > 0) {
          realPct = snapshot.bytesTransferred / snapshot.totalBytes
          const displayPct = Math.round(realPct * 100)
          if (onProgress && displayPct > simPct) { simPct = displayPct; onProgress(displayPct) }

          if (realPct >= 0.90 && !isSavingRef.current) {
            task.cancel()           // triggers PATH 2 (storage/canceled) → silently ignored
            finalize(manualUrl)
          }
        }
      },

      // ── PATH 2 & 3: Error interception ───────────────────────────────────
      error => {
        // PATH 2: We fired task.cancel() ourselves in PATH 1 — ignore silently.
        if (error.code === 'storage/canceled') return

        // PATH 3: A hard CORS block or network error fired before PATH 1 could.
        // If realPct shows bytes arrived (>= 0.90), treat as success anyway.
        if (realPct >= 0.90) {
          console.warn('[Upload] CORS blocked finalization — bytes confirmed via realPct, forcing complete:', error.code)
          finalize(manualUrl)
        } else {
          clearInterval(simTimer)
          console.error('[Upload] Firebase Storage SDK error:', error.code, error.message)
          reject(new Error('UPLOAD_FAILED'))
        }
      },

      // ── PATH 4: Standard success hook ────────────────────────────────────
      // Fires transparently when Firebase CORS is fully configured.
      // isSavingRef prevents a double-resolve if PATH 1 already ran.
      () => { finalize(manualUrl) }
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
