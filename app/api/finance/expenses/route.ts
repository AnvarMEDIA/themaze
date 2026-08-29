import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listTransactions } from '@/lib/finance/data'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { buildExpenseBreakdown } from '@/lib/finance/expenseBreakdown'
import { periodFromParams } from '@/lib/finance/period'

export const dynamic = 'force-dynamic'

/** Spending for a period, grouped by kind and by who was paid. */
export async function GET(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const { searchParams } = new URL(req.url)
  const period = periodFromParams({
    preset: searchParams.get('preset'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })

  const [txns, settings] = await Promise.all([
    listTransactions(),
    getEffectiveFinanceSettings(),
  ])

  return NextResponse.json(buildExpenseBreakdown(txns, settings, period))
}
