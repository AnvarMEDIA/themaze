import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getAdminSession } from '@/lib/auth'
import { sendTelegram, telegramConfigured } from '@/lib/notify'
import { todayKey, previousDay } from '@/lib/analytics'
import { buildDigest, collectDigest } from '@/lib/digest'
import { readStore, updateStore } from '@/lib/store'
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

/* ── run log ────────────────────────────────────────────────────────────── */

const RUNS_KEY = 'digest_runs'
const KEEP_RUNS = 30

interface DigestRun {
  at: string
  /** The day the report covered. */
  date: string
  sent: boolean
  /** How the caller was recognised: cron secret, Vercel's own cron, or admin. */
  via: 'secret' | 'vercel-cron' | 'admin'
  reason?: string
}

/**
 * Every attempt is recorded, successful or not.
 *
 * Without this there is no way to answer "did the report even try to go out",
 * and two evenings passed with nobody able to tell a quiet day from a cron
 * that never fired. Thirty runs is a month of evenings — enough to see a
 * pattern, small enough to keep in one row.
 */
async function recordRun(run: DigestRun): Promise<void> {
  try {
    await updateStore<{ runs?: DigestRun[] }>(RUNS_KEY, {}, (cur) => ({
      runs: [run, ...(cur.runs ?? [])].slice(0, KEEP_RUNS),
    }))
  } catch (err) {
    console.error('[daily-digest] could not record the run —', err)
  }
}

/**
 * The end-of-day site report, delivered to the same Telegram chat that
 * receives new inquiries.
 *
 * Scheduled in vercel.json for 18:50 UTC — 23:50 in Tashkent — so it reports
 * a day that has actually finished where the people reading it live.
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
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const fromCron = fromSecret || fromVercelCron
  const via: DigestRun['via'] = fromSecret ? 'secret' : fromVercelCron ? 'vercel-cron' : 'admin'

  const url = new URL(req.url)

  // The log of recent attempts, for answering "why did nothing arrive".
  if (!fromCron && url.searchParams.get('runs') === '1') {
    const { runs = [] } = await readStore<{ runs?: DigestRun[] }>(RUNS_KEY, {})
    return NextResponse.json({
      ok: true,
      cronSecretConfigured: !!cronSecret,
      telegramConfigured: telegramConfigured(),
      runs,
    })
  }

  const asked = url.searchParams.get('date')
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked ?? '') ? asked! : todayKey()
  // A cron firing at 23:50 local reports today; an admin opening this the
  // next morning almost always means yesterday, so that is the default there.
  const target = fromCron || asked ? date : previousDay(todayKey())

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
