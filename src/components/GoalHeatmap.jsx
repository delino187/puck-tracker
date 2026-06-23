import { Star, TrendingUp } from 'lucide-react'
import { ZONES } from '../constants/zones.js'
import { heatColor } from '../utils/heatColor.js'
import { playerStats } from '../utils/stats.js'
import { C } from '../styles.js'
import StatCard from './shared/StatCard.jsx'
import XPBar from './shared/XPBar.jsx'
import NetSVG from './net/NetSVG.jsx'
import HeatLegend from './net/HeatLegend.jsx'
import { useAppStore } from '../store/useAppStore.js'
import { usePlayer } from '../context/PlayerContext.jsx'

export default function GoalHeatmap() {
  const { activePlayer: player, st } = usePlayer()
  const techBonusXP = useAppStore(s => s.techniqueByPlayer[player?.id]?.bonusXP ?? 0)
  const stats = playerStats(player, st.sessions, techBonusXP)
  const sessions = st.sessions

  // Filter sessions belonging to this player, excluding any with a missing or
  // invalid date — old/corrupted docs should never cause a render crash.
  const pss = sessions
    .filter(s => s.playerId === player.id && s.date && !isNaN(new Date(s.date)))
    // Sort chronologically so .slice(-10) reliably gives the 10 most recent
    // sessions regardless of the order they arrived from the Firestore merge.
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const hist = pss.map(s => {
    const sets = s.sets || []
    const hits = sets.reduce((a, x) => a + (x.hits ?? 0), 0)
    const sh   = s.source === 'atw' ? hits : sets.length * 10
    return { d: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), sh }
  }).slice(-10)
  const maxSh = Math.max(...hist.map(d => d.sh), 10)

  const best = ZONES.reduce((b, z) =>
    stats.zoneStats[z.id]?.shots > 0 && (!b || stats.zoneStats[z.id].acc > stats.zoneStats[b.id].acc) ? z : b, null)
  const weak = ZONES.reduce((w, z) =>
    stats.zoneStats[z.id]?.shots > 0 && (!w || stats.zoneStats[z.id].acc < stats.zoneStats[w.id].acc) ? z : w, null)

  // Show a friendly placeholder only when player has logged zero sessions ever.
  // Sessions with empty sets still display with 0 accuracy as a data point.
  if (pss.length === 0) {
    return (
      <div style={{ padding: '14px 16px 80px' }}>
        <div style={{
          ...C.card, textAlign: 'center',
          padding: '40px 24px',
          background: 'linear-gradient(135deg,#080b14,#0f1628)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>🏒</div>
          <div style={{
            fontFamily: "'Bangers',sans-serif", fontSize: 26,
            color: '#60a5fa', letterSpacing: '0.08em', marginBottom: 8,
          }}>
            NO TARGET PRACTICE YET
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14,
            color: '#64748b', lineHeight: 1.6,
          }}>
            Log a Target Practice session to see<br />
            your zone heatmap and accuracy stats here.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 16px 80px' }}>
      {/* Career totals */}
      <div style={C.card}>
        <div style={C.label}>Career Accuracy Totals</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          <StatCard label="Shots"    value={stats.totalShots}                                               color="#60a5fa" />
          <StatCard label="Hits"     value={stats.totalHits}                                                color="#34d399" />
          <StatCard label="Accuracy" value={stats.totalShots > 0 ? stats.acc.toFixed(1) + '%' : '—'}       color="#fbbf24" />
        </div>
        <XPBar li={stats.li} xp={stats.xp} />
      </div>

      {/* Heatmap SVG */}
      <div style={C.card}>
        <div style={C.label}>Zone Heat Map</div>
        <div style={{ position: 'relative', width: '100%', paddingBottom: '70%', marginBottom: 12 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,26,0.7)', borderRadius: 10, border: '1px solid #1e3a5f', overflow: 'hidden' }}>
            <NetSVG heatData={stats.zoneStats} />
          </div>
        </div>
        <HeatLegend />
      </div>

      {/* Zone breakdown */}
      <div style={C.card}>
        <div style={C.label}>Zone Breakdown</div>
        {ZONES.map(z => {
          const d = stats.zoneStats[z.id]
          if (!d || d.shots === 0) {
            return (
              <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #0f172a' }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", color: '#94a3b8', fontSize: 13 }}>{z.label}</span>
                <span style={{ color: '#475569', fontSize: 12 }}>No data</span>
              </div>
            )
          }
          const { fill } = heatColor(d.acc, true)
          return (
            <div key={z.id} style={{ padding: '6px 0', borderBottom: 'var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", color: 'var(--text-1)', fontSize: 13, fontWeight: 700 }}>{z.label}</span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{d.acc.toFixed(0)}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--progress-track)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${d.acc}%`, background: fill, borderRadius: 3 }} />
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{d.hits}/{d.shots} hits · {d.sets} sets</div>
            </div>
          )
        })}
      </div>

      {/* Best / weak zone cards */}
      {(best || weak) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {best && (
            <div style={{ background: 'var(--card-bg)', borderRadius: 10, padding: 12, border: '1px solid #22c55e44', textAlign: 'center' }}>
              <Star size={16} color="#34d399" style={{ marginBottom: 3 }} />
              <div style={{ color: '#34d399', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', margin: '3px 0' }}>BEST ZONE</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{best.label}</div>
              <div className="stat-label" style={{ color: '#34d399' }}>{stats.zoneStats[best.id]?.acc.toFixed(0)}%</div>
            </div>
          )}
          {weak && (
            <div style={{ background: 'var(--card-bg)', borderRadius: 10, padding: 12, border: '1px solid #ef444444', textAlign: 'center' }}>
              <TrendingUp size={16} color="#ef4444" style={{ marginBottom: 3 }} />
              <div style={{ color: '#ef4444', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', margin: '3px 0' }}>WORK ON</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{weak.label}</div>
              <div className="stat-label" style={{ color: '#ef4444' }}>{stats.zoneStats[weak.id]?.acc.toFixed(0)}%</div>
            </div>
          )}
        </div>
      )}

      {/* Shot history bar chart — render even single day so yesterday's accuracy shows */}
      {hist.length >= 1 && (
        <div style={C.card}>
          <div style={C.label}>Shot History</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 72, marginBottom: 4 }}>
            {hist.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ fontSize: 8, color: '#94a3b8', marginBottom: 2 }}>{d.sh}</div>
                <div style={{ width: '100%', height: `${Math.max(4, d.sh / maxSh * 64)}px`, background: '#3b82f6', borderRadius: '2px 2px 0 0', opacity: 0.7 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {hist.map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', color: '#94a3b8', fontSize: 8, overflow: 'hidden' }}>{d.d}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
