import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { loadSt, saveSt, DEFAULT_STATE } from '../utils/storage.js'
import { subscribeToTeam } from '../services/realtimeSync.js'
import { audioEngine } from '../services/audioEngine.js'
import { useAppStore } from '../store/useAppStore.js'

const PlayerContext = createContext(null)

export const ACTIVE_PLAYER_KEY = 'puck_activePlayer'

export function PlayerProvider({ children }) {
  const [st,              setSt]             = useState(null)
  const [loading,         setLoading]        = useState(true)
  const [coachAwardToast, setCoachAwardToast] = useState(null)

  const lastSaveRef             = useRef(0)
  // Holds the players array from the first subscribeToTeam snapshot when it arrives
  // before loadSt() completes (st is still null at that point so the normal merge
  // path returns early).  The boot effect drains this ref and merges it into the
  // initial state so the login screen always shows current ELO/ranks.
  const pendingTeamPlayersRef   = useRef(null)
  // Set to true INSIDE the setSt() functional update when the snapshot changes st.
  // Consumed (reset to false) by the [st] save-effect so that exactly the one st
  // change caused by the snapshot is skipped — without any setTimeout race.
  const stFromSnapshotRef       = useRef(false)
  // Timestamp of the last received snapshot; prevents saveSt from firing within
  // 2 s of a snapshot even if stFromSnapshotRef was already consumed.
  const lastSnapshotTimeRef     = useRef(0)
  // Rate-limit counters: abort if more than 5 snapshots arrive within 1 s.
  const snapshotCountRef        = useRef(0)
  const snapshotWindowRef       = useRef(0)
  const activePlayerIdRef       = useRef(null)
  const teamUnsubRef            = useRef(null)
  const lastPlayersRef          = useRef(null)   // null = listener baseline not yet set
  const coachAwardToastTimerRef = useRef(null)

  const upd = patch => setSt(prev => ({ ...prev, ...patch }))

  // Keep ref in sync so the team onSnapshot closure always reads the latest value
  activePlayerIdRef.current = st?.activePlayerId ?? null

  // ── Boot: Firestore → localStorage fallback ───────────────────────────────
  useEffect(() => {
    loadSt().then(saved => {
      const base = saved || { ...DEFAULT_STATE }

      // If the real-time team listener fired before loadSt() resolved, its snapshot
      // was discarded (st was null).  Merge those fresh players in now so the login
      // screen shows current ELO/ranks instead of whatever was in the Firestore cache.
      const pending = pendingTeamPlayersRef.current
      if (pending && pending.length > 0 && base.players?.length > 0) {
        base.players = base.players.map(lp => {
          const sp = pending.find(p => p.id === lp.id)
          if (!sp) return lp
          return {
            ...sp,
            // Keep local-wins for contested accumulator fields
            diamonds:    Math.max(sp.diamonds    || 0, lp.diamonds    || 0),
            streakCount: Math.max(sp.streakCount || 0, lp.streakCount || 0),
          }
        })
        pendingTeamPlayersRef.current = null
        // Treat this as a snapshot-driven change so the persist effect skips the
        // immediate echo write back to Firestore.
        stFromSnapshotRef.current  = true
        lastSnapshotTimeRef.current = Date.now()
      }

      const savedId = localStorage.getItem(ACTIVE_PLAYER_KEY)
      if (savedId && base.players?.find(p => p.id === savedId)) {
        setSt({ ...base, view: 'player', activePlayerId: savedId, activeSessionId: null })
      } else {
        setSt({ ...base, view: 'home' })
      }
      setLoading(false)
    })
  }, []) // eslint-disable-line

  // ── Persist: localStorage + Firestore on every state change ───────────────
  useEffect(() => {
    if (!st) return
    // Boot-failure safeguard: if both Firestore and localStorage failed to load,
    // DEFAULT_STATE has players:[] — writing that to Firestore would wipe everyone.
    // Only skip if players is empty AND we have no activePlayerId (true blank state).
    if (st.players.length === 0 && !st.activePlayerId) return

    // Echo guard (precise, race-condition-free): skip the exact save triggered by
    // an incoming snapshot to prevent the snapshot → saveSt → snapshot echo cycle.
    if (stFromSnapshotRef.current) {
      stFromSnapshotRef.current = false
      return
    }

    // Post-snapshot debounce: if a snapshot arrived less than 2 s ago, skip the
    // write even if stFromSnapshotRef was already consumed (e.g. rapid 2nd snapshot).
    if (Date.now() - lastSnapshotTimeRef.current < 2000) return

    saveSt(st)
    lastSaveRef.current = Date.now()
  }, [st])

  // ── Real-time team document listener ─────────────────────────────────────
  // Keeps player data (diamonds, ELO, coachMsg, etc.) in sync across devices.
  // Loop guard: setSt returns `prev` unchanged when incoming players match
  // local state, preventing re-render → saveSt → Firestore echo cycles.
  useEffect(() => {
    const unsub = subscribeToTeam(teamData => {
      // Snapshot rate-limiter: if more than 5 snapshots arrive within any 1-second
      // window we are in a loop — short-circuit before React's update depth limit.
      const _now = Date.now()
      if (_now - snapshotWindowRef.current > 1000) {
        snapshotCountRef.current  = 0
        snapshotWindowRef.current = _now
      }
      snapshotCountRef.current += 1
      if (snapshotCountRef.current > 5) {
        console.warn(
          `[realtimeSync] Rate limit: ${snapshotCountRef.current} snapshots in 1 s — ` +
          `skipping to prevent infinite loop. Check techniqueByPlayer or players write cycle.`
        )
        return
      }

      lastSnapshotTimeRef.current = _now

      const incoming = teamData.players || []
      const activeId = activePlayerIdRef.current

      // Diagnostic: log what Firestore is delivering for the active player.
      if (activeId) {
        const snap = incoming.find(p => p.id === activeId)
        if (snap) {
          console.log(
            '[realtimeSync] team snapshot for active player:',
            snap.name,
            '| streakCount:', snap.streakCount ?? 'unset',
            '| lastActivity:', snap.lastActivity
              ? new Date(snap.lastActivity).toLocaleString()
              : 'unset',
            '| diamonds:', snap.diamonds ?? 0,
            '| elo:', snap.elo ?? 'unset',
          )
        }
      }

      // Diamond-increase toast: compare against the previous snapshot baseline.
      // Skip the very first fire (baseline = null) to avoid false toasts on login.
      if (lastPlayersRef.current !== null) {
        if (activeId) {
          const prev = lastPlayersRef.current.find(p => p.id === activeId)
          const next = incoming.find(p => p.id === activeId)
          if (prev && next) {
            const gained = (next.diamonds || 0) - (prev.diamonds || 0)
            if (gained > 0) {
              clearTimeout(coachAwardToastTimerRef.current)
              setCoachAwardToast({ amount: gained, playerName: next.name })
              coachAwardToastTimerRef.current = setTimeout(() => setCoachAwardToast(null), 5000)
              audioEngine.playUtilitySuccess()
            }
          }
        }
      }
      lastPlayersRef.current = incoming

      setSt(prev => {
        if (!prev) {
          // Boot hasn't completed yet — stash players so the boot effect can apply
          // them to the initial state instead of losing this snapshot entirely.
          pendingTeamPlayersRef.current = incoming
          return prev
        }
        const prevPlayers = prev.players || []

        // Normalize helper: treat null and undefined as equal for field comparison
        // so Firestore null round-trips don't create spurious hasChanges = true.
        const eq = (a, b) => (a ?? null) === (b ?? null)

        // Only merge when something actually changed — avoids re-rendering on
        // our own write echoing back from Firestore.
        const hasChanges =
          incoming.length !== prevPlayers.length ||
          incoming.some(ip => {
            const lp = prevPlayers.find(p => p.id === ip.id)
            if (!lp) return true
            return (
              !eq(ip.diamonds,       lp.diamonds)       ||
              !eq(ip.elo,            lp.elo)            ||
              !eq(ip.coachMsg,       lp.coachMsg)       ||
              !eq(ip.eloLastUpdated, lp.eloLastUpdated) ||
              !eq(ip.totalWins,      lp.totalWins)      ||
              !eq(ip.hasEloShield,   lp.hasEloShield)   ||
              !eq(ip.streakCount,    lp.streakCount)    ||
              !eq(ip.lastActivity,   lp.lastActivity)
            )
          })

        if (!hasChanges) return prev

        // Mark that this specific st change was caused by a snapshot so the
        // [st] save-effect skips the Firestore echo write precisely.
        stFromSnapshotRef.current = true

        return {
          ...prev,
          players: incoming.map(ip => {
            const lp = prevPlayers.find(p => p.id === ip.id)
            if (!lp) return ip
            return {
              ...ip,
              // Keep whichever diamond total is higher so a local claim mid-session
              // is never clobbered by a slightly-stale snapshot from Firestore.
              diamonds:    Math.max(ip.diamonds    || 0, lp.diamonds    || 0),
              // Keep whichever streakCount is higher so a just-awarded streak from
              // updateStreak() isn't lost if a concurrent local write races it.
              streakCount: Math.max(ip.streakCount || 0, lp.streakCount || 0),
            }
          }),
        }
      })

      // Sync techniqueByPlayer from server into Zustand
      // Safety: ensure both getState and mapping are null-safe
      try {
        const serverTech = teamData.techniqueByPlayer
        if (serverTech && Object.keys(serverTech).length > 0) {
          const current    = useAppStore.getState()?.techniqueByPlayer || {}
          let hasNewData   = false
          const mergedTech = { ...current }

          for (const [pid, srv] of Object.entries(serverTech)) {
            const local = current[pid] || { totalPucks: 0, bonusXP: 0 }
            // Validate numeric values to prevent NaN from Math.max
            const localPucks = Number(local.totalPucks) || 0
            const serverPucks = Number(srv.totalPucks) || 0
            const mergedTotalPucks = Math.max(localPucks, serverPucks)
            const mergedBonusXP    = Math.max(Number(local.bonusXP) || 0, Number(srv.bonusXP) || 0)

          const srvLog   = srv.dailyLog   || {}
          const localLog = local.dailyLog || {}
          const allDates = new Set([...Object.keys(srvLog), ...Object.keys(localLog)])
          const mergedLog = {}
          let logChanged = false
          for (const date of allDates) {
            const best = Math.max(srvLog[date] || 0, localLog[date] || 0)
            mergedLog[date] = best
            if ((localLog[date] || 0) !== best) logChanged = true
          }

          if (mergedTotalPucks !== (local.totalPucks ?? 0) || mergedBonusXP !== (local.bonusXP ?? 0) || logChanged) {
            hasNewData = true
            mergedTech[pid] = { ...local, dailyLog: mergedLog, totalPucks: mergedTotalPucks, bonusXP: mergedBonusXP }
          }
        }

        if (hasNewData) {
          useAppStore.setState({ techniqueByPlayer: mergedTech })
        }
        }
      } catch (err) {
        console.error('[realtimeSync] techniqueByPlayer merge failed:', err.message)
      }
    })

    teamUnsubRef.current = unsub
    return () => { unsub(); teamUnsubRef.current = null }
  }, []) // eslint-disable-line

  // ── Re-sync on app focus / tab visibility restore ─────────────────────────
  useEffect(() => {
    const lastSync = { ts: 0 }
    function handleFocus() {
      const now = Date.now()
      if (now - lastSync.ts < 5000) return          // debounce repeated fires
      if (now - lastSaveRef.current < 15000) return // we just wrote; Firestore may not have it yet
      lastSync.ts = now
      loadSt().then(fresh => {
        if (!fresh) return
        setSt(prev => ({
          ...fresh,
          // Preserve in-progress navigation — don't bounce a live session
          view:            prev?.view            ?? fresh.view,
          activePlayerId:  prev?.activePlayerId  ?? fresh.activePlayerId,
          activeSessionId: prev?.activeSessionId ?? fresh.activeSessionId,
          // Per-player: keep whichever diamond total is higher (with NaN safety)
          players: (fresh.players || []).map(fp => {
            const lp = prev?.players?.find(p => p.id === fp.id)
            if (!lp) return fp
            const fpDiamonds = Number(fp.diamonds) || 0
            const lpDiamonds = Number(lp.diamonds) || 0
            return { ...fp, diamonds: Math.max(fpDiamonds, lpDiamonds) }
          }),
        }))
      })
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') handleFocus()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, []) // eslint-disable-line

  const activePlayer = st ? (st.players.find(p => p.id === st.activePlayerId) ?? null) : null

  return (
    <PlayerContext.Provider value={{
      st,
      setSt,
      upd,
      loading,
      activePlayer,
      coachAwardToast,
      setCoachAwardToast,
      lastSaveRef,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider')
  return ctx
}
