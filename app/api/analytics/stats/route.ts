import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { readStats, StatsUnavailable } from '@/lib/stats/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * GET /api/analytics/stats?days=30 — the numbers behind Admin → Статистика:
 * the last `days` days (today included, 1–180), their totals, and how many
 * people are on the site now. A signed-in admin only.
 *
 * The screen asks for its whole period once, then every minute for one day
 * (`days=1`, today and "on the site now"), which is two Redis commands
 * rather than one per day of the period: a tab left open all day stays
 * well inside the store's free allowance.
 */
export async function GET(req: NextRequest) {
  if (!(await getAdminSession().catch(() => false))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: NO_STORE })
  }

  const days = Number(new URL(req.url).searchParams.get('days')) || 30
  try {
    return NextResponse.json(await readStats(days), { headers: NO_STORE })
  } catch (err) {
    console.error('[stats] the admin could not read the statistics:', err)
    const message = err instanceof StatsUnavailable
      ? err.message
      : `Не удалось прочитать статистику: ${err instanceof Error ? err.message : String(err)}`
    return NextResponse.json({ error: message }, { status: 503, headers: NO_STORE })
  }
}
