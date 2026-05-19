import { NextRequest, NextResponse } from 'next/server'
import { trackPageview } from '@/lib/analytics'
import { rateLimitAsync } from '@/lib/rateLimit'
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

  let path: string
  try {
    const body = await req.json() as { path?: unknown }
    if (typeof body.path !== 'string') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    path = body.path
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
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
