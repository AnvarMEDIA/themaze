import { NextRequest, NextResponse } from 'next/server'
import { trackPageview, normalizePath } from '@/lib/analytics'
import { rateLimitAsync, clientIp } from '@/lib/rateLimit'
import { COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime  = 'nodejs'

const BOT_UA = /bot|crawl|spider|slurp|facebookexternal|preview|googleimage|bingbot|yandexbot|duckduckbot|baiduspider|sogou|exabot|petalbot|whatsapp|telegram|vkshare|skypeuri|discordbot|headlesschrome|phantomjs|puppeteer|playwright/i

/**
 * Anonymous pageview tracker.
 *
 * - Filters obvious bots by user-agent.
 * - Skips requests from logged-in admins so we don't pollute stats
 *   with our own browsing.
 * - Rate-limits to 1 hit per (ip, path) per minute so a refresh storm
 *   can't inflate counters.
 */
export async function POST(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? ''
  if (!ua || BOT_UA.test(ua)) {
    return NextResponse.json({ ok: true, skipped: 'bot' })
  }

  // Don't count admin self-views.
  if (req.cookies.get(COOKIE_NAME)?.value) {
    return NextResponse.json({ ok: true, skipped: 'admin' })
  }

  let rawPath: string
  try {
    const body = await req.json() as { path?: unknown }
    if (typeof body.path !== 'string') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    rawPath = body.path
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Normalise first so the store key is bounded to real routes and the
  // rate-limit key can't be inflated with arbitrary path variants.
  const path = normalizePath(rawPath)
  if (!path) return NextResponse.json({ ok: true, skipped: 'ignored' })

  const ip = clientIp(req)
  // Path-independent per-IP cap bounds total writes no matter how many
  // distinct paths one client rotates through (prevents store flooding).
  const ipRl = await rateLimitAsync(`view-ip:${ip}`, { limit: 60, windowMs: 60_000 })
  if (!ipRl.success) return NextResponse.json({ ok: true, skipped: 'rate' })

  const rl = await rateLimitAsync(`view:${ip}:${path}`, { limit: 1, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json({ ok: true, skipped: 'rate' })
  }

  try {
    await trackPageview(path)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[analytics/view]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
