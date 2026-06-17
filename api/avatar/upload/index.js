/**
 * Vercel Serverless Function — /api/avatar/upload
 *
 * Client-upload token handler for @vercel/blob.
 * Called twice per upload by @vercel/blob/client:
 *   1. POST { type: 'blob.generate-client-token' } → returns a short-lived upload token
 *   2. POST { type: 'blob.upload-completed'      } → confirms the file landed in the store
 *
 * Required env var (Vercel Dashboard → Storage → Blob → Connect Store → env vars):
 *   BLOB_READ_WRITE_TOKEN
 *
 * This project is Vite + React (not Next.js), so @vercel/blob/next and NextResponse
 * are not available. handleUpload from @vercel/blob/client is the correct import.
 * Run `vercel dev` locally to test — Vite dev server does not serve /api routes.
 */

import { handleUpload } from '@vercel/blob/client'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = req.body

    // handleUpload requires a Web API Request object (not Node's IncomingMessage).
    // We construct one so the SDK can read headers like Authorization correctly.
    const webRequest = new Request(
      `https://${req.headers.host ?? 'vercel.app'}${req.url}`,
      {
        method:  'POST',
        headers: new Headers(req.headers),
        // body intentionally omitted — handleUpload reads from the `body` param directly
      }
    )

    const jsonResponse = await handleUpload({
      body,
      request: webRequest,
      // Explicit token reference so it's never silently undefined
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [
            'video/mp4',
            'video/quicktime',
            'video/x-matroska',
            'video/mov',
          ],
          maximumSizeInBytes: 70 * 1024 * 1024,   // 70 MB — room for high-res clips
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('[Blob API] Blob storage write successfully acknowledged:', blob.url)
      },
    })

    res.status(200).json(jsonResponse)
  } catch (error) {
    console.error('[Blob API Error Callback]:', error.message)
    res.status(400).json({ error: error.message })
  }
}
