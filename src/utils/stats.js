import { LEVELS } from '../constants/levels.js'
import { ZONES } from '../constants/zones.js'
import { getPSessions, dayStreak } from './badgeHelpers.js'

export function getWeekStart() {
  const n = new Date()
  const d = n.getDay()
  const m = new Date(n.setDate(n.getDate() - d + (d === 0 ? -6 : 1)))
  m.setHours(0, 0, 0, 0)
  return m
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
export function playerStats(player, sessions, bonusXP = 0) {
  const pss = getPSessions(player, sessions)

  // ATW sessions only track successful hits (no misses recorded),
  // so shots = hits for those sessions to avoid inflating the miss count.
  let totalShots = 0
  let totalHits  = 0
  pss.forEach(s => {
    const h = s.sets.reduce((a, st) => a + st.hits, 0)
    totalShots += s.source === 'atw' ? h : s.sets.length * 10
    totalHits  += h
  })

  const allSets = pss.flatMap(s => s.sets)
  const acc        = totalShots > 0 ? (totalHits / totalShots) * 100 : 0
  const streak     = dayStreak(player, sessions)
  const xp         = calcXP(totalShots, totalHits) + bonusXP
  const { level, li } = getLevel(xp)
  const nextLevel  = LEVELS[li + 1] || null

  const weekStart    = getWeekStart()
  const weekSessions = pss.filter(s => new Date(s.date) >= weekStart)
  let weekShots = 0
  let weekHits  = 0
  weekSessions.forEach(s => {
    const h = s.sets.reduce((a, st) => a + st.hits, 0)
    weekShots += s.source === 'atw' ? h : s.sets.length * 10
    weekHits  += h
  })
  const weekAcc    = weekShots > 0 ? (weekHits / weekShots) * 100 : 0

  const zoneStats = {}
  for (const z of ZONES) {
    const zs  = allSets.filter(s => s.zone === z.id)
    const zh  = zs.reduce((a, s) => a + s.hits, 0)
    const zsh = zs.length * 10
    zoneStats[z.id] = { hits: zh, shots: zsh, acc: zsh > 0 ? (zh / zsh) * 100 : 0, sets: zs.length }
  }

  return { totalShots, totalHits, acc, streak, xp, level, li, nextLevel, weekShots, weekHits, weekAcc, zoneStats }
}

export function newId() {
  return Math.random().toString(36).slice(2, 9)
}
