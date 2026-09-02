import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { lockFor } from '@/lib/finance/fxLock'
import { inPeriod } from '@/lib/finance/period'
import { listExpenses, createExpense } from '@/lib/mfc/data'
import { MfcExpenseSchema } from '@/lib/mfc/validation'

export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * The ledger, optionally narrowed to a window.
 *
 * `?from=&to=` is what the dashboard uses to open one day out of the chart:
 * asking for the whole ledger to show a single column's worth of rows is a
 * lot of data for a phone to carry for one tap. Both bounds are inclusive;
 * either may be omitted, and anything unparseable is ignored rather than
 * treated as a bound, so a mangled URL returns everything instead of nothing.
 */
export async function GET(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const { searchParams } = new URL(req.url)
  const raw = { from: searchParams.get('from'), to: searchParams.get('to') }
  const from = raw.from && DATE_RE.test(raw.from) ? raw.from : ''
  const to = raw.to && DATE_RE.test(raw.to) ? raw.to : ''

  const rows = await listExpenses()
  if (!from && !to) return NextResponse.json(rows)

  const [a, b] = from && to && from > to ? [to, from] : [from, to]
  return NextResponse.json(rows.filter((e) => inPeriod(e.date, { from: a, to: b })))
}

export async function POST(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const parsed = MfcExpenseSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  // Lock the day's rate now — $20 spent today stays worth today's som next
  // year, so a past month's total never moves. Same rule as the company ledger.
  const lock = await lockFor(parsed.data)
  const row = await createExpense({ ...parsed.data, ...(lock ?? {}) })
  return NextResponse.json(row, { status: 201 })
}
