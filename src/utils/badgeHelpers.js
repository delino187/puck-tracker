import { ZONES } from '../constants/zones.js'
import { useAppStore } from '../store/useAppStore.js'

export function getPSessions(player, sessions) {
  return sessions.filter(s => s.playerId === player.id)
}

export function lifetimeShots(p, s) {
  // ATW sessions only track successful hits; count shots = hits to avoid inflating miss count.
  const sessionShots = getPSessions(p, s).reduce((a, x) => {
    const h = (x.sets || []).reduce((sum, st) => sum + st.hits, 0)
    return a + (x.source === 'atw' ? h : (x.sets?.length ?? 0) * 10)
  }, 0)
  // Technique-mode pucks live in Zustand, not in the sessions array —
  // read synchronously via getState() so this works outside React components.
  const techEntry      = useAppStore.getState().techniqueByPlayer[p.id]
  const techniqueShots = techEntry?.totalPucks || 0
  return sessionShots + techniqueShots
}

export function zoneHits(p, s, zones) {
  return getPSessions(p, s)
    .flatMap(x => x.sets || [])
    .filter(st => zones.includes(st.zone))
    .reduce((a, st) => a + st.hits, 0)
}

export function dayStreak(p, s) {
  // Merge session days with freeze-protected dates stored on the player object
  const daySet = new Set(getPSessions(p, s).map(x => new Date(x.date).toDateString()))
  ;(p.protectedDates || []).forEach(d => daySet.add(d))

  // Include days when shots were logged in any mode (Technique, Versus, PUCK).
  // dailyLog is date-keyed in the Zustand store and updated by logTechniqueShots.
  const techEntry = useAppStore.getState().techniqueByPlayer[p.id]
  const dailyLog  = techEntry?.dailyLog || {}
  Object.entries(dailyLog).forEach(([date, entry]) => {
    // dailyLog entries may be a plain number (legacy format) or
    // { total, breakdown } (current format from logTechniqueShots).
    // A raw `count > 0` comparison evaluates to NaN for objects, silently
    // dropping every technique/Versus/PUCK-only day from the streak.
    const total = typeof entry === 'object' ? (entry?.total || 0) : (entry || 0)
    if (total > 0) daySet.add(date)
  })
  const days = [...daySet].sort((a, b) => new Date(b) - new Date(a))
  if (!days.length) return 0

  const today    = new Date().toDateString()
  // Use setDate arithmetic rather than subtracting 86 400 000 ms — DST transitions
  // make some "days" only 23 h long, which would make the subtraction land on the
  // wrong calendar date (e.g. two days ago instead of yesterday).
  const yestDate = new Date()
  yestDate.setDate(yestDate.getDate() - 1)
  const yest = yestDate.toDateString()

  if (days[0] !== today && days[0] !== yest) return 0

  let n = 1
  for (let i = 1; i < days.length; i++) {
    // Math.round guards against DST: on spring-forward nights the gap between
    // two consecutive midnight-local timestamps is 23 h (0.958…), not exactly 1.
    // Strict equality === 1 breaks the streak on those nights; rounding fixes it.
    if (Math.round((new Date(days[i - 1]) - new Date(days[i])) / 86400000) === 1) n++
    else break
  }
  return n
}

export function maxShotsInDay(p, s) {
  const m = {}
  getPSessions(p, s).forEach(x => {
    const d = new Date(x.date).toDateString()
    m[d] = (m[d] || 0) + (x.sets?.length ?? 0) * 10
  })
  return Math.max(0, ...Object.values(m))
}

// Counts sessions per calendar day, but only those with >= minPucks total shots.
// Used by Double/Triple Shift badges which require 50-puck qualifying sessions.
export function maxSessionsInDay(p, s, minPucks = 50) {
  const m = {}
  getPSessions(p, s).forEach(x => {
    const shots = (x.sets?.length ?? 0) * 10
    if (shots < minPucks) return
    const d = new Date(x.date).toDateString()
    m[d] = (m[d] || 0) + 1
  })
  return Math.max(0, ...Object.values(m))
}

