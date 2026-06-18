// Standard ELO rating system — K=32, with optional Daily Heat streak multiplier.

const K                = 32
const MAX_STREAK_BONUS = 0.30   // cap at +30%

/**
 * Expected score for player A against player B (probability 0–1).
 */
export function getExpectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Calculate new ratings after a match.
 *
 * @param {number} ratingA       - Player A (challenger) current ELO
 * @param {number} ratingB       - Player B (receiver) current ELO
 * @param {number} outcome       - From A's perspective: 1=win, 0=loss, 0.5=tie
 * @param {number} winnerStreak  - Active day streak of the winner (for Daily Heat multiplier)
 * @returns {{
 *   newRatingA, newRatingB,
 *   deltaA, deltaB,
 *   baseDelta, streakBonus, streakBonusPct, streakDays
 * }}
 */
export function calculateNewRatings(ratingA, ratingB, outcome, winnerStreak = 0) {
  const expectedA = getExpectedScore(ratingA, ratingB)
  const expectedB = getExpectedScore(ratingB, ratingA)

  const baseDeltaA = Math.round(K * (outcome       - expectedA))
  const baseDeltaB = Math.round(K * ((1 - outcome) - expectedB))

  // Daily Heat multiplier — only boosts the winner's gain, never amplifies losses
  const clampedStreak    = Math.min(winnerStreak, 15)   // 15 days = max 30%
  const multiplier       = Math.min(clampedStreak * 0.02, MAX_STREAK_BONUS)
  const streakBonusPct   = Math.round(multiplier * 100)

  const winnerIsA   = outcome === 1
  const winnerIsB   = outcome === 0

  let deltaA = baseDeltaA
  let deltaB = baseDeltaB

  // Apply multiplier to the winner's positive gain only
  if (winnerIsA && baseDeltaA > 0) {
    deltaA = Math.round(baseDeltaA * (1 + multiplier))
  } else if (winnerIsB && baseDeltaB > 0) {
    deltaB = Math.round(baseDeltaB * (1 + multiplier))
  }

  const streakBonus = winnerIsA ? deltaA - baseDeltaA : deltaB - baseDeltaB

  return {
    newRatingA:    ratingA + deltaA,
    newRatingB:    ratingB + deltaB,
    deltaA,
    deltaB,
    // Breakdown for the victory screen (winner's perspective)
    baseDelta:     winnerIsA ? baseDeltaA : baseDeltaB,
    streakBonus,
    streakBonusPct,
    streakDays:    winnerStreak,
  }
}
