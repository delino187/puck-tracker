/**
 * Achievement Engine — centralizes badge evaluation.
 * Keeps App.jsx free of badge-parsing logic.
 */
import { BADGES } from '../constants/badges.js'

class AchievementEngine {
  /**
   * Returns all badges that are newly unlockable for `player` given `sessions`.
   * Already-earned badges are excluded.
   */
  evaluate(player, sessions) {
    const earned = player.earnedBadges || {}
    return BADGES.filter(b => !earned[b.id] && b.check(player, sessions))
  }

  /**
   * Merges newly earned badges into the player's existing earnedBadges map.
   * Returns the updated map and the unlock timestamp.
   */
  buildEarnedPatch(newlyEarned, existingBadges = {}) {
    const ts      = Date.now()
    const updated = { ...existingBadges }
    newlyEarned.forEach(b => { updated[b.id] = { ts } })
    return { earnedBadges: updated, ts }
  }

  /** Quick check — is a specific badge already earned? */
  isEarned(badgeId, player) {
    return !!player.earnedBadges?.[badgeId]
  }

  /** Return all badges that have been earned, sorted newest-first */
  listEarned(player) {
    const earned = player.earnedBadges || {}
    return BADGES
      .filter(b => earned[b.id])
      .sort((a, b) => (earned[b.id]?.ts || 0) - (earned[a.id]?.ts || 0))
  }

  /** Return count of earned badges out of total */
  progress(player) {
    const count = Object.keys(player.earnedBadges || {}).length
    return { earned: count, total: BADGES.length, pct: Math.round((count / BADGES.length) * 100) }
  }
}

export const achievementEngine = new AchievementEngine()
