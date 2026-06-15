import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Legacy key migration ─────────────────────────────────────────────────────
// Runs once synchronously before the store is created so Zustand reads merged data.
;(function migrateLegacyKeys() {
  try {
    const legacyEcon  = localStorage.getItem('proshop_v1')
    const legacyTheme = localStorage.getItem('theme')
    // Also handle any hypothetical standalone keys from earlier experiments
    const legacyXP    = localStorage.getItem('xpBalance')
    const legacyAtwPB = localStorage.getItem('atw_personal_best')

    if (!legacyEcon && legacyTheme === null && !legacyXP && !legacyAtwPB) return

    const raw    = localStorage.getItem('hsh_global_app_state')
    const stored = raw ? JSON.parse(raw) : { state: {}, version: 0 }
    const state  = stored.state || {}
    let changed  = false

    // Migrate proshop_v1 → economyByPlayer
    if (legacyEcon) {
      const legacyData = JSON.parse(legacyEcon)
      const merged     = { ...(state.economyByPlayer || {}) }
      for (const [pid, pd] of Object.entries(legacyData)) {
        if (!merged[pid]) {
          merged[pid] = {
            xpSpent:       pd.xpSpent              || 0,
            streakFreezes: pd.inventory?.streakFreezes || 0,
          }
          changed = true
        }
      }
      if (changed) state.economyByPlayer = merged
      localStorage.removeItem('proshop_v1')
    }

    // Migrate theme → settings.isOutsideMode
    if (legacyTheme !== null) {
      state.settings = { ...(state.settings || {}), isOutsideMode: legacyTheme === 'outside' }
      localStorage.removeItem('theme')
      changed = true
    }

    // Clean up any other orphaned keys
    if (legacyXP)    localStorage.removeItem('xpBalance')
    if (legacyAtwPB) localStorage.removeItem('atw_personal_best')

    if (changed) {
      stored.state = state
      localStorage.setItem('hsh_global_app_state', JSON.stringify(stored))
    }
  } catch {}
})()

// ─── Unified Zustand store ────────────────────────────────────────────────────
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Per-player economy vault — replaces the old proshop_v1 localStorage key.
      // Keyed by playerId so all players' data lives in one place.
      economyByPlayer: {},

      // Per-player technique-only shot volume and bonus XP.
      // Technique shots bypass accuracy tracking; earn +1 XP per puck flat.
      techniqueByPlayer: {},

      // Global UI preferences — replaces the old 'theme' localStorage key.
      settings: {
        isOutsideMode: false,
      },

      // ── Economy actions ────────────────────────────────────────────────────
      purchaseStreakFreeze: (playerId, currentXP, cost) => {
        const econ    = get().economyByPlayer[playerId] ?? { xpSpent: 0, streakFreezes: 0 }
        const balance = Math.max(0, currentXP - (econ.xpSpent || 0))
        if (balance < cost) return false
        set(state => ({
          economyByPlayer: {
            ...state.economyByPlayer,
            [playerId]: {
              xpSpent:       (econ.xpSpent || 0) + cost,
              streakFreezes: (econ.streakFreezes || 0) + 1,
            },
          },
        }))
        return true
      },

      consumeFreeze: (playerId) => {
        const econ = get().economyByPlayer[playerId] ?? { xpSpent: 0, streakFreezes: 0 }
        if (!econ.streakFreezes || econ.streakFreezes <= 0) return false
        set(state => ({
          economyByPlayer: {
            ...state.economyByPlayer,
            [playerId]: { ...econ, streakFreezes: econ.streakFreezes - 1 },
          },
        }))
        return true
      },

      clearPlayerEconomy: (playerId) => {
        set(state => {
          const next = { ...state.economyByPlayer }
          delete next[playerId]
          return { economyByPlayer: next }
        })
      },

      // ── Technique actions ──────────────────────────────────────────────────
      // Increments career puck count and awards +1 XP per puck.
      // Bypasses zone/accuracy tracking entirely.
      logTechniqueShots: (playerId, pucksShot) => {
        const prev = get().techniqueByPlayer[playerId] ?? { totalPucks: 0, bonusXP: 0 }
        set(state => ({
          techniqueByPlayer: {
            ...state.techniqueByPlayer,
            [playerId]: {
              totalPucks: prev.totalPucks + pucksShot,
              bonusXP:    prev.bonusXP    + pucksShot, // +1 XP per puck
            },
          },
        }))
      },

      // ── Settings actions ───────────────────────────────────────────────────
      toggleOutsideMode: () => set(state => ({
        settings: { ...state.settings, isOutsideMode: !state.settings.isOutsideMode },
      })),
    }),
    {
      name: 'hsh_global_app_state',
      // Only persist plain data — exclude action functions from serialization.
      partialize: (state) => ({
        economyByPlayer:   state.economyByPlayer,
        techniqueByPlayer: state.techniqueByPlayer,
        settings:          state.settings,
      }),
    },
  ),
)
