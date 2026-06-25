/**
 * usePuckTurnAlerts
 *
 * Watches the puckGames snapshot array for turn changes that require the
 * active player to act, and fires:
 *   1. An in-app glowing banner via UIContext (always works)
 *   2. A native Notification if browser permission is granted
 *
 * Turn-change detection uses a prevActionsRef Map keyed by game ID.
 * On the FIRST non-empty snapshot the map is seeded (baseline) — no
 * notifications fire.  On every subsequent snapshot, each game's action
 * is compared to the baseline; a transition to 'set' or 'match' triggers
 * the alert.
 *
 * Edge-case guards:
 *   - First snapshot: baseline-only, no fires (prevents alert spam on login)
 *   - Player just submitted: their own write triggers a snapshot where their
 *     action is still 'waiting_*' — the check correctly stays silent because
 *     the action hasn't transitioned to an actionable state.
 *   - Multiple active games: each game is evaluated independently.
 *   - Player switch: seenGameActionRef resets on activePlayerId change.
 */
import { useEffect, useRef } from 'react'
import { usePlayer } from '../context/PlayerContext.jsx'
import { useUI }    from '../context/UIContext.jsx'
import { getGameAction } from '../services/puckGameService.js'
import { showNativeNotification } from '../utils/notificationEngine.js'

export function usePuckTurnAlerts(puckGames) {
  const { st }                           = usePlayer()
  const { setPuckTurnBanner }            = useUI()

  // Map<gameId, { action, roundId }> — baseline of last-seen state
  const prevActionsRef   = useRef(new Map())
  // True once the first non-empty snapshot has been baselined
  const hasBaselinedRef  = useRef(false)

  // Reset on player switch so stale baselines from a previous account don't
  // carry over and suppress the first legitimate alert for the new player.
  useEffect(() => {
    prevActionsRef.current  = new Map()
    hasBaselinedRef.current = false
  }, [st?.activePlayerId])

  useEffect(() => {
    const activeId = st?.activePlayerId
    if (!activeId || !puckGames.length) return

    const prev = prevActionsRef.current

    // First non-empty snapshot → seed baseline silently, no notifications
    if (!hasBaselinedRef.current) {
      for (const game of puckGames) {
        prev.set(game.id, {
          action:  getGameAction(game, activeId),
          roundId: game.currentRound?.id ?? null,
        })
      }
      hasBaselinedRef.current = true
      return
    }

    // Subsequent snapshots → diff against baseline
    for (const game of puckGames) {
      if (game.status !== 'active') continue

      const action     = getGameAction(game, activeId)
      const roundId    = game.currentRound?.id ?? null
      const prevEntry  = prev.get(game.id)

      // Determine opponent name
      const opponentName = game.p1Id === activeId ? (game.p2Name ?? 'Opponent') : (game.p1Name ?? 'Opponent')

      if (prevEntry) {
        const actionChanged  = action !== prevEntry.action
        const roundAdvanced  = roundId !== prevEntry.roundId

        // Fire when the action transitions TO an actionable state.
        // A round advancing + 'set' action means a new round started and it's
        // the player's turn to set.  'match' means the opponent just made their
        // shot and the player needs to match it (same round, status changed).
        const becameMyTurn =
          (action === 'set'   && (actionChanged || roundAdvanced)) ||
          (action === 'match' && actionChanged)

        if (becameMyTurn) {
          // In-app banner (always fires)
          setPuckTurnBanner({ gameId: game.id, opponentName, action })

          // Native notification (fires only if permission is granted)
          if (action === 'set') {
            showNativeNotification(
              '🏒 Your Turn in P-U-C-K!',
              `Film your set shot vs ${opponentName}.`,
              '/android-chrome-192x192.png',
              'puck-turn',
            )
          } else {
            showNativeNotification(
              '🚨 P-U-C-K Alert!',
              `${opponentName} set a new shot. Match it or get a letter!`,
              '/android-chrome-192x192.png',
              'puck-turn',
            )
          }
        }
      }

      // Always update baseline to current state
      prev.set(game.id, { action, roundId })
    }
  }, [puckGames, st?.activePlayerId]) // eslint-disable-line react-hooks/exhaustive-deps
}
