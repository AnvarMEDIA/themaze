import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listTransactions, createTransaction } from '@/lib/finance/data'
import { TransactionSchema } from '@/lib/finance/validation'
import { lockFor } from '@/lib/finance/fxLock'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked
  return NextResponse.json(await listTransactions())
}

export async function POST(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const parsed = TransactionSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  // Lock the day's rate onto the row now. What this money was worth today is
  // not a question we want re-answered by the market next year.
  const lock = await lockFor(parsed.data)
  const txn = await createTransaction({ ...parsed.data, ...(lock ?? {}) })
  return NextResponse.json(txn, { status: 201 })
}
