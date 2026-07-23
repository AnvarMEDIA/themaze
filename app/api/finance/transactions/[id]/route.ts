import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getTransaction, updateTransaction, deleteTransaction } from '@/lib/finance/data'
import { TransactionUpdateSchema } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

interface Ctx { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const txn = await getTransaction(params.id)
  if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(txn)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const parsed = TransactionUpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  const txn = await updateTransaction(params.id, parsed.data)
  if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(txn)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const ok = await deleteTransaction(params.id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
