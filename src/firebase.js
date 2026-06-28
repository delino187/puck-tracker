import { initializeApp } from 'firebase/app'
import { getAuth }        from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getStorage }     from 'firebase/storage'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

// IndexedDB-backed offline persistence: Firestore SDK buffers any writes
// that arrive while Wi-Fi is down and replays them automatically on reconnect.
// Without this, every setDoc() during a network drop throws an error and the
// player's shot data is only preserved in localStorage — not in Firestore.
//
// persistentMultipleTabManager allows the app to sync correctly across open
// browser tabs (e.g. a player reviewing stats in one tab while logging in another).
// If IndexedDB is unavailable (private/incognito mode), the SDK silently falls
// back to in-memory caching — no crash, just no offline write buffering.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})

export const storage = getStorage(app)
