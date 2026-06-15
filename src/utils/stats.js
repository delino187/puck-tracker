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

export function playerStats(player, sessions) {
  const pss     = getPSessions(player, sessions)
  const allSets = pss.flatMap(s => s.sets)
  const totalShots = allSets.length * 10
  const totalHits  = allSets.reduce((a, s) => a + s.hits, 0)
  const acc        = totalShots > 0 ? (totalHits / totalShots) * 100 : 0
  const streak     = dayStreak(player, sessions)
  const xp         = calcXP(totalShots, totalHits)
  const { level, li } = getLevel(xp)
  const nextLevel  = LEVELS[li + 1] || null

  const weekStart  = getWeekStart()
  const weekSets   = pss.filter(s => new Date(s.date) >= weekStart).flatMap(s => s.sets)
  const weekShots  = weekSets.length * 10
  const weekHits   = weekSets.reduce((a, s) => a + s.hits, 0)
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
