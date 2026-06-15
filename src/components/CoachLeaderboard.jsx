import { useState } from 'react'
import { Trophy, TrendingUp, Target, FlaskConical, X, ChevronRight } from 'lucide-react'
import { LEVELS } from '../constants/levels.js'
import { playerStats, calcXP } from '../utils/stats.js'
import GoalHeatmap from './GoalHeatmap.jsx'

// ── Podium accent palette ──────────────────────────────────────────────────────
const PODIUM = [
  { medal: '🥇', border: '#fbbf24', text: '#fbbf24', bg: 'rgba(251,191,36,0.07)'  },
  { medal: '🥈', border: '#cbd5e1', text: '#cbd5e1', bg: 'rgba(203,213,225,0.05)' },
  { medal: '🥉', border: '#b45309', text: '#b45309', bg: 'rgba(180,83,9,0.08)'    },
]

// ── Zone stat builder (hits, shots → { hits, shots, acc, sets }) ───────────────
function zs(hits, shots) {
  return { hits, shots, acc: shots > 0 ? (hits / shots) * 100 : 0, sets: Math.round(shots / 10) }
}

// ── Mock roster with DISTINCT zone tendencies ─────────────────────────────────
const MOCK = [
  {
    id: 'm1', name: 'Connor M.', jerseyNum: '97', shots: 1200, acc: 68.2, li: 8,
    // ── Top-Left corner specialist
    zoneStats: {
      top_left:    zs(246, 300),   // 82% 🔥
      top_right:   zs(132, 200),   // 66%
      bar_down:    zs(108, 150),   // 72%
      left_post:   zs(67,  120),   // 56%
      right_post:  zs(70,  120),   // 58%
      low_glove:   zs(72,  120),   // 60%
      low_blocker: zs(78,  120),   // 65%
    },
  },
  {
    id: 'm2', name: 'Sidney C.', jerseyNum: '87', shots: 890, acc: 72.1, li: 5,
    // ── Bar Down sniper — elite accuracy across all zones
    zoneStats: {
      top_left:    zs(109, 145),   // 75%
      top_right:   zs(106, 145),   // 73%
      bar_down:    zs(176, 200),   // 88% 🔥
      left_post:   zs(77,  110),   // 70%
      right_post:  zs(72,  110),   // 65%
      low_glove:   zs(79,  110),   // 72%
      low_blocker: zs(48,   70),   // 69%
    },
  },
  {
    id: 'm3', name: 'Patrick K.', jerseyNum: '88', shots: 620, acc: 61.4, li: 4,
    // ── Low Blocker (bottom-right) dominant
    zoneStats: {
      top_left:    zs(36,  80),    // 45% ❄️
      top_right:   zs(38,  80),    // 48%
      bar_down:    zs(44,  80),    // 55%
      left_post:   zs(52,  90),    // 58%
      right_post:  zs(54,  90),    // 60%
      low_glove:   zs(47,  90),    // 52%
      low_blocker: zs(82, 100),    // 82% 🔥
    },
  },
  {
    id: 'm4', name: 'Auston M.', jerseyNum: '34', shots: 450, acc: 54.7, li: 3,
    // ── Bar Down + Top-Right focus, raw low zones
    zoneStats: {
      top_left:    zs(34,  70),    // 49%
      top_right:   zs(54,  80),    // 68%
      bar_down:    zs(75, 100),    // 75% 🔥
      left_post:   zs(27,  60),    // 45%
      right_post:  zs(29,  60),    // 48%
      low_glove:   zs(13,  40),    // 33% ❄️
      low_blocker: zs(13,  40),    // 33% ❄️
    },
  },
  {
    id: 'm5', name: 'Nathan M.', jerseyNum: '29', shots: 310, acc: 49.3, li: 1,
    // ── Beginner, slight Low Glove edge, inconsistent everywhere
    zoneStats: {
      top_left:    zs(21,  50),    // 42%
      top_right:   zs(20,  50),    // 40%
      bar_down:    zs(19,  50),    // 38% ❄️
      left_post:   zs(24,  50),    // 48%
      right_post:  zs(25,  50),    // 50%
      low_glove:   zs(23,  40),    // 58% (best)
      low_blocker: zs(21,  40),    // 53%
    },
  },
  {
    id: 'm6', name: 'Alex O.', jerseyNum: '8', shots: 85, acc: 41.8, li: 0,
    // ── Brand new player — barely any data, cold map
    zoneStats: {
      top_left:    zs(8,  20),     // 40%
      top_right:   zs(7,  20),     // 35%
      bar_down:    zs(3,  10),     // 30% ❄️
      left_post:   zs(5,  10),     // 50%
      right_post:  zs(9,  20),     // 45%
      low_glove:   zs(2,   5),     // 40%
      low_blocker: zs(0,   0),     // no data
    },
  },
]

