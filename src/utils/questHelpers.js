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
  if (/Perfect 10/i.test(text)) return 1
  if (/8\+ Hits/i.test(text))   return 8
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
 */
export function computeQuestProgress(text, sessions) {
  const today     = new Date().toDateString()
  const todaySets = sessions
    .filter(s => new Date(s.date).toDateString() === today)
    .flatMap(s => s.sets)
  const todayShots = todaySets.length * 10

  // "Log N Total/Wrist Shots Today" / "Log N Shots Before Dinner"
  if (/Log (\d+)/i.test(text)) {
    const target = parseInt(text.match(/\d+/)[0])
    return { current: todayShots, target, suffix: '' }
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

  // "Nail a Perfect 10/10 Set"
  if (/Perfect 10/i.test(text)) {
    return { current: todaySets.some(s => s.hits === 10) ? 1 : 0, target: 1, suffix: '' }
  }

  // "Score 8+ Hits in Any Zone"
  if (/8\+ Hits/i.test(text)) {
    const best = todaySets.reduce((max, s) => Math.max(max, s.hits), 0)
    return { current: best, target: 8, suffix: '' }
  }

  // Social / binary quests — can't auto-track without peerChallenges/puckGames
  return { current: 0, target: 1, suffix: '' }
}

/**
 * Given the current player and the final sessions array (after the session
 * has been fully recorded), returns updated quest objects and how many
 * diamonds were newly earned.
 *
 * Rules:
 *  - Only runs if the player spun quests today.
 *  - Quests already marked `completed` are skipped (no double-reward).
 *  - For each newly-completed quest, `reward` diamonds are awarded once.
 *
 * Returns null when there is nothing to update (no quests today, or all
 * quests were already complete before this session).
 */
export function applyQuestProgress(player, sessions) {
  const today  = new Date().toDateString()
  const quests = player.daily_quests || []

  if (player.last_quest_spin !== today || !quests.length) return null

  let diamondsEarned = 0
  const updatedQuests = quests.map(q => {
    if (q.completed) return q   // already rewarded — skip

    const prog    = computeQuestProgress(q.text, sessions)
    const target  = q.targetProgress ?? prog.target
    const current = prog.current
    const nowDone = current >= target

    if (nowDone) diamondsEarned += (q.reward || 0)

    return { ...q, currentProgress: current, targetProgress: target, completed: nowDone }
  })

  // Nothing changed — avoid a spurious Firestore write
  const changed = updatedQuests.some((q, i) => q.completed !== quests[i].completed)
  if (!changed && diamondsEarned === 0) return null

  return { updatedQuests, diamondsEarned }
}
