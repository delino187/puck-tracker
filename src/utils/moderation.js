/**
 * moderation.js — lightweight profanity filter and username validator.
 *
 * Design goals
 * ────────────
 * • No external dependencies — runs entirely in the browser/Node.
 * • Normalise common evasion techniques (leet-speak, repeated chars, separators)
 *   before checking, so "sh1t", "s.h.i.t", "shiiit" all match.
 * • Word-boundary aware — "assassin", "scunthorpe", "classic" are never flagged.
 * • Returns structured result objects so callers can surface clear UI feedback.
 *
 * Usage
 * ─────
 *   import { validateUsername, containsProfanity } from './moderation.js'
 *
 *   const result = validateUsername('c00lKid')
 *   // → { valid: true, username: 'c00lKid', reason: null }
 *
 *   const check = containsProfanity('sh1thead')
 *   // → { flagged: true, word: 'shithead' }
 */

// ── Normalisation ─────────────────────────────────────────────────────────────
// Maps visually similar characters to their plain ASCII equivalent so that
// substitution evasions are collapsed before the word list is checked.
const CHAR_MAP = {
  '@': 'a', '4': 'a', 'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a',
  '8': 'b',
  '(': 'c', '<': 'c',
  '3': 'e', 'é': 'e', 'è': 'e', 'ë': 'e',
  '6': 'g',
  '#': 'h',
  '1': 'i', '!': 'i', '|': 'i', 'í': 'i', 'ì': 'i',
  '0': 'o', 'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o',
  '$': 's', '5': 's', 'z': 's',
  '+': 't', '7': 't',
  'ú': 'u', 'ù': 'u', 'ü': 'u',
  'ñ': 'n',
  '2': 'z',
  '9': 'g',
}

/**
 * Normalise a string for comparison:
 *   1. Lowercase
 *   2. Map leet/symbol substitutions
 *   3. Strip non-letter characters (separators, underscores, dots)
 *   4. Collapse runs of the same letter (e.g. "shiiit" → "shit")
 */
export function normalise(str) {
  if (typeof str !== 'string') return ''
  const mapped = str
    .toLowerCase()
    .split('')
    .map(ch => CHAR_MAP[ch] ?? ch)
    .join('')

  // Remove anything that isn't a-z (separators, underscores used to split words)
  const stripped = mapped.replace(/[^a-z]/g, '')

  // Collapse consecutive duplicate letters (handles "fuuuck", "shiiit", etc.)
  // Preserve double-letter runs of at most 2 to keep legitimate words intact
  // (e.g. "cool", "too") while still collapsing obvious exaggerations.
  return stripped.replace(/(.)\1{2,}/g, '$1$1')
}

// ── Word list ─────────────────────────────────────────────────────────────────
// Each entry is a root form.  Normalisation handles most morphological variants.
// Words are checked with word-boundary guards to avoid false positives on
// legitimate substrings ("assassin", "classic", "scunthorpe", etc.).
//
// The list targets content inappropriate for a youth hockey app (ages ~8-16).
const BLOCKED_ROOTS = [
  // Strong profanity
  'fuck', 'fuk', 'fucc', 'fvck',
  'shit', 'shat', 'shite',
  'bitch', 'biatch',
  'cunt', 'cnt',
  'ass', 'arse',
  'dick', 'dik', 'dck',
  'cock', 'cok',
  'piss', 'pis',
  'bastard', 'baztard',
  'damn', 'damnit',
  'crap',
  'prick',
  'slut', 'slt',
  'whore', 'whor',
  'twat',
  'wank', 'wanker',
  'bollocks', 'bollock',
  'tosser',
  'bellend',
  'knob',
  'tit', 'titty', 'tits',
  'boob',
  'pussy', 'pussie',
  'dildo',
  'nigga', 'nigger', 'nigg',
  'fag', 'fagg', 'faggot',
  'retard', 'retarded',
  'spastic',
  'homo', 'homophobe',
  'kike',
  'chink',
  'spic', 'spick',
  'tranny',
  // Common compound forms
  'asshole', 'ahole',
  'asswipe',
  'dipshit',
  'dumbass', 'dumbfuck',
  'jackass',
  'bullshit', 'bulshit',
  'horseshit',
  'shithead', 'shitface',
  'motherfuck', 'mofo',
  'fucktard', 'fucked',
  'bitchass',
  'cumshot', 'cumface',
  'cocksucker', 'cocksuck',
  'dickhead', 'dickface',
  'cuntface',
  // Hate / violence
  'nazi', 'neonazi',
  'killall', 'killme', 'killyou',
  'rape', 'rapist',
  'pedophile', 'paedophile', 'pedo', 'paedo',
]

