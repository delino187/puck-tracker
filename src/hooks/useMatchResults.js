import { useEffect, useRef } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { useAppStore } from '../store/useAppStore.js'
import {
  claimChallengeWinReward,
  claimChallengeLoserReward,
  fetchFreshTeamPlayers,
} from '../services/peerChallengeService.js'

const VERSUS_WIN_DIAMONDS = 10
const VERSUS_WIN_XP       = 20

// Resolve a player's equipped taunt to its audio asset path.
// Returns null if no taunt is equipped (caller uses default streak-broken sting).
function tauntPathFor(player) {
  if (player?.equippedTaunt === 'sad_trombone') return '/sad-game-over-trombone.mp3'
  return null
}

/**
 * useMatchResults — encapsulates all Versus Quick Match outcome detection.
 *
 * Moves the two snapshot-driven useEffect blocks (victory + defeat) out of
 * App.jsx into a dedicated hook.  Returns the in-session de-dup refs so
 * handlePeerChallengeSubmit in App.jsx can mark challenges as already-seen
 * before the peerChallenges state update triggers a re-render.
 *
 * Exploit protection (victory):
 *   1. Check `winnerRewardsClaimed` on the Firestore document — skips if set.
 *   2. Call claimChallengeWinReward() which atomically flips the flag inside a
 *      Firestore transaction BEFORE any local state or UI update occurs.
 *   3. Only on `granted === true` do we apply diamonds / XP / show the modal.
 *
 * Defeat audio:
 *   The winning opponent's profile is fetched fresh from Firestore so their
 *   `equippedTaunt` is authoritative (not stale from a local cache hit).
 *   The resolved audio path is stored in `defeatState.tauntAudioPath` and
 *   consumed by VersusDefeatModal on mount.
 */
