# Puck Tracker — Developer Architecture Hand-Off

> **Status:** Development paused. This document captures the exact state of every custom system so development can resume without archaeology.

---

## Table of Contents

1. [Tech Stack & Runtime](#1-tech-stack--runtime)
2. [Directory Map](#2-directory-map)
3. [Data Model & Firestore Schema](#3-data-model--firestore-schema)
4. [System: Real-Time Versus Match & Tie Pipeline](#4-system-real-time-versus-match--tie-pipeline)
5. [System: Timezone-Safe Streak Engine & Freeze Guards](#5-system-timezone-safe-streak-engine--freeze-guards)
6. [System: Canvas Image Compression Pipeline](#6-system-canvas-image-compression-pipeline)
7. [State Management Layers](#7-state-management-layers)
8. [Quest Engine](#8-quest-engine)
9. [Economy & Diamond Transaction System](#9-economy--diamond-transaction-system)
10. [Error Boundaries](#10-error-boundaries)
11. [Security Rules](#11-security-rules)
12. [Known Architectural Constraints](#12-known-architectural-constraints)

---

## 1. Tech Stack & Runtime

| Layer | Technology |
|---|---|
| UI framework | React 18 (Vite) |
| Global state | Zustand (`hsh_global_app_state`) + React Context |
| Database | Firestore (Firebase v12, `persistentLocalCache` offline mode) |
| Auth | Firebase Auth — optional per player; PIN-only players have no UID |
| Video upload | Vercel Blob client (`@vercel/blob/client`) |
| Styling | Inline JSX styles throughout — no CSS modules or Tailwind build step |
| Build | `npx vite build` → `dist/` |

Offline persistence is enabled at the SDK level in `src/firebase.js`:

```js
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
```

This means all `setDoc` / `runTransaction` calls return immediately when offline and are queued to IndexedDB. They replay automatically on reconnect without any application-level code. A fallback `localStorage` write always precedes every Firestore write so data survives even if IndexedDB is unavailable.

---

## 2. Directory Map

```
src/
│
├── main.jsx                     Entry point; mounts GlobalErrorBoundary → PlayerProvider → UIProvider → App
├── App.jsx                      Root component; owns all tab routing, session lifecycle, match result dispatch
│
├── constants/
│   ├── techniques.js            ★ Single source of truth for shot-type keys & suffix-norm map
│   ├── questPools.js            Daily + weekly quest text/reward definitions; TIER_COLORS
│   ├── badges.js                All badge definitions with unlock predicates
│   ├── levels.js                XP thresholds per rank tier (Mite → Arch Nemesis)
│   ├── zones.js                 6-zone net layout constants
│   └── rookieQuests.js          Onboarding milestone quest definitions
│
├── context/
│   ├── PlayerContext.jsx        ★ Boot loader; Firestore subscription; active player; save lifecycle
│   └── UIContext.jsx            Modal/overlay state (victoryReward, tieReward, defeatState, tab, etc.)
│
├── store/
│   └── useAppStore.js           Zustand store — economy (diamondsByPlayer), technique shots, settings
│
├── utils/
│   ├── streakService.js         ★ updateStreak() — the only authoritative writer of streakCount
│   ├── questEngine.js           pickQuests(), pickWeeklyQuests(), getDailyQuestProgress()
│   ├── questHelpers.js          computeQuestProgress(), applyQuestProgress()
│   ├── stats.js                 playerStats(), getLevel(), localDateStr(), getWeekStart()
│   ├── badgeHelpers.js          dayStreak(), lifetimeShots() — reads Zustand directly
│   ├── firestoreSync.js         loadFromFirestore(), saveToFirestore(), purchaseDiamondItem()
│   ├── storage.js               loadSt(), saveSt() — localStorage + Firestore dual-write
│   ├── elo.js                   calculateNewRatings() — K=32, streak multiplier, tie outcome=0.5
│   ├── authHelpers.js           Username registration, Firebase Auth wrappers
│   └── retroXPAward.js          One-time migration script for historical coach puck credits
│
├── services/
│   ├── peerChallengeService.js  ★ createChallenge, respondToChallenge, claimWin/Tie/LoserReward
│   ├── puckGameService.js       P-U-C-K Horse game CRUD + video upload
│   ├── realtimeSync.js          onSnapshot subscriptions for team doc, challenges, puckGames
│   ├── economyEngine.js         Thin wrapper over Zustand purchaseStreakFreeze / consumeFreeze
│   ├── syncQueue.js             Offline outbox (localStorage) — drained on reconnect
│   ├── rageBaitService.js       notifications subcollection CRUD (rage bait / compliment)
│   ├── audioEngine.js           Singleton audio manager with mute toggle
│   ├── questProgressService.js  Firestore writer for quest claimed state
│   └── videoReportService.js    video_reports root collection CRUD
│
├── hooks/
│   ├── useMatchResults.js       ★ Snapshot-driven victory/defeat/tie/expiry detection for challenger
│   ├── usePuckTurnAlerts.js     Banner alerts when it's the active player's P-U-C-K turn
│   ├── useAudio.js              Plays session-end audio based on accuracy
│   └── useTheme.js              Dark / outside mode toggle backed by Zustand settings
│
├── components/
│   ├── App-level screens        Dashboard, ShootTracker, Games, StreakHub, ProShop, GoalHeatmap…
│   ├── screens/                 Full-page tab screens (Leaderboard, DailyQuests, PuckGame…)
│   ├── overlays/                Modals & result screens (VersusVictoryModal, VersusTieModal…)
│   └── shared/
│       ├── ErrorBoundary.jsx    ★ GlobalErrorBoundary + WidgetErrorBoundary
│       ├── PlayerHeader.jsx     Top nav bar; freeze countdown badge; ManageProfileModal trigger
│       └── DailyProgressRing.jsx SVG ring with overflow:visible for drop-shadow glows
│
└── firebase.js                  App init; exports auth, db (with persistentLocalCache), storage
```

★ = files most likely to need changes when resuming.

---

## 3. Data Model & Firestore Schema

The app uses a **single-team document** pattern. All player and game data lives under one fixed path: `teams/team_main`.

### `teams/team_main` (document)

```
{
  players: [                        // embedded array — not a subcollection
    {
      id:                  string,  // app-generated random ID (not Firebase UID)
      name:                string,
      jerseyNum:           string | null,
      username:            string | null,
      firebaseUid:         string | null,  // Firebase Auth UID when registered

      // Stats
      elo:                 number,  // default 1000
      eloLastDelta:        number,
      eloLastUpdated:      number,  // ms timestamp
      totalWins:           number,
      diamonds:            number,

      // Streak
      lastActivity:        number,  // ms timestamp of last puck-logging event
      streakCount:         number,  // Firestore-authoritative; written only by updateStreak()
      streak_freezes:      number,  // consumable 1-day freeze count
      week_streak_freezes: number,  // consumable 7-day freeze count
      streakFreezeUntil:   number,  // ms timestamp — set when a 1-day freeze is consumed
      weeklyFreezeUntil:   number,  // ms timestamp — set on week-freeze purchase OR consume
      protectedDates:      string[], // toDateString() values of freeze-protected days

      // Quests
      last_quest_spin:       string,  // YYYY-MM-DD (localDateStr format)
      last_weekly_quest_pick: string, // YYYY-MM-DD of the Monday that was locked in
      daily_quests:          Quest[],
      weekly_quests:         Quest[],
      hasEverSpunWheelDaily:  boolean,
      hasEverSpunWheelWeekly: boolean,

      // Store / cosmetics
      hasEloShield:         boolean,
      boughtBorderGlow:     boolean,
      hasBorderGlow:        boolean,
      canChangePfp:         boolean,
      sadTromboneUnlocked:  boolean,
      ownedItems:           string[],  // e.g. ['sad_trombone']
      equippedTaunt:        string,    // 'standard' | 'sad_trombone'
      photoURL:             string | null,
      doubleXpTokens:       number,
    }
  ],
  techniqueByPlayer: {              // map keyed by player ID
    [playerId]: {
      totalPucks: number,
      bonusXP:    number,
      dailyLog: {
        [toDateString()]: {         // e.g. "Thu Jun 26 2026"
          total:     number,
          breakdown: { [techniqueKey]: number }  // keys from TECHNIQUES constant
        }
      }
    }
  },
  lastUpdated: number
}
```

### Subcollections under `teams/team_main`

| Subcollection | Key fields |
|---|---|
| `sessions/{id}` | `playerId`, `date` (ISO), `sets[]` (`zone`, `hits`), `source` (`'session'`/`'atw'`) |
| `peerChallenges/{id}` | `challengerId`, `receiverId`, `status`, `winnerId`, `isTie`, `eloProcessed`, `winnerRewardsClaimed`, `loserRewardsClaimed`, `challengerTieRewardClaimed`, `receiverTieRewardClaimed`, `expiresAt`, `respondedAt` |
| `puckGames/{id}` | `p1Id`, `p2Id`, `currentRound`, `letters`, `status` |
| `notifications/{id}` | `receiverId`, `type` (`'rage_bait'`/`'compliment'`), `status` (`'unread'`) |

### Root collections

| Collection | Purpose |
|---|---|
| `video_reports/{id}` | Moderation reports, isolated from game data |
| `migrations/{id}` | One-time migration guards (idempotency) |
| `admin_audit_logs/{id}` | Append-only coach action audit trail |

---

## 4. System: Real-Time Versus Match & Tie Pipeline

### Overview

Two players compete in a timed shooting challenge. The **challenger** records first; the **receiver** responds later. The pipeline resolves three outcomes — win, loss, and tie — with distinct reward paths and idempotency guards at every step.

### Phase 1 — Challenge Creation (`peerChallengeService.js → createChallenge()`)

```
Challenger taps "Issue Challenge"
  → uploads video to Vercel Blob → gets CDN URL
  → addDoc(peerChallenges) with:
       status: 'pending'
       matchType: 'ranked' | 'unranked'
       expiresAt: now + (ranked ? 5 days : 48 h)
       challengerHits, challengerVideo, winnerId: null, isTie: false
  → UpdateStreak(challengerId)
  → Returns { id, ...data }
```

### Phase 2 — Receiver Response (`respondToChallenge()` + ELO transaction)

```
Receiver records hits, uploads video
  → updateDoc(challenge):
       receiverHits, receiverVideo
       winnerId: (hits equal) ? null : higherScorer
       isTie:    receiverHits === challengerHits
       status: 'completed'
       respondedAt: Date.now()
       eloProcessed: false

  → runTransaction (ELO + totalWins):
       reads teamRef + challengeRef in same tx
       idempotency guard: if (challengeDoc.eloProcessed) return
       outcome = isTie ? 0.5 : (challengerWon ? 1 : 0)
       winnerStreak multiplier: up to +30% on K=32 base delta
       ELO Shield: zeroes the losing side's delta if hasEloShield=true
       writes: players[] with new elo, eloLastDelta, totalWins, hasEloShield: false
       writes: challengeRef.eloProcessed = true, challengerEloDelta, receiverEloDelta

  → Returns { ...challenge, eloResult }
```

### Phase 3 — Outcome Detection (receiver path, `App.jsx → handlePeerChallengeSubmit()`)

Runs synchronously on the receiver's device immediately after `respondToChallenge()` returns:

```
if (isTie)
  → claimChallengeTieReward(id, 'receiver')   // Firestore tx sets receiverTieRewardClaimed
  → setTieReward({ diamonds: 5, xp: 10 })     // UIContext → VersusTieModal renders

else if (winnerId === myId)
  → seenVictoryIds.add(challengeId)            // prevents snapshot double-fire

else (I lost)
  → seenDefeatIds.add(challengeId)
  → setDefeatState(...)                        // UIContext → VersusDefeatModal renders
  → claimChallengeLoserReward(id)              // tx sets loserRewardsClaimed
  → logTechniqueShots(myId, 0, 2)             // 2 XP consolation
```

### Phase 4 — Challenger Learning via Snapshot (`useMatchResults.js`)

The challenger never calls `respondToChallenge()`. They learn the outcome from the Firestore `onSnapshot` listener on `peerChallenges`. `useMatchResults.js` runs three independent `useEffect` blocks:

```
Effect 1 — expiry resolver
  For ranked challenges past expiresAt:
    → resolveExpiredChallenge(challenge)
       ⚠ checks receiver.streakFreezeUntil / weeklyFreezeUntil first
       if frozen: extend expiresAt → seenExpiredIds.delete(id) → return { extended: true }
       if not frozen: forfeit to challenger, write ELO, set expirationResolutionProcessed

Effect 2 — challenge-answered banner
  When challenger's challenge becomes status='completed':
    → fires once (persisted in localStorage via puck_seen_banners)
    → setChallengeAnsweredBanner({ isDraw, won })
    → showNativeNotification(...)

Effect 3 — victory detection (challenger won)
  challenge.winnerId === activeId AND !winnerRewardsClaimed AND !seenVictoryIds:
    → claimChallengeWinReward(id)              // tx sets winnerRewardsClaimed
    → setSt(diamonds += 10)
    → logTechniqueShots(myId, 0, 20)           // 20 XP victory bonus
    → fetchFreshTeamPlayers()                  // force ELO sync bypassing snapshot rate-limiter
    → setVictoryReward(...)                    // UIContext → VersusVictoryModal renders

Effect 4 — tie detection (challenger tied, NEW)
  challenge.isTie === true AND challengerId === activeId AND !challengerTieRewardClaimed:
    → claimChallengeTieReward(id, 'challenger') // tx sets challengerTieRewardClaimed
    → setTieReward({ diamonds: 5, xp: 10 })

Effect 5 — defeat detection (challenger lost via snapshot)
  30-minute recency gate prevents showing stale defeats on fresh login:
    → setDefeatState({ tauntAudioPath })        // resolves winner's equipped taunt
    → claimChallengeLoserReward(id)             // tx sets loserRewardsClaimed
```

### Idempotency Field Map

| Field | Writer | Purpose |
|---|---|---|
| `eloProcessed` | `respondToChallenge` tx | Prevents double ELO application |
| `winnerRewardsClaimed` | `claimChallengeWinReward` tx | Blocks challenger re-claiming win diamonds |
| `loserRewardsClaimed` | `claimChallengeLoserReward` tx | Blocks loser re-claiming consolation diamonds |
| `challengerTieRewardClaimed` | `claimChallengeTieReward('challenger')` tx | Blocks challenger tie re-claim |
| `receiverTieRewardClaimed` | `claimChallengeTieReward('receiver')` tx | Blocks receiver tie re-claim |
| `expirationResolutionProcessed` | `resolveExpiredChallenge` tx | Prevents forfeit replay |

### ELO Formula

```
K = 32
expectedA = 1 / (1 + 10^((ratingB - ratingA) / 400))
baseDelta  = round(K * (outcome - expectedA))

// outcome: 1 = win, 0 = loss, 0.5 = tie
// winnerStreak multiplier (winner only, never amplifies losses):
clampedStreak = min(winnerStreak, 15)
multiplier    = min(clampedStreak * 0.02, 0.30)   // cap at +30%
deltaWinner   = round(baseDelta * (1 + multiplier))
```

---

## 5. System: Timezone-Safe Streak Engine & Freeze Guards

### The Core Problem

A rolling 24-hour window breaks streaks for players who shoot at 10 PM one night and 11 PM the next — a 25-hour gap that still represents consecutive calendar days in the player's timezone. The app uses **calendar-day continuity** instead.

### Date Format (`stats.js → localDateStr()`)

All streak gate keys are stored as **`YYYY-MM-DD` in local time**, not `toDateString()`:

```js
export function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

Why not `toDateString()` (e.g. `"Thu Jun 26 2026"`)? It is locale-dependent and changes when the device language is switched. More critically, changing the device timezone changes `toDateString()`, allowing a player to invalidate their stored spin key and re-spin the quest wheel on demand. `localDateStr()` is immune to locale changes; only a genuine system clock change can manipulate it, and only within the user's local calendar day.

**Consistency rule:** Every write of `last_quest_spin` and `last_weekly_quest_pick` uses `localDateStr()`. Every comparison reads `localDateStr()`. These two functions are the only date utilities used for economy gates. Session filtering uses `toDateString()` on both sides of the comparison for internal consistency with how `dailyLog` keys are written.

### `updateStreak()` Decision Tree (`streakService.js`)

Called from every puck-logging event (session end, Versus submit, P-U-C-K turn). Runs inside a Firestore transaction to prevent race conditions.

```
readServerPlayer(playerId)
│
├─ lastActivity.toDateString() === todayStr
│    → refresh lastActivity only (no streak increment — one day counts once)
│
├─ lastActivity.toDateString() === yesterdayStr
│    → streakCount += 1, lastActivity = now
│
├─ streak_freezes > 0   (1-day Streak Shield)
│    → streak_freezes -= 1
│    → streakCount += 1
│    → protectedDates.push(todayStr)
│    → streakFreezeUntil = now + 24h     ← enables challenge expiry guard & countdown UI
│
├─ week_streak_freezes > 0   (1-Week Freeze)
│    → week_streak_freezes -= 1
│    → streakCount += 1
│    → protectedDates.push(todayStr)
│    → weeklyFreezeUntil = now + 7 days  ← enables challenge expiry guard & countdown UI
│
├─ streakFreezeUntil > now OR weeklyFreezeUntil > now   (active timestamp window)
│    → streakCount += 1 (still within protection window from an earlier consume)
│
└─ no freeze
     → streakCount = 1   (today is day 1 of a new streak)
```

### Two Sources of Streak Data

There are intentionally **two representations** of streak:

| Name | Location | Written by | Used for |
|---|---|---|---|
| `player.streakCount` | Firestore `teams/team_main` players array | `updateStreak()` tx only | Streak-broken modal, aura class, freeze guards |
| `stats.streak` (computed) | In-memory via `dayStreak()` in `badgeHelpers.js` | Computed on every render | Display in PlayerHeader, Leaderboard, player cards |

`dayStreak()` aggregates three sources into a `Set` of date strings:
1. Session dates from the `sessions` array
2. `player.protectedDates` (freeze-protected calendar days)
3. `dailyLog` entries from Zustand `techniqueByPlayer[playerId]`

**Critical bug fixed:** `dailyLog` entries in the new object format `{ total: N, breakdown: {...} }` were silently dropped because `if (count > 0)` evaluated `{...} > 0 = NaN > 0 = false`. The fix normalises to `typeof entry === 'object' ? entry.total : entry` before the `> 0` check.

### Freeze Timestamp Fields

When a freeze is consumed, two timestamp fields are written to the player doc:

```
streakFreezeUntil:  now + 24h     (1-day shield consumed)
weeklyFreezeUntil:  now + 7 days  (week freeze consumed, or purchased)
```

These serve three purposes:
1. **Challenge expiry guard** — `resolveExpiredChallenge()` checks `Math.max(receiver.streakFreezeUntil, receiver.weeklyFreezeUntil) > Date.now()` before forfeiting the receiver. If frozen, extends `challenge.expiresAt` to the freeze end and returns `{ extended: true }`.
2. **Countdown UI** — `PlayerHeader.jsx` reads `freezeUntil = Math.max(streakFreezeUntil, weeklyFreezeUntil)` and displays a live `"❄️ 8d · 14h 22m"` badge, updated via a `setInterval(60_000)`.
3. **Broken-streak modal suppression** — App.jsx's streak insurance check respects all four freeze paths: `streak_freezes > 0 || week_streak_freezes > 0 || streakFreezeUntil > now || weeklyFreezeUntil > now`.

### Week Freeze Purchase

When a player buys a 1-Week Freeze from the store, `weeklyFreezeUntil` is set **immediately** (not only on consume), via `purchaseDiamondItem`'s `buildFields`:

```js
buildFields: p => ({
  week_streak_freezes: (p.week_streak_freezes || 0) + 1,
  weeklyFreezeUntil: Math.max(p.weeklyFreezeUntil || 0, Date.now()) + 7 * 24 * 60 * 60 * 1000,
})
```

Stacks correctly: if a freeze is already active, the new 7 days extends from the current expiry rather than resetting from now.

---

## 6. System: Canvas Image Compression Pipeline

### The Problem

Firestore documents have a hard **1 MB limit**. A modern iPhone photo at full resolution is 4–12 MB. Base64 encoding adds approximately 33% overhead. Storing the raw file would immediately throw `"Document exceeds maximum size"` and silently fail the upload.

### Implementation (`ManageProfileModal.jsx → compressImageToJpeg()`)

A module-level pure function (allocated once, never re-created on render):

```js
function compressImageToJpeg(file, targetW, targetH, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.onloadend = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Image decode error'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width  = targetW   // 256
        canvas.height = targetH   // 256
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'  // white fill: JPEG has no alpha, prevents black pixels
        ctx.fillRect(0, 0, targetW, targetH)
        ctx.drawImage(img, 0, 0, targetW, targetH)
        resolve(canvas.toDataURL('image/jpeg', quality))  // quality 0.7
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
```

Called in `handleFileSelected`:
```js
const compressed = await compressImageToJpeg(file, 256, 256, 0.7)
// → ~20–45 KB base64 regardless of source image size or format
await onPhotoUpload(compressed)
```

### Output Size

| Input | Raw size | After 256×256 JPEG q=0.7 |
|---|---|---|
| iPhone 15 HEIC | ~8 MB | ~25 KB |
| Android full-res | ~5 MB | ~22 KB |
| PNG with transparency | ~2 MB | ~18 KB (alpha → white) |

### iOS Safari File Input Constraint

On iOS Safari / WKWebView, clearing `e.target.value` releases the **native file buffer** that `FileReader` reads from. Even though the JavaScript `File` object still exists, the underlying data is gone — `readAsDataURL` completes with an empty string.

**Fix:** `e.target.value = ''` is in a `finally` block that runs **after** `await compressImageToJpeg()` completes. By that point, the file bytes have already been read into JavaScript heap memory (the base64 string in `compressed`), so clearing the native handle is safe.

```js
const handleFileSelected = async (e) => {
  e.preventDefault()   // must stay first — prevents iOS modal close
  e.stopPropagation()  // must stay second — prevents iOS modal close
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const compressed = await compressImageToJpeg(file, 256, 256, 0.7)
    // ... upload ...
  } catch (err) { /* ... */ }
  finally {
    e.target.value = ''  // safe here — bytes already in JS heap
  }
}
```

The `e.preventDefault()` + `e.stopPropagation()` pair at the top of the handler is **non-negotiable** on iOS. Without them, the file-picker event bubbles to the modal backdrop's `onClick={onClose}`, closing the modal mid-upload.

---

## 7. State Management Layers

The app uses three state layers with distinct responsibilities:

### Layer 1: `PlayerContext` (React Context, `src/context/PlayerContext.jsx`)

Owns the entire `st` object — `players[]`, `sessions[]`, `activePlayerId`, view routing. This is the source of truth for everything loaded from Firestore.

- **Boot sequence:** `loadSt()` → Firestore first, localStorage fallback → session reconciliation healer → Zustand hydration
- **Save lifecycle:** Every `setSt()` call triggers a debounced `saveSt()` which writes localStorage synchronously, then fires `saveToFirestore()` as a fire-and-forget promise
- **Snapshot listener:** `subscribeToTeam()` in `realtimeSync.js` runs an `onSnapshot` on `teams/team_main`. Incoming deltas are merged into `st` with conflict resolution (e.g. `Math.max` for fields the server can legitimately advance like diamond awards from coaches)
- **Rate limiter:** A ref-based counter (`snapshotCountRef`) blocks re-entry if more than 5 snapshots arrive within 1 second — guards against update loops

### Layer 2: `UIContext` (React Context, `src/context/UIContext.jsx`)

Ephemeral UI state only. Lives in memory, never persists. Owns:
- Active tab (`tab`)
- All modal open/close state (`victoryReward`, `tieReward`, `defeatState`, `streakBrokenData`, etc.)
- Toast queues
- Challenge screen routing (`challengeScreen`)

### Layer 3: Zustand (`src/store/useAppStore.js`, key `hsh_global_app_state`)

Persisted to `localStorage` via `zustand/middleware`. Owns everything that isn't in Firestore or is cross-device but lives per-device:
- `economyByPlayer` — XP spent, streak freeze inventory (pre-diamond-era legacy)
- `techniqueByPlayer` — per-player technique shot totals and daily log with shot-type breakdown
- `settings` — theme preference (dark / outside mode)

Zustand is synced to Firestore as part of `saveToFirestore()` — the `techniqueByPlayer` map is written to `teams/team_main.techniqueByPlayer` using dot-notation updates so only the active player's entry is touched.

### `purchaseDiamondItem()` — Why It Bypasses the Normal Save Path

`saveToFirestore()` uses a merge transaction with:
```js
diamonds: Math.max(localPlayer.diamonds, serverPlayer.diamonds)
```
This is intentional for preventing a stale local snapshot from rolling back a coach-awarded bonus. **Side effect:** it also rolls back every diamond purchase, making items free. Any write that deducts diamonds **must** use `purchaseDiamondItem()` in `firestoreSync.js` instead, which reads the server balance inside the same Firestore transaction that writes the deduction.

---

## 8. Quest Engine

### Daily Quest Gate

```
player.last_quest_spin === localDateStr()   →  already spun today (locked)
player.last_quest_spin !== localDateStr()   →  available to spin
```

Quests are picked by `pickQuests()` (`questEngine.js`) which selects:
- 1 from `technique` or `volume` pool (50/50)
- 1 from `quality` pool
- 1 from `social` pool

Each quest gets a `baseline` (shots logged at spin time) so the "Log N shots" quests start at 0/N even if the player had existing shots before spinning.

### Weekly Quest Gate

```
player.last_weekly_quest_pick === localDateStr(getWeekStart())   →  this week's quests locked in
```

`getWeekStart()` returns the Monday of the current week at midnight local time. Weekly quests enforce equal shot-type distribution: one Wrist Shot, one Backhand, one Snap Shot, one Slap Shot quest.

### Progress Computation

`computeQuestProgress()` in `questHelpers.js` is a pure function called on every render. It matches quest text against a set of regex patterns to determine the quest type, then aggregates from sessions + Zustand dailyLog + peerChallenges + puckGames.

**Technique quest key normalization:** The regex captures `"Wrist"` from `"Wrist Shots in Technique Mode"` but breakdown keys are stored as `"Wrist Shot"`. `SHOT_SUFFIX_NORM` from `src/constants/techniques.js` normalises this. Weekly quests do a case-insensitive `Object.entries().find()` lookup instead of direct property access, tolerating any casing in persisted data.

### Social Quest Correctness

Three social quest handlers require player-role verification:
- **"Issue a Versus Challenge Today"** → `c.challengerId === playerId` (not just any pending challenge)
- **"Win 1 Versus Quick Match Today"** → `c.winnerId === playerId` (not any completed challenge)
- **"Accept an Incoming Challenge"** → `c.receiverId === playerId` (not the challenger)

These were fixed in the audit session after the Haiku regression.

---

## 9. Economy & Diamond Transaction System

### Diamond Purchase Flow

All diamond-deducting store purchases use `purchaseDiamondItem(playerId, cost, options)`:

```
purchaseDiamondItem(pid, cost, {
  uniqueFlag:   'hasEloShield',        // boolean field — block re-purchase
  uniqueItemId: 'sad_trombone',        // ownedItems array — block re-purchase
  buildFields:  (serverPlayer) => ({   // receives live server state
    hasEloShield: true,
    ownedItems: [...serverPlayer.ownedItems, 'sad_trombone']
  })
})
```

Inside the transaction:
1. Read `serverPlayer.diamonds` (authoritative)
2. Check `serverPlayer.diamonds >= cost` — reject if insufficient
3. Check `uniqueFlag` / `uniqueItemId` — reject if already owned
4. Write `diamonds: serverDiamonds - cost` + `buildFields(serverPlayer)` atomically
5. Return `{ success: true, updatedPlayer }` — caller patches this directly into React state

`updatedPlayer.diamonds` equals the committed Firestore value, so the subsequent `saveSt()` call's `Math.max(local, server)` merge resolves to `max(correct, correct) = correct` — no rollback.

### Quest Reward Claims

Quest diamond rewards use a different path — they write directly to Firestore via `saveToFirestore()` with `selfDiamondClaimRef.current = Date.now()` stamped immediately before, which tells the PlayerContext snapshot listener to suppress the `coachAwardToast` for this write.

---

## 10. Error Boundaries

Two class components in `src/components/shared/ErrorBoundary.jsx`:

### `GlobalErrorBoundary`

Mounted in `main.jsx`, outside all providers. Catches any render or lifecycle error in the entire tree.

**Fallback:** Full-screen hockey-themed UI with:
- `"🔄 RELOAD APP"` — `window.location.reload()`, no data loss
- `"⚠️ CLEAR CACHE & RELOAD"` — removes the 4 app-owned localStorage keys, then reloads (breaks corrupt-state crash loops)
- Collapsible `componentStack` for debugging
- Optional `onError(error, errorInfo)` prop for future Sentry wiring

### `WidgetErrorBoundary`

Wraps individual tab content panels. On error, renders an inline error card with a `"🔄 TRY AGAIN"` button that calls `this.setState({ error: null })` — resets the boundary without a page reload. Currently wraps: Dashboard, Leaderboard, Stats, Badge Collection, Ranks.

---

## 11. Security Rules

Rules file: `firestore.rules` (project root).

**Deploy:** `firebase deploy --only firestore:rules` or paste into Firebase Console → Firestore → Rules.

Key principles:
- All writes require `request.auth != null` (unauthenticated bots/scrapers are fully blocked)
- `peerChallenges` updates check `challengerUid` / `receiverUid` fields against `request.auth.uid`
- `puckGames` updates check `p1Uid` / `p2Uid` fields
- Legacy documents (pre-UID fields) fall through to auth-only enforcement
- `notifications` updates are blocked (delete only, no status flip via client)
- `migrations` and `admin_audit_logs` are append-only (create only, no update/delete)
- Catch-all `/{document=**}` denies everything not explicitly matched

**To complete enforcement for new challenges:** add `challengerUid: auth.currentUser?.uid` to `createChallenge()` and `receiverUid: auth.currentUser?.uid` to `respondToChallenge()`. Rules already enforce this once the fields exist.

---

## 12. Known Architectural Constraints

### Players array in team document

All player data lives in a single `players[]` array embedded in `teams/team_main`. Pros: single-read for the entire leaderboard, simple real-time subscription. Cons:
- Firestore can't enforce per-player write restrictions at the rules level (requires application-layer enforcement via `purchaseDiamondItem` and `updateStreak` transactions)
- Every save touching any player field re-writes the full array. Mitigated by transaction-merge in `saveToFirestore()` that reads server state before writing
- If the players array grows to ~50+ players with long session histories, the team doc could approach 1 MB. Sessions are already in a subcollection to avoid this

### Technique shots not in sessions

All non-target-practice activity (Technique Mode, Versus match shots, P-U-C-K rounds) is logged via `logTechniqueShots()` into Zustand `techniqueByPlayer`. This means:
- These shots show on the leaderboard and XP bar but not in session history
- `dayStreak()` reads from Zustand, not Firestore — on a fresh install, dailyLog must be hydrated from `teams/team_main.techniqueByPlayer` before the streak computes correctly. `storage.js` handles this on boot
- The merge-max in `loadSt()` takes the higher of cloud vs local per date, preventing either from rolling back the other

### Firebase Auth is optional

Players can use the app with PIN-only login (no Firebase Auth account). This means:
- `request.auth` is null for those sessions
- Security rules block all writes from those sessions (acceptable — they should register)
- `player.firebaseUid` is null or absent for legacy players
- The participant-check helper in Firestore rules falls back to auth-only enforcement for documents without UID fields

### `toDateString()` in dailyLog keys

Technique shot daily log entries are keyed by `new Date().toDateString()` (e.g. `"Thu Jun 26 2026"`) — locale-dependent. Quest spin gates use `localDateStr()` (YYYY-MM-DD) — locale-independent. Do not mix these two formats when writing to or querying `dailyLog`.

---

*Generated from codebase state as of the development pause. All critical system behaviors are currently covered by working production code.*
