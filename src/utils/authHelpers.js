/**
 * Auth Helpers — username-based registration and login.
 *
 * Architecture:
 *   Players are stored as an array inside teams/team_main (existing schema).
 *   Firebase Auth is used as an OPTIONAL second factor for self-registered
 *   players.  Coach-added players have no Firebase Auth account and continue
 *   to authenticate via the local password comparison in PlayerSelectScreen.
 *
 * Username → email mapping:
 *   Firebase Auth requires an email address.  We synthesize one:
 *     connor97  →  connor97@pucktracker.internal
 *   This internal domain is never sent to real email infrastructure.
 *
 * Backwards compatibility:
 *   Players registered before this change have a real `email` field and no
 *   `username` field.  They are unaffected — PlayerSelectScreen checks for
 *   the `username` field before calling Firebase Auth.
 */

import { auth, db } from '../firebase.js'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const INTERNAL_DOMAIN = '@pucktracker.internal'

// ── Username utilities ────────────────────────────────────────────────────────

/** Normalises a raw username: lowercase, strip everything except a-z0-9_ */
export function normaliseUsername(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '')
}

/** Returns the synthetic Firebase Auth email for a username. */
export function usernameToEmail(username) {
  return `${normaliseUsername(username)}${INTERNAL_DOMAIN}`
}

/**
 * Returns true if the email looks like our synthetic internal address.
 * Used to strip the suffix when displaying the "email" to a user.
 */
export function isInternalEmail(email) {
  return typeof email === 'string' && email.endsWith(INTERNAL_DOMAIN)
}

// ── Contact field parser ──────────────────────────────────────────────────────

/**
 * Parses the optional "Email or Phone" field.
 * Returns { email, phone } — exactly one will be a string, the other null.
 * Both are null when the field is blank.
 */
export function parseContactField(value) {
  const v = (value ?? '').trim()
  if (!v) return { email: null, phone: null }
  if (v.includes('@')) {
    return { email: v.toLowerCase(), phone: null }
  }
  // Strip non-digit characters and check length for a phone number
  const digits = v.replace(/\D/g, '')
  if (digits.length >= 7) {
    return { email: null, phone: digits }
  }
  return { email: null, phone: null }
}

/**
 * Validates the contact field value.
 * Returns an error string, or '' if valid (or blank).
 */
export function validateContactField(value) {
  const v = (value ?? '').trim()
  if (!v) return ''
  if (v.includes('@')) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(v)) return 'That does not look like a valid email address.'
    return ''
  }
  const digits = v.replace(/\D/g, '')
  if (digits.length < 7) return 'Phone number looks too short — enter digits only.'
  return ''
}

// ── Username availability ─────────────────────────────────────────────────────

/**
 * Checks whether a username is already taken in the team's players array.
 * Returns true if the username is available, false if taken.
 */
export async function isUsernameAvailable(username) {
  const normalised = normaliseUsername(username)
  try {
    const snap = await getDoc(doc(db, 'teams', 'team_main'))
    if (!snap.exists()) return true
    const players = snap.data().players || []
    return !players.some(p => normaliseUsername(p.username || p.name || '') === normalised)
  } catch (err) {
    console.warn('[authHelpers] username availability check failed:', err.message)
    // Fail open — let the submission proceed and rely on Firestore write to catch dups
    return true
  }
}

// ── Firebase Auth wrappers ────────────────────────────────────────────────────

/**
 * Registers a new player with Firebase Auth using the synthetic email.
 * Returns the Firebase User object on success.
 * Throws with a human-readable message on failure.
 */
export async function registerWithUsername(username, password) {
  const email = usernameToEmail(username)
  const cred  = await createUserWithEmailAndPassword(auth, email, password)
  // Set displayName so Firebase shows the username, not the internal email
  await updateProfile(cred.user, { displayName: username })
  return cred.user
}

/**
 * Signs in a player.
 * Accepts either a username (no '@') or a full email (for coach-added accounts).
 * Returns the Firebase User on success.
 * Throws with a human-readable message on failure.
 */
export async function signInPlayer(usernameOrEmail, password) {
  const email = usernameOrEmail.includes('@')
    ? usernameOrEmail.toLowerCase()
    : usernameToEmail(usernameOrEmail)
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

/**
 * Signs out the current Firebase Auth session.
 * Safe to call even when no session is active.
 */
export async function signOutPlayer() {
  try { await signOut(auth) } catch {}
}

// ── Error message normaliser ─────────────────────────────────────────────────

/**
 * Maps Firebase Auth error codes to friendly messages.
 */
export function friendlyAuthError(err) {
  const code = err?.code ?? ''
  if (code === 'auth/email-already-in-use') return 'That username is already taken — try a different one.'
  if (code === 'auth/invalid-email')        return 'Username contains invalid characters.'
  if (code === 'auth/weak-password')        return 'Password must be at least 6 characters.'
  if (code === 'auth/user-not-found')       return 'No account found with that username.'
  if (code === 'auth/wrong-password')       return 'Incorrect password.'
  if (code === 'auth/too-many-requests')    return 'Too many attempts — please wait a moment and try again.'
  if (code === 'auth/network-request-failed') return 'Connection error — check your internet and try again.'
  return 'Something went wrong. Please try again.'
}
