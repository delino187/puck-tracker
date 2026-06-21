import { db } from '../firebase.js'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore'

// Single fixed team — one doc for team-level data, subcollection for sessions.
// Structure:
//   teams/team_main                    → players, challenges, h2h, h2hHistory, techniqueByPlayer
//   teams/team_main/sessions/{id}      → one doc per session (avoids 1 MB doc limit)

const TEAM_ID = 'team_main'

function teamDoc()         { return doc(db, 'teams', TEAM_ID) }
function sessionDoc(id)    { return doc(db, 'teams', TEAM_ID, 'sessions', id) }
function sessionsCol()     { return collection(db, 'teams', TEAM_ID, 'sessions') }

// In-memory set of session IDs already confirmed in Firestore.
// Populated on first load so subsequent saves only write NEW sessions.
const syncedSessionIds = new Set()

// ── Load ──────────────────────────────────────────────────────────────────────
// Returns merged state object on success, null on failure/missing.
// The returned object includes `techniqueByPlayer` so storage.js can hydrate
// the Zustand store — this is the only cross-device sync path for that data.
export async function loadFromFirestore() {
  try {
    const [teamSnap, sessionSnaps] = await Promise.all([
      getDoc(teamDoc()),
      getDocs(sessionsCol()),
    ])

    if (!teamSnap.exists()) return null

    const sessions = sessionSnaps.docs.map(d => {
      syncedSessionIds.add(d.id)
      return d.data()
    })

    // teamSnap.data() now includes techniqueByPlayer if it was ever saved.
    return { ...teamSnap.data(), sessions }
  } catch (err) {
    console.error('[Firestore] load failed — falling back to localStorage:', err.message)
    return null
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
// Writes team-level fields to the team doc using { merge: true } so concurrent
// writers (updateStreak transaction, ELO updates, etc.) don't clobber each other.
// techniqueByPlayer is passed in explicitly so cross-device sync works — it
// lives in Zustand/localStorage by default and would otherwise be lost on a new
// device or after clearing the browser cache.
export async function saveToFirestore(state, techniqueByPlayer = {}) {
  try {
    const { sessions = [], ...rest } = state

    // { merge: true } prevents overwriting fields written by other concurrent paths
    // (e.g. updateStreak's transaction writes streakCount/lastActivity).
    await setDoc(teamDoc(), {
      players:            rest.players            ?? [],
      dailyChallenge:     rest.dailyChallenge     ?? null,
      weeklyChallenge:    rest.weeklyChallenge    ?? null,
      h2h:                rest.h2h                ?? null,
      h2hHistory:         rest.h2hHistory         ?? [],
      techniqueByPlayer:  techniqueByPlayer,
      lastUpdated:        Date.now(),
    }, { merge: true })

    const newSessions = sessions.filter(s => !syncedSessionIds.has(s.id))
    await Promise.all(
      newSessions.map(s =>
        setDoc(sessionDoc(s.id), s).then(() => syncedSessionIds.add(s.id))
      )
    )
  } catch (err) {
    console.error(
      '[Firestore] save failed — data is safe in localStorage but Firestore is out of sync.',
      '\nPlayer count:', state.players?.length ?? 0,
      '\nSession count:', state.sessions?.length ?? 0,
      '\nError:', err.message,
    )
    throw err  // re-throw so callers can detect failure and surface it
  }
}

// ── Alpha-test career wipe ─────────────────────────────────────────────────────
// Deletes all session docs and peer-challenge docs belonging to a single player.
// Also clears those session IDs from the local sync cache so future saves work.
export async function deletePlayerData(playerId) {
  try {
    const peerChallengesCol = collection(db, 'teams', TEAM_ID, 'peerChallenges')

    const [sessionSnaps, pcQ1, pcQ2] = await Promise.all([
      getDocs(sessionsCol()),
      getDocs(query(peerChallengesCol, where('challengerId', '==', playerId))),
      getDocs(query(peerChallengesCol, where('receiverId',   '==', playerId))),
    ])

    const sessionDocs    = sessionSnaps.docs.filter(d => d.data().playerId === playerId)
    const challengeDocs  = [...pcQ1.docs, ...pcQ2.docs]

    await Promise.all([
      ...sessionDocs.map(d => { syncedSessionIds.delete(d.id); return deleteDoc(d.ref) }),
      ...challengeDocs.map(d => deleteDoc(d.ref)),
    ])
  } catch (err) {
    console.error('[Firestore] deletePlayerData failed:', err.message)
  }
}
