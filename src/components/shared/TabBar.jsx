import { LayoutDashboard, Target, Swords, Trophy, BarChart2, Award, Star, Gamepad2, Flame } from 'lucide-react'

export const PLAYER_TABS = [
  { id: 'dashboard',  Icon: LayoutDashboard, label: 'Dash'           },  // Overview
  { id: 'session',    Icon: Target,          label: 'Shoot'          },  // Core Action
  { id: 'games',      Icon: Gamepad2,        label: 'Games'          },  // Secondary Action
  { id: 'challenges', Icon: Swords,          label: 'Versus'         },  // P2P Showdowns
  { id: 'streak',     Icon: Flame,           label: 'Streaks & Shop' },  // Progression & Economy (merged)
  { id: 'board',      Icon: Trophy,          label: 'Board'          },  // Social
  { id: 'stats',      Icon: BarChart2,       label: 'My Stats'       },  // Analytics
  { id: 'badges',     Icon: Award,           label: 'Badges'         },  // Achievements
  { id: 'ranks',      Icon: Star,            label: 'Ranks'          },  // Progression Tier
]

export default function TabBar({ active, onChange, hasSess }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', background: 'var(--nav-bg)',
      borderBottom: 'var(--nav-border)',
      position: 'sticky', top: 0, zIndex: 50, overflowX: 'auto',
    }}>
      {PLAYER_TABS.map(t => {
        const sel = active === t.id
        const dot = t.id === 'session' && hasSess && !sel
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex: '1 1 auto', minWidth: 52, maxWidth: 100, padding: '9px 8px 7px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: `2px solid ${sel ? '#3b82f6' : 'transparent'}`,
              color: sel ? '#3b82f6' : '#94a3b8',
              position: 'relative', transition: 'color 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <t.Icon size={15} strokeWidth={sel ? 2 : 1.5} />
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, marginTop: 2,
              fontWeight: sel ? 700 : 500, letterSpacing: '0.03em',
            }}>
              {t.label}
            </div>
            {dot && (
              <div style={{
                position: 'absolute', top: 5, right: 5, width: 5, height: 5,
                borderRadius: '50%', background: '#f59e0b',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
