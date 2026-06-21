import { useState, useEffect, useRef } from 'react'
import { AlertCircle, Plus, Lock } from 'lucide-react'

import { loadSt, saveSt, DEFAULT_STATE } from './utils/storage.js'
import { saveToFirestore, deletePlayerData } from './utils/firestoreSync.js'
import { audioEngine } from './services/audioEngine.js'
import { sendRageBait, subscribeToRageBaits, dismissRageBait, sendCompliment, subscribeToCompliments, dismissNotification } from './services/rageBaitService.js'
import { RageBaitSenderModal, RageBaitReceiverModal, ComplimentSenderModal, ComplimentReceiverModal } from './components/overlays/RageBaitModal.jsx'
import { playerStats, newId, getWeekStart } from './utils/stats.js'
import { BADGES }                        from './constants/badges.js'
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
import CreatePeerChallenge from './components/screens/CreatePeerChallenge.jsx'
import RespondToChallenge  from './components/screens/RespondToChallenge.jsx'
import { loadChallengesForPlayer } from './services/peerChallengeService.js'
import { loadPuckGamesForPlayer, getGameAction } from './services/puckGameService.js'

import { C, APP_BG } from './styles.js'

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
  const [puckGames,       setPuckGames]        = useState([])

  const [streakBrokenData, setStreakBrokenData] = useState(null)
  const [feedbackOpen,     setFeedbackOpen]     = useState(false)
  const [feedbackToast,    setFeedbackToast]    = useState(false)
  const [isSaving,         setIsSaving]         = useState(false)
  const [weakConnToast,    setWeakConnToast]    = useState(false)
  const [rageBaitSender,     setRageBaitSender]     = useState(false)
  const [rageBaitReceived,   setRageBaitReceived]   = useState(null)
  const [complimentSender,   setComplimentSender]   = useState(false)
  const [complimentReceived, setComplimentReceived] = useState(null)

  const [undoSnapshot,  setUndoSnapshot]  = useState(null)
  const undoTimerRef                       = useRef(null)

  const badgeQRef               = useRef([])
  const epicAudioRef            = useRef(null)
  const streakInsuranceCheckedRef = useRef(null)
  const weakConnTimerRef        = useRef(null)
  const rageBaitUnsubRef        = useRef(null)
  const complimentUnsubRef      = useRef(null)
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
    if (st) { saveSt(st); lastSaveRef.current = Date.now() }
  }, [st])

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

  // ── Load peer challenges + PUCK games when a player is active ────────────
  useEffect(() => {
    if (!st?.activePlayerId) return
    loadChallengesForPlayer(st.activePlayerId).then(setPeerChallenges)
    loadPuckGamesForPlayer(st.activePlayerId).then(setPuckGames)
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
    setSt(prev => ({
      ...prev,
      players: prev.players.map(p =>
        p.id === player.id ? { ...p, earnedBadges: already } : p
      ),
    }))
  }, [st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (p.streakCount > 0 && p.lastActivity && elapsed > MS_36H) {
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

  const upd = patch => setSt(prev => ({ ...prev, ...patch }))

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
    if (epicAudioRef.current) {
      epicAudioRef.current.pause()
      epicAudioRef.current.currentTime = 0
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

    // Write to localStorage immediately, then await Firestore
    const nextSt = { ...st, ...patch }
    saveSt(nextSt)
    try { await saveToFirestore(nextSt) } catch {}

    clearTimeout(weakConnTimerRef.current)
    setWeakConnToast(false)
    setIsSaving(false)

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

    // Level-up detection
    const prevLi = playerStats(aPlayer, st.sessions).li
    const newSt  = playerStats(aPlayer, updSessions)
    if (newSt.li > prevLi) {
      const audio = new Audio('/level-up-music.mp3')
      audio.volume = 0.75
      epicAudioRef.current = audio
      audio.play().catch(() => {})
      setEpicCeleb({ type: 'levelup', level: newSt.level })
    }

    // Badge check
    const already   = { ...(aPlayer.earnedBadges || {}) }
    const newBadges = BADGES.filter(b => !already[b.id] && b.check(aPlayer, updSessions))

    let updPlayers = st.players
    if (newBadges.length) {
      const now = Date.now()
      newBadges.forEach(b => { already[b.id] = { ts: now } })
      updPlayers = st.players.map(p =>
        p.id === aPlayer.id ? { ...p, earnedBadges: already } : p
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

    // Level-up detection
    const prevLi = playerStats(aPlayer, st.sessions).li
    const newSt  = playerStats(aPlayer, updSessions)
    if (newSt.li > prevLi) {
      const audio = new Audio('/level-up-music.mp3')
      audio.volume = 0.75
      epicAudioRef.current = audio
      audio.play().catch(() => {})
      setEpicCeleb({ type: 'levelup', level: newSt.level })
    }

    // Badge check
    const already   = { ...(aPlayer.earnedBadges || {}) }
    const newBadges = BADGES.filter(b => !already[b.id] && b.check(aPlayer, updSessions))

    let updPlayers = st.players
    if (newBadges.length) {
      const now = Date.now()
      newBadges.forEach(b => { already[b.id] = { ts: now } })
      updPlayers = st.players.map(p =>
        p.id === aPlayer.id ? { ...p, earnedBadges: already } : p
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
        <CoachPortal st={st} upd={upd} />
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
    const stats          = playerStats(aPlayer, st.sessions)
    const earnedBadgeObj = aPlayer.earnedBadges || {}

    // ── Notification dot flags (reactive — clear instantly when turn completes) ──
    const hasPendingVersus  = peerChallenges.some(
      c => c.receiverId === aPlayer.id && c.status === 'pending'
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
        {badgePreview && (
          <BadgePopup
            badge={badgePreview.badge}
            earned={badgePreview.earned ?? !!earnedBadgeObj[badgePreview.badge.id]}
            earnedDate={earnedBadgeObj[badgePreview.badge.id]?.ts}
            onClose={handleBadgeClose}
          />
        )}

        {/* ── Peer challenge full-screen flows ─────────────────────────── */}
        {challengeScreen === 'create' && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--page-bg)', zIndex: 300, overflowY: 'auto' }}>
            <CreatePeerChallenge
              player={aPlayer}
              players={st.players}
              onBack={() => setChallengeScreen(null)}
              onSubmit={handlePeerChallengeSubmit}
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
        <TabBar active={tab} onChange={setTab} hasSess={!!aSess} hasPendingVersus={hasPendingVersus} hasPendingGames={hasPendingGames} hasClaimableQuests={hasClaimableQuests} />

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
              }}
              onPuckGameUpdate={updated => setPuckGames(prev => {
                const idx = prev.findIndex(g => g.id === updated.id)
                return idx >= 0 ? prev.map(g => g.id === updated.id ? updated : g) : [updated, ...prev]
              })}
              onConcedeGame={() => loadPuckGamesForPlayer(st.activePlayerId).then(setPuckGames)}
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
              onSpinComplete={(quests) => setSt(prev => {
                const id = prev.activePlayerId
                return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, last_quest_spin: new Date().toDateString(), daily_quests: quests } : p) }
              })}
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
              onInitWeeklyQuests={(newQuests) => setSt(prev => {
                const id = prev.activePlayerId
                return { ...prev, players: prev.players.map(p => p.id === id ? { ...p, weekly_quests: newQuests, last_weekly_quest_pick: getWeekStart().toDateString() } : p) }
              })}
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
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, streak_freezes: (p.streak_freezes || 0) + 1 } : p) })
                  audioEngine.playUtilitySuccess()
                } else if (itemId === 'weekStreakFreeze') {
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, week_streak_freezes: (p.week_streak_freezes || 0) + 1 } : p) })
                  audioEngine.playUtilitySuccess()
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
