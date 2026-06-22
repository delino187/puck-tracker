import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import {
  loadDisputedMatches,
  resolveDisputedChallenge,
  resolveDisputedPuckGame,
} from '../services/disputeService.js'
import { C } from '../styles.js'

const PUCK_LETTERS = ['P', 'U', 'C', 'K']

// ── Versus dispute card ───────────────────────────────────────────────────────
function VersusDisputeCard({ match, onResolved }) {
  const [resolving, setResolving] = useState(null)  // 'challengerId' | 'receiverId' | null
  const [toast,     setToast]     = useState(null)

  async function handleResolve(winnerId, winnerName) {
    setResolving(winnerId)
    try {
      await resolveDisputedChallenge(match, winnerId, 'Coach')
      setToast({ ok: true, msg: `✅ Win awarded to ${winnerName}. ELO corrected.` })
      setTimeout(() => onResolved(match.id), 2200)
    } catch (err) {
      console.error('[Dispute] resolve failed:', err)
      setToast({ ok: false, msg: '⚠️ Resolution failed — check connection.' })
      setResolving(null)
    }
  }

  const shotCount = match.shotCount ?? 5
  const filed     = match.disputeData?.timestamp
    ? new Date(match.disputeData.timestamp).toLocaleString()
    : '—'

  return (
    <div style={{
      background: 'linear-gradient(135deg,#0d0a18,#150f28)',
      border: '2px solid #a855f766',
      borderRadius: 18, padding: '18px 18px 16px', marginBottom: 16,
      boxShadow: '0 0 28px #a855f718',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
          letterSpacing: '0.14em', color: '#a855f7',
          background: 'rgba(168,85,247,0.12)', border: '1px solid #a855f744',
          borderRadius: 4, padding: '2px 7px',
        }}>⚔️ VERSUS</span>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#64748b' }}>
          Disputed by <strong style={{ color: '#94a3b8' }}>
            {match.challengerId === match.disputeData?.disputedBy ? match.challengerName : match.receiverName}
          </strong> · {filed}
        </span>
      </div>

      {/* Score comparison — scores only, no video here so columns stay wide enough to read */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 15, letterSpacing: '0.05em', color: '#f1f5f9', marginBottom: 4 }}>
            {match.challengerName}
          </div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 42, color: '#a855f7', lineHeight: 1 }}>
            {match.challengerHits ?? '—'}
            <span style={{ fontSize: 20, color: '#475569' }}>/{shotCount}</span>
          </div>
        </div>

        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, color: '#475569', textAlign: 'center' }}>VS</div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 15, letterSpacing: '0.05em', color: '#f1f5f9', marginBottom: 4 }}>
            {match.receiverName}
          </div>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 42, color: '#a855f7', lineHeight: 1 }}>
            {match.receiverHits ?? '—'}
            <span style={{ fontSize: 20, color: '#475569' }}>/{shotCount}</span>
          </div>
        </div>
      </div>

      {/* VIDEO EVIDENCE — full-width section below scores so the coach can properly audit */}
      {/* Videos are served from Vercel Blob public CDN — no Firebase Storage token needed */}
      {(match.challengerVideo || match.receiverVideo) ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
            color: '#475569', letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            📹 VIDEO EVIDENCE
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: match.challengerVideo && match.receiverVideo ? '1fr 1fr' : '1fr',
            gap: 8,
          }}>
            {match.challengerVideo && (
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#64748b', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {match.challengerName.toUpperCase()}
                </div>
                <video
                  src={match.challengerVideo}
                  controls playsInline preload="metadata"
                  style={{ width: '100%', borderRadius: 10, maxHeight: 280, background: '#000', display: 'block' }}
                />
              </div>
            )}
            {match.receiverVideo && (
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#64748b', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {match.receiverName.toUpperCase()}
                </div>
                <video
                  src={match.receiverVideo}
                  controls playsInline preload="metadata"
                  style={{ width: '100%', borderRadius: 10, maxHeight: 280, background: '#000', display: 'block' }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          marginBottom: 14, padding: '14px 12px',
          background: '#0a0f1a', border: '1px dashed #1e3a5f',
          borderRadius: 10, textAlign: 'center',
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#334155',
          letterSpacing: '0.06em',
        }}>
          📷 No video proof submitted for this match.
        </div>
      )}

      {/* Zone + original result */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#64748b', marginBottom: 14, textAlign: 'center' }}>
        Zone: <strong style={{ color: '#94a3b8' }}>{match.zone}</strong>
        {' · '}Original system result: <strong style={{ color: '#fbbf24' }}>
          {match.disputeData?.originalWinnerId === match.challengerId ? match.challengerName
            : match.disputeData?.originalWinnerId === match.receiverId ? match.receiverName
            : '—'}
        </strong>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
          background: toast.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${toast.ok ? '#22c55e44' : '#ef444444'}`,
          borderRadius: 8, padding: '8px 12px',
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700,
          color: toast.ok ? '#4ade80' : '#f87171', letterSpacing: '0.05em',
        }}>
          {toast.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />} {toast.msg}
        </div>
      )}

      {/* Resolution buttons */}
      {!toast?.ok && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            disabled={!!resolving}
            onClick={() => handleResolve(match.challengerId, match.challengerName)}
            style={{
              background: resolving === match.challengerId
                ? 'linear-gradient(135deg,#1e40af,#3b82f6)'
                : 'linear-gradient(135deg,#0c2347,#1e40af)',
              border: '1.5px solid #3b82f666',
              borderRadius: 12, padding: '12px 8px',
              fontFamily: "'Bangers',sans-serif", fontSize: 14, letterSpacing: '0.06em',
              color: '#fff', cursor: resolving ? 'not-allowed' : 'pointer',
              opacity: resolving && resolving !== match.challengerId ? 0.4 : 1,
              boxShadow: '0 0 14px #3b82f630',
            }}
          >
            {resolving === match.challengerId ? 'AWARDING…' : `AWARD WIN TO\n${match.challengerName.toUpperCase()}`}
          </button>
          <button
            disabled={!!resolving}
            onClick={() => handleResolve(match.receiverId, match.receiverName)}
            style={{
              background: resolving === match.receiverId
                ? 'linear-gradient(135deg,#6b21a8,#a855f7)'
                : 'linear-gradient(135deg,#2e1065,#6b21a8)',
              border: '1.5px solid #a855f766',
              borderRadius: 12, padding: '12px 8px',
              fontFamily: "'Bangers',sans-serif", fontSize: 14, letterSpacing: '0.06em',
              color: '#fff', cursor: resolving ? 'not-allowed' : 'pointer',
              opacity: resolving && resolving !== match.receiverId ? 0.4 : 1,
              boxShadow: '0 0 14px #a855f730',
            }}
          >
            {resolving === match.receiverId ? 'AWARDING…' : `AWARD WIN TO\n${match.receiverName.toUpperCase()}`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── PUCK dispute card ─────────────────────────────────────────────────────────
function PuckDisputeCard({ match, onResolved }) {
  const [resolving, setResolving] = useState(null)
  const [toast,     setToast]     = useState(null)

  async function handleResolve(winnerId, winnerName) {
    setResolving(winnerId)
    try {
      await resolveDisputedPuckGame(match, winnerId, 'Coach')
      setToast({ ok: true, msg: `✅ Win awarded to ${winnerName}. ELO corrected.` })
      setTimeout(() => onResolved(match.id), 2200)
    } catch (err) {
      console.error('[Dispute] puck resolve failed:', err)
      setToast({ ok: false, msg: '⚠️ Resolution failed — check connection.' })
      setResolving(null)
    }
  }

  const p1Letters = match.p1Letters || []
  const p2Letters = match.p2Letters || []
  const filed     = match.disputeData?.timestamp
    ? new Date(match.disputeData.timestamp).toLocaleString()
    : '—'
  const disputerName = match.disputeData?.disputedBy === match.p1Id ? match.p1Name : match.p2Name

  // Last-round videos (from currentRound)
  const setterVideo   = match.currentRound?.setterVideo   ?? null
  const defenderVideo = match.currentRound?.defenderVideo ?? null

  return (
    <div style={{
      background: 'linear-gradient(135deg,#0d0a10,#180c0c)',
      border: '2px solid #ef444466',
      borderRadius: 18, padding: '18px 18px 16px', marginBottom: 16,
      boxShadow: '0 0 28px #ef444418',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
          letterSpacing: '0.14em', color: '#ef4444',
          background: 'rgba(239,68,68,0.12)', border: '1px solid #ef444444',
          borderRadius: 4, padding: '2px 7px',
        }}>🏒 P-U-C-K</span>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#64748b' }}>
          Disputed by <strong style={{ color: '#94a3b8' }}>{disputerName}</strong> · {filed}
        </span>
      </div>

      {/* Letter score comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        {/* P1 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 15, letterSpacing: '0.05em', color: '#f1f5f9', marginBottom: 6 }}>
            {match.p1Name}
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {PUCK_LETTERS.map((l, i) => (
              <span key={l} style={{
                fontFamily: "'Bangers',sans-serif", fontSize: 28, letterSpacing: '0.02em',
                color: i < p1Letters.length ? '#ef4444' : '#1e2d44',
                textShadow: i < p1Letters.length ? '0 0 12px #ef444488' : 'none',
              }}>{l}</span>
            ))}
          </div>
        </div>

        <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 20, color: '#475569', textAlign: 'center' }}>VS</div>

        {/* P2 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 15, letterSpacing: '0.05em', color: '#f1f5f9', marginBottom: 6 }}>
            {match.p2Name}
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {PUCK_LETTERS.map((l, i) => (
              <span key={l} style={{
                fontFamily: "'Bangers',sans-serif", fontSize: 28, letterSpacing: '0.02em',
                color: i < p2Letters.length ? '#ef4444' : '#1e2d44',
                textShadow: i < p2Letters.length ? '0 0 12px #ef444488' : 'none',
              }}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Last-round video evidence — full-width below scores for proper coach review */}
      {/* Vercel Blob public CDN URLs — no Firebase Storage token pipeline required */}
      {(setterVideo || defenderVideo) ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800,
            color: '#475569', letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            📹 VIDEO EVIDENCE (FINAL ROUND)
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: setterVideo && defenderVideo ? '1fr 1fr' : '1fr',
            gap: 8,
          }}>
            {setterVideo && (
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#64748b', letterSpacing: '0.1em', marginBottom: 4 }}>
                  SETTER'S SHOT
                </div>
                <video src={setterVideo} controls playsInline preload="metadata"
                  style={{ width: '100%', borderRadius: 10, maxHeight: 280, background: '#000', display: 'block' }} />
              </div>
            )}
            {defenderVideo && (
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#64748b', letterSpacing: '0.1em', marginBottom: 4 }}>
                  DEFENDER'S RESPONSE
                </div>
                <video src={defenderVideo} controls playsInline preload="metadata"
                  style={{ width: '100%', borderRadius: 10, maxHeight: 280, background: '#000', display: 'block' }} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          marginBottom: 14, padding: '14px 12px',
          background: '#0a0f1a', border: '1px dashed #1e3a5f',
          borderRadius: 10, textAlign: 'center',
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#334155',
          letterSpacing: '0.06em',
        }}>
          📷 No video proof submitted for this match.
        </div>
      )}

      {/* Original result */}
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#64748b', marginBottom: 14, textAlign: 'center' }}>
        Original system result: <strong style={{ color: '#fbbf24' }}>
          {match.disputeData?.originalWinnerId === match.p1Id ? match.p1Name
            : match.disputeData?.originalWinnerId === match.p2Id ? match.p2Name
            : '—'}
        </strong>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
          background: toast.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${toast.ok ? '#22c55e44' : '#ef444444'}`,
          borderRadius: 8, padding: '8px 12px',
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700,
          color: toast.ok ? '#4ade80' : '#f87171', letterSpacing: '0.05em',
        }}>
          {toast.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />} {toast.msg}
        </div>
      )}

      {/* Resolution buttons */}
      {!toast?.ok && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            disabled={!!resolving}
            onClick={() => handleResolve(match.p1Id, match.p1Name)}
            style={{
              background: resolving === match.p1Id
                ? 'linear-gradient(135deg,#1e40af,#3b82f6)'
                : 'linear-gradient(135deg,#0c2347,#1e40af)',
              border: '1.5px solid #3b82f666',
              borderRadius: 12, padding: '12px 8px',
              fontFamily: "'Bangers',sans-serif", fontSize: 14, letterSpacing: '0.06em',
              color: '#fff', cursor: resolving ? 'not-allowed' : 'pointer',
              opacity: resolving && resolving !== match.p1Id ? 0.4 : 1,
              boxShadow: '0 0 14px #3b82f630',
            }}
          >
            {resolving === match.p1Id ? 'AWARDING…' : `AWARD WIN TO\n${match.p1Name.toUpperCase()}`}
          </button>
          <button
            disabled={!!resolving}
            onClick={() => handleResolve(match.p2Id, match.p2Name)}
            style={{
              background: resolving === match.p2Id
                ? 'linear-gradient(135deg,#dc2626,#ef4444)'
                : 'linear-gradient(135deg,#450a0a,#dc2626)',
              border: '1.5px solid #ef444466',
              borderRadius: 12, padding: '12px 8px',
              fontFamily: "'Bangers',sans-serif", fontSize: 14, letterSpacing: '0.06em',
              color: '#fff', cursor: resolving ? 'not-allowed' : 'pointer',
              opacity: resolving && resolving !== match.p2Id ? 0.4 : 1,
              boxShadow: '0 0 14px #ef444430',
            }}
          >
            {resolving === match.p2Id ? 'AWARDING…' : `AWARD WIN TO\n${match.p2Name.toUpperCase()}`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function CoachDisputeReview() {
  const [disputes, setDisputes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadDisputedMatches()
      setDisputes(data)
    } catch (err) {
      console.error('[CoachDisputeReview] load failed:', err)
      setError('Could not load disputes — check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleResolved(id) {
    setDisputes(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 800, color: '#ef4444', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            ⚠️ DISPUTED MATCHES
          </div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Review video proof and override the result below.
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            background: 'transparent', border: '1px solid #334155',
            borderRadius: 8, padding: '6px 10px', cursor: loading ? 'not-allowed' : 'pointer',
            color: '#64748b', display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, opacity: loading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#64748b' }}>
          Loading disputes…
        </div>
      )}

      {!loading && error && (
        <div style={{
          ...C.card, borderColor: '#ef444444', textAlign: 'center',
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#f87171',
        }}>
          <AlertCircle size={14} style={{ display: 'inline', marginRight: 6 }} />{error}
        </div>
      )}

      {!loading && !error && disputes.length === 0 && (
        <div style={{
          ...C.card,
          textAlign: 'center', padding: '32px 16px',
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, color: '#64748b',
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          No disputed matches — all clear!
        </div>
      )}

      {!loading && disputes.map(d =>
        d.type === 'versus'
          ? <VersusDisputeCard  key={d.id} match={d} onResolved={handleResolved} />
          : <PuckDisputeCard    key={d.id} match={d} onResolved={handleResolved} />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
