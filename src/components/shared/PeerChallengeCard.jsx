import { useState, useEffect } from 'react'
import { Play, Clock, Trophy, Swords } from 'lucide-react'
import { ZONES } from '../../constants/zones.js'
import { formatCountdown } from '../../services/peerChallengeService.js'

export default function PeerChallengeCard({ challenge, playerId, onAccept }) {
  const [countdown, setCountdown] = useState(formatCountdown(challenge.expiresAt))
  const [showVideo,  setShowVideo]  = useState(false)

  useEffect(() => {
    const iv = setInterval(() => setCountdown(formatCountdown(challenge.expiresAt)), 10_000)
    return () => clearInterval(iv)
  }, [challenge.expiresAt])

  const isChallenger = challenge.challengerId === playerId
  const zoneName     = ZONES.find(z => z.id === challenge.zone)?.label ?? challenge.zone
  const expired      = Date.now() > challenge.expiresAt
  const completed    = challenge.status === 'completed'
  const won          = completed && challenge.winnerId === playerId
  const lost         = completed && challenge.winnerId !== playerId

  // ── Completed card ─────────────────────────────────────────────────────────
  if (completed) {
    return (
      <div style={{
        background: 'var(--card-bg)',
        border: `1px solid ${won ? '#22c55e44' : '#ef444444'}`,
        borderRadius: 14, padding: '16px 18px', marginBottom: 12,
        boxShadow: won ? '0 0 20px #22c55e12' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Trophy size={14} color={won ? '#22c55e' : '#ef4444'} />
          <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.06em', color: won ? '#22c55e' : '#ef4444' }}>
            {won ? 'CHALLENGE WON!' : 'CHALLENGE LOST'}
          </span>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
          {isChallenger ? challenge.receiverName : challenge.challengerName} · {zoneName}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: 'var(--text-muted)' }}>
          {challenge.challengerName} {challenge.challengerHits} · {challenge.receiverName} {challenge.receiverHits ?? '—'} hits
        </div>
      </div>
    )
  }

  // ── Challenger's outgoing card ─────────────────────────────────────────────
  if (isChallenger) {
    return (
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid #3b82f644',
        borderRadius: 14, padding: '16px 18px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Swords size={14} color="#3b82f6" />
          <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 18, letterSpacing: '0.06em', color: '#3b82f6' }}>
            CHALLENGE ISSUED
          </span>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: 'var(--text-1)', marginBottom: 4 }}>
          You challenged <strong>{challenge.receiverName}</strong> to match{' '}
          <strong>{challenge.challengerHits} hits</strong> in <strong>{zoneName}</strong>
        </div>

        {challenge.challengerVideo && (
          <button
            onClick={() => setShowVideo(v => !v)}
            style={{ background: 'transparent', border: '1px solid #3b82f644', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, marginBottom: showVideo ? 8 : 0, marginTop: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#60a5fa' }}
          >
            <Play size={11} /> {showVideo ? 'HIDE' : 'YOUR PROOF'}
          </button>
        )}
        {showVideo && challenge.challengerVideo && (
          <video src={challenge.challengerVideo} controls playsInline style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 200 }} />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}>
          <Clock size={11} color={expired ? '#ef4444' : '#94a3b8'} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: expired ? '#ef4444' : '#94a3b8', letterSpacing: '0.06em' }}>
            {expired ? 'EXPIRED — NO RESPONSE' : countdown}
          </span>
        </div>
      </div>
    )
  }

  // ── Receiver's incoming card ───────────────────────────────────────────────
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0f0c1a,#1a1030)',
      border: '2px solid #a855f755',
      borderRadius: 14, padding: '18px', marginBottom: 12,
      boxShadow: '0 0 28px #a855f714',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Swords size={16} color="#a855f7" />
        <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 22, letterSpacing: '0.08em', color: '#a855f7', textShadow: '0 0 20px #a855f755' }}>
          CHALLENGE INCOMING!
        </span>
      </div>

      <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 16, color: '#f1f5f9', marginBottom: 6, letterSpacing: '0.04em' }}>
        {challenge.challengerName} scored{' '}
        <span style={{ color: '#a855f7' }}>{challenge.challengerHits} HITS</span>{' '}
        in <span style={{ color: '#a855f7' }}>{zoneName.toUpperCase()}</span>
      </div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
        Match or beat {challenge.challengerHits} hits to win!
      </div>

      {challenge.challengerVideo && (
        <>
          <button
            onClick={() => setShowVideo(v => !v)}
            style={{ background: '#2e1065', border: '1px solid #a855f755', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: showVideo ? 10 : 12, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: '#d8b4fe', width: '100%', justifyContent: 'center' }}
          >
            <Play size={13} /> {showVideo ? 'HIDE PROOF VIDEO' : 'WATCH PROOF VIDEO ▶'}
          </button>
          {showVideo && (
            <video src={challenge.challengerVideo} controls playsInline style={{ width: '100%', borderRadius: 8, marginBottom: 12, maxHeight: 220 }} />
          )}
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Clock size={12} color={expired ? '#ef4444' : '#a855f7'} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: expired ? '#ef4444' : '#a855f7', letterSpacing: '0.08em' }}>
            {expired ? 'TIME EXPIRED' : countdown}
          </span>
        </div>
      </div>

      {!expired && (
        <button
          onClick={() => onAccept(challenge)}
          style={{ width: '100%', background: 'linear-gradient(135deg,#6b21a8,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.08em', cursor: 'pointer', boxShadow: '0 0 20px #a855f740' }}
        >
          ⚔️ ACCEPT CHALLENGE
        </button>
      )}
    </div>
  )
}
