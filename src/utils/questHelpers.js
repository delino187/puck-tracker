/**
 * Quest progress helpers — shared between DailyQuests.jsx (live display)
 * and App.jsx (session-end reward trigger).
 *
 * Keeping this logic in one place prevents the two consumers from drifting
 * out of sync and re-awarding diamonds on quests that are already complete.
 */

/**
 * Extracts the numeric target from a quest's text string.
 * Returns the raw number used as targetProgress on the quest object.
 */
export function parseQuestTarget(text) {
  if (/Log (\d+)/i.test(text))  return parseInt(text.match(/\d+/)[0])
  if (/Hit (\d+)%/i.test(text)) return parseInt(text.match(/\d+/)[0])
  if (/at Least (\d+)\/10/i.test(text)) return parseInt(text.match(/at Least (\d+)/i)[1])
  if (/8\+ Hits/i.test(text))           return 8
  return 1   // binary social quests
}

/**
 * Returns the display suffix for a quest type (e.g. '%' for accuracy quests).
 */
export function parseQuestSuffix(text) {
  return /Hit (\d+)%/i.test(text) ? '%' : ''
}

/**
 * Computes live current progress for a quest from today's session array.
 * Returns { current: number, target: number, suffix: string }
 *
 * This is a pure function — call it any time, it always reflects the latest
 * sessions state without any stored intermediate values.
 *
 * Shot-count quests count ALL training activity:
 *   - Target Practice sets (s.sets, each set = 10 shots)
 *   - Technique Only pucks  (s.source === 'technique', stored as s.pucks)
 *   - Versus / PUCK game shots are logged via logTechniqueShots and flow through
 *     the Zustand techniqueByPlayer store, not into sessions.  They're included
 *     via the optional `extraShots` parameter passed in by App.jsx at session-end.
 *
 * baseline: shots already logged at the moment the wheel was spun.  Progress is
 *   computed as (totalToday - baseline) so the quest always starts at 0/N even if
 *   the player already had shots logged before spinning.
 *
 */
export function computeQuestProgress(text, sessions, extraShots = 0, baseline = 0) {
  const today     = new Date().toDateString()
  const todaySessions = sessions.filter(s => new Date(s.date).toDateString() === today)
  const todaySets     = todaySessions.flatMap(s => s.sets)
  // Target Practice: each set = 10 shots
  const targetPracticeShots = todaySets.length * 10
  // Technique Only / other sources: sessions may store a pucks field directly
  const techniqueShots = todaySessions.reduce((sum, s) => sum + (s.pucks ?? 0), 0)
  const todayShots = targetPracticeShots + techniqueShots + extraShots

  // "Log N Total/Wrist/Backhand Shots …" (any phrasing with a shot count)
  if (/Log (\d+)/i.test(text)) {
    const target  = parseInt(text.match(/\d+/)[0])
    // Subtract the spin-time baseline so progress starts at 0 not at the shots
    // already logged before the wheel was pulled.
    const current = Math.max(0, todayShots - baseline)
    return { current, target, suffix: '' }
  }

  // "Hit N% Accuracy in a Session" — best single-session accuracy today
  if (/Hit (\d+)%/i.test(text)) {
    const target  = parseInt(text.match(/\d+/)[0])
    const bestAcc = sessions
      .filter(s => new Date(s.date).toDateString() === today)
      .reduce((best, s) => {
        const shots = s.sets.length * 10
        if (!shots) return best
        return Math.max(best, Math.round(s.sets.reduce((a, x) => a + x.hits, 0) / shots * 100))
      }, 0)
    return { current: bestAcc, target, suffix: '%' }
  }

  // "Hit at Least N/10 Targets in a Practice Set"
  if (/at Least (\d+)\/10/i.test(text)) {
    const target  = parseInt(text.match(/at Least (\d+)/i)[1])
    const best    = todaySets.reduce((max, s) => Math.max(max, s.hits), 0)
    return { current: Math.min(best, target), target, suffix: '' }
  }

  // "Score 8+ Hits in Any Zone" — CUMULATIVE across all sets today
  // Sum all zone hits from all sets in today's sessions (cumulative, not max)
  if (/8\+ Hits/i.test(text)) {
    const totalHits = todaySets.reduce((sum, s) => sum + (s.hits ?? 0), 0)
    return { current: Math.min(totalHits, 8), target: 8, suffix: '' }
  }

  // Social / binary quests — can't auto-track without peerChallenges/puckGames
  return { current: 0, target: 1, suffix: '' }
}

/**
 * Given the current player and the final sessions array (after the session
 * has been fully recorded), updates `currentProgress`, `targetProgress`, and
 * `completed` on each quest object.
 *
 * Diamonds are NOT awarded here — rewards are manual (tap-to-claim).
 *
 * Rules:
 *  - Only runs if the player spun quests today.
 *  - Quests already `claimed` are fully settled — skip them entirely.
 *  - Quests already `completed` (but unclaimed) get their progress refreshed
 *    in case the player kept shooting after completing.
 *
 * Returns null when there is nothing to update.
 */
export function applyQuestProgress(player, sessions, techniqueByPlayer = {}) {
  const today  = new Date().toDateString()
  const quests = player.daily_quests || []

  if (player.last_quest_spin !== today || !quests.length) return null

  // Include technique-only pucks logged today so shot-count quests track all activity
  const techEntry = techniqueByPlayer[player.id] || {}
  const dailyLog  = techEntry.dailyLog || {}
  const todayTechPucks = dailyLog[today] ?? 0

  const updatedQuests = quests.map(q => {
    if (q.claimed) return q   // fully settled — never touch again

    // Pass the stored baseline (shots at spin time) so progress is always
    // relative to when the wheel was pulled, never the absolute daily total.
    // Also include technique pucks so all shot activity counts.
    const prog    = computeQuestProgress(q.text, sessions, todayTechPucks, q.baseline ?? 0)
    const target  = q.targetProgress ?? prog.target
    const current = prog.current
    const nowDone = current >= target

    return { ...q, currentProgress: current, targetProgress: target, completed: nowDone }
  })

  // Nothing changed — avoid a spurious Firestore write
  const changed = updatedQuests.some((q, i) =>
    q.completed !== quests[i].completed || q.currentProgress !== quests[i].currentProgress
  )
  if (!changed) return null

  return { updatedQuests }
}
