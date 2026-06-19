import { BADGES } from '../../constants/badges.js'

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#ef4444','#10b981','#f97316','#06b6d4']

function nameColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60_000)
  if (m < 2)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function buildFeed(players, sessions) {
  const events  = []
  const sessCut = Date.now() - 48 * 60 * 60 * 1000
  const badgeCut = Date.now() - 7  * 24 * 60 * 60 * 1000

  // Recent sessions
  sessions
    .filter(s => s.sets?.length > 0 && new Date(s.date).getTime() > sessCut)
    .forEach(s => {
      const p = players.find(x => x.id === s.playerId)
      if (!p) return
      const shots = s.sets.length * 10
      const hits  = s.sets.reduce((a, x) => a + x.hits, 0)
      const acc   = shots > 0 ? (hits / shots * 100) : 0
      const fiery = acc >= 75 && shots >= 30
      events.push({
        ts:   new Date(s.date).getTime(),
        pid:  s.playerId,
        name: p.name,
        icon: fiery ? '🔥' : '🏒',
        text: fiery
          ? `dropped ${shots} shots at ${acc.toFixed(0)}% accuracy`
          : `logged ${shots} shots`,
      })
    })

  // Recent badge earnings
  players.forEach(p => {
    Object.entries(p.earnedBadges || {}).forEach(([id, data]) => {
      if (!data?.ts || data.ts < badgeCut) return
      const badge = BADGES.find(b => b.id === id)
      if (!badge) return
      events.push({
        ts:    data.ts,
        pid:   p.id,
        name:  p.name,
        icon:  '🏆',
        text:  'earned',
        badge,
      })
    })
  })

  return events.sort((a, b) => b.ts - a.ts).slice(0, 6)
}

export default function LiveFeed({ players, sessions, currentPlayerId, onBadgeClick }) {
  const feed = buildFeed(players, sessions)
  if (feed.length === 0) return null

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 14, padding: '16px 18px', border: 'var(--card-border)', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
        <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: '#22c55e', letterSpacing: '0.08em' }}>
          LIVE FEED
        </span>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#334155', marginLeft: 4, letterSpacing: '0.06em' }}>
          TEAM ACTIVITY
        </span>
      </div>

      {feed.map((ev, i) => {
        const isMe = ev.pid === currentPlayerId
        const bg   = nameColor(ev.name)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < feed.length - 1 ? '1px solid #0f172a' : 'none' }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bangers',sans-serif", fontSize: 15, color: '#fff', letterSpacing: '0.02em',
              boxShadow: isMe ? `0 0 10px ${bg}88` : 'none',
              border: isMe ? `2px solid ${bg}` : '2px solid transparent',
            }}>
              {ev.name[0].toUpperCase()}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: isMe ? '#f1f5f9' : 'var(--text-1)' }}>
                {isMe ? 'You' : ev.name}
              </span>
              <span style={{ fontFamily: 'Barlow,sans-serif', fontSize: 12, color: '#64748b' }}>
                {ev.badge ? (
                  <> earned{' '}
                    <button
                      onClick={e => { e.stopPropagation(); onBadgeClick?.(ev.badge, true) }}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#fbbf24', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 700, textDecoration: 'underline dotted', textUnderlineOffset: 2 }}
                    >
                      "{ev.badge.name}"
                    </button>
                  </>
                ) : (
                  <> {ev.text}</>
                )}
              </span>
            </div>

            {/* Icon + time */}
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 14, lineHeight: 1, marginBottom: 2 }}>{ev.icon}</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#334155', letterSpacing: '0.06em' }}>
                {timeAgo(ev.ts)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
