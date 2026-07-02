import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getAdminSession } from '@/lib/auth'
import { readStore } from '@/lib/store'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

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
  // Authorisation: either Vercel Cron bearer or admin session.
  // Constant-time compare prevents timing-based brute force on CRON_SECRET.
  const cronSecret = process.env.CRON_SECRET
  const bearer     = req.headers.get('authorization') ?? ''
  const presented  = bearer.startsWith('Bearer ') ? bearer.slice(7) : ''
  const fromCron   = !!cronSecret && presented.length > 0 && safeEqual(presented, cronSecret)
  const session    = await getAdminSession().catch(() => false)
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
    // The bundle contains contact-form PII (name/email/message). Vercel
    // Blob only supports public access, so we make the URL unguessable
    // with a random suffix instead of a predictable `YYYY-MM-DD.json`
    // path anyone could enumerate. The URL is returned only to the
    // authenticated caller / cron and is never published.
    const blob    = await put(
      `maze-backups/${today}.json`,
      JSON.stringify(snapshot, null, 2),
      {
        access:          'public',
        addRandomSuffix: true,
        allowOverwrite:  false,
        contentType:     'application/json',
      },
    )
    return NextResponse.json({ ok: true, url: blob.url, date: today })
  } catch (err) {
    console.error('[backup] put failed', err)
    return NextResponse.json({ ok: false, error: 'Backup upload failed' }, { status: 500 })
  }
}
