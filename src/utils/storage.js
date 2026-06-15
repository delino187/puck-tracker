import { loadFromFirestore, saveToFirestore } from './firestoreSync.js'

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

export async function loadSt() {
  // Prefer Firestore — most up-to-date data across devices.
  // On success, update localStorage so offline fallback is fresh.
  const cloudData = await loadFromFirestore()
  if (cloudData) {
    try { localStorage.setItem(SK, JSON.stringify(cloudData)) } catch {}
    return cloudData
  }

  // Firestore unavailable (offline / first run) — fall back to localStorage.
  try {
    if (window.storage) {
      const r = await window.storage.get(SK)
      return r ? JSON.parse(r.value) : null
    }
    const raw = localStorage.getItem(SK)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function saveSt(s) {
  // Write localStorage first — fast, synchronous, always works offline.
  try {
    if (window.storage) {
      await window.storage.set(SK, JSON.stringify(s))
    } else {
      localStorage.setItem(SK, JSON.stringify(s))
    }
  } catch {}

  // Mirror to Firestore in the background — fire-and-forget.
  // Errors are caught inside saveToFirestore; they never block the UI.
  saveToFirestore(s)
}
