import { CheckCircle, Zap, CalendarDays, Swords, AlertCircle, TrendingUp } from 'lucide-react'
import { ZONES } from '../../constants/zones.js'
import { getWeekStart } from '../../utils/stats.js'

export default function ChallengesTab({ player, sessions, dailyChallenge, weeklyChallenge, h2h, players }) {
  const ws    = getWeekStart()
  const today = new Date().toDateString()

  const todaySets = sessions.filter(s => s.playerId === player.id && new Date(s.date).toDateString() === today).flatMap(s => s.sets)
  const weekSets  = sessions.filter(s => s.playerId === player.id && new Date(s.date) >= ws).flatMap(s => s.sets)

  const isInH2H  = h2h && (h2h.p1 === player.id || h2h.p2 === player.id)
  const opp      = isInH2H ? players.find(p => p.id === (h2h.p1 === player.id ? h2h.p2 : h2h.p1)) : null
  const myShots  = isInH2H ? sessions.filter(s => s.playerId === player.id && new Date(s.date) >= ws).flatMap(s => s.sets).length * 10 : 0
  const oppShots = opp      ? sessions.filter(s => s.playerId === opp.id    && new Date(s.date) >= ws).flatMap(s => s.sets).length * 10 : 0

  const chs = [
    dailyChallenge  && { ch: dailyChallenge,  label: 'Daily Challenge',  sets: todaySets, xp: 50,  Icon: Zap,         color: '#f59e0b' },
    weeklyChallenge && { ch: weeklyChallenge, label: 'Weekly Challenge', sets: weekSets,  xp: 100, Icon: CalendarDays, color: '#60a5fa' },
  ].filter(Boolean)

  return (
    <div style={{ padding: '14px 16px 80px' }}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: 7 }}>
        Active Challenges
      </div>

      {chs.length === 0 && !isInH2H && (
        <div style={{ background: 'var(--card-bg)', borderRadius: 14, padding: '20px 18px', border: 'var(--card-border)', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, letterSpacing: '0.06em', marginBottom: 12 }}>
          No active challenges — check with your coach!
        </div>
      )}

      {chs.map(({ ch, label, sets, xp, Icon, color }) => {
        const hits   = sets.filter(s => s.zone === ch.zone).reduce((a, s) => a + s.hits, 0)
        const target = parseInt(ch.target) || 5
        const done   = hits >= target
        return (
          <div key={label} style={{ background: 'var(--card-bg)', borderRadius: 14, padding: '20px', border: `1px solid ${color}44`, marginBottom: 12 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={14} color={color} />
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color, letterSpacing: '0.14em' }}>{label.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', background: 'var(--progress-track)', border: 'var(--card-border)', borderRadius: 5, padding: '2px 7px', letterSpacing: '0.08em' }}>+{xp} XP</span>
                {done && <CheckCircle size={15} color="#34d399" />}
              </div>
            </div>

            {/* Primary metric */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                {ZONES.find(z => z.id === ch.zone)?.label}
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 36, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1 }}>
                {hits}<span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-muted)' }}>/{target}</span>
              </div>
            </div>

            <div style={{ height: 7, background: 'var(--progress-track)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, hits / target * 100)}%`, background: done ? '#22c55e' : color, borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
            {done && (
              <div style={{ marginTop: 10, color: '#34d399', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={13} /> Complete! +{xp} XP
              </div>
            )}
          </div>
        )
      })}

      {/* Head-to-head */}
      {isInH2H && opp && (
        <div style={{ background: 'var(--card-bg)', borderRadius: 14, padding: '20px', border: '1px solid #ef444444', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <Swords size={14} color="#ef4444" />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.14em' }}>HEAD-TO-HEAD THIS WEEK</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 800, color: myShots > oppShots ? '#fbbf24' : 'var(--text-1)' }}>{player.name} (you)</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 38, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>{myShots}</div>
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, color: '#475569' }}>VS</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 800, color: oppShots > myShots ? '#fbbf24' : 'var(--text-1)' }}>{opp.name}</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 38, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>{oppShots}</div>
            </div>
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, textAlign: 'center',
            color: myShots > oppShots ? '#34d399' : myShots < oppShots ? '#ef4444' : '#fbbf24',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
            {myShots > oppShots ? <><TrendingUp size={13} />You're leading!</> : myShots < oppShots ? <><AlertCircle size={13} />Time to put in work!</> : <>All tied up!</>}
          </div>
          <div style={{ color: '#94a3b8', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, textAlign: 'center', marginTop: 4 }}>+50 XP for winning</div>
        </div>
      )}
    </div>
  )
}
