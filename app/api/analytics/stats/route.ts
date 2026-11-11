import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { readPeriod, StatsUnavailable } from '@/lib/stats/store'
import { resolvePeriod } from '@/lib/stats/periods'
import { siteDay } from '@/lib/stats/time'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * GET /api/analytics/stats — the numbers behind Admin → Статистика, for a
 * signed-in admin only:
 *   ?period=today | yesterday | 7 | 30 | 90 | year
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD   any span, up to 400 days, ending today at the latest
 *   ?days=N                          the last N days (the older form)
 * The days of the period, their totals, and how many people are on the
 * site now (lib/stats/periods says how each becomes dates).
 *
 * The screen asks for its period once, then every minute for today only
 * (`period=today`: today and "on the site now"), which is two Redis commands
 * rather than one per day of the period: a tab left open all day stays well
 * inside the store's allowance.
 */
export async function GET(req: NextRequest) {
  if (!(await getAdminSession().catch(() => false))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: NO_STORE })
  }

  const q = new URL(req.url).searchParams
  const { from, to } = resolvePeriod(
    { period: q.get('period'), from: q.get('from'), to: q.get('to'), days: q.get('days') },
    siteDay(),
  )
  try {
    return NextResponse.json(await readPeriod(from, to), { headers: NO_STORE })
  } catch (err) {
    console.error('[stats] the admin could not read the statistics:', err)
    const message = err instanceof StatsUnavailable
      ? err.message
      : `Не удалось прочитать статистику: ${err instanceof Error ? err.message : String(err)}`
    return NextResponse.json({ error: message }, { status: 503, headers: NO_STORE })
  }
}
