import { useState, useEffect, useRef } from 'react'
import { AlertCircle, Plus, Lock } from 'lucide-react'

import { loadSt, saveSt, DEFAULT_STATE } from './utils/storage.js'
import { saveToFirestore, deletePlayerData, forceSessionSync } from './utils/firestoreSync.js'
import { audioEngine } from './services/audioEngine.js'
import { sendRageBait, subscribeToRageBaits, dismissRageBait, sendCompliment, subscribeToCompliments, dismissNotification } from './services/rageBaitService.js'
import { RageBaitSenderModal, RageBaitReceiverModal, ComplimentSenderModal, ComplimentReceiverModal } from './components/overlays/RageBaitModal.jsx'
import PuckRoundOutcomeModal from './components/modals/PuckRoundOutcomeModal.jsx'
import { playerStats, newId, getWeekStart, getLevel } from './utils/stats.js'
import { useAppStore } from './store/useAppStore.js'
import { useShallow } from 'zustand/react/shallow'
import { BADGES, getBadgeXP }             from './constants/badges.js'
import { ROOKIE_QUESTS, DEFAULT_ROOKIE_QUESTS } from './constants/rookieQuests.js'
import { useAudio }                      from './hooks/useAudio.js'
import { useTheme }                      from './hooks/useTheme.js'

import HomeScreen         from './components/screens/HomeScreen.jsx'
import PlayerSelectScreen from './components/screens/PlayerSelectScreen.jsx'
import ChallengesTab      from './components/screens/ChallengesTab.jsx'

import Dashboard        from './components/Dashboard.jsx'
import ShootTracker     from './components/ShootTracker.jsx'
import Games            from './components/Games.jsx'
import StreakHub        from './components/StreakHub.jsx'
import DailyQuests      from './components/screens/DailyQuests.jsx'
import TeamLeaderboards from './components/TeamLeaderboards.jsx'
import Leaderboard      from './components/screens/Leaderboard.jsx'
import { updateStreak }      from './utils/streakService.js'
import { applyQuestProgress } from './utils/questHelpers.js'
import GoalHeatmap      from './components/GoalHeatmap.jsx'
import BadgeGrid        from './components/BadgeGrid.jsx'
import RanksTab         from './components/RanksTab.jsx'
import CoachPortal      from './components/CoachPortal.jsx'

import TabBar        from './components/shared/TabBar.jsx'
import PlayerHeader  from './components/shared/PlayerHeader.jsx'
import GlobalStyles  from './components/shared/GlobalStyles.jsx'
import Scaffold      from './components/shared/Scaffold.jsx'

import BadgePopup           from './components/overlays/BadgePopup.jsx'
import OnboardingModal     from './components/overlays/OnboardingModal.jsx'
import EpicCelebration     from './components/overlays/EpicCelebration.jsx'
import CelebOverlay        from './components/overlays/CelebOverlay.jsx'
import CoachMsgPopup       from './components/overlays/CoachMsgPopup.jsx'
import StreakBrokenModal   from './components/overlays/StreakBrokenModal.jsx'
import FeedbackModal       from './components/overlays/FeedbackModal.jsx'
import VersusVictoryModal  from './components/overlays/VersusVictoryModal.jsx'
import VersusTieModal      from './components/overlays/VersusTieModal.jsx'
import VersusDefeatModal   from './components/overlays/VersusDefeatModal.jsx'
import CreatePeerChallenge from './components/screens/CreatePeerChallenge.jsx'
import RespondToChallenge  from './components/screens/RespondToChallenge.jsx'
import { getGameAction } from './services/puckGameService.js'
import { markChallengesAsSeen, claimChallengeWinReward } from './services/peerChallengeService.js'
import { subscribeToTeam, subscribeToChallenges, subscribeToPuckGames } from './services/realtimeSync.js'

import { C, APP_BG } from './styles.js'

// Versus Quick Match win rewards — meaningful difference vs the 1-diamond consolation
const VERSUS_WIN_DIAMONDS = 10
const VERSUS_WIN_XP       = 20

