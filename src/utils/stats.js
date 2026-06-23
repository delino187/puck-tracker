import { LEVELS } from '../constants/levels.js'
import { ZONES } from '../constants/zones.js'
import { getPSessions, dayStreak } from './badgeHelpers.js'

export function getWeekStart() {
  const now = new Date()
  const d   = now.getDay()          // 0 = Sunday … 6 = Saturday (local)
  // Monday-start weeks: go back to the most recent Monday.
  // On Sunday (d=0) that is 6 days back; on Monday (d=1) it is 0 days back.
  const daysBack = d === 0 ? 6 : d - 1
  const monday   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function calcXP(shots, hits) {
  return Math.floor(shots / 10) * 5 + Math.floor(hits / 10) * 3
}

export function getLevel(xp) {
  let li = 0
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xpNeeded) li = i
  }
  return { level: LEVELS[li], li }
}

// bonusXP covers all non-session puck activity: challenges, PUCK games,
// technique mode, and coach manual credits.  Pass it in so the XP bar and
// level display reflect the player's true career total.
/**
 * Calculate lifetime accuracy across all sessions for a player.
 * No date filters — aggregates entire shooting history.
 * Handles divide-by-zero safely; returns 0% if player has 0 shots.
 */
export function calculateLifetimeAccuracy(player, sessions) {
  if (!player || !sessions) return { totalShots: 0, totalHits: 0, accuracy: 0, zoneStats: {} }

  const pss = getPSessions(player, sessions)
  let totalShots = 0
  let totalHits  = 0

  // Aggregate all sets across all sessions (no date filter)
  pss.forEach(s => {
    const sets = s.sets || []
    const h    = sets.reduce((a, st) => a + (st.hits ?? 0), 0)
    // ATW sessions only track hits; count shots = hits to avoid inflating miss count
    totalShots += s.source === 'atw' ? h : sets.length * 10
    totalHits  += h
  })

  const accuracy = totalShots > 0 ? (totalHits / totalShots) * 100 : 0

  // Zone-by-zone breakdown for heatmap
  const allSets = pss.flatMap(s => s.sets || [])
  const zoneStats = {}
  for (const z of ZONES) {
    const zs  = allSets.filter(s => s && s.zone === z.id)
    const zh  = zs.reduce((a, s) => a + (s.hits ?? 0), 0)
    const zsh = zs.length * 10
    zoneStats[z.id] = {
      hits: zh,
      shots: zsh,
      acc: zsh > 0 ? (zh / zsh) * 100 : 0,
      sets: zs.length,
    }
  }

  return { totalShots, totalHits, accuracy, zoneStats }
}

export function playerStats(player, sessions, bonusXP = 0) {
  const pss = getPSessions(player, sessions)

  // Lifetime accuracy across all sessions (no date filter)
  const { totalShots, totalHits, accuracy: acc, zoneStats } = calculateLifetimeAccuracy(player, sessions)

  const streak     = dayStreak(player, sessions)
  const xp         = calcXP(totalShots, totalHits) + bonusXP
  const { level, li } = getLevel(xp)
  const nextLevel  = LEVELS[li + 1] || null

  // Week accuracy (filtered by week start date)
  const weekStart    = getWeekStart()
  const weekSessions = pss.filter(s => {
    if (!s.date) return false
    const d = new Date(s.date)
    return !isNaN(d) && d >= weekStart
  })
  let weekShots = 0
  let weekHits  = 0
  weekSessions.forEach(s => {
    const sets = s.sets || []
    const h    = sets.reduce((a, st) => a + (st.hits ?? 0), 0)
    weekShots += s.source === 'atw' ? h : sets.length * 10
    weekHits  += h
  })
  const weekAcc    = weekShots > 0 ? (weekHits / weekShots) * 100 : 0

  return { totalShots, totalHits, acc, streak, xp, level, li, nextLevel, weekShots, weekHits, weekAcc, zoneStats }
}

export function newId() {
  return Math.random().toString(36).slice(2, 9)
}