// ── Column widths ─────────────────────────────────────────────────────────────
const COLS = '36px 1fr 96px 68px 54px 18px'

// ── Build GoalHeatmap props from a leaderboard row ────────────────────────────
function buildHeatmapProps(row, st, isMock) {
  if (!isMock) {
    const real = st.players.find(p => p.id === row.id)
    if (!real) return null
    return { player: real, stats: playerStats(real, st.sessions), sessions: st.sessions }
  }
  const totalHits = Math.round(row.shots * row.acc / 100)
  return {
    player:   { id: row.id, name: row.name },
    sessions: [],   // empty → no shot-history bar chart, no errors
    stats: {
      totalShots: row.shots,
      totalHits,
      acc:        row.acc,
      li:         row.li,
      xp:         calcXP(row.shots, totalHits),
      zoneStats:  row.zoneStats || {},
    },
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function HeaderCell({ children, onClick, active, align = 'left' }) {
  return (
    <div
      onClick={onClick}
      style={{
        fontFamily:    "'Barlow Condensed',sans-serif",
        fontSize:      10, fontWeight: 700, letterSpacing: '0.12em',
        color:         active ? '#60a5fa' : '#6b7280',
        textTransform: 'uppercase',
        textAlign:     align,
        cursor:        onClick ? 'pointer' : 'default',
        userSelect:    'none',
        padding:       '8px 6px',
        borderBottom:  '1px solid #1e3a5f',
      }}
    >
      {children}{active && ' ↓'}
    </div>
  )
}

function RankCell({ rank }) {
  const p = PODIUM[rank - 1]
  if (p) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{p.medal}</div>
  return <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: '#475569', textAlign: 'center' }}>{rank}</div>
}

