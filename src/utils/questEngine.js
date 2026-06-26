// Pure quest engine — no React, no hooks, no side effects.
// All functions accept plain data and return plain data.
import { computeQuestProgress, parseQuestTarget, parseQuestSuffix } from './questHelpers.js'
import { getWeekStart } from './stats.js'
import { QUEST_POOL, WEEKLY_QUEST_POOL } from '../constants/questPools.js'

// ── Tab routing ───────────────────────────────────────────────────────────────
export function questTab(text) {
  if (/Versus/i.test(text))                                   return 'challenges'
  if (/P-U-C-K/i.test(text))                                 return 'session'
  if (/Shots|Accuracy|Log|Session|Set|Practice/i.test(text)) return 'session'
  return null
}

// ── Countdown helpers ─────────────────────────────────────────────────────────
export function timeUntilReset() {
  const now   = new Date()
  const reset = new Date(now)
  reset.setHours(24, 0, 0, 0)
  const ms = reset.getTime() - now.getTime()
  return { h: Math.floor(ms / 3_600_000), m: Math.floor((ms % 3_600_000) / 60_000) }
}

export function timeUntilWeekReset() {
  const next = new Date(getWeekStart())
  next.setDate(next.getDate() + 7)
  const diff = next - Date.now()
  if (diff <= 0) return { days: 0, hours: 0 }
  return {
    days:  Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
  }
}

// ── Daily quest picker ────────────────────────────────────────────────────────
// sessions snapshot is captured at call time; callers should pass a ref.current
// so the baseline reflects the moment the lever is pulled, not a stale closure.
export function pickQuests(sessions = []) {
  const today        = new Date().toDateString()
  const todaySess    = sessions.filter(s => new Date(s.date).toDateString() === today)
  const spinTimeShots = todaySess.flatMap(s => s.sets || []).length * 10
    + todaySess.reduce((sum, s) => sum + (s.pucks ?? 0), 0)

  const pick  = arr => arr[Math.floor(Math.random() * arr.length)]
  const stamp = q => ({
    ...q,
    targetProgress:  parseQuestTarget(q.text),
    currentProgress: 0,
    completed:       false,
    claimed:         false,
    suffix:          parseQuestSuffix(q.text),
    baseline:        /Log (\d+)/i.test(q.text) ? spinTimeShots : 0,
  })
  const pool = Math.random() > 0.5 ? QUEST_POOL.technique : QUEST_POOL.volume
  return [stamp(pick(pool)), stamp(pick(QUEST_POOL.quality)), stamp(pick(QUEST_POOL.social))]
}

// ── Weekly quest picker ───────────────────────────────────────────────────────
export function pickWeeklyQuests() {
  const shuffled = [...WEEKLY_QUEST_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3).map(q => ({
    ...q,
    currentProgress: 0,
    completed:       false,
    claimed:         false,
  }))
}

// ── Daily quest progress ──────────────────────────────────────────────────────
// Reads techniqueByPlayer as a plain map — never calls any hook.
export function getDailyQuestProgress(quest, sessions, playerId, puckGames, peerChallenges, techniqueByPlayer) {
  const dailyLog       = techniqueByPlayer?.[playerId]?.dailyLog || {}
  const today          = new Date().toDateString()
  const todayEntry     = dailyLog[today]
  const todayTechPucks = typeof todayEntry === 'number' ? todayEntry : (todayEntry?.total ?? 0)
  return computeQuestProgress(
    quest.text, sessions, todayTechPucks, quest.baseline ?? 0,
    puckGames, peerChallenges, techniqueByPlayer, playerId
  )
}

// ── Weekly quest progress ─────────────────────────────────────────────────────
export function getWeeklyQuestProgress(text, sessions, playerId, puckGames = [], peerChallenges = [], techniqueByPlayer = null) {
  const ws       = getWeekStart()
  const weekSess = sessions.filter(s => s.playerId === playerId && new Date(s.date) >= ws)
  const weekSets = weekSess.flatMap(s => s.sets || [])
  const weekShots = weekSets.length * 10 + weekSess.reduce((sum, s) => sum + (s.pucks ?? 0), 0)

  if (/Log (\d+) Total Shots/i.test(text)) {
    const target = parseInt(text.match(/\d+/)[0])
    return { current: Math.min(weekShots, target), target }
  }

  if (/Log (\d+) Backhand Shots/i.test(text)) {
    const target   = parseInt(text.match(/\d+/)[0])
    const dailyLog = techniqueByPlayer?.[playerId]?.dailyLog || {}
    let backhands  = 0
    Object.values(dailyLog).forEach(e => {
      if (typeof e === 'object' && e?.breakdown?.['Backhand']) backhands += e.breakdown['Backhand']
    })
    return { current: Math.min(backhands, target), target }
  }

  const accAcross = text.match(/Hit (\d+)% Accuracy across (\d+)[^0-9]*Sessions/i)
  if (accAcross) {
    const minAcc = parseInt(accAcross[1])
    const target = parseInt(accAcross[2])
    const current = weekSess.filter(s => {
      const sets  = s.sets || []
      const shots = sets.length * 10
      return shots > 0 && sets.reduce((a, x) => a + x.hits, 0) / shots * 100 >= minAcc
    }).length
    return { current: Math.min(current, target), target }
  }

  const sessM = text.match(/Complete (\d+) Training Sessions/i)
  if (sessM) {
    const t = parseInt(sessM[1])
    return { current: Math.min(weekSess.length, t), target: t }
  }

  const setsM = text.match(/Log (\d+) Sets/i)
  if (setsM) {
    const t = parseInt(setsM[1])
    return { current: Math.min(weekSets.length, t), target: t }
  }

  const dayM = text.match(/Log (\d+) Shots in a Single Day/i)
  if (dayM) {
    const target = parseInt(dayM[1])
    const byDay  = {}
    weekSess.forEach(s => {
      const d = new Date(s.date).toDateString()
      byDay[d] = (byDay[d] || 0) + (s.sets || []).length * 10
    })
    return { current: Math.min(Math.max(0, ...Object.values(byDay)), target), target }
  }

  return { current: 0, target: 1 }
}
