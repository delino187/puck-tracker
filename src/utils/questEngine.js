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
// Guarantees a balanced 3-quest set: 1 zone target + 1 technique + 1 other.
export function pickWeeklyQuests() {
  const ZONE_RE = /Hit \d+ (Top Left|Top Right|Left Post|Right Post|Crossbar|Bar Down|Low Glove|Low Blocker)s? this Week/i
  const TECH_RE = /Wrist|Backhand|Snap Shot|Slap Shot/i

  const zoneQuests  = WEEKLY_QUEST_POOL.filter(q => ZONE_RE.test(q.text))
  const techQuests  = WEEKLY_QUEST_POOL.filter(q => TECH_RE.test(q.text))
  const otherQuests = WEEKLY_QUEST_POOL.filter(q => !ZONE_RE.test(q.text) && !TECH_RE.test(q.text))

  const pick    = arr => arr[Math.floor(Math.random() * arr.length)]
  const picked  = []

  if (zoneQuests.length > 0)  picked.push(pick(zoneQuests))
  if (techQuests.length > 0)  picked.push(pick(techQuests))
  if (otherQuests.length > 0) picked.push(pick(otherQuests))

  // Fallback: fill any empty category slot from the remainder
  const remaining = WEEKLY_QUEST_POOL.filter(q => !picked.includes(q))
  while (picked.length < 3 && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length)
    picked.push(remaining.splice(idx, 1)[0])
  }

  return picked.slice(0, 3).map(q => ({
    ...q,
    targetProgress:  parseQuestTarget(q.text),
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

// Maps quest-text zone labels to their canonical snake_case zone IDs (zones.js).
// "Crossbar" is an alias for the bar_down zone used in quest text.
const ZONE_LABEL_TO_ID = {
  'top left':    'top_left',
  'top right':   'top_right',
  'left post':   'left_post',
  'right post':  'right_post',
  'crossbar':    'bar_down',
  'bar down':    'bar_down',
  'low glove':   'low_glove',
  'low blocker': 'low_blocker',
}

// ── Weekly quest progress ─────────────────────────────────────────────────────
export function getWeeklyQuestProgress(text, sessions, playerId, puckGames = [], peerChallenges = [], techniqueByPlayer = null) {
  const ws       = getWeekStart()
  const weekSess = sessions.filter(s => s.playerId === playerId && new Date(s.date) >= ws)
  const weekSets = weekSess.flatMap(s => s.sets || [])
  const sessionShots = weekSets.length * 10 + weekSess.reduce((sum, s) => sum + (s.pucks ?? 0), 0)

  // Include shots from P-U-C-K games and Versus challenges
  const weekPuckGames = puckGames.filter(g => g.playerId === playerId && new Date(g.date) >= ws)
  const puckGameShots = weekPuckGames.reduce((sum, g) => sum + (g.shots ?? 0), 0)

  const weekChallenges = peerChallenges.filter(c => c.playerId === playerId && new Date(c.date) >= ws)
  const challengeShots = weekChallenges.reduce((sum, c) => sum + (c.shots ?? 0), 0)

  const weekShots = sessionShots + puckGameShots + challengeShots

  if (/Log (\d+) Total Shots/i.test(text)) {
    const target = parseInt(text.match(/\d+/)[0])
    return { current: Math.min(weekShots, target), target }
  }

  // Match all technique-specific shot types: "Log N in {Wrist Shot|Backhand|Snap Shot|Slap Shot} Technique"
  // Breakdown keys are stored with original TechniqueTracker casing ("Wrist Shot", "Backhand", etc.)
  const techniqueMatch = text.match(/Log (\d+) in ((?:Wrist|Snap|Slap) Shot|Backhand) Technique/i)
  if (techniqueMatch) {
    const target   = parseInt(techniqueMatch[1])
    const shotType = techniqueMatch[2]
    const dailyLog = techniqueByPlayer?.[playerId]?.dailyLog || {}
    let shotCount  = 0

    // Lowercase once for case-insensitive comparison — breakdown keys may be stored in any casing.
    const breakdownKeyLc = shotType.toLowerCase()

    // Only count shots from the current week, not all time
    const ws = getWeekStart()
    Object.entries(dailyLog).forEach(([dateStr, e]) => {
      const entryDate = new Date(dateStr)
      if (entryDate < ws || typeof e !== 'object' || !e?.breakdown) return
      // Case-insensitive lookup: keys stored as "Wrist Shot"/"Backhand"/etc. may vary
      const hit = Object.entries(e.breakdown).find(([k]) => k.toLowerCase() === breakdownKeyLc)
      if (hit) shotCount += hit[1]
    })
    return { current: Math.min(shotCount, target), target }
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

  // Zone target quests — aggregate hits across all three game modes.
  // Regex intentionally matches pluralised or unpluralised form ("Top Lefts" / "Top Left").
  const zoneM = text.match(/Hit (\d+) (Top Left|Top Right|Left Post|Right Post|Crossbar|Bar Down|Low Glove|Low Blocker)s? this Week/i)
  if (zoneM) {
    const target = parseInt(zoneM[1])
    const zoneId = ZONE_LABEL_TO_ID[zoneM[2].toLowerCase()]
    if (!zoneId) return { current: 0, target }

    // a. Target Practice sessions — sets carry a per-zone hit count
    const sessionZoneHits = weekSess
      .flatMap(s => s.sets || [])
      .filter(st => st.zone === zoneId)
      .reduce((sum, st) => sum + (st.hits ?? 0), 0)

    // b. Versus (peer) challenges — each challenge targets a single zone
    const versusZoneHits = peerChallenges
      .filter(c => {
        const ts = c.createdAt ?? c.date
        return ts && new Date(ts) >= ws && c.zone === zoneId &&
          (c.challengerId === playerId || c.receiverId === playerId)
      })
      .reduce((sum, c) => {
        if (c.challengerId === playerId) return sum + (c.challengerHits ?? 0)
        if (c.receiverId   === playerId) return sum + (c.receiverHits   ?? 0)
        return sum
      }, 0)

    // c. P-U-C-K games — full round history is not persisted; only currentRound
    //    is available per game, so this counts setter/defender hits for that round.
    const puckZoneHits = puckGames
      .filter(g => {
        const ts = g.createdAt ?? g.lastActivityAt
        return ts && new Date(ts) >= ws && (g.p1Id === playerId || g.p2Id === playerId)
      })
      .reduce((sum, g) => {
        const r = g.currentRound
        if (!r || r.zone !== zoneId) return sum
        if (r.setterPlayerId === playerId && r.setterMade === true)   return sum + 1
        if (r.setterPlayerId !== playerId && r.defenderMade === true) return sum + 1
        return sum
      }, 0)

    const current = sessionZoneHits + versusZoneHits + puckZoneHits
    return { current: Math.min(current, target), target }
  }

  return { current: 0, target: 1 }
}
