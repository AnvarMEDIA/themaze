import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listTransactions, createTransaction } from '@/lib/finance/data'
import { TransactionSchema } from '@/lib/finance/validation'

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
  const txn = await createTransaction(parsed.data)
  return NextResponse.json(txn, { status: 201 })
}
