import { db } from '../firebase.js'
import { doc, runTransaction } from 'firebase/firestore'

const TEAM_ID = 'team_main'

/**
 * Returns the local date string (e.g. "Thu Jun 26 2026") for a given timestamp.
 * Using toDateString() rather than toISOString() ensures the check respects the
 * device's local timezone — matching how players experience "today" and "yesterday".
 */
function dateStr(ts) {
  return new Date(ts).toDateString()
}

/**
 * Updates a player's daily streak using CALENDAR-DAY continuity, not a
 * rolling 24-hour elapsed window.
 *
 * Calendar-day logic (from the player's local timezone):
 *
 *   lastActivity === today    → Already active today. Refresh lastActivity
 *                               timestamp but do NOT increment streakCount.
 *                               (Prevents double-counting PUCK + session on
 *                               the same day from inflating the streak.)
 *
 *   lastActivity === yesterday → Consecutive day. Increment streakCount.
 *
 *   lastActivity is older / null, hasFreeze → Consume one freeze silently,
 *                               increment streakCount, record the protected date.
 *
 *   lastActivity is older / null, no freeze → Reset streakCount to 1.
 *                               (Today is day 1 of a new streak.)
 *
 * Why calendar days beat a rolling window
 * ─────────────────────────────────────────
 * With a 24-hour window: a player who shoots at 10:00 PM Monday and at
 * 11:00 PM Tuesday has a 25-hour gap → streak resets to 1 even though they
 * played on consecutive calendar days. Calendar-day logic fixes that.
 *
 * Streak Freeze protection:
 *   One freeze covers any calendar gap (1 day, 5 days, etc.) so the UX matches
 *   the store description. The missed date is added to protectedDates for audit.
 *
 * Atomicity:
 *   Uses a Firestore transaction so the read-then-write is safe against a
 *   concurrent saveToFirestore() call writing stale local state on top.
 *
 * Called from:
 *   - App.jsx        endSession()            (Target Practice / ATW)
 *   - PuckGame.jsx   handleSetterSubmit()    (P-U-C-K setter turn)
 *   - PuckGame.jsx   handleDefenderSubmit()  (P-U-C-K defender turn)
 *   - RespondToChallenge.jsx handleSubmit()  (Versus receiver)
 *   - CreatePeerChallenge.jsx handleSubmit() (Versus challenger)
 */
export async function updateStreak(playerId) {
  try {
    const teamRef   = doc(db, 'teams', TEAM_ID)
    let   newStreak = 0

    await runTransaction(db, async tx => {
      const teamSnap = await tx.get(teamRef)
      if (!teamSnap.exists()) return

      const players  = teamSnap.data().players || []
      const player   = players.find(p => p.id === playerId)
      if (!player) return

      const now        = Date.now()
      const todayStr   = dateStr(now)

      // Build "yesterday" by subtracting one calendar day (handles month/year boundaries)
      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayStr  = yesterdayDate.toDateString()

      const lastAct     = player.lastActivity || 0
      const lastDateStr = lastAct ? dateStr(lastAct) : null
      const hasFreeze   = (player.streak_freezes || 0) > 0

      if (lastDateStr === todayStr) {
        // ── Same calendar day ─────────────────────────────────────────────────
        // Already counted today — just refresh the timestamp so lastActivity is
        // current (important for the streak-broken check in App.jsx).
        // Do NOT increment streakCount — shooting a PUCK game AND a session on
        // the same day should still count as 1 day.
        newStreak = player.streakCount || 1
        tx.update(teamRef, {
          players: players.map(p =>
            p.id === playerId ? { ...p, lastActivity: now } : p
          ),
        })

      } else if (lastDateStr === yesterdayStr) {
        // ── Consecutive calendar day ──────────────────────────────────────────
        newStreak = (player.streakCount || 0) + 1
        tx.update(teamRef, {
          players: players.map(p =>
            p.id === playerId
              ? { ...p, lastActivity: now, streakCount: newStreak }
              : p
          ),
        })

      } else if (hasFreeze) {
        // ── Missed one or more days, freeze available ─────────────────────────
        const prevDates = player.protectedDates || []
        newStreak       = (player.streakCount || 0) + 1

        console.log(
          `[Streak Protection] Freeze consumed for player ${playerId}. `
          + `Streak preserved at ${newStreak}. `
          + `Remaining freezes: ${(player.streak_freezes || 1) - 1}`
        )

        tx.update(teamRef, {
          players: players.map(p =>
            p.id === playerId
              ? {
                  ...p,
                  lastActivity:   now,
                  streakCount:    newStreak,
                  streak_freezes: Math.max(0, (p.streak_freezes || 1) - 1),
                  protectedDates: [...prevDates, todayStr],
                }
              : p
          ),
        })

      } else {
        // ── Missed a day, no freeze — reset streak ────────────────────────────
        // Today counts as day 1 of a new streak.
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
