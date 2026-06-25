/**
 * Notification Engine
 *
 * Provides two layers of notification for challenge-answered events:
 *
 * Layer 1 — Native Notification API (browser/PWA)
 *   Works when the app is open in any foreground or background browser tab, or
 *   installed as a PWA on iOS/Android.  Does NOT require a service worker or
 *   VAPID keys.  Fires `new Notification(title, options)` directly from the
 *   page context.
 *
 * Layer 2 — In-app glowing banner
 *   Fires unconditionally via UIContext state.  Covers every case including
 *   denied permissions and unsupported browsers.
 *
 * Layer 3 (future) — True OS Web Push when app is closed
 *   Requires a registered service worker + VAPID keys + a server-side push
 *   trigger (e.g. Firebase Cloud Functions).  The `isPushEnabled` flag stored
 *   on the player record here is the prerequisite — once a backend exists it
 *   can read this flag and send push messages to subscribed players.
 */

const NOTIF_ASKED_KEY = 'puck_notifAsked'

// ── Permission state ──────────────────────────────────────────────────────────

export function getPermissionState() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission  // 'default' | 'granted' | 'denied'
}

/**
 * Requests browser notification permission exactly once per device.
 * Returns `true` if the user grants permission (now or previously).
 * Safe to call from any component — silently no-ops if already asked.
 */
export async function requestPermissionIfNeeded() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied')  return false

  // Only ask once per browser session (avoids repeated prompts that
  // condition users to dismiss all permission dialogs).
  if (localStorage.getItem(NOTIF_ASKED_KEY)) return false

  try {
    localStorage.setItem(NOTIF_ASKED_KEY, '1')
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

/**
 * Shows a native browser/PWA notification if permission is currently granted.
 * Falls back silently if not.  Safe to call at any time.
 *
 * @param {string} tag  - Notification tag. Same tag replaces any prior notification
 *                        of that type rather than stacking duplicates.
 *                        Use 'versus-challenge' for match results, 'puck-turn' for turns.
 */
export function showNativeNotification(title, body, icon = '/android-chrome-192x192.png', tag = 'puck-game') {
  if (typeof window === 'undefined')            return
  if (!('Notification' in window))              return
  if (Notification.permission !== 'granted')    return

  try {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body, icon, tag,
          badge:    '/android-chrome-192x192.png',
          renotify: true,
        }).catch(() => {})
      }).catch(() => _fireInlineNotification(title, body, icon, tag))
    } else {
      _fireInlineNotification(title, body, icon, tag)
    }
  } catch {
    // Notification constructor can throw on some iOS versions — fail silently
  }
}

function _fireInlineNotification(title, body, icon, tag) {
  try {
    const n = new Notification(title, { body, icon, tag, renotify: true })
    setTimeout(() => { try { n.close() } catch {} }, 8000)
  } catch {}
}
