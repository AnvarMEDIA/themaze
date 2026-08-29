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
import { toBase, txBase, missingRates } from './money'
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
  let otherIncome = 0

  const noteUnrated = (key: string, c: Currency) => {
    const set = unrated.get(key) ?? new Set<Currency>()
    set.add(c)
    unrated.set(key, set)
  }

  for (const t of periodTxns) {
    // Test the rate, not the converted result: a genuine zero-amount row is
    // perfectly convertible and must not be flagged as unknown.
    const { value: converted, locked } = txBase(t, settings)
    const value = converted ?? 0

    if (!t.projectId) {
      // Two mirror buckets for money that belongs to no single project:
      // expenses are the studio's overhead, income is everything earned
      // outside a project — a retainer, a one-off, a payment recorded against
      // the client only. Both sit outside the per-project table but inside the
      // net result, or "net profit" would not be net.
      if (t.type === 'expense') {
        overhead += value
        if (converted === null) noteUnrated('__overhead__', t.currency)
      } else {
        otherIncome += value
        if (converted === null) noteUnrated('__otherIncome__', t.currency)
      }
      continue
    }

    const bucket = t.type === 'income' ? income : cost
    bucket.set(t.projectId, (bucket.get(t.projectId) ?? 0) + value)
    if (converted === null) noteUnrated(t.projectId, t.currency)
    void locked
  }

  const rows: ProjectProfit[] = projects.map((p) => {
    const received = income.get(p.id) ?? 0
    const directCost = cost.get(p.id) ?? 0
    const profit = received - directCost
    // Outstanding is point-in-time (all payments ever), not period-scoped —
    // a debt doesn't shrink because you narrowed the report window. Cancelled
    // and lead work owes nothing: nobody is going to pay for a job that was
    // called off, and counting it here contradicted the dashboard's figure.
    const roll = projectRollup(p, txns, settings)
    const outstanding = toBase(roll.owed, p.currency, settings)
    return {
      id: p.id,
      title: p.title,
      client: clientLabel(p.clientId),
      status: p.status,
      contracted: toBase(p.amount, p.currency, settings),
      received,
      outstanding,
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
      otherIncome,
      overhead,
      grossProfit,
      // Everything the period earned, less everything it spent. Both the
      // unattached buckets belong here, so this equals the dashboard's profit
      // for the same window — which the label beside it claims.
      netProfit: grossProfit + otherIncome - overhead,
    },
    unratedCurrencies: missingRates(
      [...periodTxns.map((t) => t.currency), ...projects.map((p) => p.currency)],
      settings,
    ),
  }
}
