import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { periodFromParams, inPeriod } from '@/lib/finance/period'
import { txBase } from '@/lib/finance/money'
import { csvBody, csvHeaders, periodStamp } from '@/lib/finance/csv'
import { listExpenses, listCategories } from '@/lib/mfc/data'

export const dynamic = 'force-dynamic'

/** Personal spending as a spreadsheet — the same rows the list screen shows. */
export async function GET(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const { searchParams } = new URL(req.url)
  const period = periodFromParams({
    preset: searchParams.get('preset'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })
  const categoryFilter = searchParams.get('category') ?? ''
  const search = (searchParams.get('q') ?? '').trim().toLowerCase()

  const [expenses, categories, settings] = await Promise.all([
    listExpenses(), listCategories(), getEffectiveFinanceSettings(),
  ])
  const byId = new Map(categories.map((c) => [c.id, c]))
  const base = settings.baseCurrency

  const rows: (string | number)[][] = [[
    'Date', 'Category', 'Amount', 'Currency', `Amount (${base})`, 'Rate locked', 'Method', 'Note',
  ]]

  for (const e of expenses) {
    if (!inPeriod(e.date, period)) continue
    if (categoryFilter && (e.categoryId ?? '') !== (categoryFilter === 'none' ? '' : categoryFilter)) continue
    const cat = e.categoryId ? byId.get(e.categoryId) : undefined
    if (search && !`${cat?.name ?? ''} ${cat?.nameRu ?? ''} ${e.note}`.toLowerCase().includes(search)) continue

    const { value, locked } = txBase(e, settings)
    rows.push([
      e.date,
      cat?.name ?? '',
      e.amount,
      e.currency,
      // Blank, not 0 — an unconvertible row has an unknown base value, and a
      // zero in a spreadsheet column silently drags the total down.
      value === null ? '' : Math.round(value * 100) / 100,
      locked ? 'yes' : 'no',
      e.method,
      e.note,
    ])
  }

  return new NextResponse(csvBody(rows), {
    headers: csvHeaders(`maze-mfc-${periodStamp(period)}.csv`),
  })
}
