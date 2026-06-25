import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { ZONES } from '../../constants/zones.js'
import Avatar from './Avatar.jsx'
import HistoricalMatchupModal from '../overlays/HistoricalMatchupModal.jsx'
import PlayerProfileCardModal from '../overlays/PlayerProfileCardModal.jsx'
import CopyButton, { buildInviteText } from './CopyButton.jsx'
import { formatRankedCountdown } from '../../services/peerChallengeService.js'

function MatchTypeBadge({ matchType }) {
  const ranked = matchType !== 'unranked'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: ranked ? 'rgba(251,191,36,0.1)' : 'rgba(34,197,94,0.1)',
      border: `1px solid ${ranked ? '#fbbf2444' : '#22c55e44'}`,
      borderRadius: 20, padding: '2px 7px', flexShrink: 0,
    }}>
      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: ranked ? '#fbbf24' : '#22c55e' }}>
        {ranked ? '🏆 RANKED' : '🤝 CASUAL'}
      </span>
    </span>
  )
}

export default function PeerChallengeCard({ challenge, playerId, players = [], sessions = [], onAccept }) {
  const challenger = players.find(p => p.id === challenge.challengerId)
  const receiver   = players.find(p => p.id === challenge.receiverId)
  const me         = players.find(p => p.id === playerId)
  const [matchupOpp,    setMatchupOpp]   = useState(null)   // H2H quick summary
  const [profilePlayer, setProfilePlayer] = useState(null) // full profile card

  function openProfile(player) {
    if (!player || player.id === playerId) return
    setProfilePlayer(player)
  }

  const isChallenger = challenge.challengerId === playerId
  const zoneName     = ZONES.find(z => z.id === challenge.zone)?.label ?? challenge.zone
  const expired      = Date.now() > challenge.expiresAt
  const completed    = challenge.status === 'completed'
  const won          = completed && challenge.winnerId === playerId
  const lost         = completed && challenge.winnerId !== playerId

  // ── Completed card ─────────────────────────────────────────────────────────
  if (completed) {
    const opp = isChallenger ? receiver : challenger
    return (
      <>
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
            <span style={{ marginLeft: 'auto' }}>
              <MatchTypeBadge matchType={challenge.matchType} />
            </span>
          </div>
          {/* Opponent name — clickable to open H2H modal */}
          <button
            onClick={() => opp && setMatchupOpp(opp)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: opp ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}
          >
            <Avatar player={opp} size={20} />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#a855f7', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>
              {isChallenger ? challenge.receiverName : challenge.challengerName}
            </span>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>
              · {zoneName}
            </span>
          </button>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: 'var(--text-muted)' }}>
            {challenge.challengerName} {challenge.challengerHits} · {challenge.receiverName} {challenge.receiverHits ?? '—'} hits
          </div>
        </div>
        {matchupOpp    && me && <HistoricalMatchupModal     player={me} opponent={matchupOpp}    onClose={() => setMatchupOpp(null)} />}
        {profilePlayer && me && <PlayerProfileCardModal player={profilePlayer} currentPlayer={me} sessions={sessions} onClose={() => setProfilePlayer(null)} />}
      </>
    )
  }

  // ── Shared compact match-list card (outgoing + incoming) ─────────────────
  const opp     = isChallenger ? receiver  : challenger
  const oppName = isChallenger ? challenge.receiverName : challenge.challengerName

  return (
    <>
      <div
        onClick={() => !expired && onAccept?.(challenge)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg,#0d0b18,#14102a)',
          border: `2px solid ${expired ? '#1e293b' : isChallenger ? '#3b82f655' : '#a855f766'}`,
          borderRadius: 16, padding: '12px 14px', marginBottom: 10,
          cursor: expired ? 'default' : 'pointer',
          boxShadow: expired ? 'none' : isChallenger ? '0 0 16px #3b82f614' : '0 0 20px #a855f718',
          opacity: expired ? 0.55 : 1,
          transition: 'transform 0.1s, box-shadow 0.1s',
        }}
        onMouseEnter={e => { if (!expired) { e.currentTarget.style.transform = 'scale(1.01)' } }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {/* ── Left: opponent avatar ─────────────────────────────────────── */}
        <button
          onClick={e => { e.stopPropagation(); openProfile(opp) }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: opp ? 'pointer' : 'default', flexShrink: 0 }}
        >
          <Avatar
            player={opp}
            size={48}
            className={isChallenger ? '' : 'arcade-glow'}
            style={{ borderRadius: '50%' }}
          />
        </button>

        {/* ── Center: name, game mode, status pill ─────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* VS name */}
          <button
            onClick={e => { e.stopPropagation(); opp && setMatchupOpp(opp) }}
            style={{ background: 'none', border: 'none', padding: 0, cursor: opp ? 'pointer' : 'default', display: 'block', textAlign: 'left' }}
          >
            <div style={{
              fontFamily: "'Bangers',sans-serif", fontSize: 20, letterSpacing: '0.06em',
              color: '#f1f5f9', lineHeight: 1.1,
            }}>
              VS {oppName?.toUpperCase() ?? '—'}
            </div>
          </button>

          {/* Game mode subtext */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em' }}>
              Shooting Challenge · {zoneName}
            </span>
            <MatchTypeBadge matchType={challenge.matchType} />
          </div>

          {/* Status pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7,
            background: expired
              ? 'rgba(239,68,68,0.1)'
              : isChallenger
                ? 'rgba(59,130,246,0.12)'
                : 'rgba(168,85,247,0.15)',
            border: `1px solid ${expired ? '#ef444444' : isChallenger ? '#3b82f644' : '#a855f766'}`,
            borderRadius: 20, padding: '3px 10px',
          }}>
            <span style={{ fontSize: 10 }}>
              {expired ? '⛔' : isChallenger ? '⏳' : '⚡'}
            </span>
            <span style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800,
              letterSpacing: '0.1em',
              color: expired ? '#ef4444' : isChallenger ? '#60a5fa' : '#c084fc',
            }}>
              {expired
                ? isChallenger ? 'EXPIRED — NO RESPONSE' : 'TIME EXPIRED'
                : isChallenger ? 'WAITING FOR OPPONENT…' : 'YOUR TURN!'}
            </span>
          </div>

          {/* Ranked expiration countdown — sender view only */}
          {isChallenger && !expired && challenge.matchType === 'ranked' && challenge.expiresAt && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 6,
              background: (() => {
                const ms = challenge.expiresAt - Date.now()
                return ms < 12 * 3_600_000
                  ? 'rgba(239,68,68,0.1)'
                  : ms < 48 * 3_600_000
                    ? 'rgba(251,191,36,0.1)'
                    : 'rgba(59,130,246,0.08)'
              })(),
              border: `1px solid ${(() => {
                const ms = challenge.expiresAt - Date.now()
                return ms < 12 * 3_600_000 ? '#ef444455' : ms < 48 * 3_600_000 ? '#fbbf2455' : '#3b82f633'
              })()}`,
              borderRadius: 8, padding: '3px 8px',
            }}>
              <span style={{ fontSize: 9 }}>⏳</span>
              <span style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 800,
                letterSpacing: '0.08em',
                color: (() => {
                  const ms = challenge.expiresAt - Date.now()
                  return ms < 12 * 3_600_000 ? '#f87171' : ms < 48 * 3_600_000 ? '#fbbf24' : '#60a5fa'
                })(),
              }}>
                {formatRankedCountdown(challenge.expiresAt)}
              </span>
            </div>
          )}

          {/* Nudge copy link — only on outgoing pending cards */}
          {isChallenger && !expired && (
            <div style={{ marginTop: 6 }}>
              <CopyButton inviteText={buildInviteText('versus', challenge.matchType)} />
            </div>
          )}
        </div>

        {/* ── Right: action button ──────────────────────────────────────── */}
        {!expired && (
          <button
            onClick={e => { e.stopPropagation(); onAccept?.(challenge) }}
            style={{
              flexShrink: 0,
              background: isChallenger
                ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
                : 'linear-gradient(135deg,#6b21a8,#a855f7)',
              border: 'none', borderRadius: 12, padding: '10px 14px',
              fontFamily: "'Bangers',sans-serif", fontSize: 16, letterSpacing: '0.06em',
              color: '#fff', cursor: 'pointer',
              boxShadow: isChallenger ? '0 0 16px #3b82f644' : '0 0 16px #a855f744',
              whiteSpace: 'nowrap',
            }}
          >
            {isChallenger ? 'VIEW 🕹️' : 'PLAY ⚔️'}
          </button>
        )}
      </div>

      {matchupOpp    && me && <HistoricalMatchupModal     player={me} opponent={matchupOpp}    onClose={() => setMatchupOpp(null)} />}
      {profilePlayer && me && <PlayerProfileCardModal player={profilePlayer} currentPlayer={me} sessions={sessions} onClose={() => setProfilePlayer(null)} />}
    </>
  )
}
