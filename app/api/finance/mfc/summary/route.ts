import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { listExpenses, listCategories } from '@/lib/mfc/data'
import { mfcNow, mfcPeriodFromParams } from '@/lib/mfc/period'
import { buildMfcSummary } from '@/lib/mfc/summary'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const { searchParams } = new URL(req.url)
  // The window and "today" both come from the browser: this process runs in
  // UTC and would otherwise answer a Tashkent morning with yesterday's month.
  const period = mfcPeriodFromParams({
    preset: searchParams.get('preset'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })
  const now = mfcNow(searchParams.get('today'))

  const [expenses, categories, settings] = await Promise.all([
    listExpenses(),
    listCategories(),
    // Shared with the company ledger on purpose: one person, one base
    // currency, one set of rates.
    getEffectiveFinanceSettings(),
  ])

  return NextResponse.json(buildMfcSummary(expenses, categories, settings, period, now))
}
