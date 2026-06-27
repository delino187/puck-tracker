// Static quest pool definitions and display constants.
// No logic — pure data consumed by questEngine.js and DailyQuests.jsx.

export const QUEST_POOL = {
  volume: [
    { text: 'Log 25 Total Shots Today',                tier: 'common', reward: 10, icon: '🏒' },
    { text: 'Log 50 Total Shots Today',                tier: 'rare',   reward: 25, icon: '🏒' },
    { text: 'Log 75 Total Shots Today',                tier: 'rare',   reward: 25, icon: '🏒' },
    { text: 'Log 100 Total Shots Today',               tier: 'epic',   reward: 50, icon: '🏒' },
    { text: 'Log 30 Shots in Technique Only Mode',     tier: 'common', reward: 10, icon: '🎯' },
  ],
  technique: [
    { text: 'Log 25 Wrist Shots in Technique Mode Today',    tier: 'common', reward: 10, icon: '🏒' },
    { text: 'Log 15 Backhand Shots in Technique Mode Today', tier: 'rare',   reward: 25, icon: '🎯' },
    { text: 'Log 20 Snap Shots in Technique Mode Today',     tier: 'common', reward: 10, icon: '⚡' },
    { text: 'Log 10 Slap Shots in Technique Mode Today',     tier: 'epic',   reward: 50, icon: '💥' },
  ],
  quality: [
    { text: 'Hit 40% Accuracy in a Target Practice Session', tier: 'common', reward: 10, icon: '📊' },
    { text: 'Hit 50% Accuracy in a Target Practice Session', tier: 'rare',   reward: 25, icon: '📈' },
    { text: 'Hit 60% Accuracy in a Target Practice Session', tier: 'epic',   reward: 50, icon: '🔥' },
    { text: 'Hit at Least 3/10 Targets in a Practice Set',  tier: 'epic',   reward: 50, icon: '💯' },
    { text: 'Score 8+ Hits in Any Zone in Target Practice', tier: 'rare',   reward: 25, icon: '🎯' },
  ],
  social: [
    { text: 'Issue a Versus Challenge Today',                       tier: 'common',    reward: 10,  icon: '📣' },
    { text: 'Play 1 P-U-C-K Game Today',                           tier: 'rare',      reward: 25,  icon: '🎮' },
    { text: 'Win 1 Versus Quick Match Today',                       tier: 'epic',      reward: 50,  icon: '⚔️' },
    { text: 'Accept an Incoming Challenge',                         tier: 'common',    reward: 10,  icon: '🤝' },
    { text: 'Beat a Friend at P-U-C-K Today',                      tier: 'legendary', reward: 150, icon: '🏆' },
    { text: 'Win a P-U-C-K Game Using at Least One Backhand Shot', tier: 'rare',      reward: 1,   icon: '🎨' },
  ],
}

export const WEEKLY_QUEST_POOL = [
  // Volume quests
  { id: 'wq_shots500', text: 'Log 500 Total Shots This Week',                              reward: 250, icon: '🏒', tier: 'red'    },
  { id: 'wq_shots400', text: 'Log 400 Total Shots This Week',                              reward: 200, icon: '🏒', tier: 'red'    },
  { id: 'wq_shots300', text: 'Log 300 Total Shots This Week',                              reward: 150, icon: '🏒', tier: 'red'    },
  { id: 'wq_shots200', text: 'Log 200 Total Shots This Week',                              reward: 100, icon: '🏒', tier: 'red'    },
  // Technique-specific shots — names must match the breakdown keys in TechniqueTracker.jsx
  { id: 'wq_wrist300', text: 'Log 300 in Wrist Shot Technique This Week',      reward: 150, icon: '🏒', tier: 'red'    },
  { id: 'wq_wrist200', text: 'Log 200 in Wrist Shot Technique This Week',      reward: 125, icon: '🏒', tier: 'red'    },
  { id: 'wq_back200',  text: 'Log 200 in Backhand Technique This Week',        reward: 125, icon: '🎯', tier: 'red'    },
  { id: 'wq_back150',  text: 'Log 150 in Backhand Technique This Week',        reward: 100, icon: '🎯', tier: 'red'    },
  { id: 'wq_snap250',  text: 'Log 250 in Snap Shot Technique This Week',       reward: 150, icon: '⚡', tier: 'red'    },
  { id: 'wq_snap200',  text: 'Log 200 in Snap Shot Technique This Week',       reward: 125, icon: '⚡', tier: 'red'    },
  { id: 'wq_slap150',  text: 'Log 150 in Slap Shot Technique This Week',       reward: 125, icon: '💥', tier: 'red'    },
  { id: 'wq_slap100',  text: 'Log 100 in Slap Shot Technique This Week',       reward: 100, icon: '💥', tier: 'red'    },
  // Accuracy quests
  { id: 'wq_acc85x5',  text: 'Hit 50% Accuracy across 5 different Sessions this Week',    reward: 175, icon: '🔥', tier: 'common' },
  { id: 'wq_acc80x3',  text: 'Hit 50% Accuracy across 3 different Sessions this Week',    reward: 100, icon: '📊', tier: 'common' },
  { id: 'wq_acc75x5',  text: 'Hit 40% Accuracy across 5 different Sessions this Week',    reward: 125, icon: '📈', tier: 'common' },
  { id: 'wq_acc90x3',  text: 'Hit 50% Accuracy across 3 different Sessions this Week',    reward: 150, icon: '💯', tier: 'common' },
  // Session quests
  { id: 'wq_sess7',    text: 'Complete 7 Training Sessions this Week',                     reward: 175, icon: '📅', tier: 'epic'   },
  { id: 'wq_sess5',    text: 'Complete 5 Training Sessions this Week',                     reward: 100, icon: '📅', tier: 'epic'   },
]

export const TIER_COLORS = {
  common:    { border: '#22c55e', glow: '#22c55e' },
  rare:      { border: '#3b82f6', glow: '#3b82f6' },
  epic:      { border: '#a855f7', glow: '#a855f7' },
  legendary: { border: '#fbbf24', glow: '#fbbf24' },
  red:       { border: '#ef4444', glow: '#ef4444' },
}

export const SHUFFLE_POOL = [
  'Log 20 Backhands', 'Hit 50% Accuracy', 'Win a Match',
  'Score 15 Wrist Shots', 'Play 2 P-U-C-K', 'Hit 40% Accuracy',
  'Log 30 Shots', 'Win 1 Versus', 'Score a Bar Down',
  'Log 75 Shots', 'Hit 40% in a Session', 'Challenge a Friend',
  'Get 8 Hits Top-Left', 'Snap Shot Barrage', 'Perfect 10/10 Set',
  'Log 50 Slap Shots', 'Accuracy Grind 50%', 'Dominate Versus Tab',
]

export const WEEKLY_SHUFFLE_POOL = [
  'Log 500 Shots', 'Hit 50% Accuracy', 'Log 200 Backhands',
  'Complete 7 Sessions', 'Log 300 Shots', '50% x5 Sessions',
  'Log 150 Backhands', '50% x3 Sessions', 'Log 400 Shots',
  'Complete 5 Sessions', '40% x5 Sessions', 'Log 100 Wristers',
  'Hit 50% x5', 'Log 200 Shots', '50% x3 Sessions',
]
