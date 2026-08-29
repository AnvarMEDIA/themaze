import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listClients, listProjects, listTransactions } from '@/lib/finance/data'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { rateOf } from '@/lib/finance/money'
import { periodFromParams, inPeriod } from '@/lib/finance/period'
import { csvBody, csvHeaders, periodStamp } from '@/lib/finance/csv'
import { payeeKey } from '@/lib/finance/expenseKind'

export const dynamic = 'force-dynamic'

/**
 * CSV export of the ledger for an accountant or a spreadsheet.
 *
 * Honours the same filters as the Transactions screen so "what I see" is
 * "what I get". Amounts are exported twice: the original currency exactly as
 * entered, plus the base-currency equivalent used by the dashboard, so the
 * conversion is auditable rather than hidden.
 */

export async function GET(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const { searchParams } = new URL(req.url)
  const period = periodFromParams({
    preset: searchParams.get('preset'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })
  const type = searchParams.get('type')
  const clientId = searchParams.get('clientId')
  const projectId = searchParams.get('projectId')
  const q = (searchParams.get('q') ?? '').trim().toLowerCase()
  const kind = searchParams.get('kind')
  const payee = searchParams.get('payee')

  const [txns, projects, clients, settings] = await Promise.all([
    listTransactions(),
    listProjects(),
    listClients(),
    getEffectiveFinanceSettings(),
  ])

  const projName = new Map(projects.map((p) => [p.id, p.title]))
  const cliName = new Map(clients.map((c) => [c.id, c.company.trim() || c.name.trim()]))

  const rows = txns.filter((t) => {
    if (!inPeriod(t.date, period)) return false
    if (type === 'income' || type === 'expense') { if (t.type !== type) return false }
    if (clientId && t.clientId !== clientId) return false
    if (projectId && t.projectId !== projectId) return false
    // Same rule as the screen: both axes describe spending, so both imply
    // "expense". 'unclassified' means an expense with no kind.
    if (kind) {
      if (t.type !== 'expense') return false
      if (kind === 'unclassified' ? !!t.expenseKind : t.expenseKind !== kind) return false
    }
    if (payee && (t.type !== 'expense' || payeeKey(t.payee) !== payee)) return false
    if (q) {
      const hay = [
        t.category, t.note,
        t.projectId ? projName.get(t.projectId) ?? '' : '',
        t.clientId ? cliName.get(t.clientId) ?? '' : '',
      ].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const header = [
    'Date', 'Type', 'Amount', 'Currency',
    `Amount (${settings.baseCurrency})`, 'Client', 'Project', 'Kind', 'Paid to', 'Category', 'Method', 'Note',
  ]

  const lines: (string | number)[][] = [header]
  for (const t of rows) {
    // Test the rate, not the result: a genuine zero-amount row in a foreign
    // currency is perfectly convertible and must not be reported as unknown.
    const rate = rateOf(t.currency, settings)
    lines.push([
      t.date,
      t.type,
      t.amount,
      t.currency,
      // An unconvertible amount exports blank rather than a misleading 0.
      rate === null ? '' : t.amount * rate,
      t.clientId ? cliName.get(t.clientId) ?? '' : '',
      t.projectId ? projName.get(t.projectId) ?? '' : '',
      t.expenseKind ?? '',
      t.payee ?? '',
      t.category,
      t.method,
      t.note,
    ])
  }

  return new NextResponse(csvBody(lines), {
    headers: csvHeaders(`maze-finance-${periodStamp(period)}.csv`),
  })
}
