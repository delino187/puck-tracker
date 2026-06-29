import {
  Flame, Star, Target, Clock, Shield, Leaf, Zap, Award,
  Timer, CheckCircle, Moon, Sunrise, Crosshair, Gem,
  Globe, Plane, RotateCcw, Compass, Wind, Map, Gamepad2,
  Swords, ShoppingBag, Trophy, Disc3,
} from 'lucide-react'
import {
  dayStreak, zoneHits, lifetimeShots, maxShotsInDay, maxSessionsInDay,
  sessionTimeCheck, chirpProof, hasCelery, challengesCompleted,
  perfectEveryZone, maxDailyPostHits, hasPerfectSet, hasHighSetInZone,
  atwGamesPlayed, atwMaxRunHits, atwAllCornersAtLeast, atwDayStreak,
  atwBeatPBBy, atwCareerHits,
} from '../utils/badgeHelpers.js'

export const TIER = {
  1: { ring: '#22c55e', glow: '#22c55e80', lockedGlow: '#22c55e28', bg: 'linear-gradient(135deg,#052e16,#14532d)', icon: '#86efac', label: 'Uncommon',  desc: 'Entry-level achievements' },
  2: { ring: '#3b82f6', glow: '#3b82f680', lockedGlow: '#3b82f628', bg: 'linear-gradient(135deg,#1e3a5f,#1e4976)', icon: '#93c5fd', label: 'Rare',       desc: 'Solid accomplishments' },
  3: { ring: '#a855f7', glow: '#a855f780', lockedGlow: '#a855f728', bg: 'linear-gradient(135deg,#2e1065,#581c87)', icon: '#d8b4fe', label: 'Epic',       desc: 'Impressive milestones' },
  4: { ring: '#eab308', glow: '#eab30880', lockedGlow: '#eab30828', bg: 'linear-gradient(135deg,#422006,#713f12)', icon: '#fef08a', label: 'Legendary',  desc: 'Elite-level achievements' },
  5: { ring: '#f59e0b', glow: '#f59e0b99', lockedGlow: '#f59e0b33', bg: 'linear-gradient(135deg,#451a03,#854d0e)', icon: '#fef08a', label: 'Ultra-Rare', desc: 'Extraordinary once-in-a-season achievements' },
}