export default function App() {
  const [st,          setSt]         = useState(null)
  const [loading,     setLoading]    = useState(true)
  const lastSaveRef                  = useRef(0)
  const [tab,         setTab]        = useState('dashboard')
  const [sesGoal,     setSesGoal]    = useState(10)
  const [badgePreview,setBadgePreview] = useState(null)
  const [epicCeleb,   setEpicCeleb]   = useState(null)
  const [celeb,       setCeleb]       = useState(null)
  const [newBadgeIds, setNewBadgeIds] = useState({})
  const [flashZone,   setFlashZone]  = useState(null)
  const [flashType,   setFlashType]  = useState(null)
  const [puckAnim,    setPuckAnim]   = useState(null)
  const [pinInput,    setPinInput]   = useState('')
  const [pinErr,      setPinErr]     = useState(false)
  const [npName,        setNpName]       = useState('')
  const [npNum,         setNpNum]        = useState('')
  const [npPw,          setNpPw]         = useState('')
  const [npEmail,       setNpEmail]      = useState('')
  const [rankDetailOpen,  setRankDetailOpen]   = useState(false)
  const [peerChallenges,  setPeerChallenges]   = useState([])
  const [challengeScreen, setChallengeScreen]  = useState(null) // null | 'create' | { mode:'respond', challenge }
  const [puckGames,            setPuckGames]            = useState([])
  const [deepLinkPuckGameId,   setDeepLinkPuckGameId]   = useState(null)
  const [pendingRoundOutcome,  setPendingRoundOutcome]  = useState(null)  // { type, letterAwarded, opponentName, gameId }
  // Clear the deep-link game ID whenever the player leaves the session tab.
  // This avoids PuckGame auto-re-selecting a stale game on subsequent visits.
  // We clear on tab change (not inside ShootTracker) so the ID remains alive
  // long enough for PuckGame to process it before it's nulled out.
  useEffect(() => {
    if (tab !== 'session') setDeepLinkPuckGameId(null)
  }, [tab])

  const [streakBrokenData, setStreakBrokenData] = useState(null)
  const [feedbackOpen,     setFeedbackOpen]     = useState(false)
  const [feedbackToast,    setFeedbackToast]    = useState(false)
  const [rookieToast,      setRookieToast]      = useState(null)
  const rookieToastTimer                         = useRef(null)
  const [isSaving,         setIsSaving]         = useState(false)
  const [weakConnToast,    setWeakConnToast]    = useState(false)
  const [rageBaitSender,     setRageBaitSender]     = useState(false)
  const [rageBaitReceived,   setRageBaitReceived]   = useState(null)
  const [complimentSender,   setComplimentSender]   = useState(false)
  const [complimentReceived, setComplimentReceived] = useState(null)

  const [undoSnapshot,    setUndoSnapshot]    = useState(null)
  const [coachAwardToast, setCoachAwardToast] = useState(null)
  const [victoryReward,   setVictoryReward]   = useState(null)
  const [tieReward,       setTieReward]       = useState(null)
  const [defeatState,     setDefeatState]     = useState(null)
  const undoTimerRef                           = useRef(null)

  const badgeQRef               = useRef([])
  const epicAudioRef            = useRef(null)
  const streakInsuranceCheckedRef = useRef(null)
  const weakConnTimerRef        = useRef(null)
  const rageBaitUnsubRef        = useRef(null)
  const complimentUnsubRef      = useRef(null)
  const teamUnsubRef            = useRef(null)
  // Set to true INSIDE the setSt() functional update when the snapshot changes st.
  // Consumed (reset to false) by the [st] save-effect so that exactly the one st
  // change caused by the snapshot is skipped — without any setTimeout race condition.
  const stFromSnapshotRef       = useRef(false)
  // Timestamp of the last received snapshot; prevents saveSt from firing within
  // 2 s of a snapshot even if stFromSnapshotRef was already consumed (e.g. by a
  // rapid second snapshot that didn't change st but reset the flag).
  const lastSnapshotTimeRef     = useRef(0)
  // Rate-limit counters: if more than 5 snapshots arrive within 1 s, short-circuit
  // and log a warning before React's update depth limit is hit.
  const snapshotCountRef        = useRef(0)
  const snapshotWindowRef       = useRef(0)
  const challengesUnsubRef      = useRef(null)
  const puckGamesUnsubRef       = useRef(null)
  const lastPlayersRef          = useRef(null)   // null = listener baseline not yet set
  const activePlayerIdRef       = useRef(null)
  const coachAwardToastTimerRef = useRef(null)
  const lastChallengeLiRef      = useRef(null)   // null = baseline not yet set
  // ── Versus win detection ──────────────────────────────────────────────────
  // seenVictoryIds: in-session Set of challenge IDs already processed this session.
  //   Prevents rapid snapshot re-fires from calling claimChallengeWinReward twice.
  //   Reset on player switch.  The Firestore field winnerRewardsClaimed is the
  //   persistent cross-session guard; seenVictoryIds is just a session-level lock.
  const seenVictoryIds    = useRef(new Set())

  // Reactive read of the technique/challenge XP pool.  Drives XP bar + level display.
  // useShallow prevents re-renders when a new techniqueByPlayer object is written
  // with the same per-player values (shallow-compares the player-keyed entries).
  const techniqueByPlayer = useAppStore(useShallow(s => s.techniqueByPlayer))
  const play         = useAudio()
  const { theme, toggleOutsideMode } = useTheme()

  const ACTIVE_PLAYER_KEY = 'puck_activePlayer'

  // ── Boot: Firestore → localStorage fallback ───────────────────────────────
  useEffect(() => {
    loadSt().then(saved => {
      const base = saved || { ...DEFAULT_STATE }
      // Auto-login: if a player ID was saved on last login, route straight to
      // their dashboard without forcing them through the selection screen.
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

    // ── Echo guard (precise, race-condition-free) ──────────────────────────
    // stFromSnapshotRef is set INSIDE the setSt() functional update when the
    // snapshot directly caused this st change. Consuming it here (flip to false)
    // means exactly that one save is skipped; the NEXT st change (from a real
    // user action) will always reach saveSt regardless of snapshot timing.
    if (stFromSnapshotRef.current) {
      stFromSnapshotRef.current = false
      return
    }

    // ── Post-snapshot debounce ─────────────────────────────────────────────
    // If a snapshot arrived less than 2 s ago, delay the Firestore write to
    // prevent a rapid snapshot → saveSt → snapshot echo cycle even in cases
    // where stFromSnapshotRef was already consumed by a prior effect run.
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
      // ── Snapshot rate-limiter ──────────────────────────────────────────────
      // If more than 5 snapshots arrive within any 1-second window, we are in a
      // loop. Short-circuit immediately and log the offending key so it can be
      // diagnosed without React throwing Error #185.
      const _now = Date.now()
      if (_now - snapshotWindowRef.current > 1000) {
        snapshotCountRef.current = 0
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

      // Track snapshot arrival time for the post-snapshot save debounce in [st] effect.
      lastSnapshotTimeRef.current = _now

      const incoming = teamData.players || []

      // ── Diagnostic: log what Firestore is delivering ──────────────────────
      // Helps trace puck/XP/streak discrepancies without a full devtools session.
      const activeId = activePlayerIdRef.current
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
        if (!prev) return prev
        const prevPlayers = prev.players || []

        // Normalize helper: treat null and undefined as equal for field comparison
        // so Firestore null round-trips don't create spurious hasChanges = true.
        const eq = (a, b) => (a ?? null) === (b ?? null)

        // Only merge when something actually changed — avoids re-rendering on
        // our own write echoing back from Firestore.
        // streakCount / lastActivity MUST be included here: updateStreak() writes
        // these fields directly to Firestore (bypassing local state).
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
        // [st] save-effect can skip the Firestore echo write precisely.
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

      // ── Sync techniqueByPlayer from server into Zustand ───────────────────
      const serverTech = teamData.techniqueByPlayer
      if (serverTech && Object.keys(serverTech).length > 0) {
        const current    = useAppStore.getState().techniqueByPlayer || {}
        const localTech  = current
        let hasNewData   = false
        const mergedTech = { ...localTech }

        for (const [pid, srv] of Object.entries(serverTech)) {
          const local = localTech[pid] || { totalPucks: 0, bonusXP: 0 }
          const mergedTotalPucks = Math.max(local.totalPucks ?? 0, srv.totalPucks ?? 0)
          const mergedBonusXP    = Math.max(local.bonusXP    ?? 0, srv.bonusXP    ?? 0)

          // Merge dailyLogs — max count per date so weekly totals survive
          // cross-device scenarios and fresh loads where local dailyLog is empty
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
            mergedTech[pid] = {
              ...local,
              dailyLog:   mergedLog,
              totalPucks: mergedTotalPucks,
              bonusXP:    mergedBonusXP,
            }
          }
        }

        if (hasNewData) {
          useAppStore.setState({ techniqueByPlayer: mergedTech })
        }
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
          // Per-player: keep whichever diamond total is higher so a recent
          // claim never gets clobbered by a stale cloud snapshot
          players: (fresh.players || []).map(fp => {
            const lp = prev?.players?.find(p => p.id === fp.id)
            if (!lp) return fp
            return { ...fp, diamonds: Math.max(fp.diamonds || 0, lp.diamonds || 0) }
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

  // ── Real-time peer challenges + PUCK games ───────────────────────────────
  // Subscriptions re-attach whenever the active player changes.  The cleanup
  // function returned from useEffect tears down both listeners on unmount or
  // when activePlayerId switches (e.g. logout, profile switch).
  useEffect(() => {
    challengesUnsubRef.current?.()
    challengesUnsubRef.current = null
    puckGamesUnsubRef.current?.()
    puckGamesUnsubRef.current = null

    if (!st?.activePlayerId) {
      setPeerChallenges([])
      setPuckGames([])
      return
    }

    const pid = st.activePlayerId
    challengesUnsubRef.current = subscribeToChallenges(pid, setPeerChallenges)
    puckGamesUnsubRef.current  = subscribeToPuckGames(pid, setPuckGames)

    return () => {
      challengesUnsubRef.current?.()
      challengesUnsubRef.current = null
      puckGamesUnsubRef.current?.()
      puckGamesUnsubRef.current = null
    }
  }, [st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time rage bait listener ─────────────────────────────────────────
  useEffect(() => {
    if (!st?.activePlayerId || st.view !== 'player') {
      rageBaitUnsubRef.current?.()
      rageBaitUnsubRef.current = null
      return
    }
    const unsub = subscribeToRageBaits(st.activePlayerId, notif => {
      setRageBaitReceived(notif)
      audioEngine.playMailReceived()
    })
    rageBaitUnsubRef.current = unsub
    return () => { unsub(); rageBaitUnsubRef.current = null }
  }, [st?.activePlayerId, st?.view]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time compliment listener ─────────────────────────────────────────
  useEffect(() => {
    if (!st?.activePlayerId || st.view !== 'player') {
      complimentUnsubRef.current?.()
      complimentUnsubRef.current = null
      return
    }
    const unsub = subscribeToCompliments(st.activePlayerId, notif => {
      setComplimentReceived(notif)
      audioEngine.playMailReceived()
    })
    complimentUnsubRef.current = unsub
    return () => { unsub(); complimentUnsubRef.current = null }
  }, [st?.activePlayerId, st?.view]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Level-up detection for challenge / technique XP ─────────────────────
  // Session-based level-ups are caught in handleLogSet / handleLogAll.
  // This effect handles the bonusXP path: every time logTechniqueShots fires
  // (challenge completion, PUCK game turn, coach credit), we re-check whether
  // the player's combined XP (session + bonus) has crossed a new level threshold.
  useEffect(() => {
    if (!st?.activePlayerId || !aPlayer) {
      lastChallengeLiRef.current = null
      return
    }
    const bonusXP = techniqueByPlayer[st.activePlayerId]?.bonusXP || 0
    const totalXP = playerStats(aPlayer, st.sessions).xp + bonusXP
    const { li, level } = getLevel(totalXP)

    if (lastChallengeLiRef.current !== null && li > lastChallengeLiRef.current) {
      audioEngine.playHeavyMp3('/level-up-music.mp3', 0.75)
      setEpicCeleb({ type: 'levelup', level })
    }
    lastChallengeLiRef.current = li
  }, [st?.activePlayerId, techniqueByPlayer]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Retroactive badge check — runs once when a player session opens ───────
  // Catches badges that should have been awarded from technique-mode pucks
  // or any other shots logged before this fix was deployed.
  useEffect(() => {
    if (!st?.activePlayerId || !st) return
    const player = st.players.find(p => p.id === st.activePlayerId)
    if (!player) return
    const already   = { ...(player.earnedBadges || {}) }
    const newBadges = BADGES.filter(b => !already[b.id] && b.check(player, st.sessions))
    if (!newBadges.length) return
    const now = Date.now()
    newBadges.forEach(b => { already[b.id] = { ts: now } })
    // Award XP before setSt so Zustand is fresh when the save fires
    const totalBadgeXP = newBadges.reduce((sum, b) => sum + getBadgeXP(b), 0)
    if (totalBadgeXP > 0) useAppStore.getState().logTechniqueShots(player.id, 0, totalBadgeXP)
    setSt(prev => ({
      ...prev,
      players: prev.players.map(p =>
        p.id === player.id ? { ...p, earnedBadges: already } : p
      ),
    }))
  }, [st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Retroactive PUCK milestone heal ─────────────────────────────────────
  // If the player has a completed PUCK game in their history but the 'horseGame'
  // rookie milestone was never saved (e.g. due to the render crash before the fix),
  // grant it now.  The guard inside markRookieQuest is idempotent — safe to call
  // repeatedly.  The retroactiveCheckDoneRef prevents re-firing on every puckGames
  // snapshot update after the first pass.
  //
  // IMPORTANT: Do NOT close over `aPlayer` here.  This effect is registered BEFORE
  // the `if (loading || !st) return` guard at line ~700, so on the first render
  // (when st is null) `const aPlayer` is never reached — its binding stays in the
  // TDZ.  Any access inside the callback would throw "Cannot access 'aPlayer' before
  // initialization".  Instead, derive the player fresh from `st` inside the callback
  // where we can verify st is defined.
  const retroactiveHorseRef = useRef(null)
  useEffect(() => {
    if (!st?.activePlayerId || !st?.players) return  // st not yet loaded
    const player = st.players.find(p => p.id === st.activePlayerId)
    if (!player?.id || player?.rookieQuests?.horseGame) return
    // Only check once per player session; re-check if player switches
    if (retroactiveHorseRef.current === player.id) return
    // Wait until puckGames has been hydrated (avoids false-negative on first render)
    if (puckGames.length === 0) return
    retroactiveHorseRef.current = player.id
    const hasFinishedGame = puckGames.some(g => g.status !== 'active')
    if (hasFinishedGame) {
      console.log('[milestone] retroactively granting horseGame — completed game found in history')
      markRookieQuest('horseGame')
    }
  }, [puckGames, st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Streak insurance: check on player load, once per broken streak ───────
  useEffect(() => {
    if (!st?.activePlayerId || !st) return
    const p = st.players.find(pl => pl.id === st.activePlayerId)
    if (!p) return
    // Key prevents re-checking the same state twice (e.g. StrictMode double-invoke)
    const key = `${p.id}_${p.lastActivity}`
    if (streakInsuranceCheckedRef.current === key) return
    streakInsuranceCheckedRef.current = key

    const MS_36H   = 36 * 60 * 60 * 1000
    const elapsed  = Date.now() - (p.lastActivity || 0)
    const hasFreeze = (p.streak_freezes || 0) > 0
    // Skip the broken-streak modal entirely when the player has a freeze in
    // inventory — updateStreak() will silently consume one on next login/session
    // and keep the streak intact without surfacing the loss to the player.
    if (p.streakCount > 0 && p.lastActivity && elapsed > MS_36H && !hasFreeze) {
      setStreakBrokenData({ prevCount: p.streakCount })
      audioEngine.playStreakBroken()
    }
  }, [st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Versus win detection — challenger perspective ─────────────────────────
  // handlePeerChallengeSubmit is called by RespondToChallenge when the RECEIVER
  // submits.  The CHALLENGER never calls that function — they only see their
  // peerChallenges list update silently via the Firestore snapshot.  This effect
  // diffs consecutive snapshots, detects newly-completed wins, and queues the
  // VersusVictoryModal exactly once per challenge.
  useEffect(() => {
    // Reset the in-session claim-lock set when the player switches accounts
    seenVictoryIds.current = new Set()
  }, [st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!st?.activePlayerId || !st?.players) return
    const activeId = st.activePlayerId

    // ── Exploit-proof win detection ───────────────────────────────────────────
    // Previous approach relied on snapshot diffs (cached vs server) to detect
    // "newly completed" challenges.  This failed when the cached snapshot was
    // empty (first login / cleared cache / new device), making every login look
    // like a fresh win.
    //
    // New approach: the Firestore field `winnerRewardsClaimed` is the ONLY
    // truth.  We write it atomically BEFORE applying rewards or showing the UI.
    // Order of operations:
    //   1. Find a completed win where the flag is NOT yet set
    //   2. Optimistically add to seenVictoryIds (prevents retry this session)
    //   3. Call claimChallengeWinReward() — Firestore transaction atomically
    //      sets winnerRewardsClaimed:true (returns false if already set)
    //   4. Only if granted: apply rewards to local state, then show the modal
    //
    // This is exploit-proof because:
    //   • The flag write happens before any UI is shown
    //   • Subsequent logins see winnerRewardsClaimed:true and skip entirely
    //   • Even if the modal is dismissed without "claiming", rewards are already
    //     applied and the flag is already written
    for (const challenge of peerChallenges) {
      if (challenge.status !== 'completed')         continue
      if (challenge.winnerId !== activeId)           continue
      if (challenge.winnerRewardsClaimed)            continue  // Firestore flag: already done
      if (seenVictoryIds.current.has(challenge.id)) continue  // in-session lock

      // Optimistic lock — prevents rapid snapshot re-fires from double-claiming
      seenVictoryIds.current.add(challenge.id)

      const opponentId = challenge.challengerId === activeId
        ? challenge.receiverId
        : challenge.challengerId

      // Capture stable references before the async boundary
      const cid       = challenge.id
      const pid       = activeId
      const pl        = st.players.find(p => p.id === activeId)
      const today     = new Date().toDateString()

      // Atomically write to Firestore FIRST — if this returns false, rewards
      // were already claimed on another device or session; skip everything.
      claimChallengeWinReward(cid).then(granted => {
        if (!granted) return

        // Apply rewards to local state immediately after the flag is written
        setSt(prev => ({
          ...prev,
          players: prev.players.map(p =>
            p.id !== pid ? p : { ...p, diamonds: (p.diamonds || 0) + VERSUS_WIN_DIAMONDS }
          ),
        }))
        useAppStore.getState().logTechniqueShots(pid, 0, VERSUS_WIN_XP)

        // Mark "Win 1 Versus Quick Match Today" quest complete
        if (pl?.last_quest_spin === today) {
          setSt(prev => {
            const player = prev.players.find(p => p.id === prev.activePlayerId)
            if (!player) return prev
            const qi = (player.daily_quests || []).findIndex(
              q => /win.*versus/i.test(q.text) && !q.completed && !q.claimed
            )
            if (qi < 0) return prev
            return {
              ...prev,
              players: prev.players.map(p =>
                p.id !== prev.activePlayerId ? p : {
                  ...p,
                  daily_quests: p.daily_quests.map((q, i) =>
                    i === qi ? { ...q, currentProgress: 1, targetProgress: 1, completed: true } : q
                  ),
                }
              ),
            }
          })
        }

        // Show the modal — purely visual at this point, rewards already applied
        setVictoryReward({ type: 'versus', diamonds: VERSUS_WIN_DIAMONDS, xp: VERSUS_WIN_XP, opponentId, challengeId: cid })
      })

      break  // process one at a time; next win shows after this modal dismisses
    }
  }, [peerChallenges, st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStreakRevive() {
    const prev = streakBrokenData?.prevCount ?? 0
    upd({
      players: st.players.map(p =>
        p.id === aPlayer?.id
          ? { ...p, diamonds: Math.max(0, (p.diamonds || 0) - 50), streakCount: prev, lastActivity: Date.now() }
          : p
      ),
    })
    // Update ref key so the check doesn't re-fire with stale lastActivity
    streakInsuranceCheckedRef.current = `${aPlayer?.id}_${Date.now()}`
    setStreakBrokenData(null)
  }

  function handleStreakDecline() {
    upd({
      players: st.players.map(p =>
        p.id === aPlayer?.id ? { ...p, streakCount: 0 } : p
      ),
    })
    setStreakBrokenData(null)
  }

  const upd = patch => setSt(prev => ({ ...prev, ...patch }))
  // Keep ref current so the team onSnapshot closure always reads the latest value
  activePlayerIdRef.current = st?.activePlayerId ?? null

  // Mark a rookie quest complete, award diamonds, fire toast, check for graduate badge
  // Maps each rookie quest key to its milestone badge ID
  const ROOKIE_BADGE_MAP = {
    puckSet100:      'ob_centurion',
    horseGame:       'ob_firstblood',
    aroundWorld:     'ob_aroundrim',
    issueChallenge:  'ob_gauntlet',
    visitStore:      'ob_browsing',
    techniqueOnly10: 'ob_formfirst',
    spinDaily:       'ob_dailygrind',
    spinWeekly:      'ob_weeklywar',
  }

  function markRookieQuest(key) {
    const quest = ROOKIE_QUESTS.find(q => q.key === key)
    if (!quest || !aPlayer) return

    const rqNow       = aPlayer.rookieQuests || {}
    if (rqNow[key]) return   // idempotent early exit — already granted

    // ── Compute next state synchronously ────────────────────────────────────
    // We build the full next-state object here rather than inside setSt so we
    // can call saveSt() immediately, before React processes any renders.
    // This means a render crash (e.g. in PuckRoundOutcomeModal) cannot
    // intercept or undo the milestone write.
    const milestoneId  = ROOKIE_BADGE_MAP[key]
    const allKeys      = ROOKIE_QUESTS.map(q => q.key)
    const allDoneNow   = allKeys.every(k => k === key ? true : !!rqNow[k])
    const alreadyGrad  = !!aPlayer.earnedBadges?.rookie_grad
    const now          = Date.now()

    const grantedBadges = []
    if (milestoneId && !aPlayer.earnedBadges?.[milestoneId]) {
      const b = BADGES.find(x => x.id === milestoneId)
      if (b) grantedBadges.push(b)
    }
    if (allDoneNow && !alreadyGrad) {
      const b = BADGES.find(x => x.id === 'rookie_grad')
      if (b) grantedBadges.push(b)
    }
    const totalBadgeXP = grantedBadges.reduce((sum, b) => sum + getBadgeXP(b), 0)
    if (totalBadgeXP > 0) useAppStore.getState().logTechniqueShots(aPlayer.id, 0, totalBadgeXP)

    const newEarnedBadges = {
      ...(aPlayer.earnedBadges || {}),
      ...(milestoneId && !aPlayer.earnedBadges?.[milestoneId]
          ? { [milestoneId]: { ts: now } } : {}),
      ...(allDoneNow && !alreadyGrad
          ? { rookie_grad: { ts: now } } : {}),
    }

    const nextPlayers = st.players.map(p => p.id === aPlayer.id ? {
      ...p,
      diamonds:     (p.diamonds || 0) + quest.reward,
      rookieQuests: { ...rqNow, [key]: true },
      earnedBadges: newEarnedBadges,
    } : p)
    const nextSt = { ...st, players: nextPlayers }

    // ── Persist immediately — before any React render ────────────────────────
    // saveSt writes localStorage synchronously and fires Firestore async.
    // Even if the subsequent setSt render crashes, this write already landed.
    saveSt(nextSt)

    // ── Queue React state update (pure updater — no side effects) ───────────
    // Side effects (toasts, audio) run AFTER setSt, not inside it.
    // React may call the updater multiple times in Strict Mode, so the updater
    // must be a pure function that only returns the next state.
    setSt(() => nextSt)

    // ── Side effects: toasts and celebration audio ───────────────────────────
    clearTimeout(rookieToastTimer.current)
    setTimeout(() => {
      setRookieToast({ label: quest.label, reward: quest.reward, icon: quest.icon })
      rookieToastTimer.current = setTimeout(() => setRookieToast(null), 4500)
    }, 0)

    // Grand finale — all milestones done for the first time
    if (allDoneNow && !alreadyGrad && grantedBadges.some(b => b.id === 'rookie_grad')) {
      setTimeout(() => {
        audioEngine.playBadgeUnlock()
        setEpicCeleb({ type: 'badge', badge: BADGES.find(b => b.id === 'rookie_grad') })
      }, 1200)
    }
  }

  // ── Alpha-test career reset ───────────────────────────────────────────────
  async function handleResetCareer() {
    if (!aPlayer) return
    const confirmed = window.confirm(
      'Are you sure you want to completely wipe your career data? This cannot be undone during the alpha test.'
    )
    if (!confirmed) return

    const clearedSessions = st.sessions.filter(s => s.playerId !== aPlayer.id)
    const resetPlayer = {
      ...aPlayer,
      elo:                1000,
      streakCount:        0,
      lastActivity:       null,
      streak_freezes:     0,
      week_streak_freezes: 0,
      doubleXpTokens:     0,
      earnedBadges:       {},
      diamonds:           0,
      hasEloShield:       false,
      hasBorderGlow:      false,
      protectedDates:     [],
      daily_quests:       [],
      weekly_quests:      [],
    }
    const patch = {
      sessions:        clearedSessions,
      players:         st.players.map(p => p.id === aPlayer.id ? resetPlayer : p),
      activeSessionId: null,
    }

    upd(patch)
    useAppStore.getState().clearPlayerEconomy(aPlayer.id)
    useAppStore.getState().clearPlayerTechnique(aPlayer.id)
    setTab('dashboard')

    const nextSt = { ...st, ...patch }
    saveSt(nextSt)
    await deletePlayerData(aPlayer.id)
  }

  // ── Loading splash ────────────────────────────────────────────────────────
  if (loading || !st) {
    return (
      <div style={{ ...APP_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <GlobalStyles />
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, color: '#60a5fa', letterSpacing: '0.1em' }}>
          LOADING…
        </div>
      </div>
    )
  }

  const aPlayer = st.players.find(p => p.id === st.activePlayerId)
  const aSess   = st.sessions.find(s => s.id === st.activeSessionId)

  // ── Badge queue helpers ───────────────────────────────────────────────────
  function stopEpicAudio() {
    audioEngine.stopHeavyAudio()
    // Clear legacy ref in case it was set before this refactor
    if (epicAudioRef.current) {
      try { epicAudioRef.current.pause(); epicAudioRef.current.currentTime = 0 } catch {}
      epicAudioRef.current = null
    }
  }

  function popNextBadge() {
    if (badgeQRef.current.length === 0) return
    const next = badgeQRef.current.shift()
    setEpicCeleb({ type: 'badge', badge: next })
    audioEngine.playBadgeUnlock()  // throttled internally — safe to call every pop
  }

  function handleBadgeClose() {
    setBadgePreview(null)
    setTimeout(popNextBadge, 150)
  }

  function handleEpicClose() {
    stopEpicAudio()
    setEpicCeleb(null)
    if (badgeQRef.current.length > 0) setTimeout(popNextBadge, 150)
  }

  function handlePeerChallengeSubmit({ challenge }) {
    // Rookie quest: first issued challenge (challengerId = the player who sent it)
    if (challenge.challengerId === st.activePlayerId) markRookieQuest('issueChallenge')

    // Daily quest: "Issue a Versus Challenge Today"
    // Only fires on a brand-new (pending) challenge, not on a completed one.
    if (
      challenge.status === 'pending' &&
      challenge.challengerId === st.activePlayerId
    ) {
      const today = new Date().toDateString()
      const pl = st.players.find(p => p.id === st.activePlayerId)
      if (pl?.last_quest_spin === today) {
        setSt(prev => {
          const pid    = prev.activePlayerId
          const player = prev.players.find(p => p.id === pid)
          if (!player) return prev
          const qi = (player.daily_quests || []).findIndex(
            q => /issue.*challenge|send.*challenge/i.test(q.text) && !q.completed && !q.claimed
          )
          if (qi < 0) return prev
          return {
            ...prev,
            players: prev.players.map(p =>
              p.id !== pid ? p : {
                ...p,
                daily_quests: p.daily_quests.map((q, i) =>
                  i === qi ? { ...q, currentProgress: 1, targetProgress: 1, completed: true } : q
                ),
              }
            ),
          }
        })
      }
    }

    // Merge updated challenge into local list
    setPeerChallenges(prev => {
      const idx = prev.findIndex(c => c.id === challenge.id)
      return idx >= 0
        ? prev.map(c => c.id === challenge.id ? challenge : c)
        : [challenge, ...prev]
    })

    // Instantly apply ELO deltas to local player state so the leaderboard and
    // header reflect the new ratings without waiting for a Firestore reload.
    const er = challenge.eloResult
    if (er && challenge.status === 'completed') {
      const now = Date.now()
      upd({
        players: st.players.map(p => {
          if (p.id === challenge.challengerId && er.challengerDelta !== undefined) {
            return { ...p, elo: (p.elo ?? 1000) + er.challengerDelta, eloLastDelta: er.challengerDelta, eloLastUpdated: now, hasEloShield: false }
          }
          if (p.id === challenge.receiverId && er.receiverDelta !== undefined) {
            return { ...p, elo: (p.elo ?? 1000) + er.receiverDelta, eloLastDelta: er.receiverDelta, eloLastUpdated: now, hasEloShield: false }
          }
          return p
        }),
      })
    }

    // Queue result modals — shown once the respond flow closes (!challengeScreen)
    if (challenge.status === 'completed') {
      const activeId   = st.activePlayerId
      // opponentId: whichever side of the challenge is not the current player
      const opponentId = challenge.challengerId === activeId
        ? challenge.receiverId
        : challenge.challengerId

      // Winner's video: used on the defeat screen so the loser can study game tape
      const winnerVideoUrl = challenge.winnerId === challenge.challengerId
        ? (challenge.challengerVideo ?? null)
        : (challenge.receiverVideo   ?? null)

      // Mark "Play 1 Versus Quick Match Today" quest complete — ties count the same as wins
      const today = new Date().toDateString()
      if (aPlayer?.last_quest_spin === today) {
        setSt(prev => {
          const pid = prev.activePlayerId
          const pl  = prev.players.find(p => p.id === pid)
          if (!pl) return prev
          // Match quest: can be "Play 1 Versus..." or "Win 1 Versus..." — both count
          const qi = (pl.daily_quests || []).findIndex(
            q => /play.*versus|win.*versus/i.test(q.text) && !q.completed && !q.claimed
          )
          if (qi < 0) return prev
          return {
            ...prev,
            players: prev.players.map(p =>
              p.id !== pid ? p : {
                ...p,
                daily_quests: p.daily_quests.map((q, i) =>
                  i === qi ? { ...q, currentProgress: 1, targetProgress: 1, completed: true } : q
                ),
              }
            ),
          }
        })
      }

      // Tie: both players get equal partial reward
      if (challenge.isTie) {
        setTieReward({ type: 'versus', diamonds: 5, xp: 10, opponentId, opponentName: challenge.challengerId === activeId ? challenge.receiverName : challenge.challengerName, challengeId: challenge.id })
      } else if (challenge.winnerId === activeId) {
        // The snapshot useEffect handles win detection, Firestore flag write,
        // reward application, and modal show atomically.  Mark as seen here so
        // the effect doesn't double-queue if the snapshot arrives before the
        // peerChallenges state update for this submit.
        seenVictoryIds.current.add(challenge.id)
      } else {
        setDefeatState({ type: 'versus', diamonds: 1, xp: 2, opponentId, opponentVideoUrl: winnerVideoUrl })
      }
    }
  }

  function handleDashNavigate(tabId, openRankDetail = false) {
    setTab(tabId)
    setRankDetailOpen(tabId === 'ranks' && openRankDetail)
    if (tabId === 'session' && !aSess) startSession()
  }

  // ── Session handlers ──────────────────────────────────────────────────────
  function startSession() {
    const sid = newId()
    const s   = { id: sid, playerId: aPlayer.id, sets: [], date: new Date().toISOString() }
    upd({ sessions: [...st.sessions, s], activeSessionId: sid })
  }

  async function endSession() {
    if (!aSess) return
    const shots = aSess.sets.length * 10
    if (shots < 10) {
      alert('shoot at least 10 pucks to log this session')
      return
    }
    const hits = aSess.sets.reduce((a, s) => a + s.hits, 0)

    // ── Quest progress — mark completed, no auto-reward (tap-to-claim) ────
    const questResult = aPlayer ? applyQuestProgress(aPlayer, st.sessions) : null
    const newlyDone = questResult
      ? questResult.updatedQuests.filter((q, i) =>
          q.completed && !(aPlayer.daily_quests?.[i]?.completed)
        ).length
      : 0

    const patch = {
      activeSessionId: null,
      ...(questResult ? {
        players: st.players.map(p =>
          p.id === aPlayer.id
            ? { ...p, daily_quests: questResult.updatedQuests }
            : p
        ),
      } : {}),
    }

    // ── Saving state: block double-taps, show feedback ─────────────────────
    setIsSaving(true)
    weakConnTimerRef.current = setTimeout(() => setWeakConnToast(true), 5000)

    // Write to localStorage immediately, then await Firestore.
    // Both calls pass activePlayerId so Firestore uses a transaction that merges
    // only this player's entry — coach edits (diamonds, ELO, etc.) are preserved.
    const nextSt            = { ...st, ...patch }
    const activePlayerId    = st.activePlayerId
    const techniqueByPlayer = useAppStore.getState().techniqueByPlayer || {}
    saveSt(nextSt, activePlayerId)   // fire-and-forget localStorage + Firestore backup
    try {
      await saveToFirestore(nextSt, techniqueByPlayer, activePlayerId)
    } catch (err) {
      console.error('[endSession] Firestore write failed — session is safe in localStorage:', err.message)
    }

    // Explicitly write the completed session with its full sets to Firestore.
    // saveToFirestore skips sessions whose IDs are already in syncedSessionIds —
    // which includes this session because it was cached at creation time with
    // sets: [].  forceSessionSync bypasses that cache so the real shot data lands.
    await forceSessionSync(aSess)

    clearTimeout(weakConnTimerRef.current)
    setWeakConnToast(false)
    setIsSaving(false)

    // ── Rookie quest: 100-puck session ────────────────────────────────────
    if (shots >= 100) markRookieQuest('puckSet100')

    // ── Navigate + celebrate ───────────────────────────────────────────────
    play('confetti')
    setCeleb({
      emoji: '💪',
      title: 'Session Done!',
      subtitle: newlyDone > 0
        ? `${shots} shots · ${shots > 0 ? (hits / shots * 100).toFixed(0) : 0}% acc · ${newlyDone} quest${newlyDone > 1 ? 's' : ''} ready to claim! 💎`
        : `${shots} shots · ${shots > 0 ? (hits / shots * 100).toFixed(0) : 0}% accuracy`,
    })

    upd(patch)
    audioEngine.playStreakIgnite()
    setTab('dashboard')
    if (aPlayer) updateStreak(aPlayer.id).catch(() => {})
  }

  function handleUndo() {
    clearTimeout(undoTimerRef.current)
    setUndoSnapshot(prev => {
      if (prev) setSt(prev)
      return null
    })
  }

  function handleLogSet(zoneId, hits) {
    if (!aSess || !aPlayer) return

    // Snapshot state before the update so undo can restore it exactly
    const snapshot = st
    clearTimeout(undoTimerRef.current)
    setUndoSnapshot(snapshot)
    undoTimerRef.current = setTimeout(() => setUndoSnapshot(null), 8000)

    const set         = { zone: zoneId, hits, ts: Date.now() }
    const updSessions = st.sessions.map(s =>
      s.id === aSess.id ? { ...s, sets: [...s.sets, set] } : s
    )

    // Sound + animations
    const type = hits === 0 ? 'ice' : hits >= 8 ? 'fire' : 'hit'
    play(type)
    setPuckAnim({ hits, type, zone: zoneId, ts: Date.now() })
    setFlashZone(zoneId)
    setFlashType(type)
    setTimeout(() => { setFlashZone(null); setFlashType(null) }, 900)
    setTimeout(() => setPuckAnim(null), 1800)

    // Level-up detection — bonusXP ensures challenge/PUCK XP counts toward threshold
    const techBonusXP = techniqueByPlayer[aPlayer.id]?.bonusXP || 0
    const prevLi = playerStats(aPlayer, st.sessions, techBonusXP).li
    const newSt  = playerStats(aPlayer, updSessions, techBonusXP)
    if (newSt.li > prevLi) {
      audioEngine.playHeavyMp3('/level-up-music.mp3', 0.75)
      setEpicCeleb({ type: 'levelup', level: newSt.level })
    }

    // Badge check
    const already   = { ...(aPlayer.earnedBadges || {}) }
    const newBadges = BADGES.filter(b => !already[b.id] && b.check(aPlayer, updSessions))

    let updPlayers = st.players
    if (newBadges.length) {
      const now = Date.now()
      newBadges.forEach(b => { already[b.id] = { ts: now } })
      // Award XP before upd() so Zustand is fresh when the resulting saveSt fires
      const totalBadgeXP = newBadges.reduce((sum, b) => sum + getBadgeXP(b), 0)
      if (totalBadgeXP > 0) useAppStore.getState().logTechniqueShots(aPlayer.id, 0, totalBadgeXP)
      updPlayers = st.players.map(p =>
        p.id === aPlayer.id ? {
          ...p,
          earnedBadges: already,
          diamonds: p.diamonds || 0,
        } : p
      )
      setNewBadgeIds(prev => {
        const n = { ...prev }
        newBadges.forEach(b => { n[b.id] = true })
        return n
      })
      badgeQRef.current.push(...newBadges)
      setEpicCeleb(cur => {
        if (cur) return cur
        const next = badgeQRef.current.shift()
        if (next) audioEngine.playBadgeUnlock()
        return next ? { type: 'badge', badge: next } : null
      })
    }

    upd({ sessions: updSessions, players: updPlayers })
  }

  function handleLogAll(inputs) {
    // inputs: { [zoneId]: number } — one entry per zone the user filled in
    if (!aSess || !aPlayer) return
    const entries = Object.entries(inputs).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    if (!entries.length) return

    const ts      = Date.now()
    const newSets = entries.map(([zone, hits]) => ({ zone, hits: Number(hits), ts }))

    const updSessions = st.sessions.map(s =>
      s.id === aSess.id ? { ...s, sets: [...(s.sets || []), ...newSets] } : s
    )

    play('confetti')

    // Level-up detection — bonusXP ensures challenge/PUCK XP counts toward threshold
    const techBonusXP = techniqueByPlayer[aPlayer.id]?.bonusXP || 0
    const prevLi = playerStats(aPlayer, st.sessions, techBonusXP).li
    const newSt  = playerStats(aPlayer, updSessions, techBonusXP)
    if (newSt.li > prevLi) {
      audioEngine.playHeavyMp3('/level-up-music.mp3', 0.75)
      setEpicCeleb({ type: 'levelup', level: newSt.level })
    }

    // Badge check
    const already   = { ...(aPlayer.earnedBadges || {}) }
    const newBadges = BADGES.filter(b => !already[b.id] && b.check(aPlayer, updSessions))

    let updPlayers = st.players
    if (newBadges.length) {
      const now = Date.now()
      newBadges.forEach(b => { already[b.id] = { ts: now } })
      // Award XP before upd() so Zustand is fresh when the resulting saveSt fires
      const totalBadgeXP = newBadges.reduce((sum, b) => sum + getBadgeXP(b), 0)
      if (totalBadgeXP > 0) useAppStore.getState().logTechniqueShots(aPlayer.id, 0, totalBadgeXP)
      updPlayers = st.players.map(p =>
        p.id === aPlayer.id ? {
          ...p,
          earnedBadges: already,
          diamonds: p.diamonds || 0,
        } : p
      )
      setNewBadgeIds(prev => {
        const n = { ...prev }
        newBadges.forEach(b => { n[b.id] = true })
        return n
      })
      badgeQRef.current.push(...newBadges)
      setEpicCeleb(cur => {
        if (cur) return cur
        const next = badgeQRef.current.shift()
        if (next) audioEngine.playBadgeUnlock()
        return next ? { type: 'badge', badge: next } : null
      })
    }

    upd({ sessions: updSessions, players: updPlayers })
  }

  // ── Routing ───────────────────────────────────────────────────────────────
  if (st.view === 'home') {
    return (
      <>
        <GlobalStyles />
        <HomeScreen st={st} upd={upd} />
      </>
    )
  }

  if (st.view === 'playerSelect') {
    return (
      <>
        <GlobalStyles />
        <PlayerSelectScreen
          players={st.players}
          sessions={st.sessions}
          onSelect={id => {
            localStorage.setItem(ACTIVE_PLAYER_KEY, id)
            upd({ activePlayerId: id, activeSessionId: null, view: 'player' })
            setTab('dashboard')
          }}
          onBack={() => upd({ view: 'home' })}
        />
      </>
    )
  }

  if (st.view === 'coachPin') {
    return (
      <>
        <GlobalStyles />
        <Scaffold onBack={() => upd({ view: 'home' })} title="Coach Login">
          <div style={C.card}>
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              maxLength={6}
              onChange={e => { setPinInput(e.target.value); setPinErr(false) }}
              placeholder="PIN"
              style={{ ...C.inp, textAlign: 'center', fontSize: 26, letterSpacing: 10, marginBottom: 10 }}
            />
            {pinErr && (
              <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Incorrect PIN
              </div>
            )}
            <button
              style={C.btnP}
              onClick={() => {
                if (pinInput === '1969') { upd({ view: 'coach' }); setPinInput('') }
                else setPinErr(true)
              }}
            >
              <Lock size={15} /> Unlock
            </button>
          </div>
        </Scaffold>
      </>
    )
  }

  if (st.view === 'coach') {
    return (
      <>
        <GlobalStyles />
        <CoachPortal
          st={st} upd={upd}
          onPlayerLevelUp={(playerId, newLevel) => {
            audioEngine.playHeavyMp3('/level-up-music.mp3', 0.75)
            setEpicCeleb({ type: 'levelup', level: newLevel })
          }}
          onPuckCreditAdded={playerId => {
            // Mark puckSet100 rookie quest on the target player if not already done
            setSt(prev => {
              const player = prev.players.find(p => p.id === playerId)
              if (!player) return prev
              const rq = player.rookieQuests || {}
              if (rq.puckSet100) return prev
              const quest = ROOKIE_QUESTS.find(q => q.key === 'puckSet100')
              return {
                ...prev,
                players: prev.players.map(p => p.id === playerId ? {
                  ...p,
                  diamonds:     (p.diamonds || 0) + (quest?.reward || 10),
                  rookieQuests: { ...rq, puckSet100: true },
                } : p),
              }
            })
          }}
        />
      </>
    )
  }

  // ── Public player self-registration ─────────────────────────────────────────
  if (st.view === 'playerSignup') {
    const [signupErr, setSignupErr] = [null, () => {}] // static — error shown inline
    return (
      <>
        <GlobalStyles />
        <Scaffold onBack={() => { setNpName(''); setNpNum(''); setNpPw(''); setNpEmail(''); upd({ view: 'home' }) }} title="Create Your Profile">
          <div style={C.card}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#60a5fa', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 16 }}>
              🏒 JOIN YOUR TEAM — ALPHA SIGN-UP
            </div>

            <label style={C.label}>Your Name *</label>
            <input
              value={npName}
              onChange={e => setNpName(e.target.value)}
              placeholder="e.g. Connor"
              style={C.inp}
            />

            <label style={C.label}>Email Address *</label>
            <input
              type="email"
              value={npEmail}
              onChange={e => setNpEmail(e.target.value)}
              placeholder="e.g. connor@team.com"
              style={C.inp}
            />

            <label style={C.label}>Jersey # (optional)</label>
            <input
              value={npNum}
              onChange={e => setNpNum(e.target.value)}
              placeholder="e.g. 97"
              style={C.inp}
            />

            <label style={C.label}>Password *</label>
            <input
              type="password"
              value={npPw}
              onChange={e => setNpPw(e.target.value)}
              placeholder="Choose a password you'll remember"
              style={C.inp}
            />

            <button
              style={C.btnP}
              onClick={() => {
                if (!npName.trim() || !npEmail.trim() || !npPw.trim()) return
                if (!npEmail.includes('@')) return
                const p = {
                  id:                 newId(),
                  name:               npName.trim(),
                  email:              npEmail.trim().toLowerCase(),
                  jerseyNum:          npNum.trim(),
                  password:           npPw.trim(),
                  role:               'player',
                  earnedBadges:       {},
                  diamonds:           0,
                  streak_freezes:     0,
                  last_quest_spin:    null,
                  daily_quests:       [],
                  photoURL:           null,
                  totalWins:          0,
                  streakCount:        0,
                  lastActivity:       null,
                  elo:                1000,
                  eloLastDelta:       0,
                  eloLastUpdated:     null,
                  hasEloShield:       false,
                  hasSeenOnboarding:  false,
                  rookieQuests:       { ...DEFAULT_ROOKIE_QUESTS },
                  createdAt:          Date.now(),
                }
                localStorage.setItem(ACTIVE_PLAYER_KEY, p.id)
                upd({ players: [...st.players, p], activePlayerId: p.id, activeSessionId: null, view: 'player' })
                setNpName(''); setNpNum(''); setNpPw(''); setNpEmail('')
              }}
            >
              <Plus size={16} /> Create My Profile
            </button>

            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#475569', textAlign: 'center', marginTop: 10, letterSpacing: '0.06em' }}>
              Your coach will see your profile in the roster. Fields marked * are required.
            </div>
          </div>
        </Scaffold>
      </>
    )
  }

  if (st.view === 'addPlayer') {
    return (
      <>
        <GlobalStyles />
        <Scaffold onBack={() => upd({ view: 'coach' })} title="Add Player">
          <div style={C.card}>
            <label style={C.label}>Player Name</label>
            <input
              value={npName}
              onChange={e => setNpName(e.target.value)}
              placeholder="e.g. Connor"
              style={C.inp}
            />
            <label style={C.label}>Jersey # (optional)</label>
            <input
              value={npNum}
              onChange={e => setNpNum(e.target.value)}
              placeholder="e.g. 97"
              style={C.inp}
            />
            <label style={C.label}>Password (optional — auto-generated if blank)</label>
            <input
              value={npPw}
              onChange={e => setNpPw(e.target.value)}
              placeholder="Leave blank for auto"
              style={C.inp}
            />
            <button
              style={C.btnP}
              onClick={() => {
                if (!npName.trim()) return
                const base  = npName.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'player'
                const autoPw = `${base}${Math.floor(100 + Math.random() * 900)}`
                const p = {
                  id:                newId(),
                  name:              npName.trim(),
                  jerseyNum:         npNum.trim(),
                  password:          npPw.trim() || autoPw,
                  earnedBadges:      {},
                  diamonds:          0,
                  streak_freezes:    0,
                  last_quest_spin:   null,
                  daily_quests:      [],
                  photoURL:          null,
                  totalWins:         0,
                  streakCount:       0,
                  lastActivity:      null,
                  elo:               1000,
                  eloLastDelta:      0,
                  eloLastUpdated:    null,
                  hasEloShield:      false,
                  hasSeenOnboarding: false,
                  createdAt:         Date.now(),
                }
                upd({ players: [...st.players, p], view: 'coach' })
                setNpName(''); setNpNum(''); setNpPw('')
              }}
            >
              <Plus size={16} /> Add to Roster
            </button>
          </div>
        </Scaffold>
      </>
    )
  }

  // ── Player view ───────────────────────────────────────────────────────────
  if (st.view === 'player' && aPlayer) {
    const techBonusXP    = techniqueByPlayer[aPlayer.id]?.bonusXP || 0
    const stats          = playerStats(aPlayer, st.sessions, techBonusXP)
    const earnedBadgeObj = aPlayer.earnedBadges || {}

    // ── Notification dot flags (reactive — clear instantly when turn completes) ──
    const hasPendingVersus  = peerChallenges.some(
      c => c.receiverId === aPlayer.id && c.status === 'pending' && !c.seenByOpponent
    )
    const hasPendingGames = puckGames.some(g => {
      const action = getGameAction(g, aPlayer.id)
      return action === 'set' || action === 'match' || action === 'expired'
    })
    const hasClaimableQuests = (aPlayer.daily_quests || []).some(
      q => q.completed && !q.claimed
    )

    return (
      <div style={{ ...APP_BG, minHeight: '100vh', position: 'relative' }}>
        <GlobalStyles />

        {epicCeleb && (
          <EpicCelebration
            type={epicCeleb.type}
            level={epicCeleb.level}
            badge={epicCeleb.badge}
            onClose={handleEpicClose}
            onClaimBonus={epicCeleb.type === 'badge' ? () => setSt(prev => {
              const id = prev.activePlayerId
              return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, diamonds: (p.diamonds || 0) + 1 } : p) }
            }) : undefined}
          />
        )}
        {celeb && <CelebOverlay data={celeb} onClose={() => setCeleb(null)} />}

        {streakBrokenData && (
          <StreakBrokenModal
            prevStreak={streakBrokenData.prevCount}
            diamonds={aPlayer.diamonds || 0}
            onRevive={handleStreakRevive}
            onDecline={handleStreakDecline}
          />
        )}

        {aPlayer.coachMsg && (
          <CoachMsgPopup
            message={aPlayer.coachMsg}
            onAck={() => upd({
              players: st.players.map(p => p.id === aPlayer.id ? { ...p, coachMsg: '' } : p)
            })}
          />
        )}

        {/* ── Diamond reward toast — fires when remote Firestore diamond delta is detected ── */}
        {coachAwardToast && (
          <div
            onClick={() => { clearTimeout(coachAwardToastTimerRef.current); setCoachAwardToast(null) }}
            style={{
              position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9000, cursor: 'pointer',
              background: 'linear-gradient(135deg,#1a0050,#4c1d95)',
              border: '2px solid #fbbf24', borderRadius: 14,
              padding: '12px 22px', textAlign: 'center',
              boxShadow: '0 0 36px #fbbf2466',
              animation: 'pulse 0.5s ease-out',
              minWidth: 200,
            }}
          >
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, color: '#fbbf24', letterSpacing: '0.08em', lineHeight: 1 }}>
              💎 YOU JUST EARNED {coachAwardToast.amount} DIAMONDS!
            </div>
          </div>
        )}

        {/* ── New-user onboarding modal ────────────────────────────────── */}
        {aPlayer.hasSeenOnboarding === false && (
          <OnboardingModal
            onComplete={() => upd({
              players: st.players.map(p =>
                p.id === aPlayer.id ? { ...p, hasSeenOnboarding: true } : p
              ),
            })}
          />
        )}

        {/* ── Rage Bait — sender picker ─────────────────────────────────── */}
        {rageBaitSender && (
          <RageBaitSenderModal
            player={aPlayer}
            players={st.players}
            onSend={async targetId => {
              await sendRageBait(aPlayer.id, aPlayer.name, targetId)
              setRageBaitSender(false)
            }}
            onCancel={() => setRageBaitSender(false)}
          />
        )}

        {/* ── Rage Bait — receiver envelope ────────────────────────────── */}
        {rageBaitReceived && !rageBaitSender && (
          <RageBaitReceiverModal
            notification={rageBaitReceived}
            onDismiss={async () => {
              await dismissRageBait(rageBaitReceived.id)
              setRageBaitReceived(null)
            }}
          />
        )}

        {/* ── Compliment — sender picker ────────────────────────────────── */}
        {complimentSender && (
          <ComplimentSenderModal
            player={aPlayer}
            players={st.players}
            onSend={async targetId => {
              await sendCompliment(aPlayer.id, aPlayer.name, targetId)
              setComplimentSender(false)
            }}
            onCancel={() => setComplimentSender(false)}
          />
        )}

        {/* ── Compliment — receiver envelope ───────────────────────────── */}
        {complimentReceived && !complimentSender && (
          <ComplimentReceiverModal
            notification={complimentReceived}
            onDismiss={async () => {
              await dismissNotification(complimentReceived.id)
              setComplimentReceived(null)
            }}
          />
        )}

        {/* ── PUCK round outcome pop-up ────────────────────────────── */}
        {pendingRoundOutcome && (
          <PuckRoundOutcomeModal
            outcome={pendingRoundOutcome}
            opponentName={pendingRoundOutcome.opponentName}
            playerId={aPlayer?.id}
            defenderId={pendingRoundOutcome?.defenderId}
            onDismiss={() => setPendingRoundOutcome(null)}
          />
        )}

        {badgePreview && (
          <BadgePopup
            badge={badgePreview.badge}
            earned={badgePreview.earned ?? !!earnedBadgeObj[badgePreview.badge.id]}
            earnedDate={earnedBadgeObj[badgePreview.badge.id]?.ts}
            onClose={handleBadgeClose}
          />
        )}

        {/* ── Versus victory reward — purely visual; rewards already applied and
               winnerRewardsClaimed already written before this modal appeared ── */}
        {victoryReward && !challengeScreen && (
          <VersusVictoryModal
            reward={victoryReward}
            onClaim={() => {
              // Rewards were applied and Firestore flag was written before this
              // modal was shown.  Claim just closes and navigates home.
              setVictoryReward(null)
              setTab('dashboard')
            }}
            onRematch={() => {
              const opponentId = victoryReward.opponentId
              setVictoryReward(null)
              setChallengeScreen({ mode: 'create', defaultFriendId: opponentId })
            }}
          />
        )}

        {/* ── Versus tie reward — both players get equal partial rewards ── */}
        {tieReward && !challengeScreen && (
          <VersusTieModal
            reward={tieReward}
            opponentName={tieReward.opponentName}
            onClaim={() => {
              const pid = st.activePlayerId
              upd({
                players: st.players.map(p =>
                  p.id === pid
                    ? { ...p, diamonds: (p.diamonds || 0) + tieReward.diamonds }
                    : p
                ),
              })
              useAppStore.getState().logTechniqueShots(pid, 0, tieReward.xp)
              setTieReward(null)
              setTab('dashboard')
            }}
            onRematch={() => {
              const opponentId = tieReward.opponentId
              setTieReward(null)
              setChallengeScreen({ mode: 'create', defaultFriendId: opponentId })
            }}
          />
        )}

        {/* ── Versus defeat reward — appears after RespondToChallenge closes ── */}
        {defeatState && !challengeScreen && (() => {
          const defeatWinner = st.players.find(p => p.id === defeatState.opponentId) ?? null
          return (
            <VersusDefeatModal
              defeatState={defeatState}
              winner={defeatWinner}
              onClaim={() => {
                const pid = st.activePlayerId
                upd({
                  players: st.players.map(p =>
                    p.id === pid
                      ? { ...p, diamonds: (p.diamonds || 0) + defeatState.diamonds }
                      : p
                  ),
                })
                setDefeatState(null)
              }}
              onRematch={() => {
                const opponentId = defeatState.opponentId
                setDefeatState(null)
                setChallengeScreen({ mode: 'create', defaultFriendId: opponentId })
              }}
            />
          )
        })()}

        {/* ── Peer challenge full-screen flows ─────────────────────────── */}
        {(challengeScreen === 'create' || challengeScreen?.mode === 'create') && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--page-bg)', zIndex: 300, overflowY: 'auto' }}>
            <CreatePeerChallenge
              player={aPlayer}
              players={st.players}
              onBack={() => setChallengeScreen(null)}
              onSubmit={handlePeerChallengeSubmit}
              defaultFriendId={challengeScreen?.defaultFriendId ?? ''}
            />
          </div>
        )}
        {challengeScreen?.mode === 'respond' && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--page-bg)', zIndex: 300, overflowY: 'auto' }}>
            <RespondToChallenge
              player={aPlayer}
              challenge={challengeScreen.challenge}
              onBack={() => setChallengeScreen(null)}
              onSubmit={handlePeerChallengeSubmit}
            />
          </div>
        )}

        <PlayerHeader
          player={aPlayer}
          stats={stats}
          onBack={() => upd({ view: 'playerSelect', activePlayerId: null, activeSessionId: null })}
          theme={theme}
          onThemeToggle={toggleOutsideMode}
          onStreakClick={() => setTab('store')}
          onPhotoUpload={url => upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, photoURL: url } : p) })}
          onResetCareer={handleResetCareer}
          onSwitchProfile={() => {
            localStorage.removeItem(ACTIVE_PLAYER_KEY)
            upd({ view: 'playerSelect', activePlayerId: null, activeSessionId: null })
            setTab('dashboard')
          }}
        />
        <TabBar
          active={tab}
          onChange={t => {
            if (t === 'store')      markRookieQuest('visitStore')
            if (t === 'challenges') markChallengesAsSeen(aPlayer.id, peerChallenges)
            setTab(t)
          }}
          hasSess={!!aSess}
          hasPendingVersus={hasPendingVersus}
          hasPendingGames={hasPendingGames}
          hasClaimableQuests={hasClaimableQuests}
        />

        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {tab === 'dashboard' && (
            <Dashboard
              player={aPlayer}
              stats={stats}
              sessions={st.sessions}
              players={st.players}
              newBadgeIds={newBadgeIds}
              onBadgeClick={(b, isEarned) => setBadgePreview({ badge: b, earned: isEarned })}
              onStartSession={() => { startSession(); setTab('session') }}
              onNavigate={handleDashNavigate}
              peerChallenges={peerChallenges}
              onAcceptChallenge={c => setChallengeScreen({ mode: 'respond', challenge: c })}
              puckGames={puckGames}
              onPlayPuckGame={game => { setDeepLinkPuckGameId(game.id); setTab('session') }}
            />
          )}
          {tab === 'session' && (
            <ShootTracker
              player={aPlayer}
              sessions={st.sessions}
              players={st.players}
              session={aSess}
              sesGoal={sesGoal}
              setSesGoal={setSesGoal}
              onLogSet={handleLogSet}
              onLogAll={handleLogAll}
              onEndSession={endSession}
              onStart={startSession}
              isSaving={isSaving}
              weakConnToast={weakConnToast}
              onGoalReached={markRookieQuest}
              flashZone={flashZone}
              flashType={flashType}
              puckAnim={puckAnim}
              puckGames={puckGames}
              onSubmitGame={sets => {
                const atwSession = {
                  id:       newId(),
                  playerId: aPlayer.id,
                  date:     new Date().toISOString(),
                  source:   'atw',
                  sets,
                }
                upd({ sessions: [...st.sessions, atwSession] })
                markRookieQuest('aroundWorld')
              }}
              onPuckGameUpdate={updated => {
                setPuckGames(prev => {
                  const idx = prev.findIndex(g => g.id === updated.id)
                  return idx >= 0 ? prev.map(g => g.id === updated.id ? updated : g) : [updated, ...prev]
                })
                if (updated.status !== 'active') {
                  markRookieQuest('horseGame')
                  // Auto-complete the "Win a P-U-C-K Game Using a Backhand Shot" daily quest
                  // when the player wins a game in which they used a Backhand technique.
                  const pid      = aPlayer.id
                  const isWinner = (updated.status === 'p1_wins' && updated.p1Id === pid) ||
                                   (updated.status === 'p2_wins' && updated.p2Id === pid)
                  const myTechs  = (updated.p1Id === pid ? updated.p1Techniques : updated.p2Techniques) || []
                  if (isWinner && myTechs.includes('Backhand')) {
                    const today = new Date().toDateString()
                    if (aPlayer.last_quest_spin === today) {
                      const qi = (aPlayer.daily_quests || []).findIndex(
                        q => /backhand/i.test(q.text) && !q.completed && !q.claimed
                      )
                      if (qi >= 0) {
                        setSt(prev => ({
                          ...prev,
                          players: prev.players.map(p =>
                            p.id !== pid ? p : {
                              ...p,
                              daily_quests: (p.daily_quests || []).map((q, i) =>
                                i === qi ? { ...q, currentProgress: 1, completed: true } : q
                              ),
                            }
                          ),
                        }))
                      }
                    }
                  }
                }
              }}
              deepLinkPuckGameId={deepLinkPuckGameId}
              onConcedeGame={gameId => {
                // Optimistic removal — real-time listener confirms the final state
                setPuckGames(prev => prev.filter(g => g.id !== gameId))
              }}
              onPuckEloUpdate={deltas => setSt(prev => ({
                ...prev,
                players: prev.players.map(p => {
                  const delta = deltas[p.id]
                  if (delta === undefined || delta === 0) return p
                  return { ...p, elo: Math.max(0, (p.elo || 1600) + delta) }
                }),
              }))}
              setPendingRoundOutcome={setPendingRoundOutcome}
            />
          )}
          {tab === 'challenges' && (
            <ChallengesTab
              player={aPlayer}
              players={st.players}
              sessions={st.sessions}
              peerChallenges={peerChallenges}
              onCreateChallenge={() => setChallengeScreen('create')}
              onAcceptChallenge={c => setChallengeScreen({ mode: 'respond', challenge: c })}
            />
          )}
          {tab === 'quests' && (
            <DailyQuests
              player={aPlayer}
              sessions={st.sessions}
              onNavigate={setTab}
              onDiamondEarn={(amount) => setSt(prev => {
                const id = prev.activePlayerId
                return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, diamonds: (p.diamonds || 0) + amount } : p) }
              })}
              onSpinComplete={(quests) => {
                markRookieQuest('spinDaily')
                setSt(prev => {
                  const id = prev.activePlayerId
                  return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, last_quest_spin: new Date().toDateString(), daily_quests: quests } : p) }
                })
              }}
              onClaimQuest={(questIndex) => setSt(prev => {
                const id     = prev.activePlayerId
                const player = prev.players.find(p => p.id === id)
                const quests = player?.daily_quests || []
                const quest  = quests[questIndex]
                if (!quest || quest.claimed || !quest.completed) return prev
                return {
                  ...prev,
                  players: prev.players.map(p =>
                    p.id === id
                      ? { ...p, diamonds: (p.diamonds || 0) + (quest.reward || 0), daily_quests: quests.map((q, i) => i === questIndex ? { ...q, claimed: true } : q) }
                      : p
                  ),
                }
              })}
              onInitWeeklyQuests={(newQuests) => {
                markRookieQuest('spinWeekly')
                setSt(prev => {
                  const id = prev.activePlayerId
                  return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, weekly_quests: newQuests, last_weekly_quest_pick: getWeekStart().toDateString() } : p) }
                })
              }}
              onClaimWeeklyQuest={(questIndex, reward) => setSt(prev => {
                const id     = prev.activePlayerId
                const player = prev.players.find(p => p.id === id)
                const quests = player?.weekly_quests || []
                return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, diamonds: (p.diamonds || 0) + reward, weekly_quests: quests.map((q, i) => i === questIndex ? { ...q, claimed: true, completed: true } : q) } : p) }
              })}
              onWeeklySpinComplete={(prize) => setSt(prev => {
                const id     = prev.activePlayerId
                const player = prev.players.find(p => p.id === id)
                const updates = { lastWeeklySpin: new Date().toISOString() }
                if (prize.diamonds) updates.diamonds = (player?.diamonds || 0) + prize.diamonds
                if (prize.eloShield && !player?.hasEloShield) updates.hasEloShield = true
                return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, ...updates } : p) }
              })}
            />
          )}
          {tab === 'store' && (
            <StreakHub
              player={aPlayer}
              stats={stats}
              onNavigate={setTab}
              onPurchaseItem={(itemId, cost) => {
                const diamonds = aPlayer.diamonds || 0
                if (diamonds < cost) return
                if (itemId === 'streakFreeze') {
                  // Audio is played by StreakHub.buyItem() before this callback —
                  // no second sound needed here to avoid double-play
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, streak_freezes: (p.streak_freezes || 0) + 1 } : p) })
                } else if (itemId === 'weekStreakFreeze') {
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, week_streak_freezes: (p.week_streak_freezes || 0) + 1 } : p) })
                } else if (itemId === 'doubleXpToken') {
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, doubleXpTokens: (p.doubleXpTokens || 0) + 1 } : p) })
                } else if (itemId === 'eloShield') {
                  if (aPlayer.hasEloShield) return
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, hasEloShield: true } : p) })
                } else if (itemId === 'eloReset') {
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, elo: 1000 } : p) })
                } else if (itemId === 'borderGlow') {
                  if (aPlayer.boughtBorderGlow) return
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, boughtBorderGlow: true, hasBorderGlow: true } : p) })
                } else if (itemId === 'toggleBorderGlow') {
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, hasBorderGlow: !p.hasBorderGlow } : p) })
                  audioEngine.playUtilitySuccess()
                } else if (itemId === 'unlockPfp') {
                  if (aPlayer.canChangePfp) return
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, canChangePfp: true } : p) })
                } else if (itemId === 'sadTrombone') {
                  if (aPlayer.sadTromboneUnlocked) return
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, sadTromboneUnlocked: true } : p) })
                } else if (itemId === 'rageBait') {
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost } : p) })
                  setRageBaitSender(true)
                } else if (itemId === 'compliment') {
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost } : p) })
                  setComplimentSender(true)
                }
              }}
            />
          )}
          {tab === 'board' && (
            <Leaderboard
              player={aPlayer}
              players={st.players}
              sessions={st.sessions}
            />
          )}
          {tab === 'stats' && (
            <GoalHeatmap
              player={aPlayer}
              stats={stats}
              sessions={st.sessions}
            />
          )}
          {tab === 'badges' && (
            <BadgeGrid
              player={aPlayer}
              sessions={st.sessions}
              newBadgeIds={newBadgeIds}
              onBadgeClick={(b, isEarned) => setBadgePreview({ badge: b, earned: isEarned })}
            />
          )}
          {tab === 'ranks' && <RanksTab stats={stats} openDetail={rankDetailOpen} onDetailClose={() => setRankDetailOpen(false)} />}
        </div>

        {/* ── Rookie milestone completion toast ──────────────────────────── */}
        {rookieToast && (
          <>
            <style>{`
              @keyframes rookieSlideUp {
                from { transform: translateX(-50%) translateY(20px); opacity: 0 }
                to   { transform: translateX(-50%) translateY(0);    opacity: 1 }
              }
              @keyframes rookieStrike {
                from { width: 0 }
                to   { width: 100% }
              }
              .rookie-strike-wrap {
                position: relative;
                display: inline-block;
              }
              .rookie-strike-wrap::after {
                content: '';
                position: absolute;
                left: 0;
                top: 50%;
                height: 2px;
                width: 0;
                background: #a855f7;
                animation: rookieStrike 0.55s ease-out 0.35s forwards;
              }
            `}</style>
            <div style={{
              position: 'fixed', bottom: 80, left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 310,
              background: 'linear-gradient(135deg,#1a0a30,#2d1060)',
              border: '1.5px solid #a855f7',
              borderRadius: 18, padding: '14px 20px',
              boxShadow: '0 0 28px #a855f755, 0 4px 20px rgba(0,0,0,0.65)',
              maxWidth: '88vw', minWidth: 240,
              animation: 'rookieSlideUp 0.3s ease-out both',
            }}>
              {/* Achievement context header */}
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
                color: '#a855f7', letterSpacing: '0.2em', textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                ✅ ACHIEVEMENT COMPLETED
              </div>

              {/* Milestone name with strike-through animation */}
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700,
                color: '#d8b4fe', letterSpacing: '0.04em', lineHeight: 1.3,
                marginBottom: 8,
              }}>
                <span className="rookie-strike-wrap">
                  {rookieToast.icon} {rookieToast.label}
                </span>
              </div>

              {/* Diamond reward — explicit sentence */}
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700,
                color: '#fbbf24', letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 14 }}>💎</span>
                You just earned {rookieToast.reward} diamonds!
              </div>
            </div>
          </>
        )}

        {/* ── Undo last set toast ──────────────────────────────────────────── */}
        {undoSnapshot && tab === 'session' && (
          <div style={{
            position: 'fixed', bottom: 80, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg,#0f172a,#1e293b)',
            border: '1.5px solid #3b82f6',
            borderRadius: 14, padding: '10px 14px',
            boxShadow: '0 0 20px #3b82f655, 0 4px 16px rgba(0,0,0,0.6)',
            pointerEvents: 'auto',
          }}>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
              ✅ Set logged
            </span>
            <button
              onClick={handleUndo}
              style={{
                background: 'linear-gradient(135deg,#1d3a6e,#1e40af)',
                border: '1.5px solid #3b82f6',
                borderRadius: 8, padding: '5px 14px',
                fontFamily: "'Bangers',sans-serif", fontSize: 16,
                letterSpacing: '0.08em', color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 0 10px #3b82f655',
              }}
            >
              UNDO
            </button>
          </div>
        )}

        {/* ── Feedback floating button ────────────────────────────────────── */}
        <button
          onClick={() => setFeedbackOpen(true)}
          title="Report a bug or request a feature"
          style={{
            position: 'fixed', bottom: 16, right: 16, zIndex: 90,
            background: 'linear-gradient(135deg,rgba(69,10,10,0.82),rgba(127,29,29,0.82))',
            border: '1px solid #ef444455',
            borderRadius: 20, padding: '7px 12px',
            display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 0 16px rgba(239,68,68,0.25), 0 2px 8px rgba(0,0,0,0.5)',
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11,
            fontWeight: 800, letterSpacing: '0.08em', color: '#fca5a5',
            opacity: 0.8,
            transition: 'opacity 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 0 28px rgba(239,68,68,0.45), 0 2px 8px rgba(0,0,0,0.5)'; e.currentTarget.style.borderColor = '#ef444488' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.boxShadow = '0 0 16px rgba(239,68,68,0.25), 0 2px 8px rgba(0,0,0,0.5)'; e.currentTarget.style.borderColor = '#ef444455' }}
          onTouchStart={e => { e.currentTarget.style.opacity = '1' }}
          onTouchEnd={e => { e.currentTarget.style.opacity = '0.8' }}
        >
          <span style={{ fontSize: 13 }}>🕹️</span>
          <span>REPORT BUG</span>
        </button>

        {/* ── Feedback modal ──────────────────────────────────────────────── */}
        {feedbackOpen && (
          <FeedbackModal
            player={aPlayer}
            activeTab={tab}
            onClose={() => setFeedbackOpen(false)}
            onSuccess={() => {
              setFeedbackToast(true)
              setTimeout(() => setFeedbackToast(false), 3500)
            }}
          />
        )}

        {/* ── Success toast ───────────────────────────────────────────────── */}
        {feedbackToast && (
          <div style={{
            position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
            zIndex: 500, pointerEvents: 'none',
            background: 'linear-gradient(135deg,#052e16,#14532d)',
            border: '1px solid #22c55e66',
            borderRadius: 14, padding: '12px 20px',
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14,
            fontWeight: 700, color: '#4ade80', letterSpacing: '0.06em',
            boxShadow: '0 0 24px rgba(34,197,94,0.3), 0 4px 16px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
            animation: 'slideUp 0.3s ease-out both',
          }}>
            🛠️ Feedback received! Time to go fix things.
          </div>
        )}

      </div>
    )
  }

  // Fallback — shouldn't be reached but guards against bad view state
  return (
    <>
      <GlobalStyles />
      <HomeScreen st={st} upd={upd} />
    </>
  )
}
