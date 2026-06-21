export const ROOKIE_QUESTS = [
  { key: 'puckSet100',      label: 'Log your first 100-puck session',       icon: '🏒', reward: 10 },
  { key: 'horseGame',       label: 'Finish your first PUCK game',           icon: '🎮', reward: 10 },
  { key: 'aroundWorld',     label: 'Complete an Around the World game',     icon: '🌍', reward: 10 },
  { key: 'issueChallenge',  label: 'Issue a challenge to a friend',         icon: '⚔️', reward: 10 },
  { key: 'visitStore',      label: 'Visit the Store for the first time',    icon: '🛒', reward: 10 },
  { key: 'techniqueOnly10', label: 'Log 10 pucks in Technique Only mode',   icon: '💪', reward: 10 },
  { key: 'spinDaily',           label: 'Spin the daily quest wheel',                        icon: '🎰', reward: 1  },
  { key: 'spinWeekly',          label: 'Spin the weekly quest wheel',                       icon: '📆', reward: 1  },
  { key: 'puck_backhand_win',   label: 'Win a PUCK game using at least one Backhand shot',  icon: '🎨', reward: 1  },
]

export const DEFAULT_ROOKIE_QUESTS = Object.fromEntries(
  ROOKIE_QUESTS.map(q => [q.key, false])
)
