import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listCategories, createCategory, reorderCategories } from '@/lib/mfc/data'
import { MfcCategorySchema, MfcReorderSchema } from '@/lib/mfc/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked
  // The first read seeds the defaults, so the quick-add grid is never empty.
  return NextResponse.json(await listCategories())
}

export async function POST(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const parsed = MfcCategorySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await createCategory(parsed.data), { status: 201 })
}

/** Reordering the grid — one write for the whole arrangement. */
export async function PUT(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const parsed = MfcReorderSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  await reorderCategories(parsed.data.ids)
  return NextResponse.json(await listCategories())
}
