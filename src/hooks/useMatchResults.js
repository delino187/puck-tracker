import { useEffect, useRef } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { useAppStore } from '../store/useAppStore.js'
import {
  claimChallengeWinReward,
  claimChallengeLoserReward,
  fetchFreshTeamPlayers,
  resolveExpiredChallenge,
} from '../services/peerChallengeService.js'
import { showNativeNotification } from '../utils/notificationEngine.js'

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
  const {
    setVictoryReward, setDefeatState,
    setChallengeAnsweredBanner, setExpiredVictoryBanner,
  } = useUI()

  const seenVictoryIds = useRef(new Set())
  const seenDefeatIds  = useRef(new Set())
  const seenExpiredIds = useRef(new Set())
  // seenAnsweredBannerIds is persisted to localStorage so the banner never
  // re-fires for a challenge the player already saw, even across page reloads.
  const SEEN_BANNERS_KEY = 'puck_seen_banners'
  const getSeenBannerIds = () => {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_BANNERS_KEY) || '[]')) }
    catch { return new Set() }
  }
  const markBannerSeen = (id) => {
    try {
      const ids = getSeenBannerIds()
      ids.add(id)
      // Cap at 500 entries so localStorage never grows unbounded
      const arr = [...ids].slice(-500)
      localStorage.setItem(SEEN_BANNERS_KEY, JSON.stringify(arr))
    } catch {}
  }

  // Reset in-session sets when the active player switches accounts.
  // NOTE: seenAnsweredBannerIds intentionally NOT reset here — it is
  // cross-session by design (localStorage-backed, player-agnostic).
  useEffect(() => {
    seenVictoryIds.current = new Set()
    seenDefeatIds.current  = new Set()
    seenExpiredIds.current = new Set()
  }, [st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ranked expiration lazy resolver ──────────────────────────────────────
  // Fires on every peerChallenges snapshot.  If a ranked challenge has passed
  // its 5-day window with no response, it atomically resolves it as a forfeit
  // win for the challenger.  The completed challenge then flows through the
  // normal victory/defeat detection effects below.
  useEffect(() => {
    if (!st?.activePlayerId) return
    const activeId = st.activePlayerId
    const now      = Date.now()

    for (const challenge of peerChallenges) {
      if (challenge.matchType !== 'ranked')              continue
      if (challenge.status    !== 'pending')             continue
      if (now <= challenge.expiresAt)                   continue
      if (challenge.expirationResolutionProcessed)      continue
      if (seenExpiredIds.current.has(challenge.id))     continue
      if (challenge.challengerId !== activeId && challenge.receiverId !== activeId) continue

      seenExpiredIds.current.add(challenge.id)

      resolveExpiredChallenge(challenge).then(result => {
        if (!result) return  // already resolved by another device, or error
        // Challenger: show the expiry-specific banner (diamonds/XP come from
        // the victory effect below when the completed snapshot arrives).
        if (challenge.challengerId === activeId) {
          setExpiredVictoryBanner({
            opponentName: challenge.receiverName ?? 'your opponent',
            challengeId:  challenge.id,
            eloGained:    result.challengerDelta ?? 0,
          })
        }
      })

      break  // one resolution per render cycle
    }
  }, [peerChallenges, st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Challenge-answered banner + native notification ───────────────────────
  // Fires when the CHALLENGER's sent challenge is answered by the receiver.
  // The victory/defeat modals handle the full result — this banner is a
  // lightweight "heads up" that works across all app tabs, firing the moment
  // the realtime snapshot delivers the completion.
  useEffect(() => {
    if (!st?.activePlayerId) return
    const activeId = st.activePlayerId

    for (const challenge of peerChallenges) {
      if (challenge.status !== 'completed')             continue
      if (challenge.challengerId !== activeId)          continue  // only fires for the challenger
      if (getSeenBannerIds().has(challenge.id))         continue  // persisted — survives reloads

      markBannerSeen(challenge.id)

      const opponentName = challenge.receiverName ?? 'your opponent'
      const won    = challenge.winnerId === activeId
      const isDraw = challenge.isTie ?? false

      // Layer 1: in-app glowing banner (UIContext state)
      setChallengeAnsweredBanner({ opponentName, challengeId: challenge.id, won, isDraw })

      // Layer 2: native browser/PWA notification (silent no-op if not granted)
      const resultText = isDraw
        ? "It's a tie! Check the results."
        : won
          ? `You WON against ${opponentName}! Collect your diamonds.`
          : `${opponentName} beat you this time. Check the tape!`
      showNativeNotification('⚡ Challenge Answered!', resultText, '/android-chrome-192x192.png', 'versus-challenge')

      break  // one banner at a time; next fires after dismissal
    }
  }, [peerChallenges, st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps

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

        // Mark "Win 1 Versus Quick Match Today" quest complete.
        // Read last_quest_spin from prev (live state) inside the functional updater
        // so we never act on the stale `pl` snapshot from when the effect first ran.
        const today = new Date().toDateString()
        setSt(prev => {
          const player = prev.players.find(p => p.id === prev.activePlayerId)
          if (!player || player.last_quest_spin !== today) return prev
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

        // Step 3: Show result UI.
        // Expiration wins already show the expiredVictoryBanner (set in the resolver
        // effect above), so skip the regular victory modal to avoid doubling up.
        if (!challenge.expirationVictory) {
          setVictoryReward({ type: 'versus', diamonds: VERSUS_WIN_DIAMONDS, xp: VERSUS_WIN_XP, opponentId, challengeId: cid })
        }
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
