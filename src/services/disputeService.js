/**
 * Match Dispute Service
 *
 * Covers both Versus (peerChallenges) and PUCK (puckGames) match types.
 * Firestore paths:
 *   teams/team_main/peerChallenges/{id}
 *   teams/team_main/puckGames/{id}
 *
 * Status lifecycle:
 *   Versus:   pending → completed → disputed → completed (coach-resolved)
 *   PUCK:     active  → p1_wins / p2_wins → disputed → p1_wins / p2_wins (coach-resolved)
 *
 * ELO correction strategy:
 *   On resolution, the service reads current ELO from Firestore, subtracts the
 *   originally applied deltas (stored in eloResult) to reconstruct pre-match ELO,
 *   recalculates with the correct winner, then writes the corrected absolute values.
 */
import { db }         from '../firebase.js'
import {
  doc, collection, updateDoc, getDocs, runTransaction,
} from 'firebase/firestore'
import { calculateNewRatings } from '../utils/elo.js'

const TEAM_ID = 'team_main'
const teamRef       = () => doc(db, 'teams', TEAM_ID)
const challengeRef  = id => doc(db, 'teams', TEAM_ID, 'peerChallenges', id)
const puckRef       = id => doc(db, 'teams', TEAM_ID, 'puckGames',      id)

// ── File a dispute ────────────────────────────────────────────────────────────

export async function disputeChallenge(challenge, disputedBy) {
  await updateDoc(challengeRef(challenge.id), {
    status:      'disputed',
    disputeData: {
      disputedBy,
      originalStatus:   challenge.status,
      originalWinnerId: challenge.winnerId ?? null,
      timestamp:        Date.now(),
      resolvedBy:       null,
      resolvedAt:       null,
    },
  })
}

export async function disputePuckGame(game, disputedBy) {
  const originalWinnerId =
    game.status === 'p1_wins' ? game.p1Id :
    game.status === 'p2_wins' ? game.p2Id : null

  await updateDoc(puckRef(game.id), {
    status:      'disputed',
    disputeData: {
      disputedBy,
      originalStatus:   game.status,
      originalWinnerId,
      timestamp:        Date.now(),
      resolvedBy:       null,
      resolvedAt:       null,
    },
  })
}

// ── Load all disputed matches for the Coach Review panel ─────────────────────

export async function loadDisputedMatches() {
  const [cSnap, gSnap] = await Promise.all([
    getDocs(collection(db, 'teams', TEAM_ID, 'peerChallenges')),
    getDocs(collection(db, 'teams', TEAM_ID, 'puckGames')),
  ])

  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000   // show disputes up to 14 days old

  const challenges = cSnap.docs
    .map(d => ({ id: d.id, type: 'versus', ...d.data() }))
    .filter(c => c.status === 'disputed' && (c.disputeData?.timestamp ?? 0) > cutoff)

  const games = gSnap.docs
    .map(d => ({ id: d.id, type: 'puck', ...d.data() }))
    .filter(g => g.status === 'disputed' && (g.disputeData?.timestamp ?? 0) > cutoff)

  return [...challenges, ...games]
    .sort((a, b) => (b.disputeData?.timestamp ?? 0) - (a.disputeData?.timestamp ?? 0))
}

// ── Resolve a disputed Versus challenge ───────────────────────────────────────