function TierCell({ li }) {
  const level = LEVELS[li] || LEVELS[0]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${level.color}55`, background: level.bg }}>
        <img src={level.img} alt={level.name} className="rounded-full object-cover" style={{ width: '100%', height: '100%', transform: 'scale(1.08)' }} />
      </div>
      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: level.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {level.name}
      </span>
    </div>
  )
}

// ── Player Detail Modal ───────────────────────────────────────────────────────
function PlayerModal({ row, heatmapProps, onClose }) {
  const level = LEVELS[row.li] || LEVELS[0]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2500,
        background: 'rgba(4,9,20,0.92)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 500, minHeight: '100%', background: 'linear-gradient(160deg,#0a0f1a,#0d1628)' }}>

        {/* ── Modal header ─────────────────────────────────────────────── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(10,15,26,0.97)',
          borderBottom: '1px solid #1e3a5f',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {/* Rank image */}
          <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${level.color}`, boxShadow: `0 0 14px ${level.glow}55`, background: level.bg }}>
            <img src={level.img} alt={level.name} className="rounded-full object-cover" style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
              {row.name}{row.jerseyNum ? <span style={{ color: '#60a5fa' }}> #{row.jerseyNum}</span> : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: level.color }}>
                {level.name}
              </span>
              <span style={{ color: '#475569', fontSize: 11 }}>·</span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#94a3b8' }}>
                {row.shots.toLocaleString()} shots · {row.acc.toFixed(1)}% acc
              </span>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '6px', cursor: 'pointer', display: 'flex', color: '#94a3b8', flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── GoalHeatmap ──────────────────────────────────────────────── */}
        {heatmapProps
          ? <GoalHeatmap player={heatmapProps.player} stats={heatmapProps.stats} sessions={heatmapProps.sessions} />
          : (
            <div style={{ padding: 32, textAlign: 'center', color: '#475569', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14 }}>
              No data available for this player.
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Main Leaderboard ──────────────────────────────────────────────────────────
export default function CoachLeaderboard({ st }) {
  const [sort,           setSort]           = useState('volume')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [hoveredRow,     setHoveredRow]     = useState(null)

  const isMock = !st?.players?.length

  const rows = isMock
    ? MOCK
    : st.players.map(p => {
        const s = playerStats(p, st.sessions)
        return { id: p.id, name: p.name, jerseyNum: p.jerseyNum || '', shots: s.totalShots, acc: s.acc, li: s.li, zoneStats: s.zoneStats }
      })

  const sorted = [...rows].sort((a, b) =>
    sort === 'volume' ? b.shots - a.shots : b.acc - a.acc
  )

  function handleRowClick(row) {
    setSelectedPlayer(row)
  }

  return (
    <>
      {/* ── Player detail modal ─────────────────────────────────────────── */}
      {selectedPlayer && (
        <PlayerModal
          row={selectedPlayer}
          heatmapProps={buildHeatmapProps(selectedPlayer, st, isMock)}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      <div style={{ paddingBottom: 40 }}>
        {/* ── Card header ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={16} color="#f59e0b" />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.06em' }}>
              TEAM LEADERBOARD
            </span>
          </div>
          {isMock && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '3px 8px' }}>
              <FlaskConical size={10} color="#6b7280" />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#6b7280', letterSpacing: '0.1em' }}>SAMPLE DATA</span>
            </div>
          )}
        </div>

        {/* ── Sort toggle ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[
            { key: 'volume',   label: 'Most Pucks',       Icon: TrendingUp },
            { key: 'accuracy', label: 'Highest Accuracy', Icon: Target     },
          ].map(({ key, label, Icon }) => {
            const active = sort === key
            return (
              <button key={key} onClick={() => setSort(key)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 10px', background: active ? '#1e3a5f' : '#0f172a', color: active ? '#60a5fa' : '#6b7280', border: `1px solid ${active ? '#3b82f6' : '#334155'}`, borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s' }}>
                <Icon size={12} /> {label}
              </button>
            )
          })}
        </div>

        {/* ── Tap hint ─────────────────────────────────────────────────── */}
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#334155', letterSpacing: '0.1em', textAlign: 'right', marginBottom: 6 }}>
          TAP A PLAYER TO VIEW HEATMAP →
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '0 10px', background: '#172032' }}>
            <HeaderCell align="center">#</HeaderCell>
            <HeaderCell>Player</HeaderCell>
            <HeaderCell>Tier</HeaderCell>
            <HeaderCell onClick={() => setSort('volume')}   active={sort === 'volume'}   align="right">Pucks</HeaderCell>
            <HeaderCell onClick={() => setSort('accuracy')} active={sort === 'accuracy'} align="right">Acc</HeaderCell>
            <div />
          </div>

          {/* Data rows */}
          {sorted.map((row, i) => {
            const rank    = i + 1
            const podium  = PODIUM[i]
            const isHov   = hoveredRow === row.id
            const label   = row.jerseyNum ? `${row.name} #${row.jerseyNum}` : row.name

            return (
              <div
                key={row.id}
                onClick={() => handleRowClick(row)}
                onMouseEnter={() => setHoveredRow(row.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  display:    'grid',
                  gridTemplateColumns: COLS,
                  alignItems: 'center',
                  padding:    '10px 10px',
                  cursor:     'pointer',
                  background: isHov
                    ? 'rgba(59,130,246,0.12)'
                    : podium
                      ? podium.bg
                      : i % 2 === 0 ? 'rgba(30,41,59,0.5)' : 'rgba(15,23,42,0.4)',
                  borderLeft:   podium ? `3px solid ${podium.border}` : '3px solid transparent',
                  borderBottom: i < sorted.length - 1 ? '1px solid #1e3a5f' : 'none',
                  transition:   'background 0.12s, filter 0.12s',
                  filter:       isHov ? 'brightness(1.08)' : 'none',
                  userSelect:   'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <RankCell rank={rank} />

                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: isHov ? '#93c5fd' : podium ? podium.text : '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 4, transition: 'color 0.12s' }}>
                  {label}
                </div>

                <TierCell li={row.li} />

                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, color: sort === 'volume' ? '#60a5fa' : '#cbd5e1', textAlign: 'right' }}>
                  {row.shots.toLocaleString()}
                </div>

                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: sort === 'accuracy' ? '#34d399' : '#94a3b8', textAlign: 'right' }}>
                  {row.acc.toFixed(1)}%
                </div>

                {/* Drill-down affordance */}
                <div style={{ display: 'flex', justifyContent: 'center', opacity: isHov ? 1 : 0.3, transition: 'opacity 0.12s' }}>
                  <ChevronRight size={12} color="#60a5fa" />
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#475569', letterSpacing: '0.08em' }}>
            {sorted.length} PLAYER{sorted.length !== 1 ? 'S' : ''} · {isMock ? 'SAMPLE' : 'LIVE DATA'}
          </span>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#475569' }}>
            {sort === 'volume' ? 'SORTED BY VOLUME' : 'SORTED BY ACCURACY'}
          </span>
        </div>
      </div>
    </>
  )
}
