/**
 * Vercel Serverless Function — /api/avatar/upload
 *
 * Client-upload token handler for @vercel/blob.
 * Called twice per upload by @vercel/blob/client:
 *   1. POST { type: 'blob.generate-client-token' } → returns a short-lived upload token
 *   2. POST { type: 'blob.upload-completed'      } → confirms the file landed in the store
 *
 * Required env var — set in Vercel Dashboard → Storage → Blob → Connect Store:
 *   BLOB_READ_WRITE_TOKEN
 *
 * NOTE: This is a Vite + React project (not Next.js).
 * @vercel/blob/next and NextResponse do not exist here.
 * handleUpload from @vercel/blob/client is the correct import for non-Next.js runtimes.
 * Use `vercel dev` to test locally — Vite's dev server does not serve /api routes.
 */

import { handleUpload } from '@vercel/blob/client'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Vercel runtime usually auto-parses JSON bodies into req.body.
    // Guard against the case where it arrives as a raw Buffer or string.
    let body = req.body
    if (typeof body === 'string')  body = JSON.parse(body)
    if (Buffer.isBuffer(body))     body = JSON.parse(body.toString('utf8'))

    // handleUpload requires a Web API Request so it can inspect headers.
    // Node IncomingMessage headers can have array values — flatten them first.
    const flatHeaders = {}
    for (const [key, value] of Object.entries(req.headers)) {
      flatHeaders[key] = Array.isArray(value) ? value.join(', ') : value
    }

    const webRequest = new Request(
      `https://${req.headers.host ?? 'vercel.app'}${req.url}`,
      { method: 'POST', headers: new Headers(flatHeaders) }
    )

    // Pass the request directly without re-parsing the JSON body beforehand.
    const jsonResponse = await handleUpload({
      body,
      request: webRequest,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/mov'],
          maximumSizeInBytes: 70 * 1024 * 1024,  // 70 MB — room for high-res clips
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Blob upload completed successfully:', blob.url)
      },
    })

    res.status(200).json(jsonResponse)
  } catch (error) {
    console.error('[Vercel Blob API Catch]:', error)
    res.status(400).json({ error: error.message })
  }
}
