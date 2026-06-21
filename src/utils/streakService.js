import { db } from '../firebase.js'
import { doc, runTransaction } from 'firebase/firestore'

const TEAM_ID = 'team_main'
const MS_24H  = 24 * 60 * 60 * 1000

/**
 * Increments streakCount if the player had activity within the last 24 hours,
 * or resets it to 1 if it has been longer.  Updates lastActivity to now.
 * Returns the new streakCount.
 *
 * Uses a Firestore transaction so the read-then-write is atomic — prevents a
 * concurrent saveToFirestore() call from reading stale player data and writing
 * it back on top of this update (which would reset streakCount to whatever was
 * in local React state at that moment).
 */
export async function updateStreak(playerId) {
  try {
    const teamRef  = doc(db, 'teams', TEAM_ID)
    let   newStreak = 0

    await runTransaction(db, async tx => {
      const teamSnap = await tx.get(teamRef)
      if (!teamSnap.exists()) return

      const players = teamSnap.data().players || []
      const player  = players.find(p => p.id === playerId)
      if (!player) return

      const now    = Date.now()
      const lastAct = player.lastActivity || 0
      newStreak = (now - lastAct) < MS_24H ? (player.streakCount || 0) + 1 : 1

      tx.update(teamRef, {
        players: players.map(p =>
          p.id === playerId
            ? { ...p, lastActivity: now, streakCount: newStreak }
            : p
        ),
      })
    })

    return newStreak
  } catch (err) {
    console.error('[updateStreak]', err)
    return 0
  }
}
