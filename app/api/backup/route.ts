import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { readStore } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Daily JSON-store backup.
 *
 * Triggered by:
 *   - Vercel Cron (GET with `Authorization: Bearer <CRON_SECRET>`)
 *   - Manual admin request (GET with a valid admin session cookie)
 *
 * Produces `maze-backups/YYYY-MM-DD.json` in the same Vercel Blob the
 * live store uses; gracefully no-ops when BLOB_READ_WRITE_TOKEN is
 * missing (local dev).
 */
const KNOWN_KEYS = [
  'portfolio',
  'partners',
  'team',
  'testimonials',
  'posts',
  'settings',
  'inquiries',
] as const

export async function GET(req: NextRequest) {
  // Authorisation: either Vercel Cron bearer or admin session
  const cronSecret = process.env.CRON_SECRET
  const bearer    = req.headers.get('authorization')
  const fromCron  = cronSecret && bearer === `Bearer ${cronSecret}`
  const session   = await getAdminSession().catch(() => false)
  if (!fromCron && !session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, reason: 'BLOB_READ_WRITE_TOKEN not configured; backup skipped.' },
      { status: 200 },
    )
  }

  // Snapshot every known store key into a single JSON bundle.
  const snapshot: Record<string, unknown> = {
    createdAt: new Date().toISOString(),
    keys:      {},
  }
  for (const key of KNOWN_KEYS) {
    try {
      snapshot.keys = {
        ...(snapshot.keys as Record<string, unknown>),
        [key]: await readStore(key, null),
      }
    } catch (err) {
      console.warn(`[backup] failed to read "${key}"`, err)
    }
  }

  try {
    const { put } = await import('@vercel/blob')
    const today   = new Date().toISOString().slice(0, 10)
    const blob    = await put(
      `maze-backups/${today}.json`,
      JSON.stringify(snapshot, null, 2),
      {
        access:          'public',
        addRandomSuffix: false,
        allowOverwrite:  true,
        contentType:     'application/json',
      },
    )
    return NextResponse.json({ ok: true, url: blob.url, date: today })
  } catch (err) {
    console.error('[backup] put failed', err)
    return NextResponse.json({ ok: false, error: 'Backup upload failed' }, { status: 500 })
  }
}
