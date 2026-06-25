/**
 * Quest Progress Service — Cumulative tracking with atomic Firestore updates
 *
 * Handles:
 * - Cumulative progress calculation (adding new session hits to existing progress)
 * - Atomic Firestore increments to prevent race conditions
 * - Completion detection and celebration triggers
 * - Real-time UI refresh via React state
 */

import { db } from '../firebase.js'
import { doc, runTransaction } from 'firebase/firestore'

const TEAM_ID = 'team_main'

/**
 * Calculate cumulative progress from a new session.
 * For quests like "Score 8+ Hits in Any Zone", this sums ALL zone hits
 * in the session (not just the max single set).
 *
 * Returns the number to ADD to the existing quest progress.
 */
export function calculateSessionQuestIncrement(questText, newSets) {
  // "Score 8+ Hits in Any Zone in Target Practice"
  // Sum ALL hits from all zones in this session
  if (/8\+ Hits/i.test(questText)) {
    const totalHits = newSets.reduce((sum, set) => sum + (set.hits ?? 0), 0)
    return totalHits
  }

  // "Hit at Least N/10 Targets in a Practice Set"
  // Take the max from best single set (not cumulative)
  if (/at Least (\d+)\/10/i.test(questText)) {
    return 0  // These are binary — handled separately
  }

  // All other quests (accuracy, volumes, etc.) are not cumulative
  return 0
}

/**
 * Update a player's quest progress cumulatively using atomic Firestore increment.
 * This ensures race-condition-safe updates when multiple sessions complete rapidly.
 *
 * Returns: { completed, newProgress, targetProgress }
 */
export async function updateQuestProgressAtomic(playerId, questIndex, questText, targetProgress, sessionIncrement) {
  if (sessionIncrement <= 0) return null

  // Players are stored as an array inside the team document, not as individual
  // subcollection docs. Reading teams/team_main/players/{id} would always return
  // !exists() and silently drop every update.
  const teamRef = doc(db, 'teams', TEAM_ID)
  let result = { completed: false, newProgress: 0, targetProgress }

  try {
    await runTransaction(db, async tx => {
      const teamDoc = await tx.get(teamRef)
      if (!teamDoc.exists()) return

      const players = teamDoc.data().players || []
      const player  = players.find(p => p.id === playerId)
      if (!player) return

      const dailyQuests = player.daily_quests || []
      const quest = dailyQuests[questIndex]
      if (!quest) return

      const currentProgress = quest.currentProgress || 0
      const newProgress     = currentProgress + sessionIncrement
      const isCompleted     = newProgress >= targetProgress

      const updatedQuest  = {
        ...quest,
        currentProgress: newProgress,
        targetProgress,
        completed: isCompleted || quest.completed,
      }

      const updatedQuests = [...dailyQuests]
      updatedQuests[questIndex] = updatedQuest

      // Write only the active player's entry to avoid clobbering concurrent updates
      tx.update(teamRef, {
        players: players.map(p =>
          p.id === playerId ? { ...p, daily_quests: updatedQuests } : p
        ),
      })

      result = {
        completed:      isCompleted && !quest.completed,
        newProgress,
        targetProgress,
        questText,
      }
    })
  } catch (err) {
    console.error('[questProgressService] Firestore update failed:', err.message)
  }

  return result
}

/**
 * Batch update multiple quest progresses from a completed session.
 * Processes each quest that can be incremented from the new session data.
 */
export async function updateMultipleQuestsFromSession(playerId, quests, newSets, techPucksToday) {
  const completedQuests = []

  for (let i = 0; i < quests.length; i++) {
    const quest = quests[i]
    if (quest.claimed || !quest.text) continue

    // Use a distinct name to avoid shadowing the (now-unused) Firestore increment import
    const sessionProgress = calculateSessionQuestIncrement(quest.text, newSets)

    // Only update if there's progress to track
    if (sessionProgress > 0) {
      const result = await updateQuestProgressAtomic(
        playerId,
        i,
        quest.text,
        quest.targetProgress || 8,
        sessionProgress
      )

      if (result?.completed) {
        completedQuests.push(result)
      }
    }
  }

  return completedQuests
}
