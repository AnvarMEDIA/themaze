import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'
import { clientIp, rateLimitAsync } from '@/lib/rateLimit'
import { sanitizeMarketing, type Marketing } from '@/lib/stats/marketing'
import { recordBeat, recordView } from '@/lib/stats/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const OK = () => NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })

/**
 * POST /api/visit: one page view, or a heartbeat, from the site's tracker
 * (components/PageviewTracker). A neutral name: blocklists tend to drop
 * paths with "analytics", "track" or "stat" in them.
 *
 * Public, so nothing in the body is trusted: the campaign goes through a
 * whitelist (lib/stats/marketing), the page is normalised, bots are dropped
 * before anything is written (lib/stats/store). The IP address and user
 * agent are read from the request to tell visitors apart, hashed with a
 * salt that changes daily, and never stored.
 *
 * Always 200: a tracker must never be able to break a page, and a browser
 * retrying a failed beacon would count it twice.
 */
export async function POST(req: NextRequest) {
  try {
    // The studio's own browsing of its site is not a visit.
    if (req.cookies.get(COOKIE_NAME)?.value) return OK()

    const ip = clientIp(req)
    // A ceiling on writes per address, whatever it posts.
    const rl = await rateLimitAsync(`visit:${ip}`, { limit: 120, windowMs: 60_000 })
    if (!rl.success) return OK()

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) return OK()
    const ua = req.headers.get('user-agent') ?? ''

    if (body.beat === true) {
      await recordBeat({ ua, ip })
      return OK()
    }

    let marketing: Marketing | undefined = sanitizeMarketing(body.marketing)
    // A page cached from before 12 November sends the old shape: `path`, and
    // `source` (a referrer's host, or a link's utm_source).
    if (!marketing && typeof body.source === 'string' && body.source.trim()) {
      const s = body.source.trim().slice(0, 200)
      marketing = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(s) ? { referrer: `https://${s}/` } : { source: s }
    }

    await recordView({
      page: body.page ?? body.path,
      locale: body.locale,
      referrer: marketing?.referrer,
      marketing,
      ua,
      ip,
      country: req.headers.get('x-vercel-ip-country'),
      host: req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
      firstEver: body.firstEver === true,
    })
  } catch (err) {
    console.error('[visit]', err instanceof Error ? err.message : err)
  }
  return OK()
}
