/**
 * Video Report Service
 * Firestore: video_reports/{reportId}   ← root-level collection, isolated from game data
 *
 * Reports are written by players and read/actioned by coaches only.
 * The collection is separate from teams/team_main so a compromised report write
 * cannot affect player stats, ELO, or sessions.
 */
import { db } from '../firebase.js'
import {
  collection, doc, addDoc, getDocs, updateDoc,
  query, where, orderBy, getDoc,
} from 'firebase/firestore'

const COL = () => collection(db, 'video_reports')

export const REPORT_REASONS = [
  'Inappropriate Content',
  'Harassment / Spam',
  'Not Hockey Related',
  'Other',
]

// ── Submit a new report ───────────────────────────────────────────────────────
export async function submitVideoReport({ videoUrl, videoContext, reportedBy, reporterName, reason }) {
  const data = {
    reportId:     crypto.randomUUID(),
    videoUrl:     videoUrl || '',
    videoContext: videoContext || '',   // human-readable label, e.g. "Versus – vs Connor"
    reportedBy,
    reporterName,
    reason,
    timestamp:    new Date().toISOString(),
    status:       'pending',
  }
  await addDoc(COL(), data)
  return data
}

// ── Load all pending reports (coach only) ─────────────────────────────────────
export async function loadPendingReports() {
  try {
    const snap = await getDocs(
      query(COL(), where('status', '==', 'pending'), orderBy('timestamp', 'desc'))
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    // orderBy requires a composite index on the first run — fall back to unordered
    console.warn('[videoReportService] ordered query failed, retrying without orderBy:', err.message)
    const snap = await getDocs(query(COL(), where('status', '==', 'pending')))
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }
}

// ── Dismiss (mark resolved, keep video) ──────────────────────────────────────
export async function dismissReport(docId) {
  await updateDoc(doc(db, 'video_reports', docId), {
    status:     'resolved',
    resolvedAt: new Date().toISOString(),
    resolution: 'dismissed',
  })
}

// ── Remove video (mark resolved + flag video on its source document) ──────────
// For Versus challenges the video lives in peerChallenges/{id}.
// For PUCK games it lives in puckGames/{id}.
// We blank the videoUrl on that doc so it stops rendering everywhere, then mark
// the report resolved.  Both writes are fire-and-forget best-effort — the report
// itself is always marked resolved regardless.
export async function removeVideo(docId, videoUrl) {
  const TEAM_ID = 'team_main'

  // Attempt to locate and blank the video URL on its source document.
  // We search both peerChallenges and puckGames subcollections for a URL match.
  try {
    for (const colName of ['peerChallenges', 'puckGames']) {
      const colRef = collection(db, 'teams', TEAM_ID, colName)
      const snap   = await getDocs(colRef)

      for (const docSnap of snap.docs) {
        const data   = docSnap.data()
        const fields = [
          'challengerVideo', 'receiverVideo',   // Versus
          'setterVideo',     'defenderVideo',    // PUCK game rounds
        ]
        const match = fields.find(f => data[f] === videoUrl)
        if (match) {
          await updateDoc(doc(db, 'teams', TEAM_ID, colName, docSnap.id), { [match]: null })
          break
        }
      }
    }
  } catch (err) {
    console.warn('[videoReportService] source video blank failed (non-fatal):', err.message)
  }

  await updateDoc(doc(db, 'video_reports', docId), {
    status:     'resolved',
    resolvedAt: new Date().toISOString(),
    resolution: 'removed',
  })
}
