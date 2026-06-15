import { ZONES } from '../constants/zones.js'

// ── Date helpers ──────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toDateString()
}

function weekStartStr() {
  const n = new Date()
  const d = n.getDay()
  const m = new Date(n)
  m.setDate(m.getDate() - d + (d === 0 ? -6 : 1))
  m.setHours(0, 0, 0, 0)
  return m.toDateString()
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Generators ────────────────────────────────────────────────────────────────
function generateDailyChallenge() {
  const zone    = randItem(ZONES)
  const target  = randItem([5, 6, 7, 8, 9, 10])
  return {
    zone:        zone.id,
    target:      String(target),
    source:      'auto',
    generatedOn: todayStr(),
    date:        Date.now(),
  }
}

function generateWeeklyChallenge() {
  const zone    = randItem(ZONES)
  const target  = randItem([25, 30, 35, 40, 45, 50])
  return {
    zone:        zone.id,
    target:      String(target),
    source:      'auto',
    generatedOn: weekStartStr(),
    date:        Date.now(),
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
// Returns a state patch (may be empty {}). Never overwrites source:'coach' entries.
export function buildAutoChallengePatch(st) {
  const patch     = {}
  const today     = todayStr()
  const weekStart = weekStartStr()

  const dc = st.dailyChallenge
  if (!dc || (dc.source === 'auto' && dc.generatedOn !== today)) {
    patch.dailyChallenge = generateDailyChallenge()
  }

  const wc = st.weeklyChallenge
  if (!wc || (wc.source === 'auto' && wc.generatedOn !== weekStart)) {
    patch.weeklyChallenge = generateWeeklyChallenge()
  }

  return patch
}

// Human-readable label for a challenge object
export function challengeLabel(ch, zones) {
  const zone = zones.find(z => z.id === ch?.zone)
  if (!zone || !ch) return ''
  return `${ch.target} ${zone.label} hit${ch.target === '1' ? '' : 's'}`
}
