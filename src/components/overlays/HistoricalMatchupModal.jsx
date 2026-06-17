import { useState, useEffect } from 'react'
import { db } from '../../firebase.js'
import { collection, query, where, getDocs } from 'firebase/firestore'
import Avatar from '../shared/Avatar.jsx'

const TEAM_ID = 'team_main'

export default function HistoricalMatchupModal({ player, opponent, onClose }) {
  const [status, setStatus] = useState('loading')  // 'loading' | 'done' | 'error'
  const [record, setRecord] = useState({ wins: 0, losses: 0, ties: 0, total: 0 })

  useEffect(() => {
    if (!player?.id || !opponent?.id) return

    const col = collection(db, 'teams', TEAM_ID, 'peerChallenges')

    // Firestore doesn't support OR across different field pairs, so run two
    // targeted queries and merge the results client-side.
    const q1 = query(col,
      where('challengerId', '==', player.id),
      where('receiverId',   '==', opponent.id),
      where('status',       '==', 'completed'),
    )
    const q2 = query(col,
      where('challengerId', '==', opponent.id),
      where('receiverId',   '==', player.id),
      where('status',       '==', 'completed'),
    )

    Promise.all([getDocs(q1), getDocs(q2)])
      .then(([s1, s2]) => {
        const all = [...s1.docs, ...s2.docs].map(d => d.data())
        let wins = 0, losses = 0, ties = 0
        for (const c of all) {
          if (!c.winnerId)              ties++
          else if (c.winnerId === player.id) wins++
          else                          losses++
        }
        setRecord({ wins, losses, ties, total: all.length })
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [player?.id, opponent?.id])

  return (
    // Backdrop — click to dismiss
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px',
      }}
    >
      {/* Card — stop propagation so clicking inside doesn't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          background: 'linear-gradient(160deg,#0f0c1a,#1a1030)',
          border: '2px solid #a855f755',
          borderRadius: 20,
          padding: '28px 24px 32px',
          boxShadow: '0 0 60px #a855f722, 0 24px 48px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'transparent', border: '1px solid #334155',
            borderRadius: 8, width: 30, height: 30,
            color: '#64748b', cursor: 'pointer', fontSize: 16, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div style={{
          fontFamily: "'Bangers',sans-serif", fontSize: 14,
          letterSpacing: '0.18em', color: '#64748b',
          textAlign: 'center', marginBottom: 22,
          textTransform: 'uppercase',
        }}>
          Head to Head
        </div>

        {/* Three-column matchup layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>

          {/* Left — current player */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar player={player} size={64} className="arcade-glow" />
            <span style={{
              fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.04em',
              color: '#f1f5f9', textAlign: 'center', lineHeight: 1.2,
              maxWidth: 90, wordBreak: 'break-word',
            }}>
              {player.name}
            </span>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#3b82f6', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              YOU
            </span>
          </div>

          {/* Center — W - L - T record */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {status === 'loading' && (
              <div style={{ width: 20, height: 20, border: '2px solid #a855f7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            )}
            {status === 'error' && (
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#ef4444' }}>Error</span>
            )}
            {status === 'done' && (
              <>
                <div className="text-3d-purple" style={{ fontFamily: "'Bangers',sans-serif", fontSize: 38, letterSpacing: '0.04em', lineHeight: 1, whiteSpace: 'nowrap' }}>
                  {record.wins} – {record.losses}
                  {record.ties > 0 && ` – ${record.ties}`}
                </div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.5 }}>
                  {record.wins === 0 && record.losses === 0
                    ? 'No matches yet'
                    : `${record.total} match${record.total !== 1 ? 'es' : ''}`}
                  {'\n'}
                  {record.ties > 0 && 'W – L – T'}
                  {record.ties === 0 && record.total > 0 && 'W – L'}
                </div>
              </>
            )}
          </div>

          {/* Right — opponent */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar player={opponent} size={64} className="arcade-glow" />
            <span style={{
              fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.04em',
              color: '#f1f5f9', textAlign: 'center', lineHeight: 1.2,
              maxWidth: 90, wordBreak: 'break-word',
            }}>
              {opponent.name}
            </span>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#a855f7', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              OPP
            </span>
          </div>
        </div>

        {/* Win-rate bar (only when there's history) */}
        {status === 'done' && record.total > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ height: 6, borderRadius: 3, background: '#1e293b', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(record.wins / record.total) * 100}%`,
                background: 'linear-gradient(90deg,#3b82f6,#a855f7)',
                transition: 'width 0.6s ease-out',
                borderRadius: 3,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#3b82f6' }}>
                {record.total > 0 ? `${Math.round(record.wins / record.total * 100)}% win rate` : ''}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#a855f7' }}>
                {record.losses} loss{record.losses !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
