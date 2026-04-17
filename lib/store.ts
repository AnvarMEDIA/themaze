/**
 * Universal JSON store:
 *   – local dev  (no BLOB_READ_WRITE_TOKEN): read/write local data/*.json
 *   – Vercel prod (BLOB_READ_WRITE_TOKEN set): read/write via @vercel/blob
 *
 * Blob key format: "maze-data/<name>.json"  (addRandomSuffix: false → deterministic)
 */

import fs   from 'fs'
import path from 'path'

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN

function localPath(name: string) {
  return path.join(process.cwd(), 'data', `${name}.json`)
}

export async function readStore<T>(name: string, fallback: T): Promise<T> {
  if (USE_BLOB) {
    try {
      const { list } = await import('@vercel/blob')
      const { blobs } = await list({ prefix: `maze-data/${name}.json` })
      if (blobs.length === 0) {
        // No blob yet — seed from bundled file if it exists
        return readLocal(name, fallback)
      }
      const res = await fetch(blobs[0].downloadUrl, { cache: 'no-store' })
      return res.json() as T
    } catch {
      return readLocal(name, fallback)
    }
  }
  return readLocal(name, fallback)
}

export async function writeStore<T>(name: string, data: T): Promise<void> {
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob')
    await put(`maze-data/${name}.json`, JSON.stringify(data, null, 2), {
      access:            'public',
      addRandomSuffix:   false,
      allowOverwrite:    true,
      contentType:       'application/json',
    })
    return
  }
  fs.writeFileSync(localPath(name), JSON.stringify(data, null, 2), 'utf-8')
}

function readLocal<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(localPath(name), 'utf-8')) as T
  } catch {
    return fallback
  }
}
