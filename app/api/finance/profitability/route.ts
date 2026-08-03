import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listClients, listProjects, listTransactions } from '@/lib/finance/data'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { buildProfitability } from '@/lib/finance/profitability'
import { periodFromParams } from '@/lib/finance/period'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const { searchParams } = new URL(req.url)
  const period = periodFromParams({
    preset: searchParams.get('preset'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })

  const [projects, txns, clients, settings] = await Promise.all([
    listProjects(),
    listTransactions(),
    listClients(),
    getEffectiveFinanceSettings(),
  ])

  return NextResponse.json(buildProfitability(projects, txns, clients, settings, period))
}
