/**
 * Canonical shot-type definitions.
 *
 * TECHNIQUES is the single source of truth for the keys stored in
 * techniqueByPlayer.dailyLog breakdown objects and used as selector
 * options in TechniqueTracker.jsx.
 *
 * SHOT_SUFFIX_NORM maps the single word captured from daily quest text
 * (e.g. "Wrist" from "Log 25 Wrist Shots in Technique Mode Today") to
 * the full breakdown key ("Wrist Shot").  Backhand has no suffix so it
 * maps to itself; only the three compound names need normalization.
 */

export const TECHNIQUES = [
  { key: 'Wrist Shot', label: 'Wrist Shot 🏒' },
  { key: 'Backhand',   label: 'Backhand 🎯'   },
  { key: 'Snap Shot',  label: 'Snap Shot ⚡'  },
  { key: 'Slap Shot',  label: 'Slap Shot 💥'  },
  { key: 'One-Timer',  label: 'One-Timer 🚀'  },
  { key: 'Toe Drag',   label: 'Toe Drag 🔄'   },
]

export const SHOT_SUFFIX_NORM = {
  Wrist: 'Wrist Shot',
  Snap:  'Snap Shot',
  Slap:  'Slap Shot',
}
