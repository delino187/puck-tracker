// Canonical taunt catalog.  Single source of truth for IDs, audio file paths,
// display names, and pricing — imported by StreakHub, useMatchResults, and App.

export const TAUNT_CATALOG = {
  'sad-trombone': { id: 'sad-trombone', emoji: '🎺', name: 'Sad Trombone',   file: 'wah-wah-sad-trombone.mp3', desc: 'A classic sad trombone plays over your opponent\'s screen on defeat.'   },
  'ewwww':        { id: 'ewwww',        emoji: '😬', name: 'Ewwwww',         file: 'ewwww.mp3',                desc: 'An exaggerated "Ewwww" reaction hits your opponent the moment they lose.'  },
  'yeah-boy':     { id: 'yeah-boy',     emoji: '🎉', name: 'Yeah Boy',       file: 'yeah-boy.mp3',             desc: 'A hype "Yeah Boy!" shout drops right when your opponent takes the L.'     },
  'pop-wow':      { id: 'pop-wow',      emoji: '💥', name: 'Pop Wow',        file: 'pop-wow.mp3',              desc: 'A dramatic pop-wow moment punctuates your opponent\'s defeat screen.'      },
  'sooo-funny':   { id: 'sooo-funny',   emoji: '😂', name: 'Sooo Funny',     file: 'sooo-funny.mp3',           desc: 'A sarcastic "Sooo Funny" jab fires on your opponent\'s loss card.'         },
  'funny-yay':    { id: 'funny-yay',    emoji: '🥳', name: 'Funny Yay',      file: 'funny-yay.mp3',            desc: 'A sarcastic cheer plays automatically when your opponent gets defeated.'    },
  'laughing':     { id: 'laughing',     emoji: '😆', name: 'Crowd Laughing', file: 'laughing.mp3',             desc: 'The whole crowd laughs at your opponent\'s expense on their defeat screen.'  },
  'losing-horn':  { id: 'losing-horn',  emoji: '📯', name: 'Losing Horn',    file: 'losing-horn-313723.mp3',   desc: 'A classic loser horn marks your opponent\'s defeat with authority.'          },
  'game-over':    { id: 'game-over',    emoji: '🎮', name: 'Game Over',      file: 'game-over.mp3',            desc: 'Game Over rings out the moment your opponent bites the dust.'               },
}

// All new audio taunts share the same diamond price.
export const TAUNT_PRICE = 150

export const TAUNT_IDS = Object.keys(TAUNT_CATALOG)

// Returns the public-folder audio path for a given taunt ID, or null if not found.
// Handles the legacy 'sad_trombone' (underscore) equippedTaunt value written by
// older code so existing accounts don't lose their audio on defeat.
export function tauntAudioPath(tauntId) {
  if (!tauntId) return null
  const item = TAUNT_CATALOG[tauntId]
  if (item) return `/${item.file}`
  // Legacy: old code wrote 'sad_trombone' (underscore) as the equippedTaunt value
  if (tauntId === 'sad_trombone') return '/sad-game-over-trombone.mp3'
  return null
}