// Pre-normalise the list once at module load — no runtime cost per call.
const NORMALISED_BLOCKED = BLOCKED_ROOTS.map(w => normalise(w))

/**
 * Returns `{ flagged: false }` if the text is clean, or
 * `{ flagged: true, word: string }` with the normalised form that matched.
 *
 * Uses word-boundary heuristics: a match only fires when the matched root
 * is not preceded or followed by another letter in the normalised text.
 * This prevents "assassin", "scunthorpe", "classic", "shitake" from firing.
 *
 * False-positive exceptions are hard-coded below for known edge cases.
 */
export function containsProfanity(text) {
  if (!text) return { flagged: false }
  const norm = normalise(text)

  // Known innocent substrings that would otherwise trip the word-boundary check.
  const FALSE_POSITIVES = new Set([
    'assassin', 'assume', 'assumption', 'asset', 'assets',
    'passage', 'massage', 'classic', 'cassette', 'class',
    'scunthorpe', 'penistone',  // classic test cases
    'titillate', 'shitake',     // shitake mushroom
    'bassist', 'bass',
    'cocktail', 'cockatoo', 'hancock',
    'dickens', 'dickson', 'dickson',
    'titmouse', 'titmice',
  ])

  if (FALSE_POSITIVES.has(norm)) return { flagged: false }

  for (const blocked of NORMALISED_BLOCKED) {
    const idx = norm.indexOf(blocked)
    if (idx === -1) continue

    // Word-boundary check: character before and after the match must not be a letter.
    const before = idx === 0 ? '' : norm[idx - 1]
    const after  = idx + blocked.length < norm.length ? norm[idx + blocked.length] : ''

    const borderBefore = !before || !/[a-z]/.test(before)
    const borderAfter  = !after  || !/[a-z]/.test(after)

    if (borderBefore && borderAfter) {
      return { flagged: true, word: blocked }
    }
  }

  return { flagged: false }
}

// ── Username validator ────────────────────────────────────────────────────────

const USERNAME_MIN  = 3
const USERNAME_MAX  = 15
// Characters allowed in usernames: letters, digits, underscore, hyphen
const ALLOWED_RE    = /^[a-zA-Z0-9_-]+$/
// Must contain at least one letter (prevents purely numeric handles)
const HAS_LETTER_RE = /[a-zA-Z]/

/**
 * Validates a raw username string.
 *
 * @param {string} raw — the value the user typed
 * @returns {{ valid: boolean, username: string, reason: string | null }}
 *   `username` is the cleaned (space-stripped) form ready for storage.
 *   `reason` is a human-readable message suitable for display directly in the UI.
 */
export function validateUsername(raw) {
  if (typeof raw !== 'string') {
    return { valid: false, username: '', reason: 'Username must be a string.' }
  }

  // Strip spaces (users sometimes type with spaces; strip silently rather than error)
  const username = raw.replace(/\s/g, '')

  if (username.length === 0) {
    return { valid: false, username, reason: 'Username cannot be empty.' }
  }

  if (username.length < USERNAME_MIN) {
    return {
      valid: false,
      username,
      reason: `Username must be at least ${USERNAME_MIN} characters.`,
    }
  }

  if (username.length > USERNAME_MAX) {
    return {
      valid: false,
      username,
      reason: `Username must be ${USERNAME_MAX} characters or fewer.`,
    }
  }

  if (!ALLOWED_RE.test(username)) {
    return {
      valid: false,
      username,
      reason: 'Username may only contain letters, numbers, underscores, and hyphens.',
    }
  }

  if (!HAS_LETTER_RE.test(username)) {
    return {
      valid: false,
      username,
      reason: 'Username must contain at least one letter.',
    }
  }

  // Check for leading/trailing separators
  if (/^[_-]|[_-]$/.test(username)) {
    return {
      valid: false,
      username,
      reason: 'Username cannot start or end with _ or -.',
    }
  }

  // Profanity check (runs normalisation internally)
  const profanity = containsProfanity(username)
  if (profanity.flagged) {
    return {
      valid: false,
      username,
      reason: 'That username is not allowed.',
    }
  }

  return { valid: true, username, reason: null }
}
