/**
 * Peer Challenge Service
 * Firestore: teams/team_main/peerChallenges/{id}
 * Storage:   Vercel Blob (peerChallenges/{challengeId}/{role}.{ext})
 */
import { db } from '../firebase.js'
import {
  collection, doc, addDoc, updateDoc, getDocs, runTransaction,
} from 'firebase/firestore'
import { calculateNewRatings } from '../utils/elo.js'
import { upload } from '@vercel/blob/client'

const TEAM_ID        = 'team_main'
const COL            = () => collection(db, 'teams', TEAM_ID, 'peerChallenges')
const EXPIRY_MS      = 48 * 60 * 60 * 1000
const MAX_FILE_BYTES = 15 * 1024 * 1024

function playSfxAsync(url) {
  try { new Audio(url).play().catch(() => {}) } catch {}
}

// ── Video upload ──────────────────────────────────────────────────────────────
// Vercel Blob client upload — no Firebase Storage, no CORS preflight blocks.
// onUploadProgress fires on every packet: { loaded, total, percentage (0–100) }
export async function uploadChallengeVideo(file, challengeId, role, onProgress) {
  if (file.size > MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE')

  const ext      = file.name.split('.').pop() || 'mp4'
  const pathname = `peerChallenges/${challengeId}/${role}.${ext}`

  try {
    const blob = await upload(pathname, file, {
      access:          'public',
      handleUploadUrl: '/api/avatar/upload',
      onUploadProgress: ({ percentage }) => {
        onProgress?.(Math.round(percentage))
      },
    })

    // blob.url is the permanent Vercel Blob CDN URL — no manual construction needed.
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

  // Atomic transaction: update ELO + totalWins for both players simultaneously.
  // outcome is always from the challenger's perspective (1 = challenger won).
  let eloResult = null
  try {
    const teamRef = doc(db, 'teams', TEAM_ID)
    await runTransaction(db, async (tx) => {
      const teamDoc = await tx.get(teamRef)
      if (!teamDoc.exists()) return

      const players    = teamDoc.data().players || []
      const challenger = players.find(p => p.id === challenge.challengerId)
      const receiver   = players.find(p => p.id === challenge.receiverId)
      if (!challenger || !receiver) return

      const ratingC     = challenger.elo ?? 1000
      const ratingR     = receiver.elo   ?? 1000
      const outcome     = winnerId === challenge.challengerId ? 1 : 0

      // Pass winner's active streak for Daily Heat multiplier
      const winner       = winnerId === challenge.challengerId ? challenger : receiver
      const winnerStreak = winner.streakCount || winner.streak || 0

      const eloCalc = calculateNewRatings(ratingC, ratingR, outcome, winnerStreak)
      const { deltaA, deltaB } = eloCalc

      // ── ELO Shield — read BEFORE any writes (inside transaction read phase) ──
      // Consumption is unconditional: the shield is expended whether the player
      // wins or loses. Zeroing happens only if the shielded player lost.
      const receiverHadShield   = receiver.hasEloShield   || false
      const challengerHadShield = challenger.hasEloShield || false
      const loserIsReceiver     = winnerId === challenge.challengerId

      // Apply shield: zero out the losing side's delta only
      const finalDeltaA = (!loserIsReceiver && challengerHadShield) ? 0 : deltaA
      const finalDeltaB = (loserIsReceiver  && receiverHadShield)   ? 0 : deltaB

      // Store breakdown for the victory screen + local state sync
      eloResult = {
        receiverDelta:           finalDeltaB,
        challengerDelta:         finalDeltaA,   // needed for instant local state sync
        baseDelta:               eloCalc.baseDelta,
        streakBonus:             eloCalc.streakBonus,
        streakBonusPct:          eloCalc.streakBonusPct,
        streakDays:              eloCalc.streakDays,
        won:                     winnerId === challenge.receiverId,
        // Shield metadata for the end-screen UI
        receiverShieldSaved:     loserIsReceiver && receiverHadShield,
        receiverShieldConsumed:  receiverHadShield,
        shieldBaseLoss:          loserIsReceiver ? deltaB : 0,
      }

      const now = Date.now()
      tx.update(teamRef, {
        players: players.map(p => {
          if (p.id === challenge.challengerId) {
            return {
              ...p,
              elo:            ratingC + finalDeltaA,
              eloLastDelta:   finalDeltaA,
              eloLastUpdated: now,
              totalWins:      (p.totalWins || 0) + (winnerId === p.id ? 1 : 0),
              // Consume shield atomically — cannot be saved by closing the app
              hasEloShield:   false,
            }
          }
          if (p.id === challenge.receiverId) {
            return {
              ...p,
              elo:            ratingR + finalDeltaB,
              eloLastDelta:   finalDeltaB,
              eloLastUpdated: now,
              totalWins:      (p.totalWins || 0) + (winnerId === p.id ? 1 : 0),
              // Consume shield atomically — cannot be saved by closing the app
              hasEloShield:   false,
            }
          }
          return p
        }),
      })
    })
  } catch (err) {
    console.error('[respondToChallenge] ELO transaction failed:', err)
  }

  return {
    ...challenge,
    receiverHits,
    receiverVideo: videoUrl,
    winnerId,
    status: 'completed',
    eloResult,   // breakdown for the victory screen
  }
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
