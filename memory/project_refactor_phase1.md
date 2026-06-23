---
name: project-refactor-phase1
description: Phase 1 App.jsx refactor — PlayerProvider extracted with all player/Firestore state
metadata:
  type: project
---

Phase 1 of the App.jsx split is complete on branch `refactor/phase-1-player-provider`.

**What moved to `src/context/PlayerContext.jsx`:**
- `st` / `setSt` / `loading` / `setLoading` state
- `upd()` helper (shallow-merge patch onto st)
- Boot effect (`loadSt` → auto-login via `ACTIVE_PLAYER_KEY`)
- Persist effect (localStorage + Firestore echo guard)
- `subscribeToTeam` real-time listener (diamonds, ELO, coachMsg, streakCount sync)
- Focus/visibility re-sync effect
- All related refs: `lastSaveRef`, `stFromSnapshotRef`, `lastSnapshotTimeRef`, `snapshotCountRef`, `snapshotWindowRef`, `activePlayerIdRef`, `lastPlayersRef`, `teamUnsubRef`, `coachAwardToastTimerRef`
- `coachAwardToast` / `setCoachAwardToast` state (diamond-award notification)
- `ACTIVE_PLAYER_KEY` constant (exported)
- `activePlayer` derived value (exposed via context)

**What stays in App.jsx:**
- All UI/tab state (tab, sesGoal, badgePreview, epicCeleb, etc.)
- rageBait / compliment subscriptions
- peerChallenges / puckGames subscriptions
- All session handlers and routing/render logic
- Child components still receive `player` as props (Phase 2 will pull from context directly)

**Why:** `st` is deeply coupled — sessions, views, and players all live together. Moving just the player slice out cleanly requires either splitting `st` (large) or moving all of it. We moved all of `st` into the provider to keep the data layer unified and prevent top-level re-renders from player-only changes when Phase 2 converts leaf components to `usePlayer()`.

**How to apply:** When resuming the refactor, Phase 2 goal is converting leaf components (PlayerHeader, Dashboard, etc.) to call `usePlayer()` directly instead of receiving `player` as a prop from App.jsx.
