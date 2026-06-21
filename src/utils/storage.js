import { loadFromFirestore, saveToFirestore } from './firestoreSync.js'
import { useAppStore } from '../store/useAppStore.js'
import { healPlayerStats } from './profileHealer.js'

const SK = 'puck_v5'

export const DEFAULT_STATE = {
  players: [],
  sessions: [],
  view: 'home',
  activePlayerId: null,
  activeSessionId: null,
  dailyChallenge: null,
  weeklyChallenge: null,
  h2h: null,
  h2hHistory: [],
}

// ── Load ──────────────────────────────────────────────────────────────────────
export async function loadSt() {
  // ── Local snapshot for reconciliation ──────────────────────────────────────
  // Read localStorage FIRST — before the async Firestore call — so we can
  // compare session counts and warn if the cloud looks suspiciously empty.
  let localData = null
  try {
    const raw = localStorage.getItem(SK)
    localData = raw ? JSON.parse(raw) : null
  } catch {}

  // ── Prefer Firestore (most up-to-date, cross-device) ──────────────────────
  const cloudData = await loadFromFirestore()

  if (cloudData) {
    const cloudSessions = cloudData.sessions?.length  || 0
    const localSessions = localData?.sessions?.length || 0

    // Reconciliation warning: if localStorage has meaningfully more sessions than
    // Firestore, something may have failed to sync.  We still trust Firestore as
    // source of truth for the shared team doc, but flag it so it's visible in
    // the console and on-screen warnings can be added later.
    if (localSessions > cloudSessions + 2) {
      console.warn(
        `[storage] Reconciliation gap: localStorage has ${localSessions} sessions ` +
        `but Firestore only has ${cloudSessions}. This may indicate a sync failure. ` +
        `The app will use Firestore data and attempt a re-save.`,
      )
    }

    // ── Hydrate Zustand techniqueByPlayer from Firestore ──────────────────────
    // techniqueByPlayer (bonusXP + totalPucks from challenges / PUCK games /
    // technique mode / coach credits) lives in Zustand → localStorage by default.
    // Without this step it is LOST on any device that hasn't seen these events
    // locally (e.g. a second device, a cleared cache, a fresh install).
    const cloudTech = cloudData.techniqueByPlayer || {}
    const localTech = useAppStore.getState().techniqueByPlayer || {}
    const hasTechData = Object.keys(cloudTech).length > 0 || Object.keys(localTech).length > 0

    if (hasTechData) {
      // Per-player: take the maximum of cloud and local for each counter so that
      // neither source can roll back progress earned on the other device.
      const merged = { ...cloudTech }
      for (const [pid, localEntry] of Object.entries(localTech)) {
        const cloudEntry = merged[pid] || { totalPucks: 0, bonusXP: 0 }
        const mergedEntry = {
          totalPucks: Math.max(cloudEntry.totalPucks || 0, localEntry.totalPucks || 0),
          bonusXP:    Math.max(cloudEntry.bonusXP    || 0, localEntry.bonusXP    || 0),
        }
        // Only update if something actually changed to avoid redundant Zustand writes
        if (
          mergedEntry.totalPucks !== (cloudEntry.totalPucks || 0) ||
          mergedEntry.bonusXP    !== (cloudEntry.bonusXP    || 0)
        ) {
          merged[pid] = mergedEntry
        } else {
          merged[pid] = cloudEntry
        }
      }

      const currentTech = useAppStore.getState().techniqueByPlayer
      if (JSON.stringify(merged) !== JSON.stringify(currentTech)) {
        console.log('[storage] Hydrating techniqueByPlayer from Firestore/merge:', merged)
        useAppStore.setState({ techniqueByPlayer: merged })
      }
    }

    // Strip techniqueByPlayer from the returned state — Zustand owns it.
    // eslint-disable-next-line no-unused-vars
    const { techniqueByPlayer: _tech, ...stateFields } = cloudData
    const merged = { ...DEFAULT_STATE, ...stateFields }

    // ── Profile Healer ────────────────────────────────────────────────────────
    // Volume-badge evidence lets us restore the minimum totalPucks / bonusXP
    // floor for any player whose techniqueByPlayer entry is missing or too low
    // (e.g. after a cache clear or login from a fresh device).
    {
      const latestTech = useAppStore.getState().techniqueByPlayer
      const healedTech = { ...latestTech }
      let isHealed = false

      for (const player of (merged.players || [])) {
        const repaired = healPlayerStats(player, merged.sessions || [], latestTech[player.id])
        if (repaired) {
          console.log(
            `[Healer] Restored ${player.name}'s profile to ${repaired.totalPucks} pucks ` +
            `/ ${repaired.bonusXP} XP based on unlocked milestone badge.`
          )
          healedTech[player.id] = repaired
          isHealed = true
        }
      }

      if (isHealed) {
        // Push corrected values into Zustand immediately so the UI reflects them
        useAppStore.setState({ techniqueByPlayer: healedTech })
        // saveSt reads the fresh Zustand state, so the healed values reach Firestore
        saveSt(merged)
      }
    }

    // Mirror merged cloud data to localStorage so offline fallback is fresh.
    try { localStorage.setItem(SK, JSON.stringify(merged)) } catch {}
    return merged
  }

  // ── Firestore unavailable — fall back to localStorage ─────────────────────
  console.warn('[storage] Firestore unavailable — loading from localStorage fallback.')
  if (localData) {
    console.log(
      '[storage] localStorage fallback: players =', localData.players?.length ?? 0,
      '| sessions =', localData.sessions?.length ?? 0,
    )
  }
  try {
    if (window.storage) {
      const r = await window.storage.get(SK)
      return r ? JSON.parse(r.value) : null
    }
    return localData
  } catch {
    return null
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
// activePlayerId: when provided, Firestore write uses a transaction that merges
// only that player's entry so concurrent coach edits are never clobbered.
export async function saveSt(s, activePlayerId = null) {
  // Write localStorage first — fast, synchronous, always works offline.
  // This is the primary safety net: even if Firestore fails, the player's
  // data survives on this device.
  try {
    if (window.storage) {
      await window.storage.set(SK, JSON.stringify(s))
    } else {
      localStorage.setItem(SK, JSON.stringify(s))
    }
  } catch {}

  // Read the current techniqueByPlayer from Zustand so it travels to Firestore
  // alongside the rest of the state.  This is the only cross-device sync path
  // for challenge XP, PUCK game shots, technique-mode pucks, and coach credits.
  const techniqueByPlayer = useAppStore.getState().techniqueByPlayer || {}

  // Mirror to Firestore — fire-and-forget.  saveToFirestore re-throws on
  // failure (with console.error) so callers that need to know can await it.
  saveToFirestore(s, techniqueByPlayer, activePlayerId).catch(() => {
    // Already logged inside saveToFirestore; suppress unhandled-rejection warning.
  })
}
