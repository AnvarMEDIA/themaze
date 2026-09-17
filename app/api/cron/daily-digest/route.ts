import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getAdminSession } from '@/lib/auth'
import { sendTelegram, telegramConfigured } from '@/lib/notify'
import { todayKey, previousDay } from '@/lib/analytics'
import { buildDigest, collectDigest, listRuns, recordRun, type DigestRun } from '@/lib/digest'
import { rateLimitAsync } from '@/lib/rateLimit'

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
 * Scheduled in vercel.json for 19:05 UTC, which is 00:05 of the NEXT day in
 * Tashkent (UTC+5 all year, so no seasonal correction). Running just after
 * local midnight rather than just before it is what makes the day complete:
 * at 23:55 the last five minutes were always missing from the numbers.
 *
 * Which also means the report is for YESTERDAY. By the time the cron fires,
 * the local day has already turned over, so "the day that just ended" is the
 * previous one — and that is the default for every caller, cron and person
 * alike. `?date=YYYY-MM-DD` overrides it for any day still in the window.
 *
 * Three ways in:
 *   · `Authorization: Bearer <CRON_SECRET>` — the strong path, and the only
 *     one accepted when that variable is set.
 *   · Vercel's own cron signal, accepted ONLY when CRON_SECRET is not
 *     configured. Vercel sends the bearer token only if the variable exists,
 *     so requiring it unconditionally means a project without it gets a
 *     silent 401 every night — which is what appears to have happened. The
 *     worst a spoofed call can do here is deliver the owner's own report to
 *     the owner's own chat twice, and it is rate-limited so it cannot be used
 *     to spam. Set CRON_SECRET and this path stops being used at all.
 *   · A signed-in admin, for `?preview=1` (renders without sending),
 *     `?send=1` (sends now) and `?runs=1` (the log of recent attempts).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const bearer = req.headers.get('authorization') ?? ''
  const presented = bearer.startsWith('Bearer ') ? bearer.slice(7) : ''
  const fromSecret = !!cronSecret && presented.length > 0 && safeEqual(presented, cronSecret)

  // Vercel identifies its own scheduler by user-agent and an internal header.
  const ua = req.headers.get('user-agent') ?? ''
  const looksLikeVercelCron = req.headers.has('x-vercel-cron') || /vercel-cron/i.test(ua)
  let fromVercelCron = false
  if (!fromSecret && !cronSecret && looksLikeVercelCron) {
    const rl = await rateLimitAsync('digest-cron', { limit: 4, windowMs: 60 * 60_000 })
    fromVercelCron = rl.success
  }

  const session = await getAdminSession().catch(() => false)
  if (!fromSecret && !fromVercelCron && !session) {
    // Say which door to use. A bare "Unauthorised" on a diagnostic URL sends
    // the reader looking for a bug in the endpoint instead of signing in —
    // and the log this guards is also on the Statistics page, which is where
    // someone asking "did the report go out" would naturally look.
    return NextResponse.json({
      error: 'Unauthorised',
      hint: 'Sign in to the admin panel in this browser, or open Admin → Statistics — the report status and the log of the last runs are shown there.',
    }, { status: 401 })
  }
  const fromCron = fromSecret || fromVercelCron
  const via: DigestRun['via'] = fromSecret ? 'secret' : fromVercelCron ? 'vercel-cron' : 'admin'

  const url = new URL(req.url)

  // The log of recent attempts, for answering "why did nothing arrive".
  if (!fromCron && url.searchParams.get('runs') === '1') {
    const runs = await listRuns()
    return NextResponse.json({
      ok: true,
      cronSecretConfigured: !!cronSecret,
      telegramConfigured: telegramConfigured(),
      runs,
    })
  }

  // The day that just ended, in the studio's timezone — the same answer for
  // the cron at 00:05 and for a person pressing the button at lunchtime, so
  // there is one meaning of "the report" instead of two.
  const asked = url.searchParams.get('date')
  const target = /^\d{4}-\d{2}-\d{2}$/.test(asked ?? '') ? asked! : previousDay(todayKey())

  let text: string
  try {
    text = buildDigest(await collectDigest(target))
  } catch (err) {
    // A report that cannot be built must still say so: silence is the one
    // outcome that costs a day to diagnose.
    const reason = err instanceof Error ? err.message.slice(0, 200) : 'unknown error'
    console.error('[daily-digest] could not build the report —', reason)
    await recordRun({ at: new Date().toISOString(), date: target, sent: false, via, reason: `build_failed: ${reason}` })
    if (fromCron && telegramConfigured()) {
      await sendTelegram(`⚠️ <b>Отчёт за день не собрался.</b>\nПричина: ${reason}`)
    }
    return NextResponse.json({ ok: false, date: target, sent: false, reason: `build_failed: ${reason}` })
  }

  const preview = !fromCron && url.searchParams.get('send') !== '1'
  if (preview) {
    return NextResponse.json({ ok: true, date: target, sent: false, preview: text })
  }

  if (!telegramConfigured()) {
    await recordRun({ at: new Date().toISOString(), date: target, sent: false, via, reason: 'telegram_not_configured' })
    return NextResponse.json(
      { ok: false, date: target, sent: false, reason: 'telegram_not_configured' },
      { status: 200 },
    )
  }

  const result = await sendTelegram(text)
  await recordRun({
    at: new Date().toISOString(), date: target, sent: result.ok, via,
    ...(result.ok ? {} : { reason: result.error }),
  })
  if (!result.ok) {
    console.error('[daily-digest] telegram failed —', result.error)
    // 200 on purpose: Vercel Cron retries a non-2xx, and a retry would only
    // send the same failing message again. The reason is in the body and the
    // log instead.
    return NextResponse.json({ ok: false, date: target, sent: false, reason: result.error })
  }
  return NextResponse.json({
    ok: true, date: target, sent: true, via,
    // Only present when the chat had moved: the id to put in TELEGRAM_CHAT_ID.
    ...(result.migratedTo ? { migratedTo: result.migratedTo } : {}),
  })
}
