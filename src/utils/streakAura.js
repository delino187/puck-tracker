/**
 * Returns the CSS class name for the avatar glow aura based on active streak.
 *   Tier 1  (1–4 days):  arcade-glow        — standard cyan
 *   Tier 2  (5–14 days): arcade-glow-warm   — amber "heating up"
 *   Tier 3  (15+ days):  arcade-glow-fire   — crimson/gold pulsing aura
 */
export function getStreakAuraClass(streak = 0) {
  if (streak >= 15) return 'arcade-glow-fire'
  if (streak >= 5)  return 'arcade-glow-warm'
  if (streak >= 1)  return 'arcade-glow'
  return 'arcade-glow'   // always show at least the base glow
}
