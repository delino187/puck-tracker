import { createContext, useContext, useEffect, useRef, useState } from 'react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  // ── Tab navigation ────────────────────────────────────────────────────────
  const [tab,                 setTab]                = useState('dashboard')
  const [rankDetailOpen,      setRankDetailOpen]     = useState(false)
  const [challengeScreen,     setChallengeScreen]    = useState(null) // null | 'create' | { mode:'respond', challenge }
  const [deepLinkPuckGameId,  setDeepLinkPuckGameId] = useState(null)

  // Clear the deep-link game ID whenever the player leaves the session tab.
  // Avoids PuckGame auto-re-selecting a stale game on subsequent visits.
  // Lives here because both deps (tab, setDeepLinkPuckGameId) are owned by UIProvider.
  useEffect(() => {
    if (tab !== 'session') setDeepLinkPuckGameId(null)
  }, [tab])

  // ── Celebration overlays ──────────────────────────────────────────────────
  const [epicCeleb,    setEpicCeleb]    = useState(null) // { type, level?, badge? }
  const [celeb,        setCeleb]        = useState(null) // { emoji, title, subtitle }
  const [badgePreview, setBadgePreview] = useState(null) // { badge, earned }

  // ── Toasts ────────────────────────────────────────────────────────────────
  const [rookieToast,   setRookieToast]   = useState(null)  // { label, reward, icon }
  const [feedbackToast, setFeedbackToast] = useState(false)
  // Exposed as a ref so App.jsx markRookieQuest can clear it without needing
  // a callback — the ref object itself is stable across renders.
  const rookieToastTimer = useRef(null)

  // ── Standard modals ───────────────────────────────────────────────────────
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  // ── Match result modals ───────────────────────────────────────────────────
  const [streakBrokenData,     setStreakBrokenData]    = useState(null) // { prevCount }
  const [victoryReward,        setVictoryReward]       = useState(null)
  const [tieReward,            setTieReward]           = useState(null)
  const [defeatState,          setDefeatState]         = useState(null)
  const [pendingRoundOutcome,  setPendingRoundOutcome] = useState(null)

  // ── Social notification modals ────────────────────────────────────────────
  const [rageBaitSender,     setRageBaitSender]     = useState(false)
  const [rageBaitReceived,   setRageBaitReceived]   = useState(null)
  const [complimentSender,   setComplimentSender]   = useState(false)
  const [complimentReceived, setComplimentReceived] = useState(null)

  // ── Challenge-answered in-app banner ──────────────────────────────────────
  // Set to { opponentName, challengeId, won, isDraw } when a sent challenge
  // is answered by the opponent while this player is inside the app.
  // null = hidden.
  const [challengeAnsweredBanner, setChallengeAnsweredBanner] = useState(null)

  // ── Navigation helpers ────────────────────────────────────────────────────
  function navigateToTab(tabId) {
    setTab(tabId)
  }

  function openChallenge(challenge) {
    setChallengeScreen({ mode: 'respond', challenge })
  }

  function openCreateChallenge(defaultFriendId = '') {
    setChallengeScreen({ mode: 'create', defaultFriendId })
  }

  function closeChallengeScreen() {
    setChallengeScreen(null)
  }

  return (
    <UIContext.Provider value={{
      // Tab navigation
      tab, setTab, navigateToTab,
      rankDetailOpen, setRankDetailOpen,
      challengeScreen, setChallengeScreen,
      openChallenge, openCreateChallenge, closeChallengeScreen,
      deepLinkPuckGameId, setDeepLinkPuckGameId,
      // Celebration overlays
      epicCeleb, setEpicCeleb,
      celeb, setCeleb,
      badgePreview, setBadgePreview,
      // Toasts
      rookieToast, setRookieToast,
      feedbackToast, setFeedbackToast,
      rookieToastTimer,
      // Standard modals
      feedbackOpen, setFeedbackOpen,
      // Match result modals
      streakBrokenData, setStreakBrokenData,
      victoryReward, setVictoryReward,
      tieReward, setTieReward,
      defeatState, setDefeatState,
      pendingRoundOutcome, setPendingRoundOutcome,
      // Social modals
      rageBaitSender, setRageBaitSender,
      rageBaitReceived, setRageBaitReceived,
      complimentSender, setComplimentSender,
      complimentReceived, setComplimentReceived,
      // Challenge-answered banner
      challengeAnsweredBanner, setChallengeAnsweredBanner,
    }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within a UIProvider')
  return ctx
}
