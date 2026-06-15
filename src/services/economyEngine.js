/**
 * Economy Engine — per-player XP store currency and inventory.
 * All reads/writes now delegate to the unified Zustand store (hsh_global_app_state).
 * The legacy localStorage key 'proshop_v1' is migrated automatically on first load
 * by the migration guard in useAppStore.js.
 *
 * XP balance = playerStats.xp (rank XP) minus xpSpent.
 * Spending never reduces a player's rank or stats — the store uses rank XP
 * as a milestone currency.
 */
import { useAppStore } from '../store/useAppStore.js'

function _econ(playerId) {
  return useAppStore.getState().economyByPlayer[playerId] ?? { xpSpent: 0, streakFreezes: 0 }
}

function getPlayerData(playerId) {
  const econ = _econ(playerId)
  return {
    xpSpent:   econ.xpSpent   || 0,
    inventory: { streakFreezes: econ.streakFreezes || 0 },
  }
}

function getBalance(playerId, currentXP) {
  const techXP = useAppStore.getState().techniqueByPlayer[playerId]?.bonusXP || 0
  return Math.max(0, currentXP + techXP - (_econ(playerId).xpSpent || 0))
}

// XP is derived from session data via playerStats — no manual award call needed.
function awardXP(amount) { return amount }

function purchaseItem(playerId, currentXP, cost, itemKey) {
  if (itemKey === 'streakFreezes') {
    const ok = useAppStore.getState().purchaseStreakFreeze(playerId, currentXP, cost)
    return ok ? { success: true } : { success: false, reason: 'insufficient' }
  }
  return { success: false, reason: 'unknown_item' }
}

function consumeFreeze(playerId) {
  return useAppStore.getState().consumeFreeze(playerId)
}

function clearPlayer(playerId) {
  useAppStore.getState().clearPlayerEconomy(playerId)
}

export const economyEngine = {
  getPlayerData,
  getBalance,
  awardXP,
  purchaseItem,
  consumeFreeze,
  clearPlayer,
}