export function useMatchResults(peerChallenges) {
  const { st, setSt } = usePlayer()
  const { setVictoryReward, setDefeatState } = useUI()

  const seenVictoryIds = useRef(new Set())
  const seenDefeatIds  = useRef(new Set())

  // Reset in-session claim-lock sets when the active player switches accounts
  useEffect(() => {
    seenVictoryIds.current = new Set()
    seenDefeatIds.current  = new Set()
  }, [st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Victory detection (challenger perspective) ────────────────────────────
  // The receiver submits via handlePeerChallengeSubmit; the challenger only learns
  // the result through the Firestore peerChallenges snapshot arriving here.
  useEffect(() => {
    if (!st?.activePlayerId || !st?.players) return
    const activeId = st.activePlayerId

    for (const challenge of peerChallenges) {
      if (challenge.status !== 'completed')         continue
      if (challenge.winnerId !== activeId)           continue
      if (challenge.winnerRewardsClaimed)            continue  // server-side idempotency flag
      if (seenVictoryIds.current.has(challenge.id)) continue  // in-session de-dup

      // Admin correction safety: skip matches completed before a stat rollback
      const winner = st.players.find(p => p.id === activeId)
      if (winner?.lastAdminAdjustmentTimestamp && challenge.respondedAt) {
        if (challenge.respondedAt < winner.lastAdminAdjustmentTimestamp) {
          console.log(`[useMatchResults] Skipping ${challenge.id} — before admin correction`)
          continue
        }
      }

      // Optimistic lock — prevents rapid snapshot re-fires from double-claiming
      seenVictoryIds.current.add(challenge.id)

      const opponentId = challenge.challengerId === activeId
        ? challenge.receiverId
        : challenge.challengerId

      const cid   = challenge.id
      const pid   = activeId
      const pl    = st.players.find(p => p.id === activeId)
      const today = new Date().toDateString()

      // Step 1: Atomic Firestore write flips winnerRewardsClaimed BEFORE any reward
      claimChallengeWinReward(cid).then(async granted => {
        if (!granted) return  // already claimed on another device or session

        // Step 2: Apply rewards locally only after the flag is written
        setSt(prev => ({
          ...prev,
          players: prev.players.map(p =>
            p.id !== pid ? p : { ...p, diamonds: (p.diamonds || 0) + VERSUS_WIN_DIAMONDS }
          ),
        }))
        useAppStore.getState().logTechniqueShots(pid, 0, VERSUS_WIN_XP)

        // Mark "Win 1 Versus Quick Match Today" quest complete
        if (pl?.last_quest_spin === today) {
          setSt(prev => {
            const player = prev.players.find(p => p.id === prev.activePlayerId)
            if (!player) return prev
            const qi = (player.daily_quests || []).findIndex(
              q => /win.*versus/i.test(q.text) && !q.completed && !q.claimed
            )
            if (qi < 0) return prev
            return {
              ...prev,
              players: prev.players.map(p =>
                p.id !== prev.activePlayerId ? p : {
                  ...p,
                  daily_quests: p.daily_quests.map((q, i) =>
                    i === qi ? { ...q, currentProgress: 1, targetProgress: 1, completed: true } : q
                  ),
                }
              ),
            }
          })
        }

        // Force-sync ELO from server — bypasses the snapshot rate-limiter that can
        // silently drop team-doc snapshots when multiple writes burst in after Match 1.
        const freshPlayers = await fetchFreshTeamPlayers()
        if (freshPlayers.length > 0) {
          setSt(prev => ({
            ...prev,
            players: prev.players.map(lp => {
              const sp = freshPlayers.find(p => p.id === lp.id)
              if (!sp) return lp
              return {
                ...lp,
                elo:            sp.elo            ?? lp.elo,
                eloLastDelta:   sp.eloLastDelta   ?? lp.eloLastDelta,
                eloLastUpdated: sp.eloLastUpdated ?? lp.eloLastUpdated,
                totalWins:      Math.max(sp.totalWins ?? 0, lp.totalWins ?? 0),
              }
            }),
          }))
        }

        // Step 3: Show the modal — purely visual; rewards and flag already committed
        setVictoryReward({ type: 'versus', diamonds: VERSUS_WIN_DIAMONDS, xp: VERSUS_WIN_XP, opponentId, challengeId: cid })
      })

      break  // process one win at a time; next win shows after this modal dismisses
    }
  }, [peerChallenges, st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Defeat detection (challenger who lost via snapshot) ───────────────────
  // The receiver's defeat is handled synchronously in handlePeerChallengeSubmit
  // and added to seenDefeatIds there; this effect exists only for the challenger
  // who learns they lost through the Firestore snapshot.
  //
  // 30-minute recency gate prevents showing stale defeat modals on fresh login.
  useEffect(() => {
    if (!st?.activePlayerId || !st?.players) return
    const activeId = st.activePlayerId
    const DEFEAT_WINDOW_MS = 30 * 60 * 1000
    const cutoff = Date.now() - DEFEAT_WINDOW_MS

    for (const challenge of peerChallenges) {
      if (challenge.status !== 'completed')         continue
      if (challenge.isTie)                          continue
      if (challenge.winnerId === null)              continue
      if (challenge.winnerId === activeId)          continue  // they won, not our concern
      if (challenge.challengerId !== activeId && challenge.receiverId !== activeId) continue
      if (seenDefeatIds.current.has(challenge.id)) continue
      if (challenge.loserRewardsClaimed)            continue  // persistent cross-session lock
      if ((challenge.respondedAt ?? 0) < cutoff)   continue  // too old to show on login

      seenDefeatIds.current.add(challenge.id)

      const opponentId   = challenge.challengerId === activeId ? challenge.receiverId   : challenge.challengerId
      const opponentName = challenge.challengerId === activeId ? challenge.receiverName : challenge.challengerName
      const myHits       = challenge.challengerId === activeId ? challenge.challengerHits : challenge.receiverHits
      const opponentHits = challenge.challengerId === activeId ? challenge.receiverHits  : challenge.challengerHits
      const winnerVideoUrl = challenge.winnerId === challenge.challengerId
        ? (challenge.challengerVideo ?? null)
        : (challenge.receiverVideo   ?? null)

      const pid = activeId

      // Fetch fresh team data: ELO sync + winner's equippedTaunt in one round-trip
      fetchFreshTeamPlayers().then(freshPlayers => {
        if (freshPlayers.length > 0) {
          setSt(prev => ({
            ...prev,
            players: prev.players.map(lp => {
              const sp = freshPlayers.find(p => p.id === lp.id)
              if (!sp) return lp
              return {
                ...lp,
                elo:            sp.elo            ?? lp.elo,
                eloLastDelta:   sp.eloLastDelta   ?? lp.eloLastDelta,
                eloLastUpdated: sp.eloLastUpdated ?? lp.eloLastUpdated,
                totalWins:      Math.max(sp.totalWins ?? 0, lp.totalWins ?? 0),
              }
            }),
          }))
        }

        // Resolve winner's equipped taunt from authoritative Firestore data
        const winnerProfile = freshPlayers.find(p => p.id === challenge.winnerId)
        const tauntAudioPath = tauntPathFor(winnerProfile)

        setDefeatState({
          type: 'versus', diamonds: 1, xp: 2,
          opponentId, opponentName,
          myHits: myHits ?? 0, opponentHits: opponentHits ?? 0,
          opponentVideoUrl: winnerVideoUrl,
          tauntAudioPath,
        })
      }).catch(() => {
        // Fallback: show defeat modal without taunt (network error)
        setDefeatState({
          type: 'versus', diamonds: 1, xp: 2,
          opponentId, opponentName,
          myHits: myHits ?? 0, opponentHits: opponentHits ?? 0,
          opponentVideoUrl: winnerVideoUrl,
          tauntAudioPath: null,
        })
      })

      // Consolation rewards: atomic transaction is the cross-session lock
      claimChallengeLoserReward(challenge.id).then(granted => {
        if (!granted) return
        setSt(prev => ({
          ...prev,
          players: prev.players.map(p =>
            p.id === pid ? { ...p, diamonds: (p.diamonds || 0) + 1 } : p
          ),
        }))
        useAppStore.getState().logTechniqueShots(pid, 0, 2)
      })

      break  // show one defeat at a time
    }
  }, [peerChallenges, st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Expose refs so handlePeerChallengeSubmit in App.jsx can mark challenges as
  // already-seen before the peerChallenges state update triggers a re-render,
  // preventing double-fire between the submit path and the snapshot path.
  return { seenVictoryIds, seenDefeatIds }
}

// Re-export for App.jsx's handlePeerChallengeSubmit defeat path
export { tauntPathFor }
