import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getTransaction, updateTransaction, deleteTransaction, type TransactionInput } from '@/lib/finance/data'
import { TransactionUpdateSchema, parsePatch } from '@/lib/finance/validation'
import { lockFor, lockNeedsRefresh } from '@/lib/finance/fxLock'

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
  // parsePatch, not safeParse: a PATCH must touch only the fields it sent.
  const parsed = parsePatch(TransactionUpdateSchema, await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  const before = await getTransaction(params.id)
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only a change of currency or date can change which rate applies. Editing a
  // note must never silently re-price a row that has already been reported on.
  // Typed as the stored shape, not the request shape: the fx fields are set by
  // the server from the CBU and are deliberately absent from the request schema,
  // so a client can never post its own exchange rate.
  let patch: Partial<TransactionInput> = parsed.data
  if (lockNeedsRefresh(before, patch)) {
    const next = { currency: patch.currency ?? before.currency, date: patch.date ?? before.date }
    const lock = await lockFor(next)
    patch = {
      ...patch,
      // Clear a stale lock even when a new one can't be obtained: a rate from
      // the wrong day is worse than an honest gap.
      fxRate: lock?.fxRate, fxBase: lock?.fxBase, fxDate: lock?.fxDate, fxSource: lock?.fxSource,
    }
  }

  const txn = await updateTransaction(params.id, patch)
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
