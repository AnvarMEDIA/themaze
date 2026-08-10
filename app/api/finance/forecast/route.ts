import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listProjects, listRecurring, listTransactions } from '@/lib/finance/data'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { buildForecast, DEFAULT_FORECAST_MONTHS } from '@/lib/finance/forecast'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const raw = Number(new URL(req.url).searchParams.get('months'))
  // buildForecast clamps the span; anything unparseable takes the default.
  const months = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_FORECAST_MONTHS

  const [projects, txns, recurring, settings] = await Promise.all([
    listProjects(),
    listTransactions(),
    listRecurring(),
    getEffectiveFinanceSettings(),
  ])

  return NextResponse.json(buildForecast(projects, txns, recurring, settings, months))
}
