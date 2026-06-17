/**
 * Vercel Serverless Function — /api/upload-url
 *
 * Generates a Google Cloud Storage v4 signed URL that the browser can PUT
 * a video file to directly.  Signing happens server-side using a service account
 * so the client never needs GCS credentials.
 *
 * Required environment variables (set in Vercel Dashboard → Settings → Environment):
 *   GOOGLE_PROJECT_ID          — GCP / Firebase project ID
 *   GOOGLE_SERVICE_ACCOUNT_JSON — full service account JSON as a single-line string
 *   FIREBASE_STORAGE_BUCKET     — e.g. puck-tracker-app.firebasestorage.app
 *
 * Note: `vercel dev` is needed locally to test this endpoint; Vite's dev server
 * does not serve /api routes.
 */

import { Storage } from '@google-cloud/storage'

export default async function handler(req, res) {
  // CORS — allow the Vite dev origin and production domain
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { storagePath, contentType = 'video/mp4' } = req.body

    if (!storagePath) {
      return res.status(400).json({ error: 'storagePath is required' })
    }

    // Validate path is within expected prefixes — reject anything else
    const allowed = ['peerChallenges/', 'puckGames/']
    if (!allowed.some(prefix => storagePath.startsWith(prefix))) {
      return res.status(400).json({ error: 'Invalid storage path' })
    }

    const storage = new Storage({
      projectId:   process.env.GOOGLE_PROJECT_ID,
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    })

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET
    if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET env var not set')

    const [signedUrl] = await storage
      .bucket(bucketName)
      .file(storagePath)
      .getSignedUrl({
        version:     'v4',
        action:      'write',
        expires:     Date.now() + 15 * 60 * 1000,  // 15-minute window
        contentType,
      })

    res.status(200).json({ signedUrl })
  } catch (err) {
    console.error('[upload-url] Failed to generate signed URL:', err.message)
    res.status(500).json({ error: 'Could not generate upload URL' })
  }
}
