import { db } from '../firebase.js'
import { doc, runTransaction } from 'firebase/firestore'

const TEAM_ID = 'team_main'
const MS_24H  = 24 * 60 * 60 * 1000

/**
 * Increments streakCount if the player had activity within the last 24 hours,
 * or resets it to 1 if it has been longer.  Updates lastActivity to now.
 * Returns the new streakCount.
 *
 * Streak Freeze protection:
 *   If the player missed a day (elapsed ≥ 24 h) but has streak_freezes > 0,
 *   one freeze is silently consumed and the streak is preserved.  The missed
 *   date is added to protectedDates for audit purposes.  The player never
 *   sees a "streak broken" modal because the insurance check in App.jsx also
 *   gates on streak_freezes > 0.
 *
 * Uses a Firestore transaction so the read-then-write is atomic — prevents a
 * concurrent saveToFirestore() call from writing stale local state on top of
 * this update (which would reset streakCount to whatever was in React state).
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

      const now       = Date.now()
      const lastAct   = player.lastActivity || 0
      const elapsed   = now - lastAct
      const hasFreeze = (player.streak_freezes || 0) > 0

      if (elapsed < MS_24H) {
        // Active within the window — normal increment
        newStreak = (player.streakCount || 0) + 1
        tx.update(teamRef, {
          players: players.map(p =>
            p.id === playerId
              ? { ...p, lastActivity: now, streakCount: newStreak }
              : p
          ),
        })
      } else if (hasFreeze) {
        // Missed a day but a freeze is available — consume it silently
        const today       = new Date().toDateString()
        const prevDates   = player.protectedDates || []
        newStreak         = (player.streakCount || 0) + 1  // still count today

        console.log(`[Streak Protection] Freeze consumed for player ${playerId}. `
          + `Streak preserved at ${newStreak}. Remaining freezes: ${(player.streak_freezes || 1) - 1}`)

        tx.update(teamRef, {
          players: players.map(p =>
            p.id === playerId
              ? {
                  ...p,
                  lastActivity:    now,
                  streakCount:     newStreak,
                  streak_freezes:  Math.max(0, (p.streak_freezes || 1) - 1),
                  protectedDates:  [...prevDates, today],
                }
              : p
          ),
        })
      } else {
        // Missed, no freeze — reset streak to 1 (today counts as day 1)
        newStreak = 1
        tx.update(teamRef, {
          players: players.map(p =>
            p.id === playerId
              ? { ...p, lastActivity: now, streakCount: newStreak }
              : p
          ),
        })
      }
    })

    return newStreak
  } catch (err) {
    console.error('[updateStreak]', err)
    return 0
  }
}
