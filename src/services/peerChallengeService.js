/**
 * Peer Challenge Service
 * Firestore: teams/team_main/peerChallenges/{id}
 * Storage:   Vercel Blob (peerChallenges/{challengeId}/{role}.{ext})
 */
import { db } from '../firebase.js'
import {
  collection, doc, getDoc, addDoc, updateDoc, getDocs, runTransaction, writeBatch,
} from 'firebase/firestore'
import { calculateNewRatings } from '../utils/elo.js'
import { upload } from '@vercel/blob/client'

const TEAM_ID           = 'team_main'
const COL               = () => collection(db, 'teams', TEAM_ID, 'peerChallenges')
const EXPIRY_MS         = 48 * 60 * 60 * 1000           // 48 h — unranked
const RANKED_EXPIRY_MS  = 5  * 24 * 60 * 60 * 1000      // 5 days — ranked
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
    expiresAt:        now + (matchType === 'ranked' ? RANKED_EXPIRY_MS : EXPIRY_MS),
    respondedAt:      null,
    seenByOpponent:   false,     // cleared to true when receiver opens the Versus tab
  }
  const docRef = await addDoc(COL(), data)
  return { id: docRef.id, ...data }
}

// ── Respond ───────────────────────────────────────────────────────────────────
export async function respondToChallenge(challenge, receiverHits, videoUrl) {
  // Detect tie: both players scored the same number of hits
  const isTie = receiverHits === challenge.challengerHits
  const winnerId = isTie ? null : (
    receiverHits > challenge.challengerHits
      ? challenge.receiverId
      : challenge.challengerId
  )

  await updateDoc(doc(db, 'teams', TEAM_ID, 'peerChallenges', challenge.id), {
    receiverHits,
    receiverVideo:  videoUrl,
    winnerId,
    isTie,
    status:         'completed',
    respondedAt:    Date.now(),
    eloProcessed:   false,   // ELO transaction will flip this to true atomically
  })

  // Atomic transaction: update ELO + totalWins for both players simultaneously.
  // Ties: outcome=0.5 for both players, no one gets a win, minimal ELO change.
  // Skipped entirely for unranked matches — ELO stays frozen, wins still counted.
  const isRanked = challenge.matchType !== 'unranked'
  let eloResult  = isRanked ? null : { unranked: true }

  if (isRanked) {
    try {
      const teamRef      = doc(db, 'teams', TEAM_ID)
      const challengeRef = doc(db, 'teams', TEAM_ID, 'peerChallenges', challenge.id)
      await runTransaction(db, async (tx) => {
        // Always read both docs first — Firestore requires all reads before writes in a transaction.
        const [teamDoc, challengeDoc] = await Promise.all([
          tx.get(teamRef),
          tx.get(challengeRef),
        ])
        if (!teamDoc.exists()) return

        // Per-match idempotency guard — prevents double ELO application if the
        // receiver's device retries or the snapshot listener fires a second time.
        if (challengeDoc.exists() && challengeDoc.data()?.eloProcessed) {
          console.log(`[ELO] Already processed for challenge ${challenge.id} — skipping`)
          return
        }

        const players    = teamDoc.data().players || []
        const challenger = players.find(p => p.id === challenge.challengerId)
        const receiver   = players.find(p => p.id === challenge.receiverId)
        if (!challenger || !receiver) {
          console.warn(`[ELO] Player not found in team doc. challengerId=${challenge.challengerId} receiverId=${challenge.receiverId}. players=[${players.map(p=>p.id).join(',')}]`)
          return
        }

        const ratingC     = challenger.elo ?? 1000
        const ratingR     = receiver.elo   ?? 1000

        // Tie: outcome=0.5 for both players (no ELO swing for draws)
        // Win: outcome=1 for challenger, 0 for receiver
        const outcome     = isTie ? 0.5 : (winnerId === challenge.challengerId ? 1 : 0)

        // Pass winner's active streak for Daily Heat multiplier (no boost for ties)
        const winnerStreak = isTie ? 0 : (winnerId === challenge.challengerId ? challenger.streakCount || 0 : receiver.streakCount || 0)

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
          isTie,
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
                // Ties don't count as wins; winnerId is null on ties
                totalWins:      (p.totalWins || 0) + (winnerId && winnerId === p.id ? 1 : 0),
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
                totalWins:      (p.totalWins || 0) + (winnerId && winnerId === p.id ? 1 : 0),
                // Consume shield atomically — cannot be saved by closing the app
                hasEloShield:   false,
              }
            }
            return p
          }),
        })

        // Write eloProcessed flag + per-player deltas to the challenge doc in the
        // same transaction so the challenger's device can read these from the
        // peerChallenges snapshot without waiting for the team-doc snapshot.
        tx.update(challengeRef, {
          eloProcessed:      true,
          challengerEloDelta: finalDeltaA,
          receiverEloDelta:   finalDeltaB,
          eloTimestamp:       now,
        })
      })
    } catch (err) {
      console.error('[respondToChallenge] ELO transaction failed:', err)
    }
  } else {
    // Unranked: still credit totalWins so career stats stay accurate
    // Ties don't count as wins; winnerId is null on ties
    try {
      const teamRef = doc(db, 'teams', TEAM_ID)
      await runTransaction(db, async (tx) => {
        const teamDoc = await tx.get(teamRef)
        if (!teamDoc.exists()) return
        const players = teamDoc.data().players || []
        tx.update(teamRef, {
          players: players.map(p => {
            if (p.id === challenge.challengerId || p.id === challenge.receiverId) {
              return { ...p, totalWins: (p.totalWins || 0) + (winnerId && winnerId === p.id ? 1 : 0) }
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

// ── Claim tie rewards (idempotent, per-role) ──────────────────────────────────
// Both players in a tie earn diamonds/XP.  Two independent Firestore flags gate
// each side so that both can claim without blocking each other, yet neither can
// double-claim across sessions or devices.
//
// role: 'challenger' | 'receiver'
export async function claimChallengeTieReward(challengeId, role) {
  const field = role === 'challenger' ? 'challengerTieRewardClaimed' : 'receiverTieRewardClaimed'
  const ref   = doc(COL(), challengeId)
  let granted = false

  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return
      if (snap.data()[field]) return   // already claimed on another device/session
      tx.update(ref, { [field]: true })
      granted = true
    })
  } catch (err) {
    console.error('[claimChallengeTieReward] transaction failed:', err.message)
  }

  return granted
}

// ── Claim loser consolation rewards (idempotent) ──────────────────────────────
// Mirrors claimChallengeWinReward exactly but for the losing side.
// Without this, a loser could refresh the page within the 30-minute defeat
// window and collect the 1 💎 / 2 XP consolation on every page load — the
// in-memory seenDefeatIds Set resets on every login so it provides zero
// cross-session protection.
export async function claimChallengeLoserReward(challengeId) {
  const ref = doc(COL(), challengeId)
  let granted = false

  try {
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return
      if (snap.data().loserRewardsClaimed) return   // already claimed on another device/session
      tx.update(ref, { loserRewardsClaimed: true })
      granted = true
    })
  } catch (err) {
    console.error('[claimChallengeLoserReward] transaction failed:', err.message)
  }

  return granted
}

// ── Fresh ELO sync ────────────────────────────────────────────────────────────
// Point-in-time read of the team doc's players array.  Used by the win/defeat
// detection effects to bypass the snapshot rate-limiter and ensure the challenger
// (who never called respondToChallenge) sees updated ELO immediately.
export async function fetchFreshTeamPlayers() {
  try {
    const snap = await getDoc(doc(db, 'teams', TEAM_ID))
    return snap.exists() ? (snap.data().players || []) : []
  } catch (err) {
    console.warn('[fetchFreshTeamPlayers] read failed:', err.message)
    return []
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// ── Ranked challenge expiration auto-resolution ───────────────────────────────
// Called lazily on-the-fly when the player loads their match list.
// Only processes ranked challenges that are still pending past their expiresAt.
// Challenger wins by forfeit; receiver loses. ELO adjusts accordingly.
// Idempotent: expirationResolutionProcessed flag prevents double-processing.
export async function resolveExpiredChallenge(challenge) {
  if (challenge.matchType !== 'ranked')            return null
  if (challenge.status    !== 'pending')            return null
  if (Date.now() <= challenge.expiresAt)           return null
  if (challenge.expirationResolutionProcessed)     return null

  const teamRef      = doc(db, 'teams', TEAM_ID)
  const challengeRef = doc(db, 'teams', TEAM_ID, 'peerChallenges', challenge.id)
  let eloResult = null

  try {
    await runTransaction(db, async tx => {
      const [teamSnap, challengeSnap] = await Promise.all([
        tx.get(teamRef),
        tx.get(challengeRef),
      ])
      if (!teamSnap.exists() || !challengeSnap.exists()) return

      // Idempotency guard inside the transaction (handles concurrent device opens)
      const cData = challengeSnap.data()
      if (cData.status !== 'pending')              return
      if (cData.expirationResolutionProcessed)     return

      const players    = teamSnap.data().players || []
      const challenger = players.find(p => p.id === challenge.challengerId)
      const receiver   = players.find(p => p.id === challenge.receiverId)
      if (!challenger || !receiver) return

      const ratingC = challenger.elo ?? 1000
      const ratingR = receiver.elo   ?? 1000

      // Forfeit: challenger wins (outcome=1), no streak bonus
      const { deltaA, deltaB } = calculateNewRatings(ratingC, ratingR, 1, 0)

      // Shield absorbs the loss for the receiver only; winner is unaffected
      const receiverHadShield = receiver.hasEloShield || false
      const finalDeltaA = deltaA
      const finalDeltaB = receiverHadShield ? 0 : deltaB

      const now = Date.now()
      eloResult = {
        challengerDelta:    finalDeltaA,
        receiverDelta:      finalDeltaB,
        receiverShieldSaved: receiverHadShield,
        forfeit:            true,
      }

      tx.update(teamRef, {
        players: players.map(p => {
          if (p.id === challenge.challengerId) return {
            ...p,
            elo:            ratingC + finalDeltaA,
            eloLastDelta:   finalDeltaA,
            eloLastUpdated: now,
            totalWins:      (p.totalWins || 0) + 1,
            hasEloShield:   false,
          }
          if (p.id === challenge.receiverId) return {
            ...p,
            elo:            ratingR + finalDeltaB,
            eloLastDelta:   finalDeltaB,
            eloLastUpdated: now,
            hasEloShield:   false,
          }
          return p
        }),
      })

      // Mark challenge completed — existing victory/defeat effects in useMatchResults
      // will fire on the next snapshot and handle winnerRewardsClaimed + local state.
      tx.update(challengeRef, {
        status:                        'completed',
        winnerId:                      challenge.challengerId,
        isTie:                         false,
        respondedAt:                   now,
        expirationVictory:             true,   // flag for contextual UI
        expirationResolutionProcessed: true,   // idempotency lock
        eloProcessed:                  true,
        challengerEloDelta:            finalDeltaA,
        receiverEloDelta:              finalDeltaB,
        eloTimestamp:                  now,
      })
    })
  } catch (err) {
    console.error('[resolveExpiredChallenge] transaction failed:', err.message)
    return null
  }

  return eloResult
}

// ── Countdown helpers ─────────────────────────────────────────────────────────

/** Human-readable countdown for ranked 5-day window: "3 days, 14h" or "8h remaining" */
export function formatRankedCountdown(expiresAt) {
  const ms = Math.max(0, expiresAt - Date.now())
  if (ms === 0) return 'EXPIRED'
  const totalHours = Math.floor(ms / 3_600_000)
  const days       = Math.floor(totalHours / 24)
  const hours      = totalHours % 24
  if (days > 0) return `${days}d ${hours}h remaining`
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`
}

export function formatCountdown(expiresAt) {
  const ms   = Math.max(0, expiresAt - Date.now())
  if (ms === 0) return 'EXPIRED'
  const h    = Math.floor(ms / 3_600_000)
  const m    = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}H ${m}M REMAINING`
}
