import { useState, useEffect, useRef } from 'react'
import { AlertCircle, Plus, Lock } from 'lucide-react'

import { loadSt, saveSt, DEFAULT_STATE } from './utils/storage.js'
import { playerStats, newId }            from './utils/stats.js'
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
import EpicCelebration     from './components/overlays/EpicCelebration.jsx'
import CelebOverlay        from './components/overlays/CelebOverlay.jsx'
import CoachMsgPopup       from './components/overlays/CoachMsgPopup.jsx'
import StreakBrokenModal   from './components/overlays/StreakBrokenModal.jsx'
import CreatePeerChallenge from './components/screens/CreatePeerChallenge.jsx'
import RespondToChallenge  from './components/screens/RespondToChallenge.jsx'
import { loadChallengesForPlayer } from './services/peerChallengeService.js'
import { loadPuckGamesForPlayer, getGameAction } from './services/puckGameService.js'

import { C, APP_BG } from './styles.js'

export default function App() {
  const [st,          setSt]         = useState(null)
  const [loading,     setLoading]    = useState(true)
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
  const [dashMutePrompt,  setDashMutePrompt]   = useState(false)
  const [rankDetailOpen,  setRankDetailOpen]   = useState(false)
  const [peerChallenges,  setPeerChallenges]   = useState([])
  const [challengeScreen, setChallengeScreen]  = useState(null) // null | 'create' | { mode:'respond', challenge }
  const [puckGames,       setPuckGames]        = useState([])

  const [streakBrokenData, setStreakBrokenData] = useState(null)

  const badgeQRef               = useRef([])
  const epicAudioRef            = useRef(null)
  const dashAudioRef            = useRef(null)
  const streakInsuranceCheckedRef = useRef(null)
  const play         = useAudio()
  const { theme, toggleOutsideMode } = useTheme()

  // ── Boot: Firestore → localStorage fallback ───────────────────────────────
  useEffect(() => {
    loadSt().then(saved => {
      setSt(saved || { ...DEFAULT_STATE })
      setLoading(false)
    })
  }, [])

  // ── Persist: localStorage + Firestore on every state change ───────────────
  useEffect(() => {
    if (st) saveSt(st)
  }, [st])

  // ── Load peer challenges + PUCK games when a player is active ────────────
  useEffect(() => {
    if (!st?.activePlayerId) return
    loadChallengesForPlayer(st.activePlayerId).then(setPeerChallenges)
    loadPuckGamesForPlayer(st.activePlayerId).then(setPuckGames)
  }, [st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Versus tab intro music: start on Versus tab, stop on any other tab ─────
  useEffect(() => {
    if (!st || st.view !== 'player' || tab !== 'challenges') {
      if (dashAudioRef.current) {
        dashAudioRef.current.pause()
        dashAudioRef.current.currentTime = 0
        dashAudioRef.current = null
      }
      setDashMutePrompt(false)
      return
    }
    const audio = new Audio('/intro-song.m4a')
    audio.volume = 0.6
    dashAudioRef.current = audio
    audio.play().catch(() => setDashMutePrompt(true))
    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [tab, st?.view]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pause versus music the moment any celebration opens ───────────────────
  useEffect(() => {
    if (epicCeleb && dashAudioRef.current) {
      dashAudioRef.current.pause()
      // Do NOT reset currentTime — so it resumes seamlessly when modal closes
    }
  }, [epicCeleb])

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
    play('badge')
  }

  function handleBadgeClose() {
    setBadgePreview(null)
    setTimeout(popNextBadge, 150)
  }

  function handleEpicClose() {
    stopEpicAudio()
    setEpicCeleb(null)
    const hasMoreBadges = badgeQRef.current.length > 0
    if (hasMoreBadges) {
      setTimeout(popNextBadge, 150)
    } else if (tab === 'challenges' && dashAudioRef.current) {
      // All celebrations done — resume the intro song from where it paused
      dashAudioRef.current.play().catch(() => setDashMutePrompt(true))
    }
  }

  function handleDashUnmute() {
    dashAudioRef.current?.play().catch(() => {})
    setDashMutePrompt(false)
  }

  function handlePeerChallengeSubmit({ challenge }) {
    // Merge updated challenge into local list — XP is awarded via logTechniqueShots inside the screens
    setPeerChallenges(prev => {
      const idx = prev.findIndex(c => c.id === challenge.id)
      return idx >= 0
        ? prev.map(c => c.id === challenge.id ? challenge : c)
        : [challenge, ...prev]
    })
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

  function endSession() {
    if (!aSess) return
    const shots = aSess.sets.length * 10
    const hits  = aSess.sets.reduce((a, s) => a + s.hits, 0)
    play('confetti')

    // ── Quest progress — mark completed, no auto-reward (tap-to-claim) ────
    const questResult = aPlayer ? applyQuestProgress(aPlayer, st.sessions) : null

    // Count newly-completed quests for the celebration subtitle
    const newlyDone = questResult
      ? questResult.updatedQuests.filter((q, i) =>
          q.completed && !(aPlayer.daily_quests?.[i]?.completed)
        ).length
      : 0

    setCeleb({
      emoji: '💪',
      title: 'Session Done!',
      subtitle: newlyDone > 0
        ? `${shots} shots · ${shots > 0 ? (hits / shots * 100).toFixed(0) : 0}% acc · ${newlyDone} quest${newlyDone > 1 ? 's' : ''} ready to claim! 💎`
        : `${shots} shots · ${shots > 0 ? (hits / shots * 100).toFixed(0) : 0}% accuracy`,
    })

    // Single upd() — quest completion flags only, no diamond change yet
    upd({
      activeSessionId: null,
      ...(questResult ? {
        players: st.players.map(p =>
          p.id === aPlayer.id
            ? { ...p, daily_quests: questResult.updatedQuests }
            : p
        ),
      } : {}),
    })

    setTab('dashboard')
    // Persist streak to Firestore; fire-and-forget so it never blocks the UI
    if (aPlayer) updateStreak(aPlayer.id).catch(() => {})
  }

  function handleLogSet(zoneId, hits) {
    if (!aSess || !aPlayer) return

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
        if (next) play('badge')
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
        if (next) play('badge')
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
                  id: newId(),
                  name: npName.trim(),
                  jerseyNum: npNum.trim(),
                  password: npPw.trim() || autoPw,
                  earnedBadges: {},
                  diamonds: 0,
                  streak_freezes: 0,
                  last_quest_spin: null,
                  daily_quests: [],
                  photoURL:       null,
                  totalWins:      0,
                  streakCount:    0,
                  lastActivity:   null,
                  elo:            1000,
                  eloLastDelta:   0,
                  eloLastUpdated: null,
                  hasEloShield:   false,
                  createdAt:      Date.now(),
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

        {dashMutePrompt && tab === 'challenges' && (
          <div
            onClick={handleDashUnmute}
            style={{
              position: 'fixed', bottom: 24, right: 20, zIndex: 200,
              background: 'rgba(10,15,26,0.92)',
              border: '1px solid #3b82f644',
              borderRadius: 24, padding: '9px 16px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 14px #3b82f622',
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 12, fontWeight: 700,
              color: '#93c5fd', letterSpacing: '0.08em',
              userSelect: 'none',
            }}
          >
            🔊 Tap to Unmute Music
          </div>
        )}

        {aPlayer.coachMsg && (
          <CoachMsgPopup
            message={aPlayer.coachMsg}
            onAck={() => upd({
              players: st.players.map(p => p.id === aPlayer.id ? { ...p, coachMsg: '' } : p)
            })}
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
              flashZone={flashZone}
              flashType={flashType}
              puckAnim={puckAnim}
              puckGames={puckGames}
              onSubmitGame={gameSession => upd({ sessions: [...st.sessions, gameSession] })}
              onPuckGameUpdate={updated => setPuckGames(prev => {
                const idx = prev.findIndex(g => g.id === updated.id)
                return idx >= 0 ? prev.map(g => g.id === updated.id ? updated : g) : [updated, ...prev]
              })}
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
              onDiamondEarn={(amount) => upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: (p.diamonds || 0) + amount } : p) })}
              onSpinComplete={(quests) => upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, last_quest_spin: new Date().toDateString(), daily_quests: quests } : p) })}
              onClaimQuest={(questIndex) => {
                const quests = aPlayer.daily_quests || []
                const quest  = quests[questIndex]
                if (!quest || quest.claimed || !quest.completed) return
                upd({
                  players: st.players.map(p =>
                    p.id === aPlayer.id
                      ? {
                          ...p,
                          diamonds:     (p.diamonds || 0) + (quest.reward || 0),
                          daily_quests: quests.map((q, i) =>
                            i === questIndex ? { ...q, claimed: true } : q
                          ),
                        }
                      : p
                  ),
                })
              }}
            />
          )}
          {tab === 'store' && (
            <StreakHub
              player={aPlayer}
              stats={stats}
              sessions={st.sessions}
              players={st.players}
              onPurchaseItem={(itemId, cost) => {
                const diamonds = aPlayer.diamonds || 0
                if (diamonds < cost) return
                if (itemId === 'streakFreeze') {
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, streak_freezes: (p.streak_freezes || 0) + 1 } : p) })
                } else if (itemId === 'eloShield') {
                  if (aPlayer.hasEloShield) return
                  upd({ players: st.players.map(p => p.id === aPlayer.id ? { ...p, diamonds: diamonds - cost, hasEloShield: true } : p) })
                }
              }}
            />
          )}
          {tab === 'board' && (
            <Leaderboard
              player={aPlayer}
              players={st.players}
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
