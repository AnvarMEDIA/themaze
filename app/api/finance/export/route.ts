import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listClients, listProjects, listTransactions } from '@/lib/finance/data'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'
import { rateOf } from '@/lib/finance/money'
import { periodFromParams, inPeriod } from '@/lib/finance/period'

export const dynamic = 'force-dynamic'

/**
 * CSV export of the ledger for an accountant or a spreadsheet.
 *
 * Honours the same filters as the Transactions screen so "what I see" is
 * "what I get". Amounts are exported twice: the original currency exactly as
 * entered, plus the base-currency equivalent used by the dashboard, so the
 * conversion is auditable rather than hidden.
 */

/** RFC 4180 quoting. A field starting with =, +, - or @ is prefixed with a
 *  quote so spreadsheets treat it as text instead of a formula. */
function csvCell(value: string | number | undefined | null): string {
  const s = value === undefined || value === null ? '' : String(value)
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

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
    `Amount (${settings.baseCurrency})`, 'Client', 'Project', 'Category', 'Method', 'Note',
  ]

  const lines = [header.map(csvCell).join(',')]
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
      t.category,
      t.method,
      t.note,
    ].map(csvCell).join(','))
  }

  const stamp = period.from || period.to
    ? `${period.from || 'start'}_${period.to || 'today'}`
    : 'all'
  // The BOM makes Excel read UTF-8 (and therefore Cyrillic) correctly.
  const body = `﻿${lines.join('\r\n')}\r\n`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="maze-finance-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
