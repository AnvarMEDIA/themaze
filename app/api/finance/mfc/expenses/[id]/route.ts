import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { lockFor, lockNeedsRefresh } from '@/lib/finance/fxLock'
import { getExpense, updateExpense, deleteExpense, type ExpenseInput } from '@/lib/mfc/data'
import { MfcExpenseUpdateSchema } from '@/lib/mfc/validation'
import { parsePatch } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

interface Ctx { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const row = await getExpense(params.id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  // parsePatch, not safeParse: Zod's `.partial()` leaves `.default()` alive, so
  // a plain safeParse of `{ note }` would also write the default method and
  // categoryId:null over real data.
  const parsed = parsePatch(MfcExpenseUpdateSchema, await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  const before = await getExpense(params.id)
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let patch: Partial<ExpenseInput> = parsed.data
  if (lockNeedsRefresh(before, patch)) {
    const next = { currency: patch.currency ?? before.currency, date: patch.date ?? before.date }
    const lock = await lockFor(next)
    // Clear a stale lock even when a new one can't be fetched: a rate from the
    // wrong day is worse than an honest gap.
    patch = { ...patch, fxRate: lock?.fxRate, fxBase: lock?.fxBase, fxDate: lock?.fxDate, fxSource: lock?.fxSource }
  }

  const row = await updateExpense(params.id, patch)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const ok = await deleteExpense(params.id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
