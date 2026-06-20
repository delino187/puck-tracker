import { Plus, Clock, Trophy, Info, Swords } from 'lucide-react'
import { useState } from 'react'
import PeerChallengeCard from '../shared/PeerChallengeCard.jsx'
import RecordingTipsModal from '../overlays/RecordingTipsModal.jsx'

export default function ChallengesTab({
  player,
  players,
  sessions = [],
  peerChallenges = [],
  onCreateChallenge,
  onAcceptChallenge,
}) {
  const [showTips, setShowTips] = useState(false)

  const incoming  = peerChallenges.filter(c => c.receiverId   === player.id && c.status === 'pending')
  const outgoing  = peerChallenges.filter(c => c.challengerId === player.id && c.status === 'pending')
  const completed = peerChallenges.filter(c => c.status === 'completed').slice(0, 5)
  const hasActive = incoming.length > 0 || outgoing.length > 0

  // Compute overall career record from all completed challenges
  let totalWins = 0, totalLosses = 0, totalTies = 0
  for (const c of peerChallenges.filter(c => c.status === 'completed')) {
    if (!c.winnerId)                   totalTies++
    else if (c.winnerId === player.id) totalWins++
    else                               totalLosses++
  }
  const hasRecord = totalWins + totalLosses + totalTies > 0

  return (
    <div style={{ padding: '14px 16px 80px' }}>
      {showTips && <RecordingTipsModal onClose={() => setShowTips(false)} />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="text-3d-purple" style={{ fontFamily: "'Bangers',sans-serif", fontSize: 28, letterSpacing: '0.06em', lineHeight: 1 }}>
            ⚔️ VERSUS
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#f97316', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
            Peer Showdowns · 3 or 5 Shots
          </div>

          {/* ── Record pill — always shown, arcade lobby style ─────────────── */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginTop: 7,
            background: 'rgba(168,85,247,0.10)',
            border: '1px solid #a855f733',
            borderRadius: 10, padding: '5px 12px',
          }}>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              W
            </span>
            <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 17, letterSpacing: '0.06em', color: '#22c55e', textShadow: '0 0 8px #22c55e55' }}>
              {totalWins}
            </span>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#334155' }}>·</span>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              L
            </span>
            <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 17, letterSpacing: '0.06em', color: '#ef4444', textShadow: '0 0 8px #ef444455' }}>
              {totalLosses}
            </span>
            {hasRecord && totalTies > 0 && (
              <>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: '#334155' }}>·</span>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: '0.16em' }}>T</span>
                <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 17, letterSpacing: '0.06em', color: '#94a3b8' }}>{totalTies}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowTips(true)}
            style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11 }}
          >
            <Info size={12} /> TIPS
          </button>
          {players.length > 1 && (
            <button
              onClick={onCreateChallenge}
              className="animate-[bounce_2.5s_ease-in-out_infinite]"
              style={{ background: 'linear-gradient(135deg,#6b21a8,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.06em', boxShadow: '0 0 16px #a855f740' }}
            >
              <Plus size={14} /> ISSUE CHALLENGE
            </button>
          )}
        </div>
      </div>

      {/* ── Active Showdowns label ───────────────────────────────────────────── */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#a855f7', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Clock size={11} color="#a855f7" /> ACTIVE SHOWDOWNS
        {hasActive && (
          <span style={{ background: '#a855f7', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 9, fontWeight: 700, marginLeft: 4 }}>
            {incoming.length + outgoing.length}
          </span>
        )}
      </div>

      {/* ── Empty state — polished neon card ────────────────────────────────── */}
      {!hasActive && (
        <div className="shadow-[0_0_15px_rgba(168,85,247,0.4)]" style={{
          background: 'linear-gradient(135deg,#0f0c1a 0%,rgba(88,28,135,0.12) 50%,#0f0c1a 100%)',
          borderRadius: 16, padding: '32px 20px 28px',
          border: '1px solid #a855f755',
          textAlign: 'center', marginBottom: 20,
        }}>
          {/* Pulsing swords icon */}
          <div className="animate-pulse" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(168,85,247,0.12)', border: '1px solid #a855f744', marginBottom: 14 }}>
            <Swords size={30} color="#a855f7" />
          </div>

          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 24, color: '#a855f7', letterSpacing: '0.08em', marginBottom: 8, textShadow: '0 0 16px #a855f755' }}>
            NO ACTIVE SHOWDOWNS
          </div>

          {players.length > 1 ? (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#64748b', letterSpacing: '0.04em' }}>
              The ice is clear. Tap <strong style={{ color: '#a855f7' }}>ISSUE</strong> to call out a teammate!
            </div>
          ) : (
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#64748b' }}>
              Add more players to the roster to unlock showdowns.
            </div>
          )}
        </div>
      )}

      {/* Incoming first — most urgent */}
      {incoming.length > 0 && (
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#ef4444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, textShadow: '0 0 8px #ef444466' }}>
          🔥 WAITING ON YOU — YOUR TURN!
        </div>
      )}
      {incoming.map(c => (
        <PeerChallengeCard key={c.id} challenge={c} playerId={player.id} players={players} sessions={sessions} onAccept={onAcceptChallenge} />
      ))}

      {outgoing.length > 0 && (
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, marginTop: incoming.length > 0 ? 12 : 0 }}>
          ⏳ WAITING ON THEM
        </div>
      )}
      {outgoing.map(c => (
        <PeerChallengeCard key={c.id} challenge={c} playerId={player.id} players={players} sessions={sessions} onAccept={onAcceptChallenge} />
      ))}

      {/* ── Recent Results ───────────────────────────────────────────────────── */}
      {completed.length > 0 && (
        <>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10, marginTop: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trophy size={11} /> RECENT RESULTS
          </div>
          {completed.map(c => (
            <PeerChallengeCard key={c.id} challenge={c} playerId={player.id} onAccept={() => {}} />
          ))}
        </>
      )}

      {/* ── Global Rivals / Recent History — placeholder grid ─────────────── */}
      {!hasActive && completed.length === 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800, color: '#475569', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trophy size={10} color="#475569" /> ✨ GLOBAL RIVALS / RECENT HISTORY
          </div>
          {[0.55, 0.35, 0.18].map((opacity, i) => (
            <div key={i} style={{
              background: 'linear-gradient(135deg,rgba(168,85,247,0.06),rgba(88,28,135,0.04))',
              border: '1px solid rgba(168,85,247,0.12)',
              borderRadius: 12, padding: '14px 16px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 12,
              opacity,
            }}>
              {/* Avatar placeholder */}
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 10, borderRadius: 5, background: 'rgba(168,85,247,0.15)', width: `${55 + i * 15}%` }} />
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(168,85,247,0.08)', width: `${35 + i * 10}%` }} />
              </div>
              <div style={{ width: 32, height: 20, borderRadius: 6, background: 'rgba(168,85,247,0.10)' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty roster notice ──────────────────────────────────────────────── */}
      {players.length <= 1 && (
        <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: '16px 18px', border: 'var(--card-border)', marginTop: 8 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-1)' }}>Peer showdowns require 2+ players.</strong>{' '}
            Ask your coach to add teammates to the roster so you can start issuing challenges.
          </div>
        </div>
      )}
    </div>
  )
}
