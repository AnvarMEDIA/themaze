import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { viewsBeforeRedis } from '@/lib/stats/history'
import { StatsUnavailable, readPageViews } from '@/lib/stats/store'

export const dynamic = 'force-dynamic'

/**
 * Every page's views of all time and of the last seven days, by path
 * (lib/stats/store, readPageViews): the counts on the admin's project
 * cards. Admin only.
 */
export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const pages = await readPageViews(viewsBeforeRedis)
    return NextResponse.json({ pages }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof StatsUnavailable) return NextResponse.json({ error: err.message }, { status: 503 })
    console.error('[stats] page views:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Не удалось прочитать просмотры.' }, { status: 500 })
  }
}
