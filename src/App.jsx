import { useState, useEffect, useRef } from 'react'
import { AlertCircle, Plus, Lock, X } from 'lucide-react'

import { saveSt } from './utils/storage.js'
import { saveToFirestore, deletePlayerData, forceSessionSync, setPlayerPhotoURL, purchaseDiamondItem } from './utils/firestoreSync.js'
import { audioEngine } from './services/audioEngine.js'
import { sendRageBait, subscribeToRageBaits, dismissRageBait, sendCompliment, subscribeToCompliments, dismissNotification } from './services/rageBaitService.js'
import { RageBaitSenderModal, RageBaitReceiverModal, ComplimentSenderModal, ComplimentReceiverModal } from './components/overlays/RageBaitModal.jsx'
import PuckRoundOutcomeModal from './components/modals/PuckRoundOutcomeModal.jsx'
import { playerStats, newId, getWeekStart, getLevel, localDateStr } from './utils/stats.js'
import { useAppStore } from './store/useAppStore.js'
import { useShallow } from 'zustand/react/shallow'
import { BADGES, getBadgeXP }             from './constants/badges.js'
import { STREAK_BADGES, toCircleBadge }  from './constants/streakBadges.js'
import { allTimeStreakPB }               from './utils/badgeHelpers.js'
import { ROOKIE_QUESTS, DEFAULT_ROOKIE_QUESTS } from './constants/rookieQuests.js'
import { useAudio }                      from './hooks/useAudio.js'
import { useTheme }                      from './hooks/useTheme.js'
import { useMatchResults, tauntPathFor } from './hooks/useMatchResults.js'
import { TAUNT_IDS, TAUNT_PRICE }        from './constants/taunts.js'
import { usePuckTurnAlerts }             from './hooks/usePuckTurnAlerts.js'

import HomeScreen         from './components/screens/HomeScreen.jsx'
import PlayerSelectScreen from './components/screens/PlayerSelectScreen.jsx'
import ChallengesTab      from './components/screens/ChallengesTab.jsx'

import Dashboard        from './components/Dashboard.jsx'
import ShootTracker     from './components/ShootTracker.jsx'
import Games            from './components/Games.jsx'
import StreakHub        from './components/StreakHub.jsx'
import DailyQuests      from './components/screens/DailyQuests.jsx'
import Leaderboard      from './components/screens/Leaderboard.jsx'
import { updateStreak }      from './utils/streakService.js'
import { applyQuestProgress } from './utils/questHelpers.js'
import {
  normaliseUsername, isUsernameAvailable, registerWithUsername,
  parseContactField, validateContactField, friendlyAuthError,
} from './utils/authHelpers.js'
import { validateUsername as moderateUsername } from './utils/moderation.js'
import GoalHeatmap      from './components/GoalHeatmap.jsx'
import BadgeGrid        from './components/BadgeGrid.jsx'
import RanksTab         from './components/RanksTab.jsx'
import CoachPortal      from './components/CoachPortal.jsx'

import TabBar        from './components/shared/TabBar.jsx'
import PlayerHeader  from './components/shared/PlayerHeader.jsx'
import GlobalStyles  from './components/shared/GlobalStyles.jsx'
import Scaffold      from './components/shared/Scaffold.jsx'

import BadgePopup           from './components/overlays/BadgePopup.jsx'
import { WidgetErrorBoundary } from './components/shared/ErrorBoundary.jsx'
import OnboardingModal     from './components/overlays/OnboardingModal.jsx'
import EpicCelebration     from './components/overlays/EpicCelebration.jsx'
import CelebOverlay              from './components/overlays/CelebOverlay.jsx'
import ChallengeAnsweredBanner   from './components/overlays/ChallengeAnsweredBanner.jsx'
import PuckTurnBanner            from './components/overlays/PuckTurnBanner.jsx'
import CoachMsgPopup       from './components/overlays/CoachMsgPopup.jsx'
import StreakBrokenModal   from './components/overlays/StreakBrokenModal.jsx'
import FeedbackModal       from './components/overlays/FeedbackModal.jsx'
import VersusVictoryModal  from './components/overlays/VersusVictoryModal.jsx'
import VersusTieModal      from './components/overlays/VersusTieModal.jsx'
import VersusDefeatModal   from './components/overlays/VersusDefeatModal.jsx'
import CreatePeerChallenge from './components/screens/CreatePeerChallenge.jsx'
import RespondToChallenge  from './components/screens/RespondToChallenge.jsx'
import { getGameAction } from './services/puckGameService.js'
import { markChallengesAsSeen, claimChallengeLoserReward, claimChallengeTieReward } from './services/peerChallengeService.js'
import { subscribeToChallenges, subscribeToPuckGames } from './services/realtimeSync.js'
import { usePlayer, ACTIVE_PLAYER_KEY } from './context/PlayerContext.jsx'
import { useUI } from './context/UIContext.jsx'

import { C, APP_BG } from './styles.js'

