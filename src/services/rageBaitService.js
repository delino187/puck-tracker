import { db } from '../firebase.js'
import {
  collection, addDoc, deleteDoc, doc,
  query, where, onSnapshot,
} from 'firebase/firestore'

const TEAM_ID = 'team_main'
const COL = () => collection(db, 'teams', TEAM_ID, 'notifications')

// ── Allowed payload contracts — strict allowlist ───────────────────────────────
const ALLOWED_TYPES  = new Set(['rage_bait', 'compliment'])
const ALLOWED_IMAGES = new Set(['rage-bait.png', 'compliment.png'])

// ── Generic helpers ───────────────────────────────────────────────────────────
async function sendNotification(senderId, senderName, receiverId, type, image) {
  if (!ALLOWED_TYPES.has(type) || !ALLOWED_IMAGES.has(image)) {
    console.error(
      `[rageBaitService] Blocked invalid notification payload — type: "${type}", image: "${image}". ` +
      `Allowed types: ${[...ALLOWED_TYPES].join(', ')}. Allowed images: ${[...ALLOWED_IMAGES].join(', ')}.`
    )
    return
  }
  await addDoc(COL(), {
    type, senderId, senderName, receiverId,
    image, status: 'unread', createdAt: Date.now(),
  })
}

function subscribeToType(playerId, type, onReceive) {
  const q = query(
    COL(),
    where('receiverId', '==', playerId),
    where('type',       '==', type),
    where('status',     '==', 'unread'),
  )
  return onSnapshot(q, snap => {
    if (snap.empty) return
    const d = snap.docs[0]
    onReceive({ id: d.id, ...d.data() })
  })
}

export async function dismissNotification(docId) {
  await deleteDoc(doc(db, 'teams', TEAM_ID, 'notifications', docId))
}

// ── Rage Bait ─────────────────────────────────────────────────────────────────
export const sendRageBait = (sId, sName, rId) =>
  sendNotification(sId, sName, rId, 'rage_bait', 'rage-bait.png')

export const subscribeToRageBaits = (playerId, onReceive) =>
  subscribeToType(playerId, 'rage_bait', onReceive)

export const dismissRageBait = dismissNotification

// ── Compliment ────────────────────────────────────────────────────────────────
export const sendCompliment = (sId, sName, rId) =>
  sendNotification(sId, sName, rId, 'compliment', 'compliment.png')

export const subscribeToCompliments = (playerId, onReceive) =>
  subscribeToType(playerId, 'compliment', onReceive)
