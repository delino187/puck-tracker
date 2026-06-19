import { Plus, Swords, Clock, Trophy, Info } from 'lucide-react'
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
  const [audioMuted, setAudioMuted] = useState(
    () => localStorage.getItem('appAudioMuted') === 'true'
  )

  function handleMuteToggle() {
    const nowMuted = !audioMuted
    setAudioMuted(nowMuted)
    try { localStorage.setItem('appAudioMuted', String(nowMuted)) } catch {}
  }

  const incoming  = peerChallenges.filter(c => c.receiverId   === player.id && c.status === 'pending')
  const outgoing  = peerChallenges.filter(c => c.challengerId === player.id && c.status === 'pending')
  const completed = peerChallenges.filter(c => c.status === 'completed').slice(0, 5)
  const hasActive = incoming.length > 0 || outgoing.length > 0

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
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleMuteToggle}
            title={audioMuted ? 'Unmute audio' : 'Mute audio'}
            style={{
              background: audioMuted ? 'rgba(15,23,42,0.7)' : 'rgba(168,85,247,0.12)',
              border: `1px solid ${audioMuted ? '#334155' : '#a855f744'}`,
              borderRadius: 8, padding: '4px 9px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9,
              fontWeight: 800, letterSpacing: '0.1em',
              color: audioMuted ? '#475569' : '#a855f7',
              transition: 'all 0.15s',
            }}
          >
            <span>{audioMuted ? '🔇' : '🎵'}</span>
            <span>{audioMuted ? 'OFF' : 'ON'}</span>
          </button>
          <button
            onClick={() => setShowTips(true)}
            style={{ background: 'transparent', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11 }}
          >
            <Info size={12} /> TIPS
          </button>
          {players.length > 1 && (
            <button
              onClick={onCreateChallenge}
              style={{ background: 'linear-gradient(135deg,#6b21a8,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.06em', boxShadow: '0 0 16px #a855f740' }}
            >
              <Plus size={14} /> ISSUE CHALLENGE
            </button>
          )}
        </div>
      </div>

      {/* ── Active Showdowns ─────────────────────────────────────────────────── */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#a855f7', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Clock size={11} color="#a855f7" /> ACTIVE SHOWDOWNS
        {hasActive && (
          <span style={{ background: '#a855f7', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 9, fontWeight: 700, marginLeft: 4 }}>
            {incoming.length + outgoing.length}
          </span>
        )}
      </div>

      {!hasActive && (
        <div style={{ background: 'linear-gradient(135deg,#0f0c1a,#1a1030)', borderRadius: 14, padding: '28px 20px', border: '1px dashed #a855f733', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚔️</div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, color: '#a855f7', letterSpacing: '0.06em', marginBottom: 6 }}>
            NO ACTIVE SHOWDOWNS
          </div>
          {players.length > 1
            ? <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#64748b' }}>
                Tap <strong style={{ color: '#a855f7' }}>ISSUE</strong> to call out a teammate!
              </div>
            : <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#64748b' }}>
                Add more players to the roster to unlock showdowns.
              </div>
          }
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

      {/* ── Empty roster ─────────────────────────────────────────────────────── */}
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
