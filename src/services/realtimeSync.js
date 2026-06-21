/**
 * Real-time Firestore listeners.
 *
 * Each function returns the onSnapshot unsubscribe handle so callers can clean
 * up on unmount.  All errors are caught and logged — listeners never throw.
 */
import { db } from '../firebase.js'
import { doc, collection, onSnapshot } from 'firebase/firestore'

const TEAM_ID = 'team_main'

// ── Team document ─────────────────────────────────────────────────────────────
// Streams the teams/team_main document.  Callers receive the raw Firestore
// data object whenever players, ELO, diamonds, coachMsg, etc. change.
export function subscribeToTeam(onData) {
  return onSnapshot(
    doc(db, 'teams', TEAM_ID),
    snap => { if (snap.exists()) onData(snap.data()) },
    err  => console.warn('[realtimeSync] team listener error:', err.message)
  )
}

// ── Peer challenges ───────────────────────────────────────────────────────────
// Streams the full peerChallenges collection and filters client-side so the
// caller only sees challenges belonging to playerId.  Cutoff is recomputed on
// every snapshot so long-lived subscriptions stay accurate.
export function subscribeToChallenges(playerId, onData) {
  return onSnapshot(
    collection(db, 'teams', TEAM_ID, 'peerChallenges'),
    snap => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000
      onData(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c =>
            (c.challengerId === playerId || c.receiverId === playerId) &&
            c.expiresAt > cutoff
          )
          .sort((a, b) => b.createdAt - a.createdAt)
      )
    },
    err => console.warn('[realtimeSync] challenges listener error:', err.message)
  )
}

// ── PUCK games ────────────────────────────────────────────────────────────────
// Streams the full puckGames collection filtered to playerId's active/recent games.
export function subscribeToPuckGames(playerId, onData) {
  return onSnapshot(
    collection(db, 'teams', TEAM_ID, 'puckGames'),
    snap => {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
      onData(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(g =>
            (g.p1Id === playerId || g.p2Id === playerId) &&
            (g.status === 'active' || g.lastActivityAt > cutoff)
          )
          .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
      )
    },
    err => console.warn('[realtimeSync] puckGames listener error:', err.message)
  )
}
