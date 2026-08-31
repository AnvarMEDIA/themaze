import { NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { listExpenses, listCategories } from '@/lib/mfc/data'

export const dynamic = 'force-dynamic'

/**
 * Everything the expenses screen needs, in one request.
 *
 * Three separate calls (rows, categories, settings) is three round trips on a
 * phone before anything renders; the screen is useless without all three, so
 * it asks once.
 */
export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const [expenses, categories, settings] = await Promise.all([
    listExpenses(),
    listCategories(),
    getEffectiveFinanceSettings(),
  ])

  return NextResponse.json({
    expenses,
    categories,
    baseCurrency: settings.baseCurrency,
    rates: settings.rates,
  })
}