export async function resolveDisputedChallenge(challenge, winnerId, coachName) {
  const now = Date.now()

  // Mark the challenge doc as resolved
  await updateDoc(challengeRef(challenge.id), {
    status:                      'completed',
    winnerId,
    'disputeData.resolvedBy':    coachName,
    'disputeData.resolvedAt':    now,
  })

  // No ELO correction for unranked matches
  if (challenge.matchType === 'unranked') return

  const origCDelta = challenge.eloResult?.challengerDelta ?? 0
  const origRDelta = challenge.eloResult?.receiverDelta   ?? 0
  const origWinner = challenge.disputeData?.originalWinnerId ?? challenge.winnerId

  await runTransaction(db, async tx => {
    const snap = await tx.get(teamRef())
    if (!snap.exists()) return
    const players    = snap.data().players || []
    const challenger = players.find(p => p.id === challenge.challengerId)
    const receiver   = players.find(p => p.id === challenge.receiverId)
    if (!challenger || !receiver) return

    // Reconstruct pre-match ELO by undoing the originally applied deltas
    const eloC = (challenger.elo ?? 1000) - origCDelta
    const eloR = (receiver.elo   ?? 1000) - origRDelta

    // Recalculate ELO for the correct winner
    const outcome            = winnerId === challenge.challengerId ? 1 : 0
    const { deltaA, deltaB } = calculateNewRatings(eloC, eloR, outcome)

    // Win-count correction: reverse the wrong credit, apply the right one
    const winnerChanged = origWinner !== winnerId
    tx.update(teamRef(), {
      players: players.map(p => {
        if (p.id === challenge.challengerId) {
          return {
            ...p,
            elo:            eloC + deltaA,
            eloLastDelta:   deltaA,
            eloLastUpdated: now,
            totalWins: Math.max(0, (p.totalWins || 0)
              + (winnerChanged && winnerId    === p.id ? 1 : 0)
              + (winnerChanged && origWinner  === p.id ? -1 : 0)),
          }
        }
        if (p.id === challenge.receiverId) {
          return {
            ...p,
            elo:            eloR + deltaB,
            eloLastDelta:   deltaB,
            eloLastUpdated: now,
            totalWins: Math.max(0, (p.totalWins || 0)
              + (winnerChanged && winnerId    === p.id ? 1 : 0)
              + (winnerChanged && origWinner  === p.id ? -1 : 0)),
          }
        }
        return p
      }),
    })
  })
}

// ── Resolve a disputed PUCK game ──────────────────────────────────────────────

export async function resolveDisputedPuckGame(game, winnerId, coachName) {
  const now       = Date.now()
  const newStatus = winnerId === game.p1Id ? 'p1_wins' : 'p2_wins'
  const origWinner = game.disputeData?.originalWinnerId ?? null

  await updateDoc(puckRef(game.id), {
    status:                   newStatus,
    'disputeData.resolvedBy': coachName,
    'disputeData.resolvedAt': now,
  })

  const origP1Delta = game.eloResult?.p1Delta ?? 0
  const origP2Delta = game.eloResult?.p2Delta ?? 0

  await runTransaction(db, async tx => {
    const snap = await tx.get(teamRef())
    if (!snap.exists()) return
    const players = snap.data().players || []
    const p1      = players.find(p => p.id === game.p1Id)
    const p2      = players.find(p => p.id === game.p2Id)
    if (!p1 || !p2) return

    // Reconstruct pre-match ELO
    const eloP1 = (p1.elo ?? 1600) - origP1Delta
    const eloP2 = (p2.elo ?? 1600) - origP2Delta

    const isP1Winner             = winnerId === game.p1Id
    const { deltaA, deltaB }     = calculateNewRatings(
      isP1Winner ? eloP1 : eloP2,
      isP1Winner ? eloP2 : eloP1,
      1,
    )
    const newP1Delta = isP1Winner ? deltaA : deltaB
    const newP2Delta = isP1Winner ? deltaB : deltaA
    const winnerChanged = origWinner !== winnerId

    tx.update(teamRef(), {
      players: players.map(p => {
        if (p.id === game.p1Id) {
          return {
            ...p,
            elo:            eloP1 + newP1Delta,
            eloLastDelta:   newP1Delta,
            eloLastUpdated: now,
            totalWins: Math.max(0, (p.totalWins || 0)
              + (winnerChanged && winnerId   === p.id ? 1 : 0)
              + (winnerChanged && origWinner === p.id ? -1 : 0)),
          }
        }
        if (p.id === game.p2Id) {
          return {
            ...p,
            elo:            eloP2 + newP2Delta,
            eloLastDelta:   newP2Delta,
            eloLastUpdated: now,
            totalWins: Math.max(0, (p.totalWins || 0)
              + (winnerChanged && winnerId   === p.id ? 1 : 0)
              + (winnerChanged && origWinner === p.id ? -1 : 0)),
          }
        }
        return p
      }),
    })
  })
}
