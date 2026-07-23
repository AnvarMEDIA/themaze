import { NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { buildSummary } from '@/lib/finance/stats'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked
  return NextResponse.json(await buildSummary())
}
