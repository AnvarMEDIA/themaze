import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { updateCategory, deleteCategory } from '@/lib/mfc/data'
import { MfcCategoryUpdateSchema } from '@/lib/mfc/validation'
import { parsePatch } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

interface Ctx { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  // Only the keys actually sent — otherwise renaming a category would also
  // reset its budget to 0 and its colour to the first slot.
  const parsed = parsePatch(MfcCategoryUpdateSchema, await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  const row = await updateCategory(params.id, parsed.data)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

/**
 * Deleting keeps the spending and drops the label — the money still left the
 * account. Archiving (PATCH `{ archived: true }`) is the softer option and is
 * what the UI offers first.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const ok = await deleteCategory(params.id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
