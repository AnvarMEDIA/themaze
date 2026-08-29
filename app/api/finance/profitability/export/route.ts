import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listClients, listProjects, listTransactions } from '@/lib/finance/data'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { buildProfitability } from '@/lib/finance/profitability'
import { periodFromParams } from '@/lib/finance/period'
import { csvBody, csvHeaders, periodStamp } from '@/lib/finance/csv'

export const dynamic = 'force-dynamic'

/** The project P&L as a spreadsheet, in the base currency throughout. */
export async function GET(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const { searchParams } = new URL(req.url)
  const period = periodFromParams({
    preset: searchParams.get('preset'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })

  const [projects, txns, clients, settings] = await Promise.all([
    listProjects(),
    listTransactions(),
    listClients(),
    getEffectiveFinanceSettings(),
  ])

  const report = buildProfitability(projects, txns, clients, settings, period)
  const cur = report.baseCurrency

  const rows: (string | number)[][] = [[
    'Project', 'Client', 'Status',
    `Contracted (${cur})`, `Received (${cur})`, `Direct costs (${cur})`,
    `Profit (${cur})`, 'Margin %', `Outstanding (${cur})`,
  ]]

  for (const p of report.projects) {
    rows.push([
      p.title, p.client, p.status,
      p.contracted, p.received, p.directCost, p.profit,
      // Blank, not 0 — no revenue means the margin is undefined, not nil.
      p.margin === null ? '' : Math.round(p.margin * 1000) / 10,
      p.outstanding,
    ])
  }

  // Totals, spelled out so the sheet reconciles with the dashboard.
  rows.push([])
  rows.push(['Total received', '', '', '', report.totals.received])
  rows.push(['Total direct costs', '', '', '', '', report.totals.directCost])
  rows.push(['Gross profit', '', '', '', '', '', report.totals.grossProfit])
  rows.push(['Other income (no project)', '', '', '', report.totals.otherIncome])
  rows.push(['Overhead (unallocated expenses)', '', '', '', '', report.totals.overhead])
  rows.push(['Net profit', '', '', '', '', '', report.totals.netProfit])

  return new NextResponse(csvBody(rows), {
    headers: csvHeaders(`maze-profitability-${periodStamp(period)}.csv`),
  })
}
