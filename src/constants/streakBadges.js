import { Flame, Star } from 'lucide-react'

// Streak milestone badges — each maps to a physical image asset in
// /src/assets/images/badges/. Unlock gate: allTimeStreakPB >= milestone.
export const STREAK_BADGES = [
  { id: 'streak_1',  name: 'The Spark',      milestone: 1,  image: 'spark.webp',          description: 'Log shots 1 day in a row to spark the flame.' },
  { id: 'streak_2',  name: 'Light the Lamp', milestone: 2,  image: 'light-the-lamp.webp', description: 'Log shots 2 days in a row to trip the goal horn.' },
  { id: 'streak_3',  name: 'Hat Trick',      milestone: 3,  image: 'hat-trick.webp',      description: 'Maintain a 3-day shooting streak.' },
  { id: 'streak_5',  name: 'Five-Hole Fire', milestone: 5,  image: 'five-hole-fire.webp', description: 'Maintain a 5-day shooting streak.' },
  { id: 'streak_7',  name: 'Hot Stick',      milestone: 7,  image: 'hot-stick.webp',      description: 'Keep the streak alive for a full week (7 days).' },
  { id: 'streak_14', name: 'Playoff Beard',  milestone: 14, image: 'playoff-beard.webp',  description: 'Keep grinding for 2 weeks straight (14 days).' },
  { id: 'streak_30', name: 'Iron Guard',     milestone: 30, image: 'iron-guard.webp',     description: 'Hit a massive 1-month milestone (30 days).' },
  { id: 'streak_60', name: 'Barn Burner',    milestone: 60, image: 'barn-burner.webp',    description: 'Two months of relentless dedication (60 days).' },
  { id: 'streak_90', name: 'Living Legend',  milestone: 90, image: 'living-legend.webp',  description: 'Ultimate mastery. 90 days of continuous training.' },
]

// Tier + gradient mapping shared by BadgeGrid and StreakHub
export const STREAK_META = {
  1:  { tier: 1, innerBg: 'linear-gradient(135deg,#052e16,#14532d)', innerIcon: '#86efac' },
  2:  { tier: 1, innerBg: 'linear-gradient(135deg,#14532d,#22c55e)', innerIcon: '#bbf7d0' },
  3:  { tier: 2, innerBg: 'linear-gradient(135deg,#1e3a5f,#2563eb)', innerIcon: '#93c5fd' },
  5:  { tier: 2, innerBg: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', innerIcon: '#bfdbfe' },
  7:  { tier: 2, innerBg: 'linear-gradient(135deg,#1e40af,#60a5fa)', innerIcon: '#dbeafe' },
  14: { tier: 3, innerBg: 'linear-gradient(135deg,#3b0764,#7c3aed)', innerIcon: '#d8b4fe' },
  30: { tier: 3, innerBg: 'linear-gradient(135deg,#4c1d95,#a855f7)', innerIcon: '#e9d5ff' },
  60: { tier: 4, innerBg: 'linear-gradient(135deg,#422006,#b45309)', innerIcon: '#fef08a' },
  90: { tier: 4, innerBg: 'linear-gradient(135deg,#713f12,#eab308)', innerIcon: '#fef9c3' },
}

/**
 * Live badges — visible ONLY while an active streak is above the threshold.
 * They are NOT stored in earnedBadges; they vanish automatically if the streak breaks.
 */
export const STREAK_EXCLUSIVE_BADGES = [
  {
    id:        'live_7day',
    name:      '7-Day Hot Streak',
    desc:      'Active 7-day streak — vanishes the moment your streak breaks.',
    minStreak: 7,
    tier:      3,
    live:      true,
    innerBg:   'linear-gradient(135deg,#7c2d12,#ea580c)',
    innerIcon: '#fed7aa',
    Icon:      Flame,
  },
  {
    id:        'live_30day',
    name:      '30-Day Ice King',
    desc:      'Ultra-rare live badge — active 30-day streak. Gone if the streak breaks.',
    minStreak: 30,
    tier:      5,
    live:      true,
    innerBg:   'linear-gradient(135deg,#0c4a6e,#0ea5e9)',
    innerIcon: '#bae6fd',
    Icon:      Star,
  },
]

// Converts a STREAK_BADGE into a BadgeCircle/BadgePopup-compatible shape.
// Both BadgeGrid and StreakHub use this so the circle styling is identical.
export function toCircleBadge(sb) {
  const meta = STREAK_META[sb.milestone] ?? STREAK_META[30]
  return {
    id:        sb.id,
    name:      sb.name,
    desc:      sb.description,
    milestone: sb.milestone,
    cat:       'streak',
    tier:      meta.tier,
    img: `/badges/${sb.image}`,
    innerBg:   meta.innerBg,
    innerIcon: meta.innerIcon,
    Icon:      Flame,
  }
}
