import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getAdminSession } from '@/lib/auth'
import { sendTelegram, telegramConfigured } from '@/lib/notify'
import { todayKey, previousDay } from '@/lib/analytics'
import { buildDigest, collectDigest } from '@/lib/digest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Constant-time compare, so the secret can't be guessed a byte at a time. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * The end-of-day site report, delivered to the same Telegram chat that
 * receives new inquiries.
 *
 * Scheduled in vercel.json for 18:50 UTC — 23:50 in Tashkent — so it reports
 * a day that has actually finished where the people reading it live. The
 * report is built for that local day, not for a UTC one.
 *
 * Two ways in, both deliberate:
 *   · Vercel Cron, with `Authorization: Bearer <CRON_SECRET>` — same guard as
 *     /api/backup, because this endpoint sends a message and an open one
 *     would let anyone spam the chat.
 *   · A signed-in admin, for `?preview=1` — reads the report back without
 *     sending it, which is how you check the wording without waiting for
 *     midnight. `?date=YYYY-MM-DD` previews any day still in the 90-day
 *     window, and `?send=1` sends it for real.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const bearer = req.headers.get('authorization') ?? ''
  const presented = bearer.startsWith('Bearer ') ? bearer.slice(7) : ''
  const fromCron = !!cronSecret && presented.length > 0 && safeEqual(presented, cronSecret)
  const session = await getAdminSession().catch(() => false)
  if (!fromCron && !session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const url = new URL(req.url)
  const asked = url.searchParams.get('date')
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked ?? '') ? asked! : todayKey()
  // A cron firing at 23:50 local reports today; an admin opening this the
  // next morning almost always means yesterday, so that is the default there.
  const target = fromCron || asked ? date : previousDay(todayKey())

  const text = buildDigest(await collectDigest(target))

  if (!text) {
    // A silent day is not an error, and a message saying "0 / 0 / 0" every
    // evening is how a channel gets muted.
    return NextResponse.json({ ok: true, date: target, sent: false, reason: 'no_activity' })
  }

  const preview = !fromCron && url.searchParams.get('send') !== '1'
  if (preview) {
    return NextResponse.json({ ok: true, date: target, sent: false, preview: text })
  }

  if (!telegramConfigured()) {
    return NextResponse.json(
      { ok: false, date: target, sent: false, reason: 'telegram_not_configured' },
      { status: 200 },
    )
  }

  const result = await sendTelegram(text)
  if (!result.ok) {
    console.error('[daily-digest] telegram failed —', result.error)
    // 200 on purpose: Vercel Cron retries a non-2xx, and a retry would only
    // send the same failing message again. The reason is in the body and the
    // log instead.
    return NextResponse.json({ ok: false, date: target, sent: false, reason: result.error })
  }
  return NextResponse.json({
    ok: true, date: target, sent: true,
    // Only present when the chat had moved: the id to put in TELEGRAM_CHAT_ID.
    ...(result.migratedTo ? { migratedTo: result.migratedTo } : {}),
  })
}
