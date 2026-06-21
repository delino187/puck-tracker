import { LayoutDashboard, Target, Swords, Trophy, BarChart2, Award, Star, ShoppingBag, Flame } from 'lucide-react'

export const PLAYER_TABS = [
  { id: 'dashboard',  Icon: LayoutDashboard, label: 'Dash'    },
  { id: 'session',    Icon: Target,          label: 'Shoot'   },
  { id: 'challenges', Icon: Swords,          label: 'Versus'  },
  { id: 'quests',     Icon: Flame,           label: 'Quests'  },
  { id: 'store',      Icon: ShoppingBag,     label: 'Store'   },
  { id: 'board',      Icon: Trophy,          label: 'Board'   },
  { id: 'stats',      Icon: BarChart2,       label: 'Stats'   },
  { id: 'badges',     Icon: Award,           label: 'Badges'  },
  { id: 'ranks',      Icon: Star,            label: 'Ranks'   },
]

export default function TabBar({ active, onChange, hasSess, hasPendingVersus, hasPendingGames, hasClaimableQuests }) {
  return (
    <div style={{
      display: 'flex',
      background: '#0a0f1e',
      borderBottom: '2px solid #1e293b',
      position: 'sticky', top: 0, zIndex: 50,
      overflowX: 'auto',
      padding: '6px 4px',
      gap: 2,
      scrollbarWidth: 'none',
    }}>
      {PLAYER_TABS.map(t => {
        const sel = active === t.id

        const sessionDot = t.id === 'session'    && hasSess          && !hasPendingGames && !sel
        const versusDot  = t.id === 'challenges' && hasPendingVersus && !sel
        const gamesDot   = t.id === 'session'    && hasPendingGames  && !sel
        const questsDot  = t.id === 'quests'     && hasClaimableQuests && !sel

        const showDot   = sessionDot || versusDot || gamesDot || questsDot
        const urgentDot = versusDot  || gamesDot  || questsDot

        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex: '1 1 auto', minWidth: 52, maxWidth: 90,
              padding: '7px 6px 6px',
              background: sel
                ? 'linear-gradient(135deg,#1d3a6e,#1e40af)'
                : 'transparent',
              border: sel ? '1.5px solid #3b82f6' : '1.5px solid transparent',
              borderRadius: 10,
              cursor: 'pointer',
              color: sel ? '#ffffff' : '#64748b',
              position: 'relative',
              transition: 'color 0.15s, background 0.15s, border-color 0.15s',
              boxShadow: sel ? '0 0 14px #3b82f655, inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <t.Icon
                size={18}
                strokeWidth={sel ? 2.2 : 1.5}
                color={sel ? '#60a5fa' : '#475569'}
              />
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 10,
              marginTop: 3,
              fontWeight: sel ? 800 : 500,
              letterSpacing: sel ? '0.06em' : '0.03em',
              color: sel ? '#ffffff' : '#64748b',
              textShadow: sel ? '0 0 10px #3b82f688' : 'none',
            }}>
              {t.label}
            </div>

            {showDot && (
              <div
                className={urgentDot ? 'animate-pulse' : ''}
                style={{
                  position: 'absolute',
                  top:    urgentDot ? 4 : 5,
                  right:  urgentDot ? 4 : 5,
                  width:  urgentDot ? 8 : 6,
                  height: urgentDot ? 8 : 6,
                  borderRadius: '50%',
                  background: urgentDot
                    ? (questsDot ? '#fbbf24' : '#ef4444')
                    : '#f59e0b',
                  boxShadow: urgentDot
                    ? (questsDot ? '0 0 8px #fbbf24bb' : '0 0 8px #ef4444bb')
                    : 'none',
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
