/**
 * Server-side dashboard aggregation. All headline figures are converted to
 * the base currency via the editable rates in settings; `revenueByCurrency`
 * keeps native amounts so the user can sanity-check the conversion.
 */
import { listClients, listProjects, listTransactions } from './data'
import { getEffectiveFinanceSettings } from './settings'
import { toBase, missingRates } from './money'
import { projectRollup } from './rollup'
import type {
  FinanceSummary,
  MonthlyPoint,
  ClientRevenue,
  Currency,
  FinanceTransaction,
  ProjectStatus,
} from './types'

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function buildSummary(): Promise<FinanceSummary> {
  const [clients, projects, txns, settings] = await Promise.all([
    listClients(),
    listProjects(),
    listTransactions(),
    getEffectiveFinanceSettings(),
  ])

  const nowDate = new Date()
  const thisYear = nowDate.getFullYear()
  const thisMonth = monthKey(nowDate)

  const income = txns.filter((t) => t.type === 'income')
  const expense = txns.filter((t) => t.type === 'expense')
  const sumBase = (list: FinanceTransaction[]) =>
    list.reduce((s, t) => s + toBase(t.amount, t.currency, settings), 0)

  const revenueAllTime = sumBase(income)
  const revenueThisYear = sumBase(income.filter((t) => new Date(t.date).getFullYear() === thisYear))
  const revenueThisMonth = sumBase(income.filter((t) => monthKey(new Date(t.date)) === thisMonth))
  const expenseThisYear = sumBase(expense.filter((t) => new Date(t.date).getFullYear() === thisYear))
  const profitThisYear = revenueThisYear - expenseThisYear

  // Receivables: unpaid balance on signed projects (active + completed).
  // Uses the same rollup as the Projects page so the two can't disagree.
  let outstanding = 0
  for (const p of projects) {
    if (p.status !== 'active' && p.status !== 'completed') continue
    const { outstanding: due } = projectRollup(p, txns, settings)
    outstanding += toBase(due, p.currency, settings)
  }

  const activeProjects = projects.filter((p) => p.status === 'active').length

  // Last 12 months (inclusive of current).
  const monthly: MonthlyPoint[] = []
  const monthIndex = new Map<string, MonthlyPoint>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(thisYear, nowDate.getMonth() - i, 1)
    const pt: MonthlyPoint = { month: monthKey(d), income: 0, expense: 0 }
    monthly.push(pt)
    monthIndex.set(pt.month, pt)
  }
  for (const t of txns) {
    const pt = monthIndex.get(monthKey(new Date(t.date)))
    if (!pt) continue
    const v = toBase(t.amount, t.currency, settings)
    if (t.type === 'income') pt.income += v
    else pt.expense += v
  }

  // Top clients by received income.
  const byClient = new Map<string | null, number>()
  for (const t of income) {
    byClient.set(t.clientId, (byClient.get(t.clientId) ?? 0) + toBase(t.amount, t.currency, settings))
  }
  const clientName = (id: string | null) =>
    id ? clients.find((c) => c.id === id)?.name ?? 'Unknown' : 'Unassigned'
  const topClients: ClientRevenue[] = [...byClient.entries()]
    .map(([clientId, total]) => ({ clientId, name: clientName(clientId), total }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const statuses: ProjectStatus[] = ['lead', 'active', 'completed', 'cancelled']
  const statusBreakdown = statuses.map((status) => {
    const rows = projects.filter((p) => p.status === status)
    return {
      status,
      count: rows.length,
      value: rows.reduce((s, p) => s + toBase(p.amount, p.currency, settings), 0),
    }
  })

  const byCurrency = new Map<Currency, number>()
  for (const t of income) byCurrency.set(t.currency, (byCurrency.get(t.currency) ?? 0) + t.amount)
  const revenueByCurrency = [...byCurrency.entries()].map(([currency, amount]) => ({ currency, amount }))

  // Any currency in use without a usable rate contributes 0 to the totals
  // above. Report it so the dashboard can warn instead of quietly under-
  // counting revenue.
  const currenciesInUse = [
    ...txns.map((t) => t.currency),
    ...projects.map((p) => p.currency),
  ]
  const unratedCurrencies = missingRates(currenciesInUse, settings)

  return {
    baseCurrency: settings.baseCurrency,
    generatedAt: nowDate.toISOString(),
    unratedCurrencies,
    totalTransactions: txns.length,
    kpis: {
      revenueAllTime,
      revenueThisYear,
      revenueThisMonth,
      expenseThisYear,
      profitThisYear,
      outstanding,
      activeProjects,
      totalClients: clients.length,
    },
    monthly,
    topClients,
    statusBreakdown,
    recentTransactions: txns.slice(0, 8),
    revenueByCurrency,
  }
}
