/**
 * Profile Healer — badge-evidence restoration for techniqueByPlayer data.
 *
 * Problem: techniqueByPlayer (totalPucks + bonusXP) lives in Zustand/localStorage.
 * If a player clears their cache or logs in on a fresh device, that store resets to
 * zero. But their earned volume badges are server-side proof that they hit certain
 * lifetime shot milestones. We use that evidence to restore the minimum floor.
 *
 * Design notes:
 *   - lifetimeShots = sessionShots + totalPucks   (see badgeHelpers.lifetimeShots)
 *   - Sessions are already stored in Firestore and are not at risk.
 *   - We only need to restore the techniqueByPlayer gap: max(0, floor - sessionShots).
 *   - bonusXP floor = restored totalPucks, because logTechniqueShots awards ≥1 XP per puck.
 *   - The function is pure and has no side-effects; callers decide whether to persist.
 */

// Badge ID → minimum combined lifetime shots that badge proves the player achieved.
// Keys must exactly match the `id` strings in src/constants/badges.js.
const VOLUME_BADGE_FLOORS = {
  v100:  100,
  v200:  200,
  v300:  300,
  v400:  400,
  v500:  500,
  v1k:   1000,
  v5k:   5000,
  v10k:  10000,
}

/**
 * Returns a repaired techniqueByPlayer entry for `player`, or null if no repair
 * is needed.
 *
 * @param {object} player        - Player profile with earnedBadges
 * @param {Array}  sessions      - Full sessions array from app state (all players)
 * @param {object} techniqueEntry - Current techniqueByPlayer[player.id] (may be undefined)
 */
export function healPlayerStats(player, sessions, techniqueEntry) {
  const earnedBadges = player.earnedBadges || {}

  // Find the highest puck-volume floor that this player's badges prove
  let maxFloor = 0
  for (const [badgeId, floor] of Object.entries(VOLUME_BADGE_FLOORS)) {
    if (earnedBadges[badgeId] && floor > maxFloor) maxFloor = floor
  }
  if (maxFloor === 0) return null  // no volume milestone badges — nothing to check

  // How many shots are already accounted for by committed session documents
  const sessionShots = sessions
    .filter(s => s.playerId === player.id)
    .reduce((acc, s) => {
      const hits = (s.sets || []).reduce((sum, st) => sum + st.hits, 0)
      // ATW sessions only record hits (no misses), so shots === hits for those
      return acc + (s.source === 'atw' ? hits : (s.sets?.length ?? 0) * 10)
    }, 0)

  const currentTotalPucks = techniqueEntry?.totalPucks ?? 0
  const currentBonusXP    = techniqueEntry?.bonusXP    ?? 0

  // Minimum totalPucks required so that (sessionShots + totalPucks) >= maxFloor
  const neededTechPucks = Math.max(0, maxFloor - sessionShots)

  if (currentTotalPucks >= neededTechPucks) return null  // already healthy

  // Restore totalPucks to the evidence floor.
  // Restore bonusXP to at least the same value: logTechniqueShots awards ≥1 XP per puck.
  const repairedTotalPucks = neededTechPucks
  const repairedBonusXP    = Math.max(currentBonusXP, repairedTotalPucks)

  return {
    totalPucks: repairedTotalPucks,
    bonusXP:    repairedBonusXP,
    dailyLog:   techniqueEntry?.dailyLog ?? {},
  }
}
