import { db } from '../firebase.js'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

const TEAM_ID = 'team_main'
const MS_24H  = 24 * 60 * 60 * 1000

/**
 * Increments streakCount if the player had activity within the last 24 hours,
 * or resets it to 1 if it has been longer. Updates lastActivity to now.
 * Returns the new streakCount.
 */
export async function updateStreak(playerId) {
  try {
    const teamRef  = doc(db, 'teams', TEAM_ID)
    const teamSnap = await getDoc(teamRef)
    if (!teamSnap.exists()) return 0

    const players = teamSnap.data().players || []
    const player  = players.find(p => p.id === playerId)
    if (!player) return 0

    const now       = Date.now()
    const lastAct   = player.lastActivity || 0
    const elapsed   = now - lastAct
    const newStreak = elapsed < MS_24H ? (player.streakCount || 0) + 1 : 1

    await updateDoc(teamRef, {
      players: players.map(p =>
        p.id === playerId
          ? { ...p, lastActivity: now, streakCount: newStreak }
          : p
      ),
    })

    return newStreak
  } catch (err) {
    console.error('[updateStreak]', err)
    return 0
  }
}
