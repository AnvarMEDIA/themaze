import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { lockFor } from '@/lib/finance/fxLock'
import { listExpenses, createExpense } from '@/lib/mfc/data'
import { MfcExpenseSchema } from '@/lib/mfc/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked
  return NextResponse.json(await listExpenses())
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
