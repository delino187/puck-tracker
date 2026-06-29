/**
 * One-time migration: retroactively correct bonusXP for players who received
 * coach puck credits before the 2026-06-21 XP-award update.
 *
 * Why this is needed: logTechniqueShots() always wrote bonusXP = totalPucks,
 * but if the Zustand store was cleared/reset or the device was swapped, bonusXP
 * could be 0 while totalPucks reflects a restored value. This script audits
 * every player with coach puck history and brings bonusXP back in sync.
 *
 * How to run (one-time, from the browser console after app boots):
 *   import('/src/utils/retroXPAward.js').then(m => m.runRetroXPAwardMigration())
 *
 * Or temporarily add to App.jsx useEffect and remove after confirming the logs.
 *
 * The script is idempotent — a Firestore migration guard document prevents
 * it from re-applying if called again.
 */

import { db } from '../firebase.js'
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore'
import { useAppStore } from '../store/useAppStore.js'
import { calcXP, getLevel } from './stats.js'

const TEAM_ID      = 'team_main'
const MIGRATION_ID = 'retro_xp_award_2026_06_21'

// ── Entry point ───────────────────────────────────────────────────────────────
export async function runRetroXPAwardMigration() {
  console.log('[retroXP] Starting retroactive XP award migration...')

  // Guard: skip if this migration was already applied successfully.
  try {
    const guardSnap = await getDoc(doc(db, 'migrations', MIGRATION_ID))
    if (guardSnap.exists()) {
      const { ranAt, updatedPlayers, totalXPRestored } = guardSnap.data()
      console.log(
        `[retroXP] Already applied on ${ranAt}. ` +
        `(${updatedPlayers} player(s), ${totalXPRestored} XP restored.) Skipping.`
      )
      return
    }
  } catch {
    console.warn('[retroXP] Could not reach Firestore for migration guard — proceeding anyway.')
  }

  // ── Step 1: identify players with historical coach credits ─────────────────
  const { techniqueByPlayer } = useAppStore.getState()
  const creditedIds = Object.keys(techniqueByPlayer).filter(id => {
    const e = techniqueByPlayer[id]
    return e && (e.totalPucks || 0) > 0
  })

  if (creditedIds.length === 0) {
    console.log('[retroXP] No players with coach puck credits found. Nothing to migrate.')
    await _writeGuard(0, 0)
    return
  }

  console.log(`[retroXP] Found ${creditedIds.length} player(s) with historical coach credits.`)

  // ── Step 2: load players + sessions (Firestore first, localStorage fallback) ─
  let players  = []
  let sessions = []

  try {
    const [teamSnap, sessionsSnap] = await Promise.all([
      getDoc(doc(db, 'teams', TEAM_ID)),
      getDocs(collection(db, 'teams', TEAM_ID, 'sessions')),
    ])
    players  = teamSnap.exists() ? (teamSnap.data().players || []) : []
    sessions = sessionsSnap.docs.map(d => d.data())
    console.log(`[retroXP] Loaded ${players.length} players and ${sessions.length} sessions from Firestore.`)
  } catch {
    console.warn('[retroXP] Firestore unavailable — falling back to localStorage.')
    try {
      const raw = localStorage.getItem('puck_v5')
      if (raw) {
        const saved = JSON.parse(raw)
        players  = saved.players  || []
        sessions = saved.sessions || []
        console.log(`[retroXP] Loaded ${players.length} players and ${sessions.length} sessions from localStorage.`)
      }
    } catch {
      console.error('[retroXP] Could not read localStorage. Aborting.')
      return
    }
  }

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]))

  // ── Step 3: audit + calculate corrections ─────────────────────────────────
  let updatedCount    = 0
  let totalXPRestored = 0
  const corrections   = {}

  for (const playerId of creditedIds) {
    const entry          = techniqueByPlayer[playerId]
    const totalPucks     = entry.totalPucks || 0
    const storedBonusXP  = entry.bonusXP   || 0
    const correctBonusXP = totalPucks // 1 XP per puck (matches logTechniqueShots rate)
    const missingXP      = correctBonusXP - storedBonusXP

    const player = playerMap[playerId]
    const label  = player
      ? (player.jerseyNum ? `${player.name} #${player.jerseyNum}` : player.name)
      : `[unknown player ${playerId}]`

    // Compute session XP for this player
    const pSessions = sessions.filter(s => s.playerId === playerId)
    let totalShots = 0
    let totalHits  = 0
    for (const s of pSessions) {
      const h = (s.sets || []).reduce((a, x) => a + x.hits, 0)
      totalShots += s.source === 'atw' ? h : (s.sets?.length ?? 0) * 10
      totalHits  += h
    }
    const sessionXP = calcXP(totalShots, totalHits)

    const prevTotalXP = sessionXP + storedBonusXP
    const newTotalXP  = sessionXP + correctBonusXP
    const prevLevel   = getLevel(prevTotalXP)
    const newLevel    = getLevel(newTotalXP)
    const leveledUp   = newLevel.li > prevLevel.li

    if (missingXP > 0) {
      corrections[playerId] = { totalPucks, bonusXP: correctBonusXP }
      console.log(
        `[retroXP] ✏️  ${label}: +${missingXP} XP restored ` +
        `(${totalPucks} coach pucks — bonusXP was ${storedBonusXP}, should be ${correctBonusXP})` +
        (leveledUp
          ? ` | Level: "${prevLevel.level.name}" → "${newLevel.level.name}" 🎉`
          : ` | Level unchanged: "${prevLevel.level.name}"`)
      )
      totalXPRestored += missingXP
      updatedCount++
    } else {
      console.log(
        `[retroXP] ✅ ${label}: ${totalPucks} coach pucks, ${storedBonusXP} bonusXP already correct` +
        (leveledUp
          ? ` | Total XP ${newTotalXP} earns "${newLevel.level.name}" 🎉`
          : ` | Level: "${prevLevel.level.name}"`)
      )
    }
  }

  // ── Step 4: apply corrections to the Zustand store ────────────────────────
  if (Object.keys(corrections).length > 0) {
    useAppStore.setState(state => ({
      techniqueByPlayer: {
        ...state.techniqueByPlayer,
        ...Object.fromEntries(
          Object.entries(corrections).map(([id, fix]) => [
            id,
            { ...state.techniqueByPlayer[id], ...fix },
          ])
        ),
      },
    }))
    console.log('[retroXP] Zustand store updated — hsh_global_app_state will be re-persisted automatically.')
  }

  // ── Step 5: summary + write migration guard ────────────────────────────────
  if (updatedCount > 0) {
    console.log(
      `[retroXP] Migration complete: Updated ${updatedCount} player(s) and restored ` +
      `${totalXPRestored.toLocaleString()} total XP.`
    )
  } else {
    console.log(
      `[retroXP] Migration complete: All ${creditedIds.length} player(s) with coach credits ` +
      `already had correct bonusXP. No changes needed.`
    )
  }

  await _writeGuard(updatedCount, totalXPRestored)
}

async function _writeGuard(updatedPlayers, totalXPRestored) {
  try {
    await setDoc(doc(db, 'migrations', MIGRATION_ID), {
      ranAt:          new Date().toISOString(),
      updatedPlayers,
      totalXPRestored,
    })
    console.log('[retroXP] Migration guard written to Firestore/migrations/' + MIGRATION_ID)
  } catch (err) {
    console.warn('[retroXP] Could not write migration guard to Firestore:', err.message)
  }
}
