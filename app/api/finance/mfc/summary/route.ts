import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { periodFromParams } from '@/lib/finance/period'
import { listExpenses, listCategories } from '@/lib/mfc/data'
import { buildMfcSummary } from '@/lib/mfc/summary'

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

  const [expenses, categories, settings] = await Promise.all([
    listExpenses(),
    listCategories(),
    // Shared with the company ledger on purpose: one person, one base
    // currency, one set of rates.
    getEffectiveFinanceSettings(),
  ])

  return NextResponse.json(buildMfcSummary(expenses, categories, settings, period))
}
