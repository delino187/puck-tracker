/**
 * Peer Challenge Service
 * Firestore: teams/team_main/peerChallenges/{id}
 * Storage:   Vercel Blob (peerChallenges/{challengeId}/{role}.{ext})
 */
import { db } from '../firebase.js'
import {
  collection, doc, addDoc, updateDoc, getDocs, runTransaction, writeBatch,
} from 'firebase/firestore'
import { calculateNewRatings } from '../utils/elo.js'
import { upload } from '@vercel/blob/client'

const TEAM_ID        = 'team_main'
const COL            = () => collection(db, 'teams', TEAM_ID, 'peerChallenges')
const EXPIRY_MS      = 48 * 60 * 60 * 1000
const MAX_FILE_BYTES  = 150 * 1024 * 1024   // 150 MB — Vercel Blob client upload; no server body limit
export const WARN_FILE_BYTES = 25 * 1024 * 1024  // show amber warning above this threshold

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
  matchType = 'ranked',
  shotCount = 5,
}) {
  const now  = Date.now()
  const data = {
    challengerId, challengerName,
    receiverId,   receiverName,
    zone,
    challengerHits,
    challengerVideo: videoUrl,
    matchType,                   // 'ranked' | 'unranked'
    shotCount,                   // total shots per turn (3 or 5)
    status:           'pending',
    receiverHits:     null,
    receiverVideo:    null,
    winnerId:         null,
    createdAt:        now,
    expiresAt:        now + EXPIRY_MS,
    respondedAt:      null,
    seenByOpponent:   false,     // cleared to true when receiver opens the Versus tab
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
  // Skipped entirely for unranked matches — ELO stays frozen, wins still counted.
  const isRanked = challenge.matchType !== 'unranked'
  let eloResult  = isRanked ? null : { unranked: true }

  if (isRanked) {
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
  } else {
    // Unranked: still credit totalWins so career stats stay accurate
    try {
      const teamRef = doc(db, 'teams', TEAM_ID)
      await runTransaction(db, async (tx) => {
        const teamDoc = await tx.get(teamRef)
        if (!teamDoc.exists()) return
        const players = teamDoc.data().players || []
        tx.update(teamRef, {
          players: players.map(p => {
            if (p.id === challenge.challengerId || p.id === challenge.receiverId) {
              return { ...p, totalWins: (p.totalWins || 0) + (winnerId === p.id ? 1 : 0) }
            }
            return p
          }),
        })
      })
    } catch (err) {
      console.error('[respondToChallenge] unranked win-count transaction failed:', err)
    }
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

// ── Mark seen ─────────────────────────────────────────────────────────────────
// Called when the receiver opens the Versus tab.  Batch-writes seenByOpponent=true
// on every pending challenge addressed to them so the notification dot clears.
export async function markChallengesAsSeen(playerId, challenges) {
  const unseen = challenges.filter(
    c => c.receiverId === playerId && c.status === 'pending' && !c.seenByOpponent
  )
  if (unseen.length === 0) return

  const batch = writeBatch(db)
  unseen.forEach(c => {
    batch.update(doc(db, 'teams', TEAM_ID, 'peerChallenges', c.id), { seenByOpponent: true })
  })
  await batch.commit().catch(err =>
    console.warn('[PeerChallenge] markChallengesAsSeen batch failed:', err.message)
  )
}

// ── Claim win rewards (idempotent) ────────────────────────────────────────────
// Uses a Firestore transaction to atomically check + set winnerRewardsClaimed.
// Returns true if this call was the first to claim (rewards should be granted),
// or false if rewards were already claimed (player logged in on a second device
// or refreshed the page before the flag was written).
export async function claimChallengeWinReward(challengeId) {
  const ref = doc(COL(), challengeId)
  let granted = false

  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return
      if (snap.data().winnerRewardsClaimed) return   // already claimed on another device/session
      tx.update(ref, { winnerRewardsClaimed: true })
      granted = true
    })
  } catch (err) {
    console.error('[claimChallengeWinReward] transaction failed:', err.message)
  }

  return granted
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function formatCountdown(expiresAt) {
  const ms   = Math.max(0, expiresAt - Date.now())
  if (ms === 0) return 'EXPIRED'
  const h    = Math.floor(ms / 3_600_000)
  const m    = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}H ${m}M REMAINING`
}
