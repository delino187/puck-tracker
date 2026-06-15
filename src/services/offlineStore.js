/**
 * Offline Store — persistent state with online/offline awareness.
 * Wraps localStorage (+ optional window.storage native adapter).
 * Drop-in replacement for utils/storage.js with additional event hooks.
 *
 * Online/offline events automatically trigger syncQueue.flushQueue() via
 * registerSyncFlush(). This keeps the outbox pattern decoupled — offlineStore
 * owns the event; syncQueue owns the drain logic.
 */
import { syncQueue } from './syncQueue.js'

const STORE_KEY      = 'puck_v5'
const SCHEMA_VERSION = 5

export const DEFAULT_STATE = {
  players:          [],
  sessions:         [],
  view:             'home',
  activePlayerId:   null,
  activeSessionId:  null,
  dailyChallenge:   null,
  weeklyChallenge:  null,
  h2h:              null,
  h2hHistory:       [],
  _schema:          SCHEMA_VERSION,
}

class OfflineStore {
  constructor() {
    this._listeners    = []
    this._isOnline     = typeof navigator !== 'undefined' ? navigator.onLine : true

    if (typeof window !== 'undefined') {
      window.addEventListener('online',  () => this._setOnline(true))
      window.addEventListener('offline', () => this._setOnline(false))
    }
  }

  // ── Online / offline ────────────────────────────────────────────────────────
  get isOnline() { return this._isOnline }

  _setOnline(online) {
    this._isOnline = online
    this._listeners.forEach(cb => cb({ online }))
    // Auto-drain the outbox whenever connectivity is restored
    if (online && this._flushCallback) {
      syncQueue.flushQueue(this._flushCallback)
    }
  }

  /** Subscribe to connection status changes. Returns an unsubscribe fn. */
  onStatusChange(cb) {
    this._listeners.push(cb)
    return () => { this._listeners = this._listeners.filter(l => l !== cb) }
  }

  /**
   * Register the sync-queue flush callback once (called from App on mount).
   * On every reconnect event, the outbox drains via this callback.
   */
  registerSyncFlush(flushCallback) {
    this._flushCallback = flushCallback
    // Attempt an immediate drain if we're already online
    if (this._isOnline) syncQueue.flushQueue(flushCallback)
  }

  // ── Persistence ─────────────────────────────────────────────────────────────
  async load() {
    try {
      let raw = null

      if (typeof window !== 'undefined' && window.storage) {
        const r = await window.storage.get(STORE_KEY)
        raw = r?.value ?? null
      } else {
        raw = localStorage.getItem(STORE_KEY)
      }

      if (!raw) return null
      const parsed = JSON.parse(raw)

      // Schema migration: add missing top-level keys without wiping data
      return { ...DEFAULT_STATE, ...parsed }
    } catch {
      return null
    }
  }

  async save(state) {
    try {
      const serial = JSON.stringify({ ...state, _schema: SCHEMA_VERSION })
      if (typeof window !== 'undefined' && window.storage) {
        await window.storage.set(STORE_KEY, serial)
      } else {
        localStorage.setItem(STORE_KEY, serial)
      }
    } catch {}
  }

  async clear() {
    try {
      if (typeof window !== 'undefined' && window.storage) {
        await window.storage.remove?.(STORE_KEY)
      } else {
        localStorage.removeItem(STORE_KEY)
      }
    } catch {}
  }

  /** Returns a snapshot of the current size in bytes (approx.) */
  sizeBytes() {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      return raw ? new Blob([raw]).size : 0
    } catch { return 0 }
  }
}

export const offlineStore = new OfflineStore()

// Re-export the helpers that the rest of the codebase uses
// so storage.js can be migrated gradually
export const loadSt  = () => offlineStore.load()
export const saveSt  = (s) => offlineStore.save(s)
