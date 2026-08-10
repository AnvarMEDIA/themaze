import { NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listClients, listProjects, listRecurring, listTransactions } from '@/lib/finance/data'
import { getFinanceSettings } from '@/lib/finance/settings'

export const dynamic = 'force-dynamic'

/** Bumped only when the shape changes in a way a reader would need to know. */
const BACKUP_VERSION = 1

/**
 * The whole finance dataset as one JSON file, so the studio's books are never
 * hostage to this deployment.
 *
 * Deliberately assembled field by field from the entity readers rather than by
 * dumping the store: the finance password hash lives in the store too, under
 * its own key, and a "back everything up" that walked the store would put it in
 * the user's Downloads folder. Nothing here can reach it.
 */
export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const [clients, projects, transactions, recurring, settings] = await Promise.all([
    listClients(),
    listProjects(),
    listTransactions(),
    listRecurring(),
    getFinanceSettings(),
  ])

  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      clients: clients.length,
      projects: projects.length,
      transactions: transactions.length,
      recurring: recurring.length,
    },
    // Exchange rates and the base currency only — never credentials.
    settings: {
      baseCurrency: settings.baseCurrency,
      rates: settings.rates,
      autoRates: settings.autoRates,
    },
    clients,
    projects,
    transactions,
    recurring,
  }

  const stamp = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="maze-finance-backup-${stamp}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
