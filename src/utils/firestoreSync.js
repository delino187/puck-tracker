import { db } from '../firebase.js'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'

// Single fixed team — one doc for team-level data, subcollection for sessions.
// Structure:
//   teams/team_main                    → players, challenges, h2h, h2hHistory
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

    return { ...teamSnap.data(), sessions }
  } catch (err) {
    console.warn('[Firestore] load failed:', err.message)
    return null
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
// Writes team-level fields to the team doc, then writes only NEW sessions.
// Fire-and-forget safe — all errors are caught internally.
export async function saveToFirestore(state) {
  try {
    const { sessions = [], ...rest } = state

    await setDoc(teamDoc(), {
      players:         rest.players         ?? [],
      dailyChallenge:  rest.dailyChallenge  ?? null,
      weeklyChallenge: rest.weeklyChallenge ?? null,
      h2h:             rest.h2h             ?? null,
      h2hHistory:      rest.h2hHistory      ?? [],
      lastUpdated:     Date.now(),
    })

    const newSessions = sessions.filter(s => !syncedSessionIds.has(s.id))
    await Promise.all(
      newSessions.map(s =>
        setDoc(sessionDoc(s.id), s).then(() => syncedSessionIds.add(s.id))
      )
    )
  } catch (err) {
    console.warn('[Firestore] save failed:', err.message)
  }
}
