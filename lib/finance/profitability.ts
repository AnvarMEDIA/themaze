/**
 * Per-project profit — the report an accountant actually asks for.
 *
 * Two deliberate choices, both about not inventing numbers:
 *
 *  - Profit is measured on CASH RECEIVED in the period, not on the contracted
 *    value. A signed project that hasn't paid yet has earned nothing; its
 *    unpaid balance is shown beside it as `outstanding` instead.
 *  - Only expenses explicitly linked to a project count as its cost. Studio
 *    overhead (rent, salaries, software) is totalled separately rather than
 *    apportioned, because how to split it is an accounting policy the studio
 *    owns — a made-up allocation would look authoritative and be wrong.
 *
 * `netProfit` = gross − overhead, which reconciles exactly with the
 * dashboard's profit KPI for the same period.
 */
import { toBase, rateOf, missingRates } from './money'
import { projectRollup } from './rollup'
import { inPeriod, type Period } from './period'
import type {
  Currency,
  FinanceClient,
  FinanceProject,
  FinanceSettings,
  FinanceTransaction,
  ProfitabilityReport,
  ProjectProfit,
} from './types'

export function buildProfitability(
  projects: FinanceProject[],
  txns: FinanceTransaction[],
  clients: FinanceClient[],
  settings: FinanceSettings,
  period: Period,
  now: Date = new Date(),
): ProfitabilityReport {
  const inRange = (t: FinanceTransaction) => inPeriod(t.date, period)
  const periodTxns = txns.filter(inRange)

  const clientLabel = (id: string | null) => {
    if (!id) return ''
    const c = clients.find((x) => x.id === id)
    return c ? (c.company.trim() || c.name.trim()) : ''
  }

  // Bucket the period's rows by project in one pass.
  const income = new Map<string, number>()
  const cost = new Map<string, number>()
  const unrated = new Map<string, Set<Currency>>()
  let overhead = 0

  const noteUnrated = (key: string, c: Currency) => {
    const set = unrated.get(key) ?? new Set<Currency>()
    set.add(c)
    unrated.set(key, set)
  }

  for (const t of periodTxns) {
    // Test the rate, not the converted result: a genuine zero-amount row is
    // perfectly convertible and must not be flagged as unknown.
    const rate = rateOf(t.currency, settings)
    const value = rate === null ? 0 : t.amount * rate

    if (!t.projectId) {
      // Unattached income is real revenue but belongs to no project, so it is
      // out of scope here; unattached expense is the studio's overhead.
      if (t.type === 'expense') {
        overhead += value
        if (rate === null) noteUnrated('__overhead__', t.currency)
      }
      continue
    }

    const bucket = t.type === 'income' ? income : cost
    bucket.set(t.projectId, (bucket.get(t.projectId) ?? 0) + value)
    if (rate === null) noteUnrated(t.projectId, t.currency)
  }

  const rows: ProjectProfit[] = projects.map((p) => {
    const received = income.get(p.id) ?? 0
    const directCost = cost.get(p.id) ?? 0
    const profit = received - directCost
    // Outstanding is point-in-time (all payments ever), not period-scoped —
    // a debt doesn't shrink because you narrowed the report window.
    const roll = projectRollup(p, txns, settings)
    return {
      id: p.id,
      title: p.title,
      client: clientLabel(p.clientId),
      status: p.status,
      contracted: toBase(p.amount, p.currency, settings),
      received,
      outstanding: toBase(roll.outstanding, p.currency, settings),
      directCost,
      profit,
      margin: received > 0 ? profit / received : null,
      unconverted: [...(unrated.get(p.id) ?? [])],
    }
  })

  // A project with no movement in the period and nothing owed is just noise.
  const visible = rows
    .filter((r) => r.received !== 0 || r.directCost !== 0 || r.outstanding > 0)
    .sort((a, b) => b.profit - a.profit)

  const totalReceived = visible.reduce((s, r) => s + r.received, 0)
  const totalCost = visible.reduce((s, r) => s + r.directCost, 0)
  const grossProfit = totalReceived - totalCost

  return {
    baseCurrency: settings.baseCurrency,
    period: { from: period.from, to: period.to, preset: period.preset },
    generatedAt: now.toISOString(),
    projects: visible,
    totals: {
      received: totalReceived,
      directCost: totalCost,
      overhead,
      grossProfit,
      netProfit: grossProfit - overhead,
    },
    unratedCurrencies: missingRates(
      [...periodTxns.map((t) => t.currency), ...projects.map((p) => p.currency)],
      settings,
    ),
  }
}
