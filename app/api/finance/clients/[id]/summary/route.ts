import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getClient, listProjects, listTransactions } from '@/lib/finance/data'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { buildClientSummary } from '@/lib/finance/clientSummary'

export const dynamic = 'force-dynamic'

interface Ctx { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const client = await getClient(params.id)
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [projects, txns, settings] = await Promise.all([
    listProjects(),
    listTransactions(),
    getEffectiveFinanceSettings(),
  ])

  return NextResponse.json(buildClientSummary(client, projects, txns, settings))
}