export function sessionTimeCheck(p, s, after, before) {
  return getPSessions(p, s).some(x => {
    const h = new Date(x.date).getHours()
    return after !== null ? h >= after : h < before
  })
}

export function chirpProof(p, s) {
  for (const z of ZONES) {
    const sets = getPSessions(p, s).flatMap(x => (x.sets || []).filter(st => st.zone === z.id))
    if (sets.length >= 2 && sets[0].hits === 0 && sets[sets.length - 1].hits / 10 >= 0.4) return true
  }
  return false
}

export function hasCelery(p, s) {
  return getPSessions(p, s).some(x => (x.sets || []).some(st => st.hits === 0))
}

export function challengesCompleted(p, s) {
  return getPSessions(p, s).reduce((a, x) => a + (x.challengeComplete ? 1 : 0), 0)
}

export function perfectEveryZone(p, s) {
  const sets = getPSessions(p, s).flatMap(x => x.sets || [])
  return ZONES.every(z => sets.some(st => st.zone === z.id && st.hits === 10))
}

// True if ANY single set in the given zone scored >= minHits (default 8)
export function hasHighSetInZone(p, s, zoneId, minHits = 8) {
  return getPSessions(p, s).some(sess =>
    (sess.sets || []).some(st => st.zone === zoneId && st.hits >= minHits)
  )
}

// True if ANY single logged set ever scored a perfect 10/10
export function hasPerfectSet(p, s) {
  return getPSessions(p, s).some(sess => (sess.sets || []).some(st => st.hits === 10))
}

// Longest consecutive-day streak the player has ever had (all time)
export function allTimeStreakPB(p, s) {
  const daySet = new Set(
    getPSessions(p, s).map(x => new Date(x.date).toDateString()),
  )
  ;(p.protectedDates || []).forEach(d => daySet.add(d))
  const days = [...daySet].map(d => new Date(d)).sort((a, b) => a - b)
  if (!days.length) return 0
  let best = 1, cur = 1
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((days[i] - days[i - 1]) / 86400000)
    if (diff === 1) { cur++; if (cur > best) best = cur }
    else cur = 1
  }
  return best
}

// ── Around the World helpers ─────────────────────────────────────────────────

function _atwSess(p, s) {
  return s.filter(x => x.playerId === p.id && x.source === 'atw')
}

function _atwScore(sess) {
  return (sess.sets || []).reduce((a, st) => a + st.hits, 0)
}

export function atwGamesPlayed(p, s) {
  return _atwSess(p, s).length
}

export function atwMaxRunHits(p, s) {
  const atw = _atwSess(p, s)
  return atw.length ? Math.max(...atw.map(_atwScore)) : 0
}

export function atwAllCornersAtLeast(p, s, min) {
  return _atwSess(p, s).some(
    sess => (sess.sets?.length ?? 0) === 4 && (sess.sets || []).every(st => st.hits >= min),
  )
}

export function atwDayStreak(p, s, days) {
  const dates = [...new Set(_atwSess(p, s).map(x => new Date(x.date).toDateString()))]
    .map(d => new Date(d))
    .sort((a, b) => b - a)
  if (dates.length < days) return false
  for (let i = 0; i < days - 1; i++) {
    if (Math.round((dates[i] - dates[i + 1]) / 86400000) !== 1) return false
  }
  return true
}

export function atwBeatPBBy(p, s, delta) {
  const scores = _atwSess(p, s).map(_atwScore).sort((a, b) => b - a)
  return scores.length >= 2 && scores[0] - scores[1] >= delta
}

export function atwCareerHits(p, s) {
  return _atwSess(p, s).reduce((a, sess) => a + _atwScore(sess), 0)
}

// ── Max combined post hits (left + right) logged in any single calendar day ──
export function maxDailyPostHits(p, s) {
  const m = {}
  getPSessions(p, s).forEach(sess => {
    const d  = new Date(sess.date).toDateString()
    const ph = (sess.sets || [])
      .filter(st => st.zone === 'left_post' || st.zone === 'right_post')
      .reduce((a, st) => a + st.hits, 0)
    m[d] = (m[d] || 0) + ph
  })
  return Math.max(0, ...Object.values(m))
}
