# Puck Tracker — 12U Team Edition · Project Blueprint

## Stack
- **Build**: Vite 6 + React 18 (ESM)
- **Styling**: Tailwind CSS 3 (configured) + inline styles for dynamic values
- **Icons**: Lucide-React
- **Fonts**: Barlow Condensed (900 weight for headers) + Barlow (body)
- **Storage**: `localStorage` fallback; native `window.storage.get/set` when available (app wrapper)

---

## File Structure

```
/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── PLAN.md
├── public/
│   ├── mite.png          ← Rank image (0 XP)
│   ├── bronze.png        ← 250 XP
│   ├── silver.png        ← 450 XP
│   ├── gold.png          ← 700 XP
│   ├── platinum.png      ← 1,100 XP
│   ├── diamond.png       ← 1,700 XP
│   ├── onyx.png          ← 2,600 XP
│   ├── semi pro.png      ← 3,800 XP
│   ├── pro.png           ← 5,500 XP
│   └── elite sniper.png  ← 8,000 XP
└── src/
    ├── main.jsx
    ├── App.jsx                   ← State machine + view router
    ├── styles.js                 ← Shared style objects (C, APP_BG)
    ├── index.css                 ← Tailwind directives + global resets
    ├── constants/
    │   ├── levels.js             ← LEVELS array with .img paths
    │   ├── zones.js              ← ZONES + NET_POS
    │   └── badges.js             ← BADGES, BADGE_CATS, TIER
    ├── utils/
    │   ├── badgeHelpers.js       ← Pure badge check functions
    │   ├── heatColor.js          ← MLB Statcast Blue→Red gradient
    │   ├── stats.js              ← XP, level, playerStats, getWeekStart
    │   └── storage.js            ← localStorage + window.storage adapter
    ├── hooks/
    │   └── useAudio.js           ← Web Audio API sound engine
    └── components/
        ├── shared/
        │   ├── GlobalStyles.jsx  ← Google Fonts import
        │   ├── Particles.jsx     ← Confetti/fire particle overlay
        │   ├── LevelBadge.jsx    ← Inline rank badge with PNG image
        │   ├── XPBar.jsx         ← Progress bar with gradient
        │   ├── StatCard.jsx      ← Single stat tile
        │   ├── BadgeCircle.jsx   ← Circular badge with tier glow
        │   ├── ZoneSetRow.jsx    ← Per-zone score selector + LOG button
        │   ├── TabBar.jsx        ← Sticky bottom-of-header tab bar
        │   ├── PlayerHeader.jsx  ← Player name + XP bar + streak
        │   └── Scaffold.jsx      ← Back-button page shell
        ├── overlays/
        │   ├── BadgePopup.jsx    ← Badge unlock / preview modal
        │   ├── LevelUpPopup.jsx  ← Level-up celebration with rank image
        │   ├── CelebOverlay.jsx  ← Generic confetti celebration
        │   ├── TierKeyPopup.jsx  ← Badge tier legend
        │   └── CoachMsgPopup.jsx ← Blocking coach message on login
        ├── net/
        │   ├── NetSVG.jsx        ← Precise SVG net with 7 hit zones
        │   └── HeatLegend.jsx    ← Blue→Red gradient legend bar
        ├── screens/
        │   ├── HomeScreen.jsx         ← Landing: Player / Coach entry
        │   ├── PlayerSelectScreen.jsx ← Roster picker + password gate
        │   └── ChallengesTab.jsx      ← Active challenge + H2H view
        ├── Dashboard.jsx         ← Player overview, XP, recent badges
        ├── ShootTracker.jsx      ← Active session: zone logging + net
        ├── GoalHeatmap.jsx       ← Zone heatmap + breakdown + bar chart
        ├── TeamLeaderboards.jsx  ← Today / Week / All-Time leaderboard
        ├── CoachPortal.jsx       ← PIN-gated coach tools (all 3 tabs)
        ├── BadgeGrid.jsx         ← All badges by category
        └── RanksTab.jsx          ← All 10 ranks with progress
```

---

## Data Model