export const BADGES = [
  // ── Streaks ──────────────────────────────────────────────────────────────────
  { id: 's1',  name: 'The Spark',        desc: 'Log pucks 2 days in a row!',  cat: 'streak', tier: 1, Icon: Flame, innerBg: 'linear-gradient(135deg,#7f1d1d,#dc2626)', innerIcon: '#fca5a5', check: (p,s) => dayStreak(p,s)>=2  },
  { id: 's3',  name: 'Hat Trick',        desc: 'Log pucks 3 days in a row!',  cat: 'streak', tier: 2, img: '/badges/hat-trick.webp',      Icon: Flame, innerBg: 'linear-gradient(135deg,#92400e,#f97316)', innerIcon: '#fed7aa', check: (p,s) => dayStreak(p,s)>=3  },
  { id: 's4',  name: 'Light the Lamp',   desc: 'Log pucks 4 days in a row!',  cat: 'streak', tier: 2, img: '/badges/light-the-lamp.webp', Icon: Flame, innerBg: 'linear-gradient(135deg,#92400e,#fb923c)', innerIcon: '#ffedd5', check: (p,s) => dayStreak(p,s)>=4  },
  { id: 's5',  name: 'Hot Stick',        desc: '5-day streak',           cat: 'streak', tier: 2, img: '/badges/hot-stick.webp',      Icon: Flame, innerBg: 'linear-gradient(135deg,#b45309,#fbbf24)', innerIcon: '#fef3c7', check: (p,s) => dayStreak(p,s)>=5  },
  { id: 's10', name: 'Inferno',          desc: '10-day streak',          cat: 'streak', tier: 3, Icon: Flame, innerBg: 'linear-gradient(135deg,#7c2d12,#ea580c)', innerIcon: '#fdba74', check: (p,s) => dayStreak(p,s)>=10 },
  { id: 's20', name: 'Three-Week March', desc: '20-day streak',          cat: 'streak', tier: 3, Icon: Flame, innerBg: 'linear-gradient(135deg,#78350f,#f59e0b)', innerIcon: '#fde68a', check: (p,s) => dayStreak(p,s)>=20 },
  { id: 's30', name: 'Monthly Warrior',  desc: '30-day streak',          cat: 'streak', tier: 4, Icon: Flame, innerBg: 'linear-gradient(135deg,#4c1d95,#7c3aed)', innerIcon: '#ddd6fe', check: (p,s) => dayStreak(p,s)>=30 },
  { id: 's40', name: 'Iron Machine',     desc: '40-day streak',          cat: 'streak', tier: 4, Icon: Flame, innerBg: 'linear-gradient(135deg,#3b0764,#6d28d9)', innerIcon: '#e9d5ff', check: (p,s) => dayStreak(p,s)>=40 },

  // ── Bar Down ─────────────────────────────────────────────────────────────────
  { id: 'bd5',   name: 'Ding!',             desc: '5 bar downs',           cat: 'bardown', tier: 1, img: '/ding.png',              Icon: Target, innerBg: 'linear-gradient(135deg,#0c4a6e,#0284c7)', innerIcon: '#bae6fd', check: (p,s) => zoneHits(p,s,['bar_down'])>=5   },
  { id: 'bd10',  name: 'Crossbar Club',     desc: '10 bar downs',          cat: 'bardown', tier: 2, img: '/crossbar-club.png',     Icon: Target, innerBg: 'linear-gradient(135deg,#1e3a8a,#2563eb)', innerIcon: '#bfdbfe', check: (p,s) => zoneHits(p,s,['bar_down'])>=10  },
  { id: 'bd20',  name: 'Off the Iron',      desc: '20 bar downs',          cat: 'bardown', tier: 2, img: '/off-the-iron.png',      Icon: Target, innerBg: 'linear-gradient(135deg,#164e63,#0891b2)', innerIcon: '#a5f3fc', check: (p,s) => zoneHits(p,s,['bar_down'])>=20  },
  { id: 'bd30',  name: 'Bar God',           desc: '30 bar downs',          cat: 'bardown', tier: 3, img: '/bar-god.png',           Icon: Target, innerBg: 'linear-gradient(135deg,#713f12,#d97706)', innerIcon: '#fde68a', check: (p,s) => zoneHits(p,s,['bar_down'])>=30  },
  { id: 'bd40',  name: 'Belfry Resident',   desc: '40 bar downs',          cat: 'bardown', tier: 3, img: '/belfry-resident.png',   Icon: Target, innerBg: 'linear-gradient(135deg,#581c87,#9333ea)', innerIcon: '#e9d5ff', check: (p,s) => zoneHits(p,s,['bar_down'])>=40  },
  { id: 'bd50',  name: 'Half-Century Iron', desc: '50 bar downs',          cat: 'bardown', tier: 4, img: '/half-century-iron.png', Icon: Target, innerBg: 'linear-gradient(135deg,#4c1d95,#7c3aed)', innerIcon: '#ddd6fe', check: (p,s) => zoneHits(p,s,['bar_down'])>=50  },
  { id: 'bd75',  name: 'Three-Quarter Bar', desc: '75 bar downs',          cat: 'bardown', tier: 4, img: '/three-quarter-bar.png', Icon: Target, innerBg: 'linear-gradient(135deg,#3b0764,#6d28d9)', innerIcon: '#f5d0fe', check: (p,s) => zoneHits(p,s,['bar_down'])>=75  },
  { id: 'bd100', name: 'Bar Down Legend',   desc: '100 bar downs',         cat: 'bardown', tier: 4, img: '/bar-down-legend.png',   Icon: Target, innerBg: 'linear-gradient(135deg,#1e1b4b,#4338ca)', innerIcon: '#c7d2fe', check: (p,s) => zoneHits(p,s,['bar_down'])>=100 },

  // ── Frame Targets — TL + TR corner shots ─────────────────────────────────────
  { id: 'cr5',   name: 'Top Touch',         desc: '5 top-corner hits (TL+TR combined)',   cat: 'frame', tier: 1, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#0c4a6e,#0284c7)',  innerIcon: '#bae6fd', check: (p,s) => zoneHits(p,s,['top_left','top_right'])>=5   },
  { id: 'cr15',  name: 'Tin Top',           desc: '15 top-corner hits (TL+TR combined)',  cat: 'frame', tier: 1, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#0369a1,#0ea5e9)',  innerIcon: '#e0f2fe', check: (p,s) => zoneHits(p,s,['top_left','top_right'])>=15  },
  { id: 'cr30',  name: 'Top Corns',         desc: '30 top-corner hits (TL+TR combined)',  cat: 'frame', tier: 2, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#065f46,#0d9488)',  innerIcon: '#99f6e4', check: (p,s) => zoneHits(p,s,['top_left','top_right'])>=30  },
  { id: 'cr50',  name: 'Corn Farmer',       desc: '50 top-corner hits (TL+TR combined)',  cat: 'frame', tier: 2, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#14532d,#15803d)',  innerIcon: '#bbf7d0', check: (p,s) => zoneHits(p,s,['top_left','top_right'])>=50  },
  { id: 'cr75',  name: 'Corners',           desc: '75 top-corner hits (TL+TR combined)',  cat: 'frame', tier: 3, img: '/top shelf.jpeg', Icon: Star, innerBg: 'linear-gradient(135deg,#451a03,#92400e)', innerIcon: '#fef08a', check: (p,s) => zoneHits(p,s,['top_left','top_right'])>=75  },
  { id: 'cr100', name: 'Corner King',       desc: '100 top-corner hits (TL+TR combined)', cat: 'frame', tier: 3, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#713f12,#d97706)',  innerIcon: '#fde68a', check: (p,s) => zoneHits(p,s,['top_left','top_right'])>=100 },
  { id: 'cr150', name: 'Cream of the Corn', desc: '150 top-corner hits (TL+TR combined)', cat: 'frame', tier: 4, Icon: Star,      innerBg: 'linear-gradient(135deg,#4c1d95,#9333ea)',  innerIcon: '#f5d0fe', check: (p,s) => zoneHits(p,s,['top_left','top_right'])>=150 },

  // ── Posts — lifetime + daily left/right post hits ─────────────────────────────
  { id: 'p50',  name: 'Post Up',          desc: '50 lifetime post hits (L+R)',       cat: 'posts', tier: 1, Icon: Award,     innerBg: 'linear-gradient(135deg,#064e3b,#059669)', innerIcon: '#a7f3d0', check: (p,s) => zoneHits(p,s,['left_post','right_post'])>=50  },
  { id: 'p100', name: 'Post Warrior',     desc: '100 lifetime post hits (L+R)',      cat: 'posts', tier: 2, Icon: Award,     innerBg: 'linear-gradient(135deg,#065f46,#10b981)', innerIcon: '#6ee7b7', check: (p,s) => zoneHits(p,s,['left_post','right_post'])>=100 },
  { id: 'fp10', name: 'Frame Seeker',     desc: '10 post hits in one day',           cat: 'posts', tier: 1, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#064e3b,#059669)', innerIcon: '#a7f3d0', check: (p,s) => maxDailyPostHits(p,s)>=10 },
  { id: 'fp20', name: 'Post Patrol',      desc: '20 post hits in one day',           cat: 'posts', tier: 2, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#065f46,#0d9488)', innerIcon: '#99f6e4', check: (p,s) => maxDailyPostHits(p,s)>=20 },
  { id: 'fp30', name: 'Iron Aim',         desc: '30 post hits in one day',           cat: 'posts', tier: 2, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#0c4a6e,#0369a1)', innerIcon: '#7dd3fc', check: (p,s) => maxDailyPostHits(p,s)>=30 },
  { id: 'fp40', name: 'Frame Destroyer',  desc: '40 post hits in one day',           cat: 'posts', tier: 3, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#713f12,#d97706)', innerIcon: '#fde68a', check: (p,s) => maxDailyPostHits(p,s)>=40 },
  { id: 'fp50', name: 'Post Perfect',     desc: '50 post hits in one day',           cat: 'posts', tier: 4, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#4c1d95,#9333ea)', innerIcon: '#f5d0fe', check: (p,s) => maxDailyPostHits(p,s)>=50 },

  // ── Career Volume ─────────────────────────────────────────────────────────────
  { id: 'v100', name: '100 Pucks',          desc: '100 career shots',    cat: 'volume', tier: 1, img: '/100 pucks.jpeg',  Icon: Zap, innerBg: 'linear-gradient(135deg,#1e3a5f,#2563eb)', innerIcon: '#93c5fd', check: (p,s) => lifetimeShots(p,s)>=100   },
  { id: 'v200', name: 'Double Down',        desc: '200 career shots',    cat: 'volume', tier: 1, img: '/double-down.png',     Icon: Zap, innerBg: 'linear-gradient(135deg,#1e3a5f,#3b82f6)', innerIcon: '#bfdbfe', check: (p,s) => lifetimeShots(p,s)>=200   },
  { id: 'v300', name: 'Triple Threat',      desc: '300 career shots',    cat: 'volume', tier: 2, img: '/triple-threat.png',   Icon: Zap, innerBg: 'linear-gradient(135deg,#0c4a6e,#0369a1)', innerIcon: '#7dd3fc', check: (p,s) => lifetimeShots(p,s)>=300   },
  { id: 'v400', name: 'Four Hundred',       desc: '400 career shots',    cat: 'volume', tier: 2, img: '/four-hundred.png',    Icon: Zap, innerBg: 'linear-gradient(135deg,#134e4a,#0d9488)', innerIcon: '#99f6e4', check: (p,s) => lifetimeShots(p,s)>=400   },
  { id: 'v500', name: '500 Pucks',          desc: '500 career shots',    cat: 'volume', tier: 2, img: '/500-pucks.png',       Icon: Zap, innerBg: 'linear-gradient(135deg,#3b0764,#7e22ce)', innerIcon: '#d8b4fe', check: (p,s) => lifetimeShots(p,s)>=500   },
  { id: 'v1k',  name: '1000 Pucks',         desc: '1,000 career shots',  cat: 'volume', tier: 3, img: '/1000-pucks.png',      Icon: Zap, innerBg: 'linear-gradient(135deg,#78350f,#f59e0b)', innerIcon: '#fde68a', check: (p,s) => lifetimeShots(p,s)>=1000  },
  { id: 'v5k',  name: 'Snipe Artist',       desc: '5,000 career shots',  cat: 'volume', tier: 3,                              Icon: Zap, innerBg: 'linear-gradient(135deg,#7c2d12,#dc2626)', innerIcon: '#fca5a5', check: (p,s) => lifetimeShots(p,s)>=5000  },
  { id: 'v10k', name: '10,000 Hours',       desc: '10,000 career shots', cat: 'volume', tier: 4,                              Icon: Zap, innerBg: 'linear-gradient(135deg,#4c1d95,#6d28d9)', innerIcon: '#c4b5fd', check: (p,s) => lifetimeShots(p,s)>=10000 },
  { id: 'd100', name: 'Barn Burner',        desc: '100 shots in one day', cat: 'volume', tier: 2, img: '/barn-burner.png',    Icon: Flame, innerBg: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', innerIcon: '#fca5a5', check: (p,s) => maxShotsInDay(p,s)>=100 },
  { id: 'd200', name: 'Gym Rat',            desc: '200 shots in one day', cat: 'volume', tier: 3, img: '/gym-rat.png',        Icon: Flame, innerBg: 'linear-gradient(135deg,#7c2d12,#c2410c)', innerIcon: '#fed7aa', check: (p,s) => maxShotsInDay(p,s)>=200 },
  { id: 'd300', name: 'Three-Hundred',      desc: '300 shots in one day', cat: 'volume', tier: 3, img: '/three-hundred.png',  Icon: Flame, innerBg: 'linear-gradient(135deg,#78350f,#d97706)', innerIcon: '#fde68a', check: (p,s) => maxShotsInDay(p,s)>=300 },
  { id: 'd400', name: 'Four-Hundred',       desc: '400 shots in one day', cat: 'volume', tier: 4,                              Icon: Flame, innerBg: 'linear-gradient(135deg,#4c1d95,#7c3aed)', innerIcon: '#ddd6fe', check: (p,s) => maxShotsInDay(p,s)>=400 },
  { id: 'd500', name: 'Five-Hundred Maniac', desc: '500 shots in one day', cat: 'ultra', tier: 4, Icon: Flame, innerBg: 'linear-gradient(135deg,#1a0000,#7f1d1d)', innerIcon: '#fca5a5', check: (p,s) => maxShotsInDay(p,s)>=500 },

  // ── Multi-Session Days ────────────────────────────────────────────────────────
  { id: 'ds2', name: 'Double Shift', desc: '2 sessions of 50+ pucks each in one day', cat: 'time', tier: 2, Icon: Timer, innerBg: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', innerIcon: '#bfdbfe', check: (p,s) => maxSessionsInDay(p,s)>=2 },
  { id: 'ds3', name: 'Triple Shift', desc: '3 sessions of 50+ pucks each in one day', cat: 'time', tier: 3, Icon: Timer, innerBg: 'linear-gradient(135deg,#312e81,#4338ca)', innerIcon: '#c7d2fe', check: (p,s) => maxSessionsInDay(p,s)>=3 },

  // ── Time Anomalies ────────────────────────────────────────────────────────────
  { id: 'tm', name: 'Midnight Oil', desc: 'Logged a session after 9 PM',  cat: 'time', tier: 2, img: '/midnight oil.jpeg', Icon: Moon,    innerBg: 'linear-gradient(135deg,#0f172a,#1e1b4b)', innerIcon: '#a5b4fc', check: (p,s) => sessionTimeCheck(p,s,21,null) },
  { id: 'te', name: 'Early Bird',   desc: 'Logged a session before 8 AM', cat: 'time', tier: 2, img: '/early bird.jpeg',   Icon: Sunrise, innerBg: 'linear-gradient(135deg,#7c2d12,#f97316)', innerIcon: '#fed7aa', check: (p,s) => sessionTimeCheck(p,s,null,8) },

  // ── Skill ─────────────────────────────────────────────────────────────────────
  { id: 'cp',  name: 'Chirp-Proof', desc: 'Went from 0% to 40%+ in one zone',    cat: 'skill', tier: 3, Icon: Shield, innerBg: 'linear-gradient(135deg,#064e3b,#15803d)', innerIcon: '#bbf7d0', check: (p,s) => chirpProof(p,s)       },
  { id: 'cel', name: 'Celery',      desc: 'Miss every shot in a set (0/10)',      cat: 'skill', tier: 1, img: '/celery.jpeg', Icon: Leaf, innerBg: 'linear-gradient(135deg,#14532d,#16a34a)',   innerIcon: '#bbf7d0', check: (p,s) => hasCelery(p,s)        },
  { id: 'sr',  name: 'Super Rare',  desc: '10/10 in every single target zone',   cat: 'ultra', tier: 4, Icon: Star,   innerBg: 'linear-gradient(135deg,#4c1d95,#9333ea)', innerIcon: '#f5d0fe', check: (p,s) => perfectEveryZone(p,s) },

  // ── Challenges ────────────────────────────────────────────────────────────────
  { id: 'c1',  name: 'Answered',          desc: 'Completed 1 challenge',   cat: 'challenge', tier: 1, Icon: CheckCircle, innerBg: 'linear-gradient(135deg,#0c4a6e,#0369a1)', innerIcon: '#7dd3fc', check: (p,s) => challengesCompleted(p,s)>=1  },
  { id: 'c3',  name: 'Challenge Rookie',  desc: 'Completed 3 challenges',  cat: 'challenge', tier: 2, Icon: CheckCircle, innerBg: 'linear-gradient(135deg,#065f46,#0d9488)', innerIcon: '#99f6e4', check: (p,s) => challengesCompleted(p,s)>=3  },
  { id: 'c5',  name: 'Challenger',        desc: 'Completed 5 challenges',  cat: 'challenge', tier: 2, Icon: CheckCircle, innerBg: 'linear-gradient(135deg,#1e3a8a,#2563eb)', innerIcon: '#bfdbfe', check: (p,s) => challengesCompleted(p,s)>=5  },
  { id: 'c10', name: 'Challenge King',    desc: 'Completed 10 challenges', cat: 'challenge', tier: 3, Icon: CheckCircle, innerBg: 'linear-gradient(135deg,#713f12,#b45309)', innerIcon: '#fde68a', check: (p,s) => challengesCompleted(p,s)>=10 },
  { id: 'c20', name: 'Weekend Warrior',   desc: 'Completed 20 challenges', cat: 'challenge', tier: 3, Icon: CheckCircle, innerBg: 'linear-gradient(135deg,#7c2d12,#dc2626)', innerIcon: '#fca5a5', check: (p,s) => challengesCompleted(p,s)>=20 },
  { id: 'c30', name: 'Challenge Master',  desc: 'Completed 30 challenges', cat: 'challenge', tier: 4, Icon: CheckCircle, innerBg: 'linear-gradient(135deg,#4c1d95,#7c3aed)', innerIcon: '#ddd6fe', check: (p,s) => challengesCompleted(p,s)>=30 },

  // ── Ultra-Rare ────────────────────────────────────────────────────────────────
  {
    id: 'ps', name: 'Perfect Set', cat: 'ultra', tier: 5,
    desc: 'Score a flawless 10/10 in any single target zone set',
    img: '/perfect set.jpeg',
    Icon: Gem,
    innerBg: 'linear-gradient(135deg,#451a03,#854d0e)', innerIcon: '#fef08a',
    check: (p,s) => hasPerfectSet(p,s),
  },

  // ── Zone Mastery — 8+ hits in a single set per zone ──────────────────────────
  { id: 'zm_tl', name: 'TL Marksman',    desc: '8+ hits in a single Top Left set',    cat: 'ultra', tier: 3, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#0c4a6e,#0e7490)', innerIcon: '#a5f3fc', check: (p,s) => hasHighSetInZone(p,s,'top_left')    },
  { id: 'zm_tr', name: 'TR Marksman',    desc: '8+ hits in a single Top Right set',   cat: 'ultra', tier: 3, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#0c4a6e,#0e7490)', innerIcon: '#a5f3fc', check: (p,s) => hasHighSetInZone(p,s,'top_right')   },
  { id: 'zm_bd', name: 'BD Marksman',    desc: '8+ hits in a single Bar Down set',    cat: 'ultra', tier: 3, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#78350f,#d97706)', innerIcon: '#fde68a', check: (p,s) => hasHighSetInZone(p,s,'bar_down')    },
  { id: 'zm_lp', name: 'LP Marksman',    desc: '8+ hits in a single Left Post set',   cat: 'ultra', tier: 3, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#064e3b,#0d9488)', innerIcon: '#99f6e4', check: (p,s) => hasHighSetInZone(p,s,'left_post')   },
  { id: 'zm_rp', name: 'RP Marksman',    desc: '8+ hits in a single Right Post set',  cat: 'ultra', tier: 3, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#064e3b,#0d9488)', innerIcon: '#99f6e4', check: (p,s) => hasHighSetInZone(p,s,'right_post')  },
  { id: 'zm_lg', name: 'LG Marksman',    desc: '8+ hits in a single Low Glove set',   cat: 'ultra', tier: 3, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#3b0764,#7c3aed)', innerIcon: '#e9d5ff', check: (p,s) => hasHighSetInZone(p,s,'low_glove')   },
  { id: 'zm_lb', name: 'LB Marksman',    desc: '8+ hits in a single Low Blocker set', cat: 'ultra', tier: 3, Icon: Crosshair, innerBg: 'linear-gradient(135deg,#831843,#be185d)', innerIcon: '#fbcfe8', check: (p,s) => hasHighSetInZone(p,s,'low_blocker') },

  // ── Around the World game badges ─────────────────────────────────────────────
  { id: 'atw_1',  name: 'Global Citizen',   desc: 'Complete your first Around the World run',    cat: 'games', tier: 1, Icon: Globe,     innerBg: 'linear-gradient(135deg,#064e3b,#059669)', innerIcon: '#6ee7b7', check: (p,s) => atwGamesPlayed(p,s) >= 1       },
  { id: 'atw_ff', name: 'Frequent Flyer',   desc: '8+ total hits in a single ATW run',           cat: 'games', tier: 1, Icon: Plane,     innerBg: 'linear-gradient(135deg,#0c4a6e,#0284c7)', innerIcon: '#bae6fd', check: (p,s) => atwMaxRunHits(p,s) >= 8        },
  { id: 'atw_oa', name: 'Orbit Achieved',   desc: '12+ total hits in a single ATW run',          cat: 'games', tier: 2, Icon: RotateCcw, innerBg: 'linear-gradient(135deg,#1e1b4b,#4338ca)', innerIcon: '#c7d2fe', check: (p,s) => atwMaxRunHits(p,s) >= 12       },
  { id: 'atw_ls', name: 'Light Speed',      desc: '20+ total hits in a single ATW run',          cat: 'games', tier: 3, Icon: Zap,       innerBg: 'linear-gradient(135deg,#78350f,#f59e0b)', innerIcon: '#fef3c7', check: (p,s) => atwMaxRunHits(p,s) >= 20       },
  { id: 'atw_pc', name: 'Perfect Compass',  desc: '2+ hits in every corner in one ATW run',      cat: 'games', tier: 2, Icon: Compass,   innerBg: 'linear-gradient(135deg,#134e4a,#0d9488)', innerIcon: '#99f6e4', check: (p,s) => atwAllCornersAtLeast(p,s,2)   },
  { id: 'atw_jl', name: 'Jet Lag',          desc: 'Play Around the World 3 days in a row',       cat: 'games', tier: 2, Icon: Moon,      innerBg: 'linear-gradient(135deg,#0f172a,#1e3a8a)', innerIcon: '#a5b4fc', check: (p,s) => atwDayStreak(p,s,3)            },
  { id: 'atw_sb', name: 'Sonic Boom',       desc: 'Beat your ATW personal best by 3+ hits',      cat: 'games', tier: 3, Icon: Wind,      innerBg: 'linear-gradient(135deg,#7f1d1d,#dc2626)', innerIcon: '#fca5a5', check: (p,s) => atwBeatPBBy(p,s,3)             },
  { id: 'atw_ps', name: 'Passport Stamped', desc: '40 career hits across all ATW runs',          cat: 'games', tier: 2, Icon: Map,       innerBg: 'linear-gradient(135deg,#713f12,#b45309)', innerIcon: '#fde68a', check: (p,s) => atwCareerHits(p,s) >= 40       },

  // ── Onboarding milestone badges (Common / tier 1) ────────────────────────────
  { id: 'ob_dailygrind',  name: 'Daily Grind',    desc: 'Spun your first daily quest wheel!',   cat: 'skill', tier: 1, Icon: Flame,       innerBg: 'linear-gradient(135deg,#7c2d12,#ea580c)', innerIcon: '#fed7aa', check: (p) => !!p.rookieQuests?.spinDaily   },
  { id: 'ob_weeklywar',  name: 'Weekly Warrior', desc: 'Spun your first weekly quest wheel!',  cat: 'skill', tier: 1, Icon: Star,        innerBg: 'linear-gradient(135deg,#1e3a5f,#2563eb)', innerIcon: '#93c5fd', check: (p) => !!p.rookieQuests?.spinWeekly  },
  { id: 'ob_formfirst',  name: 'Form First',      desc: 'Logged 10 pucks in Technique Only mode to build fundamental power!', cat: 'skill', tier: 1, Icon: Zap,          innerBg: 'linear-gradient(135deg,#064e3b,#10b981)', innerIcon: '#6ee7b7', check: (p) => !!p.rookieQuests?.techniqueOnly10 },
  { id: 'ob_centurion',  name: 'Centurion',       desc: 'Completed your first 100-puck tracking set.',            cat: 'skill', tier: 1, Icon: Target,      innerBg: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', innerIcon: '#93c5fd', check: (p) => !!p.rookieQuests?.puckSet100    },
  { id: 'ob_firstblood', name: 'First Blood',     desc: 'Completed your first PUCK game.',                       cat: 'skill', tier: 1, Icon: Disc3,        innerBg: 'linear-gradient(135deg,#450a0a,#991b1b)', innerIcon: '#fca5a5', check: (p) => !!p.rookieQuests?.horseGame     },
  { id: 'ob_aroundrim',  name: 'Around the Rim',  desc: 'Completed your first Around the World game.',           cat: 'skill', tier: 1, Icon: Globe,         innerBg: 'linear-gradient(135deg,#134e4a,#0d9488)', innerIcon: '#99f6e4', check: (p) => !!p.rookieQuests?.aroundWorld   },
  { id: 'ob_gauntlet',   name: 'Gauntlet Thrown', desc: 'Issued a Quick Match challenge to a friend.',           cat: 'skill', tier: 1, Icon: Swords,        innerBg: 'linear-gradient(135deg,#2e1065,#7c3aed)', innerIcon: '#d8b4fe', check: (p) => !!p.rookieQuests?.issueChallenge},
  { id: 'ob_browsing',         name: 'Just Browsing',    desc: 'Visited the Store for the first time.',                               cat: 'skill', tier: 1, Icon: ShoppingBag, innerBg: 'linear-gradient(135deg,#064e3b,#059669)', innerIcon: '#6ee7b7', check: (p) => !!p.rookieQuests?.visitStore          },
  { id: 'ob_backhand_beauty', name: 'Backhand Beauty',  desc: 'Won a PUCK game while landing at least one Backhand setter shot.',  cat: 'games', tier: 2, Icon: Trophy,      innerBg: 'linear-gradient(135deg,#1e1b4b,#7c3aed)', innerIcon: '#c4b5fd', check: (p) => !!p.rookieQuests?.puck_backhand_win   },

  // ── Rookie Graduate ───────────────────────────────────────────────────────────
  { id: 'rookie_grad', name: 'Rookie Graduate', desc: 'Mastered the basics of the ice. Fully completed all onboarding milestones!', cat: 'skill', tier: 4, Icon: Award, innerBg: 'linear-gradient(135deg,#422006,#b45309)', innerIcon: '#fef08a', check: (p) => {
    if (!p.rookieQuests) return false
    const keys = ['puckSet100','horseGame','aroundWorld','issueChallenge','visitStore','techniqueOnly10','spinDaily','spinWeekly']
    return keys.every(k => p.rookieQuests[k])
  }},
]

// XP awarded to the player's bonusXP pool when a badge is newly unlocked.
// Keyed by tier so every new badge added to BADGES automatically inherits a reward.
const BADGE_TIER_XP = { 1: 5, 2: 10, 3: 25, 4: 50, 5: 100 }
export function getBadgeXP(badge) {
  return BADGE_TIER_XP[badge?.tier] ?? 5
}

export const BADGE_CATS = [
  { id: 'streak',    label: 'Streaks',                 Icon: Flame       },
  { id: 'bardown',   label: 'Bar Down',                Icon: Target      },
  { id: 'frame',     label: 'Frame Targets',           Icon: Crosshair   },
  { id: 'posts',     label: 'Posts',                   Icon: Award       },
  { id: 'volume',    label: 'Volume',                  Icon: Zap         },
  { id: 'time',      label: 'Time',                    Icon: Clock       },
  { id: 'skill',     label: 'Skill & Onboarding',      Icon: Award       },
  { id: 'challenge', label: 'Challenges',              Icon: CheckCircle },
  { id: 'ultra',     label: 'Ultra-Rare Achievements', Icon: Gem         },
  { id: 'games',     label: 'Around the World',        Icon: Gamepad2    },
]