export default function App() {
  // ── Player state (boot, Firestore sync, active player) ───────────────────
  const { st, setSt, upd, loading, activePlayer, coachAwardToast, setCoachAwardToast, lastSaveRef, selfDiamondClaimRef } = usePlayer()
  const aPlayer = activePlayer

  // ── UI state (tab nav, overlays, toasts, modals) ─────────────────────────
  const {
    tab, setTab,
    rankDetailOpen, setRankDetailOpen,
    challengeScreen, setChallengeScreen,
    deepLinkPuckGameId, setDeepLinkPuckGameId,
    epicCeleb, setEpicCeleb,
    celeb, setCeleb,
    badgePreview, setBadgePreview,
    rookieToast, setRookieToast,
    feedbackToast, setFeedbackToast,
    rookieToastTimer,
    feedbackOpen, setFeedbackOpen,
    streakBrokenData, setStreakBrokenData,
    victoryReward, setVictoryReward,
    tieReward, setTieReward,
    defeatState, setDefeatState,
    pendingRoundOutcome, setPendingRoundOutcome,
    rageBaitSender, setRageBaitSender,
    rageBaitReceived, setRageBaitReceived,
    complimentSender, setComplimentSender,
    complimentReceived, setComplimentReceived,
    expiredVictoryBanner, setExpiredVictoryBanner,
    challengeAnsweredBanner, setChallengeAnsweredBanner,
    puckTurnBanner, setPuckTurnBanner,
  } = useUI()

  // ── Session / animation state (tightly coupled to game logic) ────────────
  const [sesGoal,     setSesGoal]    = useState(10)
  const [newBadgeIds, setNewBadgeIds] = useState({})
  const [flashZone,   setFlashZone]  = useState(null)
  const [flashType,   setFlashType]  = useState(null)
  const [puckAnim,    setPuckAnim]   = useState(null)
  const [pinInput,    setPinInput]   = useState('')
  const [pinErr,      setPinErr]     = useState(false)
  const [npName,      setNpName]     = useState('')  // display name (any chars)
  const [npNum,       setNpNum]      = useState('')
  const [npPw,        setNpPw]       = useState('')
  const [npPwConfirm, setNpPwConfirm] = useState('')
  const [npContact,   setNpContact]  = useState('')  // optional email or phone
  const [npUsername,  setNpUsername] = useState('')  // new: username field
  const [npSignupErr, setNpSignupErr] = useState('')
  const [npSignupBusy, setNpSignupBusy] = useState(false)
  const [peerChallenges, setPeerChallenges] = useState([])
  const [puckGames,      setPuckGames]      = useState([])
  const [isSaving,       setIsSaving]       = useState(false)
  const [weakConnToast,  setWeakConnToast]  = useState(false)
  const [undoSnapshot,   setUndoSnapshot]   = useState(null)
  const undoTimerRef = useRef(null)

  const badgeQRef               = useRef([])
  const epicAudioRef            = useRef(null)
  const streakInsuranceCheckedRef = useRef(null)
  const weakConnTimerRef        = useRef(null)
  const rageBaitUnsubRef        = useRef(null)
  const complimentUnsubRef      = useRef(null)
  const challengesUnsubRef      = useRef(null)
  const puckGamesUnsubRef       = useRef(null)
  const lastChallengeLiRef      = useRef(null)
  // ── Versus match outcome detection (victory + defeat) ────────────────────
  // Extracted into a dedicated hook that owns all snapshot-driven win/loss logic.
  // Refs are returned so handlePeerChallengeSubmit can mark challenges seen before
  // the peerChallenges state update triggers the hook's effects.
  const { seenVictoryIds, seenDefeatIds, seenTieIds } = useMatchResults(peerChallenges)
  usePuckTurnAlerts(puckGames)

  // Reactive read of the technique/challenge XP pool.  Drives XP bar + level display.
  // useShallow prevents re-renders when a new techniqueByPlayer object is written
  // with the same per-player values (shallow-compares the player-keyed entries).
  const techniqueByPlayer = useAppStore(useShallow(s => s.techniqueByPlayer))
  const play         = useAudio()
  const { theme, toggleOutsideMode } = useTheme()

  // ── Global button click sound ─────────────────────────────────────────────
  // A single delegated listener covers every button and role="button" element
  // in the app without touching individual components.  Routes through
  // audioEngine so the existing mute toggle suppresses it automatically.
  useEffect(() => {
    const handleClick = e => {
      if (!e.target.closest('button, [role="button"], .arcade-card-clickable')) return
      audioEngine.playButtonClick()
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

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
    const already        = { ...(player.earnedBadges || {}) }

    // ── Step 1: migrate legacy name-keyed streak entries to canonical IDs ──────
    // Earlier code inadvertently wrote badge display names (e.g. 'Hat Trick')
    // as earnedBadges keys instead of the system IDs ('streak_3'). Remap them
    // so the BadgeGrid's ID-based lookup finds them correctly.
    const STREAK_NAME_TO_ID = {
      'The Spark':      'streak_1',
      'Light the Lamp': 'streak_2',
      'Hat Trick':      'streak_3',
      'Five-Hole Fire': 'streak_5',
      'Hot Stick':      'streak_7',
      'Playoff Beard':  'streak_14',
      'Iron Guard':     'streak_30',
      'Barn Burner':    'streak_60',
      'Living Legend':  'streak_90',
    }
    Object.entries(STREAK_NAME_TO_ID).forEach(([name, id]) => {
      if (already[name] && !already[id]) {
        already[id] = already[name]
        delete already[name]
      } else if (already[name]) {
        delete already[name]   // duplicate — correct ID already present
      }
    })

    const newBadges = BADGES.filter(b => !already[b.id] && b.check(player, st.sessions))

    // ── Step 2: backfill STREAK_BADGES ────────────────────────────────────────
    // Use the higher of allTimeStreakPB (from session history) and streakCount
    // (stored in Firestore). Technique-only days and PUCK/Versus turns update
    // streakCount without creating session documents, so allTimeStreakPB alone
    // underestimates the streak for those players.
    // If streakCount >= 7, all intermediate milestones (3, 5, 7) are awarded.
    const streakPB        = Math.max(
      allTimeStreakPB(player, st.sessions),
      player.streakCount || 0
    )
    const newStreakBadges = STREAK_BADGES
      .filter(sb => streakPB >= sb.milestone && !already[sb.id])
      .map(sb => toCircleBadge(sb))

    const allNewBadges   = [...newBadges, ...newStreakBadges]
    if (!allNewBadges.length) return
    const now = Date.now()
    allNewBadges.forEach(b => { already[b.id] = { ts: now } })
    // Award XP before setSt so Zustand is fresh when the save fires
    const totalBadgeXP = allNewBadges.reduce((sum, b) => sum + getBadgeXP(b), 0)
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
  // IMPORTANT: Do NOT close over `aPlayer` here.  This effect runs before the
  // `if (loading || !st) return` guard, so on the first render (when st is null)
  // `aPlayer` would be null.  Derive the player fresh from `st` inside the callback.
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

    // Any active freeze path protects against the broken-streak modal:
    // consumable counts (pending, not yet triggered), or active timestamp windows
    // (set when a freeze is actually consumed, or when a week freeze is purchased).
    const hasFreeze =
      (p.streak_freezes      || 0) > 0 ||
      (p.week_streak_freezes || 0) > 0 ||
      ((p.streakFreezeUntil  || 0) > Date.now()) ||
      ((p.weeklyFreezeUntil  || 0) > Date.now())

    // Use calendar-day comparison to match updateStreak's logic.
    // Streak is broken if last activity was before yesterday (i.e. 2+ calendar
    // days ago), not simply "more than 36 hours ago". This prevents falsely
    // showing the broken-streak modal for a player who shot late one night and
    // logged in the following evening (>24h gap but consecutive calendar days).
    const lastDateStr = p.lastActivity ? new Date(p.lastActivity).toDateString() : null
    const yesterday   = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toDateString()
    const todayStr     = new Date().toDateString()
    const streakBroken = lastDateStr
      && lastDateStr !== todayStr
      && lastDateStr !== yesterdayStr  // last activity was 2+ days ago

    // Skip the broken-streak modal when a freeze is available — updateStreak()
    // will silently consume it on the next shot and keep the streak intact.
    if (p.streakCount > 0 && streakBroken && !hasFreeze) {
      setStreakBrokenData({ prevCount: p.streakCount })
      audioEngine.playStreakBroken()
    }
  }, [st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps


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

    const rqNow = aPlayer.rookieQuests || {}
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
    // Stamp selfDiamondClaimRef so the PlayerContext snapshot listener treats
    // the resulting diamond increase as self-initiated and skips the flute.
    selfDiamondClaimRef.current = Date.now()
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

  const aSess = st.sessions.find(s => s.id === st.activeSessionId)

  // ── Badge queue helpers ───────────────────────────────────────────────────
  function stopEpicAudio() {
    audioEngine.stopHeavyAudio()
    if (epicAudioRef.current) {
      try { epicAudioRef.current.pause(); epicAudioRef.current.currentTime = 0 } catch {}
      epicAudioRef.current = null
    }
  }

  function popNextBadge() {
    if (badgeQRef.current.length === 0) return
    const next = badgeQRef.current.shift()
    setEpicCeleb({ type: 'badge', badge: next })
    audioEngine.playBadgeUnlock()
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
      const today = localDateStr()
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
      const today = localDateStr()
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

      // Tie: receiver gets equal partial reward; mark seen so the snapshot effect
      // in useMatchResults (which guards the CHALLENGER path) doesn't double-fire.
      // Guard on both isTie flag AND winnerId === null so legacy documents that
      // predate the isTie field don't accidentally fall into the defeat branch.
      if (challenge.isTie || challenge.winnerId === null) {
        seenTieIds.current.add(challenge.id)
        const opponentNameTie = challenge.challengerId === activeId ? challenge.receiverName : challenge.challengerName
        // Atomic lock: prevents the receiver from re-collecting if the app is reloaded
        // before the VersusTieModal's onClaim runs.
        claimChallengeTieReward(challenge.id, 'receiver').then(granted => {
          if (!granted) return  // already claimed on another device or session
          setTieReward({ type: 'versus', diamonds: 5, xp: 10, opponentId, opponentName: opponentNameTie, challengeId: challenge.id })
        })
      } else if (challenge.winnerId === activeId) {
        // The snapshot useEffect handles win detection, Firestore flag write,
        // reward application, and modal show atomically.  Mark as seen here so
        // the effect doesn't double-queue if the snapshot arrives before the
        // peerChallenges state update for this submit.
        seenVictoryIds.current.add(challenge.id)
      } else {
        // Mark seen so the defeat detection hook doesn't double-fire for the receiver
        seenDefeatIds.current.add(challenge.id)
        // Resolve winner's equipped taunt from local state (challenger's profile is cached)
        const winnerInLocal  = st.players.find(p => p.id === challenge.winnerId)
        // Show the modal immediately — reward application is async and gated by Firestore
        setDefeatState({
          type: 'versus', diamonds: 1, xp: 2,
          opponentId,
          opponentName: challenge.challengerId === activeId ? challenge.receiverName : challenge.challengerName,
          myHits:       challenge.challengerId === activeId ? challenge.challengerHits : (challenge.receiverHits ?? 0),
          opponentHits: challenge.challengerId === activeId ? (challenge.receiverHits ?? 0) : challenge.challengerHits,
          opponentVideoUrl: winnerVideoUrl,
          tauntAudioPath: tauntPathFor(winnerInLocal),
        })
        // Consolation rewards: atomic Firestore transaction prevents re-claiming on
        // login/refresh.  seenDefeatIds only blocks same-session double-fires;
        // loserRewardsClaimed is the persistent cross-session lock.
        claimChallengeLoserReward(challenge.id).then(granted => {
          if (!granted) return
          upd({ players: st.players.map(p => p.id === activeId ? { ...p, diamonds: (p.diamonds || 0) + 1 } : p) })
          useAppStore.getState().logTechniqueShots(activeId, 0, 2)
        })
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

  function cancelSession() {
    if (!aSess) return
    // Discard the partial session entirely — remove it from the sessions list
    // so it doesn't appear in history or stats. This is the "exit without saving"
    // path: no Firestore write, no quest progress, clean state reset.
    upd({
      sessions: st.sessions.filter(s => s.id !== aSess.id),
      activeSessionId: null,
    })
  }

  async function endSession() {
    if (!aSess) return

    const sets  = aSess.sets || []   // guard: sets may be missing on legacy sessions
    const shots = sets.length * 10

    // Zero-shot session: quietly discard it, clear the active session, and
    // route back to the dashboard. No Firestore write, no alert, no crash.
    if (shots === 0) {
      upd({ activeSessionId: null })
      setTab('dashboard')
      return
    }

    const hits = sets.reduce((a, s) => a + (s.hits ?? 0), 0)

    // ── Quest progress — mark completed, no auto-reward (tap-to-claim) ────
    const techniqueByPlayer = useAppStore.getState().techniqueByPlayer || {}
    const questResult = aPlayer ? applyQuestProgress(aPlayer, st.sessions, techniqueByPlayer, puckGames, peerChallenges) : null
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

    // Quest completion toasts: applyQuestProgress (above) already computed
    // which quests are newly completed; surface a light celebration for each one.
    // CelebOverlay (setCeleb) is used intentionally — NOT setEpicCeleb — because
    // quest completions are not badge unlocks and EpicCelebration has no close path
    // for unknown types, which would freeze the UI.
    if (questResult) {
      questResult.updatedQuests.forEach((q, i) => {
        const wasAlreadyDone = aPlayer.daily_quests?.[i]?.completed
        if (q.completed && !wasAlreadyDone) {
          setTimeout(() => {
            setCeleb({ emoji: '⭐', title: 'Quest Complete!', subtitle: 'Tap to claim your reward 💎' })
            audioEngine.playUtilitySuccess()
          }, 500)
        }
      })
    }

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
      s.id === aSess.id ? { ...s, sets: [...(s.sets || []), set] } : s
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

    // Badge check — regular badges + streak milestones
    const already        = { ...(aPlayer.earnedBadges || {}) }
    const newBadges      = BADGES.filter(b => !already[b.id] && b.check(aPlayer, updSessions))
    const streakPB        = Math.max(allTimeStreakPB(aPlayer, updSessions), aPlayer.streakCount || 0)
    const newStreakBadges = STREAK_BADGES
      .filter(sb => streakPB >= sb.milestone && !already[sb.id])
      .map(sb => toCircleBadge(sb))
    const allNewBadges   = [...newBadges, ...newStreakBadges]

    let updPlayers = st.players
    if (allNewBadges.length) {
      const now = Date.now()
      allNewBadges.forEach(b => { already[b.id] = { ts: now } })
      // Award XP before upd() so Zustand is fresh when the resulting saveSt fires
      const totalBadgeXP = allNewBadges.reduce((sum, b) => sum + getBadgeXP(b), 0)
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
        allNewBadges.forEach(b => { n[b.id] = true })
        return n
      })
      badgeQRef.current.push(...allNewBadges)
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

    // Badge check — regular badges + streak milestones
    const already        = { ...(aPlayer.earnedBadges || {}) }
    const newBadges      = BADGES.filter(b => !already[b.id] && b.check(aPlayer, updSessions))
    const streakPB        = Math.max(allTimeStreakPB(aPlayer, updSessions), aPlayer.streakCount || 0)
    const newStreakBadges = STREAK_BADGES
      .filter(sb => streakPB >= sb.milestone && !already[sb.id])
      .map(sb => toCircleBadge(sb))
    const allNewBadges   = [...newBadges, ...newStreakBadges]

    let updPlayers = st.players
    if (allNewBadges.length) {
      const now = Date.now()
      allNewBadges.forEach(b => { already[b.id] = { ts: now } })
      // Award XP before upd() so Zustand is fresh when the resulting saveSt fires
      const totalBadgeXP = allNewBadges.reduce((sum, b) => sum + getBadgeXP(b), 0)
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
        allNewBadges.forEach(b => { n[b.id] = true })
        return n
      })
      badgeQRef.current.push(...allNewBadges)
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
    function clearSignupForm() {
      setNpUsername(''); setNpName(''); setNpNum(''); setNpPw(''); setNpPwConfirm('')
      setNpContact(''); setNpSignupErr(''); setNpSignupBusy(false)
    }

    async function handleSignup() {
      setNpSignupErr('')
      const username = normaliseUsername(npUsername)
      const name     = npName.trim() || username   // display name falls back to username

      // ── Username validation (length + allowed chars + profanity) ──────────
      if (!username) { setNpSignupErr('Please choose a username.'); return }
      const modResult = moderateUsername(username)
      if (!modResult.valid) { setNpSignupErr(modResult.reason); return }
      if (!npPw) { setNpSignupErr('Please set a password.'); return }
      if (npPw.length < 6) { setNpSignupErr('Password must be at least 6 characters.'); return }
      if (npPw !== npPwConfirm) { setNpSignupErr('Passwords don\'t match.'); return }

      const contactErr = validateContactField(npContact)
      if (contactErr) { setNpSignupErr(contactErr); return }

      setNpSignupBusy(true)

      // ── Username uniqueness check ────────────────────────────────────────
      const available = await isUsernameAvailable(username)
      if (!available) {
        setNpSignupErr('That username is taken — try a different one.')
        setNpSignupBusy(false)
        return
      }

      // ── Parse optional contact field ─────────────────────────────────────
      const { email: contactEmail, phone: contactPhone } = parseContactField(npContact)

      // ── Firebase Auth (best-effort — game still works without it) ────────
      let firebaseUid = null
      try {
        const fbUser = await registerWithUsername(username, npPw)
        firebaseUid = fbUser.uid
      } catch (err) {
        // If the username is already taken in Firebase Auth, surface that.
        // Any other Auth error is non-fatal — the local record is still created.
        if (err?.code === 'auth/email-already-in-use') {
          setNpSignupErr('That username is already registered. Try a different one.')
          setNpSignupBusy(false)
          return
        }
        console.warn('[Signup] Firebase Auth registration failed (non-fatal):', err.message)
      }

      // ── Create local player record ────────────────────────────────────────
      const p = {
        id:                 firebaseUid || newId(),
        username:           username,
        name:               name,
        displayName:        name,
        email:              contactEmail,   // null if not provided or is a phone
        phone:              contactPhone,   // null if not provided or is an email
        jerseyNum:          npNum.trim(),
        password:           npPw,           // kept for PlayerSelectScreen local comparison
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
      clearSignupForm()
    }

    return (
      <>
        <GlobalStyles />
        <Scaffold
          onBack={() => { clearSignupForm(); upd({ view: 'home' }) }}
          title="Create Your Profile"
        >
          <div style={C.card}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#60a5fa', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 18 }}>
              🏒 JOIN YOUR TEAM — SIGN UP
            </div>

            <label style={C.label}>Username *</label>
            <input
              value={npUsername}
              onChange={e => { setNpUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setNpSignupErr('') }}
              placeholder="e.g. connor97"
              autoCapitalize="none"
              autoCorrect="off"
              style={C.inp}
            />
            {npUsername.length > 0 && (
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#475569', marginTop: -8, marginBottom: 8, letterSpacing: '0.04em' }}>
                Your handle: <span style={{ color: '#60a5fa' }}>@{normaliseUsername(npUsername)}</span>
              </div>
            )}

            <label style={C.label}>Display Name (optional)</label>
            <input
              value={npName}
              onChange={e => setNpName(e.target.value)}
              placeholder="e.g. Connor  (defaults to username if blank)"
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
              onChange={e => { setNpPw(e.target.value); setNpSignupErr('') }}
              placeholder="At least 6 characters"
              style={C.inp}
            />

            <label style={C.label}>Confirm Password *</label>
            <input
              type="password"
              value={npPwConfirm}
              onChange={e => { setNpPwConfirm(e.target.value); setNpSignupErr('') }}
              placeholder="Repeat your password"
              style={{ ...C.inp, borderColor: npPwConfirm && npPw !== npPwConfirm ? '#ef4444' : undefined }}
            />

            <label style={C.label}>Email or Phone Number <span style={{ color: '#475569', fontWeight: 400 }}>(optional)</span></label>
            <input
              value={npContact}
              onChange={e => { setNpContact(e.target.value); setNpSignupErr('') }}
              placeholder="For password recovery if you get logged out"
              autoCapitalize="none"
              autoCorrect="off"
              style={C.inp}
            />

            {npSignupErr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                <AlertCircle size={13} /> {npSignupErr}
              </div>
            )}

            <button
              style={{ ...C.btnP, opacity: npSignupBusy ? 0.55 : 1, cursor: npSignupBusy ? 'not-allowed' : 'pointer' }}
              disabled={npSignupBusy}
              onClick={handleSignup}
            >
              <Plus size={16} /> {npSignupBusy ? 'Creating…' : 'Create My Profile'}
            </button>

            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#475569', textAlign: 'center', marginTop: 10, letterSpacing: '0.06em' }}>
              No email required. Username + password is all you need.
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
                const base   = npName.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'player'
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
                  hasEverSpunWheelDaily:  false,
                  hasEverSpunWheelWeekly: false,
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
            onClick={() => setCoachAwardToast(null)}
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

        {/* ── Ranked expiration forfeit-win banner ─────────────────── */}
        {expiredVictoryBanner && !challengeAnsweredBanner && (
          <div
            onClick={() => { setExpiredVictoryBanner(null); setTab('challenges') }}
            style={{
              position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9100, width: 'calc(100% - 32px)', maxWidth: 440,
              background: 'linear-gradient(135deg,#0a1f0a,#0d2d10)',
              border: '2px solid #22c55e',
              borderRadius: 16, padding: '14px 44px 14px 16px',
              cursor: 'pointer', userSelect: 'none',
              boxShadow: '0 0 40px #22c55e33, 0 4px 20px rgba(0,0,0,0.6)',
              animation: 'bannerSlideDown 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>⚡</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.08em', color: '#22c55e', lineHeight: 1.1 }}>
                FREE ELO WIN!
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 600, color: '#94a3b8', marginTop: 3, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {expiredVictoryBanner.opponentName} failed to respond in time.
                {expiredVictoryBanner.eloGained > 0 && ` +${expiredVictoryBanner.eloGained} ELO awarded.`}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#22c55e', letterSpacing: '0.1em', marginTop: 5 }}>
                TAP TO VIEW RESULTS →
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setExpiredVictoryBanner(null) }}
              style={{ position: 'absolute', top: 10, right: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', padding: 4 }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ── Challenge-answered arcade banner ─────────────────────── */}
        {challengeAnsweredBanner && (
          <ChallengeAnsweredBanner
            data={challengeAnsweredBanner}
            onDismiss={() => setChallengeAnsweredBanner(null)}
            onView={() => { setChallengeAnsweredBanner(null); setTab('challenges') }}
          />
        )}

        {/* ── P-U-C-K turn banner ───────────────────────────────────── */}
        {puckTurnBanner && !challengeAnsweredBanner && (
          <PuckTurnBanner
            data={puckTurnBanner}
            onDismiss={() => setPuckTurnBanner(null)}
            onView={() => {
              setPuckTurnBanner(null)
              setDeepLinkPuckGameId(puckTurnBanner.gameId)
              setTab('session')
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

        {/* ── Versus defeat — appears after RespondToChallenge closes ── */}
        {defeatState && !challengeScreen && (
          <VersusDefeatModal
            defeatState={defeatState}
            onClaim={() => {
              setDefeatState(null)
              setTab('dashboard')
            }}
            onRematch={() => {
              const opponentId = defeatState.opponentId
              setDefeatState(null)
              setChallengeScreen({ mode: 'create', defaultFriendId: opponentId })
            }}
          />
        )}

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
          onBack={() => upd({ view: 'playerSelect', activePlayerId: null, activeSessionId: null })}
          theme={theme}
          onThemeToggle={toggleOutsideMode}
          onStreakClick={() => setTab('store')}
          onPhotoUpload={async url => {
            try {
              await setPlayerPhotoURL(aPlayer.id, url)
              upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, photoURL: url } : p) })
            } catch (err) {
              console.error('[App] Photo upload to Firestore failed:', err)
            }
          }}
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
            <WidgetErrorBoundary label="Dashboard">
              <Dashboard
                newBadgeIds={newBadgeIds}
                onBadgeClick={(b, isEarned) => setBadgePreview({ badge: b, earned: isEarned })}
                onStartSession={() => { startSession(); setTab('session') }}
                onNavigate={handleDashNavigate}
                peerChallenges={peerChallenges}
                onAcceptChallenge={c => setChallengeScreen({ mode: 'respond', challenge: c })}
                puckGames={puckGames}
                onPlayPuckGame={game => { setDeepLinkPuckGameId(game.id); setTab('session') }}
              />
            </WidgetErrorBoundary>
          )}
          {tab === 'session' && (
            <ShootTracker
              session={aSess}
              sesGoal={sesGoal}
              setSesGoal={setSesGoal}
              onLogSet={handleLogSet}
              onLogAll={handleLogAll}
              onEndSession={endSession}
              onStart={startSession}
              onCancelSession={cancelSession}
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
                const updSessions = [...st.sessions, atwSession]

                // Badge check — ATW completion may unlock atw_1 (Global Citizen)
                // and other ATW milestone badges. Must run against updSessions so
                // atwGamesPlayed() sees the new session immediately.
                const already        = { ...(aPlayer.earnedBadges || {}) }
                const newBadges      = BADGES.filter(b => !already[b.id] && b.check(aPlayer, updSessions))
                const streakPB       = Math.max(allTimeStreakPB(aPlayer, updSessions), aPlayer.streakCount || 0)
                const newStreakBadges = STREAK_BADGES
                  .filter(sb => streakPB >= sb.milestone && !already[sb.id])
                  .map(sb => toCircleBadge(sb))
                const allNewBadges   = [...newBadges, ...newStreakBadges]

                let updPlayers = st.players
                if (allNewBadges.length) {
                  const now = Date.now()
                  allNewBadges.forEach(b => { already[b.id] = { ts: now } })
                  const totalBadgeXP = allNewBadges.reduce((sum, b) => sum + getBadgeXP(b), 0)
                  if (totalBadgeXP > 0) useAppStore.getState().logTechniqueShots(aPlayer.id, 0, totalBadgeXP)
                  updPlayers = st.players.map(p =>
                    p.id === aPlayer.id ? { ...p, earnedBadges: already } : p
                  )
                  setNewBadgeIds(prev => {
                    const n = { ...prev }
                    allNewBadges.forEach(b => { n[b.id] = true })
                    return n
                  })
                  badgeQRef.current.push(...allNewBadges)
                  setEpicCeleb(cur => {
                    if (cur) return cur
                    const next = badgeQRef.current.shift()
                    if (next) audioEngine.playBadgeUnlock()
                    return next ? { type: 'badge', badge: next } : null
                  })
                }

                upd({ sessions: updSessions, players: updPlayers })
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
                    const today = localDateStr()
                    if (aPlayer.last_quest_spin === today) {
                      const qi = (aPlayer.daily_quests || []).findIndex(
                        q => q.text === 'Win a P-U-C-K Game Using at Least One Backhand Shot' && !q.completed && !q.claimed
                      )
                      if (qi >= 0) {
                        const quest = aPlayer.daily_quests[qi]
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
                        // Fire celebration for quest completion (same as session-end quests)
                        setTimeout(() => {
                          setEpicCeleb({
                            type: 'quest',
                            quest: {
                              questText: quest.text,
                              newProgress: 1,
                              targetProgress: 1
                            }
                          })
                          audioEngine.playBadgeUnlock()
                        }, 300)
                      }
                    }
                  }
                }
              }}
              deepLinkPuckGameId={deepLinkPuckGameId}
              onConcedeGame={gameId => {
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
              peerChallenges={peerChallenges}
              onCreateChallenge={() => setChallengeScreen('create')}
              onAcceptChallenge={c => setChallengeScreen({ mode: 'respond', challenge: c })}
            />
          )}
          {tab === 'quests' && (
            <DailyQuests
              onNavigate={setTab}
              peerChallenges={peerChallenges}
              puckGames={puckGames}
              onDiamondEarn={(amount) => setSt(prev => {
                const id = prev.activePlayerId
                return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, diamonds: (p.diamonds || 0) + amount } : p) }
              })}
              onSpinComplete={(quests) => {
                // Only award first-spin bonus if player has never spun before
                if (!aPlayer?.hasEverSpunWheelDaily) {
                  markRookieQuest('spinDaily')
                }
                setSt(prev => {
                  const id = prev.activePlayerId
                  return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, last_quest_spin: localDateStr(), daily_quests: quests || [], hasEverSpunWheelDaily: true } : p) }
                })
              }}
              onClaimQuest={async (questText, rewardValue) => {
                const id = st.activePlayerId
                if (!id) return

                const player = st.players.find(p => p.id === id)
                if (!player) return

                const quest = (player.daily_quests || []).find(q => q.text === questText)
                if (!quest || quest.claimed) return

                const diamondReward  = rewardValue || quest.reward || 0
                const diamondsAfter  = (player.diamonds || 0) + diamondReward

                const nextState = {
                  ...st,
                  players: st.players.map(p => {
                    if (p.id !== id) return p
                    return {
                      ...p,
                      diamonds:     diamondsAfter,
                      daily_quests: p.daily_quests.map(q =>
                        q.text === questText ? { ...q, claimed: true } : q
                      ),
                    }
                  }),
                }

                // Stamp the self-claim ref so the PlayerContext snapshot listener
                // won't fire the coachAwardToast + flute for this write
                selfDiamondClaimRef.current = Date.now()

                try {
                  await saveToFirestore(nextState, techniqueByPlayer, id)
                  setSt(nextState)
                } catch (err) {
                  console.error('[App.jsx onClaimQuest] Firestore write failed:', err)
                }
              }}
              onInitWeeklyQuests={(newQuests) => {
                // Only award first-spin bonus if player has never spun the weekly wheel before
                if (!aPlayer?.hasEverSpunWheelWeekly) {
                  markRookieQuest('spinWeekly')
                }
                setSt(prev => {
                  const id = prev.activePlayerId
                  return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, weekly_quests: newQuests || [], last_weekly_quest_pick: localDateStr(getWeekStart()), hasEverSpunWheelWeekly: true } : p) }
                })
              }}
              onClaimWeeklyQuest={async (questText, rewardValue) => {
                const id = st.activePlayerId
                if (!id) return

                const player = st.players.find(p => p.id === id)
                if (!player) return

                const quest = (player.weekly_quests || []).find(q => q.text === questText)
                if (!quest || quest.claimed) return

                const diamondReward = rewardValue || quest.reward || 0
                const diamondsAfter = (player.diamonds || 0) + diamondReward

                const nextState = {
                  ...st,
                  players: st.players.map(p => {
                    if (p.id !== id) return p
                    return {
                      ...p,
                      diamonds:      diamondsAfter,
                      weekly_quests: p.weekly_quests.map(q =>
                        q.text === questText ? { ...q, claimed: true, completed: true } : q
                      ),
                    }
                  }),
                }

                // Stamp the self-claim ref so the PlayerContext snapshot listener
                // won't fire the coachAwardToast + flute for this write
                selfDiamondClaimRef.current = Date.now()

                try {
                  await saveToFirestore(nextState, techniqueByPlayer, id)
                  setSt(nextState)
                } catch (err) {
                  console.error('[App.jsx onClaimWeeklyQuest] Firestore write failed:', err)
                }
              }}
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
              onNavigate={setTab}
              onEquipTaunt={(tauntId) => {
                upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, equippedTaunt: tauntId } : p) })
              }}
              onPurchaseItem={async (itemId, cost) => {
                const pid = aPlayer.id

                // ── Free cosmetic toggle — no diamonds, no transaction needed ──────
                if (itemId === 'toggleBorderGlow') {
                  const nextSt = { ...st, players: st.players.map(p =>
                    p.id === pid ? { ...p, hasBorderGlow: !p.hasBorderGlow } : p
                  )}
                  upd(nextSt)
                  saveSt(nextSt, pid)
                  audioEngine.playUtilitySuccess()
                  return
                }

                // ── Build Firestore transaction options per item ───────────────────
                // All diamond purchases flow through purchaseDiamondItem(), which reads
                // the server-authoritative balance in a transaction and writes atomically.
                // This bypasses the Math.max merge in saveToFirestore that silently
                // restores deducted diamonds, effectively making every purchase free.
                let options = {}
                if (itemId === 'streakFreeze') {
                  options.buildFields = p => ({ streak_freezes: (p.streak_freezes || 0) + 1 })

                } else if (itemId === 'weekStreakFreeze') {
                  options.buildFields = p => ({
                    week_streak_freezes: (p.week_streak_freezes || 0) + 1,
                    // Activate the 7-day protection window immediately on purchase.
                    // Stacks: if a freeze is already active, extends from its end
                    // rather than resetting from now.
                    weeklyFreezeUntil: Math.max(p.weeklyFreezeUntil || 0, Date.now())
                      + 7 * 24 * 60 * 60 * 1000,
                  })

                } else if (itemId === 'doubleXpToken') {
                  options.buildFields = p => ({ doubleXpTokens: (p.doubleXpTokens || 0) + 1 })

                } else if (itemId === 'eloShield') {
                  options.uniqueFlag  = 'hasEloShield'
                  options.buildFields = () => ({ hasEloShield: true })

                } else if (itemId === 'eloReset') {
                  options.buildFields = () => ({ elo: 1000 })

                } else if (itemId === 'borderGlow') {
                  options.uniqueFlag  = 'boughtBorderGlow'
                  options.buildFields = () => ({ boughtBorderGlow: true, hasBorderGlow: true })

                } else if (itemId === 'unlockPfp') {
                  options.uniqueFlag  = 'canChangePfp'
                  options.buildFields = () => ({ canChangePfp: true })

                } else if (itemId === 'sadTrombone') {
                  // Double-locked: boolean flag AND ownedItems membership so that
                  // both old (flag-only) and new (array-based) accounts are covered.
                  options.uniqueFlag   = 'sadTromboneUnlocked'
                  options.uniqueItemId = 'sad_trombone'
                  options.buildFields  = p => ({
                    sadTromboneUnlocked: true,
                    // Deduplicate in case the legacy flag was set without the array entry
                    ownedItems: [...new Set([...(Array.isArray(p.ownedItems) ? p.ownedItems : []), 'sad_trombone'])],
                  })

                } else if (itemId === 'rageBait' || itemId === 'compliment') {
                  options.buildFields = () => ({})   // consumable — just deduct diamonds

                } else if (TAUNT_IDS.includes(itemId)) {
                  // Audio taunt: push the taunt ID into the player's unlockedTaunts array.
                  // Uses a Set deduplicate so re-purchasing after an edge-case rollback is safe.
                  options.buildFields = p => ({
                    unlockedTaunts: [
                      ...new Set([
                        ...(Array.isArray(p.unlockedTaunts) ? p.unlockedTaunts : []),
                        itemId,
                      ]),
                    ],
                  })

                } else {
                  return   // unknown item
                }

                const result = await purchaseDiamondItem(pid, cost, options)

                if (!result.success) {
                  // 'already_owned' and 'insufficient_funds' are expected non-error states —
                  // the StreakHub UI already blocks these in normal flow.
                  // 'transaction_error' is logged inside purchaseDiamondItem.
                  return
                }

                // ── Sync server-written player into local state ───────────────────
                // result.updatedPlayer is the exact object committed to Firestore.
                // Using it directly prevents Math.max from re-inflating diamonds in
                // the follow-up saveSt call (both sides of the max are now equal).
                const nextSt = { ...st, players: st.players.map(p =>
                  p.id === pid ? result.updatedPlayer : p
                )}
                upd(nextSt)
                saveSt(nextSt, pid)   // localStorage backup + silent Firestore re-confirm

                // Sender modals for consumable social items
                if (itemId === 'rageBait')   setRageBaitSender(true)
                if (itemId === 'compliment') setComplimentSender(true)
              }}
            />
          )}
          {tab === 'board' && (
            <WidgetErrorBoundary label="Leaderboard">
              <Leaderboard />
            </WidgetErrorBoundary>
          )}
          {tab === 'stats' && (
            <WidgetErrorBoundary label="Stats">
              <GoalHeatmap />
            </WidgetErrorBoundary>
          )}
          {tab === 'badges' && (
            <WidgetErrorBoundary label="Badge Collection">
              <BadgeGrid
                newBadgeIds={newBadgeIds}
                onBadgeClick={(b, isEarned) => setBadgePreview({ badge: b, earned: isEarned })}
              />
            </WidgetErrorBoundary>
          )}
          {tab === 'ranks' && (
            <WidgetErrorBoundary label="Ranks">
              <RanksTab openDetail={rankDetailOpen} onDetailClose={() => setRankDetailOpen(false)} />
            </WidgetErrorBoundary>
          )}
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
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
                color: '#a855f7', letterSpacing: '0.2em', textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                ✅ ACHIEVEMENT COMPLETED
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700,
                color: '#d8b4fe', letterSpacing: '0.04em', lineHeight: 1.3,
                marginBottom: 8,
              }}>
                <span className="rookie-strike-wrap">
                  {rookieToast.icon} {rookieToast.label}
                </span>
              </div>
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
