import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { buildSummary } from '@/lib/finance/stats'
import { periodFromParams } from '@/lib/finance/period'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const { searchParams } = new URL(req.url)
  const period = periodFromParams({
    preset: searchParams.get('preset'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })

  return NextResponse.json(await buildSummary(period))
}
