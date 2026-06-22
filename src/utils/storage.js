import { loadFromFirestore, saveToFirestore, forceSessionSync } from './firestoreSync.js'
import { useAppStore } from '../store/useAppStore.js'
import { healPlayerStats } from './profileHealer.js'

const SK = 'puck_v5'

// Module-level flag: the profile healer runs exactly once per browser session.
// It must never run inside the real-time onSnapshot pipeline — only at boot.
let _healerHasRun = false

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
      // Start from localTech so that dailyLog (local-only, used for streak calcs)
      // is never discarded.  Then take the maximum of cloud vs local for the two
      // writable numeric counters — neither source can roll back the other device.
      // Also merge dailyLogs: union of all dates, taking max count per date, so
      // weekly shot counts survive cross-device and fresh-load scenarios where the
      // local dailyLog may be empty even though totalPucks has been restored.
      const candidate = { ...localTech }
      let needsUpdate = false

      for (const [pid, cloudEntry] of Object.entries(cloudTech)) {
        const local          = localTech[pid] || { totalPucks: 0, bonusXP: 0 }
        const bestTotalPucks = Math.max(cloudEntry.totalPucks || 0, local.totalPucks || 0)
        const bestBonusXP    = Math.max(cloudEntry.bonusXP    || 0, local.bonusXP    || 0)

        // Merge dailyLogs — max count per date so neither device over-counts
        const cloudLog = cloudEntry.dailyLog || {}
        const localLog = local.dailyLog || {}
        const allDates = new Set([...Object.keys(cloudLog), ...Object.keys(localLog)])
        const mergedLog = {}
        let logChanged = false
        for (const date of allDates) {
          const best = Math.max(cloudLog[date] || 0, localLog[date] || 0)
          mergedLog[date] = best
          if ((localLog[date] || 0) !== best) logChanged = true
        }

        if (bestTotalPucks !== (local.totalPucks || 0) || bestBonusXP !== (local.bonusXP || 0) || logChanged) {
          candidate[pid] = { ...local, dailyLog: mergedLog, totalPucks: bestTotalPucks, bonusXP: bestBonusXP }
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        console.log('[storage] Hydrating techniqueByPlayer from Firestore/merge:', candidate)
        // Use the function form of setState: if the computed candidate turns out
        // equal to current state, return the SAME state reference so Zustand
        // skips notifying subscribers and React skips the re-render entirely.
        useAppStore.setState(state => {
          const current = state.techniqueByPlayer || {}
          const changed = Object.keys(candidate).some(pid => {
            const c = candidate[pid]
            const s = current[pid]
            if ((c?.totalPucks ?? 0) !== (s?.totalPucks ?? 0)) return true
            if ((c?.bonusXP    ?? 0) !== (s?.bonusXP    ?? 0)) return true
            // Also check dailyLog so a restored log triggers a re-render
            const cLog = c?.dailyLog || {}
            const sLog = s?.dailyLog || {}
            const cDates = Object.keys(cLog)
            const sDates = Object.keys(sLog)
            if (cDates.length !== sDates.length) return true
            return cDates.some(date => (cLog[date] || 0) !== (sLog[date] || 0))
          })
          if (!changed) return state           // same reference → zero listener calls
          return { ...state, techniqueByPlayer: candidate }
        })
      }
    }

    // ── Session reconciliation — heal the premature-empty-save bug ───────────
    // The bug: sessions were written to Firestore at creation time with sets:[]
    // and never re-written after shots were logged (syncedSessionIds cache block).
    // On any page refresh loadFromFirestore() returned the empty sets, which then
    // overwrote localStorage — making Career and Recent Sessions show 0 shots.
    //
    // Fix: for every cloud session with no sets, check if localStorage has the
    // same session with actual data.  If so, keep the local version and push it
    // back to Firestore so future loads get the correct data.
    // Also include sessions present only in localStorage (never reached Firestore).
    const cloudSessionArr = cloudData.sessions || []
    const localSessionArr = localData?.sessions || []
    const localSessionMap = new Map(localSessionArr.map(s => [s.id, s]))
    const cloudSessionIds = new Set(cloudSessionArr.map(s => s.id))

    // Reconcile cloud sessions against local data
    const healedSessions = cloudSessionArr.map(cs => {
      const ls = localSessionMap.get(cs.id)
      const cloudSets = cs.sets?.length ?? 0
      const localSets = ls?.sets?.length ?? 0
      if (ls && localSets > cloudSets) {
        console.log(
          `[storage] Healing session ${cs.id}: cloud had ${cloudSets} sets, ` +
          `local has ${localSets} — using local and pushing to Firestore.`
        )
        // Push corrected session to Firestore asynchronously; doesn't block render.
        // Writing to the sessions subcollection does NOT trigger the team onSnapshot,
        // so there is no risk of creating the update-loop that previously caused crashes.
        forceSessionSync(ls).catch(err =>
          console.warn('[storage] Session heal push failed:', err.message)
        )
        return ls
      }
      return cs
    })

    // Sessions only in localStorage (never reached Firestore — e.g. offline sessions)
    const localOnlySessions = localSessionArr.filter(
      ls => !cloudSessionIds.has(ls.id) && (ls.sets?.length ?? 0) > 0
    )
    if (localOnlySessions.length > 0) {
      console.log(
        `[storage] Found ${localOnlySessions.length} local-only session(s) — pushing to Firestore.`
      )
      localOnlySessions.forEach(ls =>
        forceSessionSync(ls).catch(err =>
          console.warn('[storage] Local-only session push failed:', err.message)
        )
      )
    }

    // Build merged sessions array — healed cloud sessions + local-only sessions
    const reconciledSessions = [...healedSessions, ...localOnlySessions]

    // Strip techniqueByPlayer from the returned state — Zustand owns it.
    // eslint-disable-next-line no-unused-vars
    const { techniqueByPlayer: _tech, ...stateFields } = cloudData
    const merged = { ...DEFAULT_STATE, ...stateFields, sessions: reconciledSessions }

    // ── Profile Healer ────────────────────────────────────────────────────────
    // Runs exactly once per browser session (guarded by _healerHasRun).
    // MUST NOT call saveSt() — an unguarded Firestore write here would fire
    // a snapshot before the app's isHydrating/echo guards are established,
    // creating the infinite loop. The healed Zustand state is picked up by
    // the next regular saveSt() call once the player view mounts.
    if (!_healerHasRun) {
      _healerHasRun = true
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
        // Function form: return same state reference when values are already equal,
        // preventing Zustand from notifying subscribers unnecessarily.
        useAppStore.setState(state => ({
          ...state,
          techniqueByPlayer: healedTech,
        }))
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