```js
// localStorage key: "puck_v5"
State = {
  players: Player[],
  sessions: Session[],
  view: 'home' | 'playerSelect' | 'player' | 'coachPin' | 'coach' | 'addPlayer',
  activePlayerId: string | null,
  activeSessionId: string | null,
  dailyChallenge:  { zone, target, date } | null,
  weeklyChallenge: { zone, target, date } | null,
  h2h: { p1, p2, set } | null,
  h2hHistory: [],
}

Player = {
  id: string,
  name: string,
  jerseyNum: string,
  password: string,
  earnedBadges: { [badgeId]: { ts: number } },
  coachMsg: string,
  createdAt: number,
}

Session = {
  id: string,
  playerId: string,
  sets: Set[],
  date: ISO string,
  challengeComplete?: boolean,
}

Set = { zone: ZoneId, hits: 0–10, ts: number }
```

---

## XP System

| Action        | XP      |
|---------------|---------|
| 1 set of 10   | +5 XP   |
| 10 hits       | +3 XP   |
| Badge unlock  | +50 XP  |

---

## Rank Thresholds + Images

| Rank         | XP Needed | Image             |
|--------------|-----------|-------------------|
| Mite         | 0         | `/mite.png`       |
| Bronze       | 250       | `/bronze.png`     |
| Silver       | 450       | `/silver.png`     |
| Gold         | 700       | `/gold.png`       |
| Platinum     | 1,100     | `/platinum.png`   |
| Diamond      | 1,700     | `/diamond.png`    |
| Onyx         | 2,600     | `/onyx.png`       |
| Semi Pro     | 3,800     | `/semi pro.png`   |
| Pro          | 5,500     | `/pro.png`        |
| Elite Sniper | 8,000     | `/elite sniper.png` |

---

## Net Zones (SVG viewBox 0 0 400 270)

| Zone        | Shape  | Position           |
|-------------|--------|--------------------|
| Top Left    | Circle | cx=56, cy=64, r=27 |
| Top Right   | Circle | cx=344, cy=64, r=27|
| Bar Down    | Rect   | x=92, y=40, w=216, h=26 |
| Left Post   | Circle | cx=30, cy=122, r=20|
| Right Post  | Circle | cx=370, cy=122, r=20|
| Low Glove   | Circle | cx=60, cy=178, r=27|
| Low Blocker | Circle | cx=340, cy=178, r=27|

---

## Heatmap Color Scale

MLB Statcast gradient: **Blue (#0000FF) → Purple (#800080) → Red (#FF0000)**

- Cold / 0% accuracy → Blue
- Hot / 100% accuracy → Red
- Implemented in `src/utils/heatColor.js` with `rgba()` interpolation

---

## Coach Portal

- **PIN**: `1969` (hardcoded, stored client-side only)
- **Tabs**: Challenges · Matchups · Roster
- **Challenges**: Set daily (zone + target) + weekly (zone + target) — broadcasts to all players
- **Matchups**: Pick or randomize 2 players for H2H weekly showdown
- **Roster**: View session history, change player password, send message (pops up on next player login)

---

## Badge Tiers

| Tier | Color  | Label     |
|------|--------|-----------|
| 1    | Gray   | Common    |
| 2    | Blue   | Rare      |
| 3    | Amber  | Epic      |
| 4    | Purple | Legendary |

Total: **33 badges** across 7 categories (Streaks, Bar Down, Posts, Volume, Time, Skill, Challenges)

---

## UI Contrast Rules

- **All body text**: `#f1f5f9` (near-white) or `#cbd5e1` on dark navy backgrounds
- **Secondary text**: `#94a3b8` (never below this on dark cards)
- **Disabled / dim**: `#6b7280` — used sparingly for metadata only
- **Deep backgrounds**: `#0a0f1a` (page), `#0f172a` (modal), `#1e293b` (card)
- **Accent blues**: `#3b82f6` (primary), `#60a5fa` (secondary)
- **Success**: `#34d399` (green), **Warning**: `#f59e0b` (amber), **Danger**: `#ef4444` (red)
- **Labels (uppercase)**: `#cbd5e1` — replaces old `#94a3b8` labels for better readability

---

## Planned Future Work

- [ ] Backend / Supabase integration (replace localStorage)
- [ ] Admin dashboard (web, not mobile)
- [ ] Push notifications for coach messages
- [ ] Season history and long-term trend charts
- [ ] Parent-facing read-only view
- [ ] PWA manifest + offline support
- [ ] Video clip upload per session
