import { Flame } from 'lucide-react'

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
  1:  { tier: 1, innerBg: 'linear-gradient(135deg,#7f1d1d,#dc2626)', innerIcon: '#fca5a5' },
  2:  { tier: 1, innerBg: 'linear-gradient(135deg,#7f1d1d,#ef4444)', innerIcon: '#fca5a5' },
  3:  { tier: 2, innerBg: 'linear-gradient(135deg,#92400e,#f97316)', innerIcon: '#fed7aa' },
  5:  { tier: 2, innerBg: 'linear-gradient(135deg,#92400e,#fb923c)', innerIcon: '#ffedd5' },
  7:  { tier: 2, innerBg: 'linear-gradient(135deg,#b45309,#fbbf24)', innerIcon: '#fef3c7' },
  14: { tier: 3, innerBg: 'linear-gradient(135deg,#78350f,#f59e0b)', innerIcon: '#fde68a' },
  30: { tier: 3, innerBg: 'linear-gradient(135deg,#7c2d12,#ea580c)', innerIcon: '#fdba74' },
  60: { tier: 4, innerBg: 'linear-gradient(135deg,#4c1d95,#7c3aed)', innerIcon: '#ddd6fe' },
  90: { tier: 4, innerBg: 'linear-gradient(135deg,#3b0764,#6d28d9)', innerIcon: '#e9d5ff' },
}

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
