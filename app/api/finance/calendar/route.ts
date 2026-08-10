import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listClients, listProjects, listRecurring, listTransactions } from '@/lib/finance/data'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { buildMonthLedger, monthOfDate, normaliseMonth } from '@/lib/finance/calendar'

export const dynamic = 'force-dynamic'

/**
 * One month's ledger for the dashboard calendar.
 *
 * Scoped to a single month rather than returning the whole ledger: the payload
 * stays the same size in year five as in year one, and the day drill-down can
 * open without another round trip.
 */
export async function GET(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const { searchParams } = new URL(req.url)
  const month = normaliseMonth(searchParams.get('month'), monthOfDate())

  const [txns, projects, clients, recurring, settings] = await Promise.all([
    listTransactions(),
    listProjects(),
    listClients(),
    listRecurring(),
    getEffectiveFinanceSettings(),
  ])

  return NextResponse.json(
    buildMonthLedger(month, txns, projects, clients, recurring, settings),
  )
}
