import { db } from '../firebase.js'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, runTransaction } from 'firebase/firestore'

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
// When activePlayerId is provided (player session end), a transaction reads the
// current server players array and merges in only the active player's object so
// concurrent coach edits (diamonds, ELO, coachMsg) are never clobbered by an
// outdated local state snapshot.
//
// When activePlayerId is omitted (coach portal, career reset, etc.) the full
// players array is written — this is intentional for those flows.
export async function saveToFirestore(state, techniqueByPlayer = {}, activePlayerId = null) {
  try {
    const { sessions = [], ...rest } = state

    if (activePlayerId) {
      // ── Transaction-merge: update only the active player's doc entry ──────
      const localPlayer = rest.players?.find(p => p.id === activePlayerId)
      await runTransaction(db, async tx => {
        const ref          = teamDoc()
        const snap         = await tx.get(ref)
        const serverPlayers = snap.exists() ? (snap.data().players ?? []) : []
        const serverPlayer  = serverPlayers.find(p => p.id === activePlayerId)

        let updatedPlayers = serverPlayers
        if (localPlayer) {
          const merged = serverPlayer ? {
            ...localPlayer,
            // Coach-authoritative or game-engine fields: never let a stale local
            // copy roll back a value that the server legitimately advanced.
            diamonds:       Math.max(localPlayer.diamonds    ?? 0, serverPlayer.diamonds    ?? 0),
            elo:            serverPlayer.elo            ?? localPlayer.elo,
            eloLastDelta:   serverPlayer.eloLastDelta   ?? localPlayer.eloLastDelta,
            eloLastUpdated: serverPlayer.eloLastUpdated ?? localPlayer.eloLastUpdated,
            totalWins:      Math.max(localPlayer.totalWins   ?? 0, serverPlayer.totalWins   ?? 0),
            hasEloShield:   serverPlayer.hasEloShield   || localPlayer.hasEloShield,
            streakCount:    Math.max(localPlayer.streakCount ?? 0, serverPlayer.streakCount ?? 0),
            lastActivity:   Math.max(localPlayer.lastActivity ?? 0, serverPlayer.lastActivity ?? 0),
            // Badges: union of both sets so neither device loses a badge
            earnedBadges:   { ...(serverPlayer.earnedBadges ?? {}), ...(localPlayer.earnedBadges ?? {}) },
          } : localPlayer

          updatedPlayers = serverPlayers.some(p => p.id === activePlayerId)
            ? serverPlayers.map(p => p.id === activePlayerId ? merged : p)
            : [...serverPlayers, merged]
        }

        const techEntry = techniqueByPlayer[activePlayerId]
        if (snap.exists()) {
          // dot-notation key updates only this player's entry in the map
          tx.update(ref, {
            players: updatedPlayers,
            ...(techEntry !== undefined
              ? { [`techniqueByPlayer.${activePlayerId}`]: techEntry }
              : {}),
            lastUpdated: Date.now(),
          })
        } else {
          tx.set(ref, {
            players: updatedPlayers,
            techniqueByPlayer,
            lastUpdated: Date.now(),
          })
        }
      })
    } else {
      // ── Full-state write: coach portal, career reset, background sync ─────
      await setDoc(teamDoc(), {
        players:           rest.players           ?? [],
        dailyChallenge:    rest.dailyChallenge    ?? null,
        weeklyChallenge:   rest.weeklyChallenge   ?? null,
        h2h:               rest.h2h               ?? null,
        h2hHistory:        rest.h2hHistory        ?? [],
        techniqueByPlayer: techniqueByPlayer,
        lastUpdated:       Date.now(),
      }, { merge: true })
    }

    // Only write sessions that are both new (not in cache) AND have actual shot data.
    // Sessions with sets: [] are created the moment startSession() fires — writing
    // them immediately would cache the ID and block the final write (with real sets)
    // forever, since saveToFirestore skips IDs already in syncedSessionIds.
    const newSessions = sessions.filter(s =>
      !syncedSessionIds.has(s.id) && (s.sets?.length ?? 0) > 0
    )
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

// ── Force-write a single completed session ─────────────────────────────────────
// Called explicitly from endSession() to guarantee the final session (with all
// its sets) reaches Firestore regardless of syncedSessionIds cache state.
// This is the fix for the premature-empty-save race condition: the session ID
// enters syncedSessionIds at creation time (with sets: []), which would normally
// block every subsequent write.  This function bypasses the cache entirely.
export async function forceSessionSync(session) {
  if (!session?.id) return
  try {
    await setDoc(sessionDoc(session.id), session)
    syncedSessionIds.add(session.id)   // keep cache consistent
  } catch (err) {
    console.error('[Firestore] forceSessionSync failed — data safe in localStorage:', err.message)
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
