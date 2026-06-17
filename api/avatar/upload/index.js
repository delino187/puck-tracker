/**
 * Vercel Serverless Function — /api/avatar/upload
 *
 * Secure client-upload token handler for @vercel/blob.
 * The browser calls this endpoint twice per upload:
 *   1. To get a short-lived client token (type: 'blob.generate-client-token')
 *   2. To confirm completion   (type: 'blob.upload-completed')
 *
 * Required environment variable (Vercel Dashboard → Storage → Blob → Connect):
 *   BLOB_READ_WRITE_TOKEN — issued when you connect a Blob store to your project
 *
 * Note: run `vercel dev` locally (not `vite dev`) to test this endpoint.
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

    // handleUpload needs a Web API Request object, not a Node IncomingMessage.
    const webRequest = new Request(
      `https://${req.headers.host ?? 'localhost'}${req.url}`,
      {
        method:  'POST',
        headers: new Headers(req.headers),
        body:    JSON.stringify(body),
      }
    )

    const jsonResponse = await handleUpload({
      body,
      request: webRequest,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: [
          'video/mp4',
          'video/quicktime',
          'video/mov',
          'video/webm',
        ],
        maximumSizeInBytes: 50 * 1024 * 1024,   // 50 MB server-side ceiling
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('[Blob] Upload completed:', blob.pathname, blob.url)
      },
    })

    res.status(200).json(jsonResponse)
  } catch (err) {
    console.error('[Blob] handleUpload error:', err.message)
    res.status(400).json({ error: err.message })
  }
}
