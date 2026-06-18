// Standard ELO rating system — K=32 for all matches.

const K = 32

/**
 * Expected score for player A against player B.
 * Returns a probability between 0 and 1.
 */
export function getExpectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Calculate new ratings after a match.
 * @param {number} ratingA  - Player A's current ELO
 * @param {number} ratingB  - Player B's current ELO
 * @param {number} outcome  - From A's perspective: 1 = win, 0 = loss, 0.5 = tie
 * @returns {{ newRatingA: number, newRatingB: number, deltaA: number, deltaB: number }}
 */
export function calculateNewRatings(ratingA, ratingB, outcome) {
  const expectedA = getExpectedScore(ratingA, ratingB)
  const expectedB = getExpectedScore(ratingB, ratingA)
  const outcomeB  = 1 - outcome

  const deltaA = Math.round(K * (outcome  - expectedA))
  const deltaB = Math.round(K * (outcomeB - expectedB))

  return {
    newRatingA: ratingA + deltaA,
    newRatingB: ratingB + deltaB,
    deltaA,
    deltaB,
  }
}
