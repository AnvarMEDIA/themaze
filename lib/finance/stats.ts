/**
 * Server-side dashboard aggregation.
 *
 * Two kinds of figure live here and they must not be confused:
 *  - PERIOD figures (revenue, expense, profit, top clients, expense mix) cover
 *    the selected reporting window.
 *  - POINT-IN-TIME figures (outstanding, overdue, project/client counts)
 *    describe the business right now; scoping them to a period would be
 *    meaningless — a receivable doesn't stop existing because you're looking
 *    at last quarter.
 *
 * All money is converted to the base currency via the editable/CBU rates;
 * `revenueByCurrency` keeps native amounts so the conversion can be checked.
 */
import { listClients, listProjects, listRecurring, listTransactions } from './data'
import { getEffectiveFinanceSettings } from './settings'
import { toBase, missingRates } from './money'
import { projectRollup } from './rollup'
import { collectDue } from './recurring'
import { inPeriod, isoDate, monthOf, previousPeriod, resolvePeriod, type Period } from './period'
import type {
  FinanceSummary,
  MonthlyPoint,
  ClientRevenue,
  Currency,
  ExpenseCategory,
  FinanceTransaction,
  OverdueProject,
  ProjectStatus,
} from './types'

/** Month key for a calendar date string, timezone-proof. */
const monthKeyOf = (date: string) => monthOf(date)

export async function buildSummary(period?: Period): Promise<FinanceSummary> {
  const [clients, projects, txns, recurring, settings] = await Promise.all([
    listClients(),
    listProjects(),
    listTransactions(),
    listRecurring(),
    getEffectiveFinanceSettings(),
  ])

  const nowDate = new Date()
  const today = isoDate(nowDate)
  const range = period ?? resolvePeriod('year', nowDate)

  const base = (t: FinanceTransaction) => toBase(t.amount, t.currency, settings)
  const sumBase = (list: FinanceTransaction[]) => list.reduce((s, t) => s + base(t), 0)

  const income = txns.filter((t) => t.type === 'income')
  const expense = txns.filter((t) => t.type === 'expense')

  const inRange = (t: FinanceTransaction) => inPeriod(t.date, range)
  const periodIncome = income.filter(inRange)
  const periodExpense = expense.filter(inRange)

  const revenue = sumBase(periodIncome)
  const expenseTotal = sumBase(periodExpense)
  const profit = revenue - expenseTotal
  const revenueAllTime = sumBase(income)

  /* ── The comparable window before this one ───────────────────────────── */

  const prevRange = previousPeriod(range)
  let previous: FinanceSummary['previous'] = null
  if (prevRange) {
    const prevIn = (t: FinanceTransaction) => inPeriod(t.date, prevRange)
    const prevRevenue = sumBase(income.filter(prevIn))
    const prevExpense = sumBase(expense.filter(prevIn))
    previous = {
      from: prevRange.from,
      to: prevRange.to,
      revenue: prevRevenue,
      expense: prevExpense,
      profit: prevRevenue - prevExpense,
    }
  }

  /* ── Receivables (point-in-time) ─────────────────────────────────────── */

  const clientLabel = (id: string | null) => {
    if (!id) return ''
    const c = clients.find((x) => x.id === id)
    return c ? (c.company.trim() || c.name.trim()) : ''
  }

  let outstanding = 0
  let overdue = 0
  const overdueProjects: OverdueProject[] = []

  for (const p of projects) {
    if (p.status !== 'active' && p.status !== 'completed') continue
    // Same rollup the Projects page uses, so the two can't disagree.
    const { outstanding: due } = projectRollup(p, txns, settings)
    if (due <= 0) continue
    const dueBase = toBase(due, p.currency, settings)
    outstanding += dueBase

    // Past its agreed end date and still unpaid.
    if (p.endDate && p.endDate < today) {
      overdue += dueBase
      overdueProjects.push({
        id: p.id,
        title: p.title,
        client: clientLabel(p.clientId),
        outstanding: dueBase,
        dueDate: p.endDate,
        daysLate: Math.max(
          0,
          Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${p.endDate}T00:00:00Z`)) / 86_400_000),
        ),
      })
    }
  }
  overdueProjects.sort((a, b) => b.daysLate - a.daysLate)

  const activeProjects = projects.filter((p) => p.status === 'active').length

  /* ── 12-month trend (independent of the selected period) ─────────────── */

  const monthly: MonthlyPoint[] = []
  const monthIndex = new Map<string, MonthlyPoint>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
    const pt: MonthlyPoint = { month: monthOf(isoDate(d)), income: 0, expense: 0 }
    monthly.push(pt)
    monthIndex.set(pt.month, pt)
  }
  for (const t of txns) {
    const pt = monthIndex.get(monthKeyOf(t.date))
    if (!pt) continue
    if (t.type === 'income') pt.income += base(t)
    else pt.expense += base(t)
  }

  /* ── Period breakdowns ───────────────────────────────────────────────── */

  const byClient = new Map<string | null, number>()
  for (const t of periodIncome) byClient.set(t.clientId, (byClient.get(t.clientId) ?? 0) + base(t))
  const topClients: ClientRevenue[] = [...byClient.entries()]
    .map(([clientId, total]) => ({ clientId, name: clientLabel(clientId), total }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Where the money went — an unlabelled expense is grouped rather than dropped.
  const byCategory = new Map<string, number>()
  for (const t of periodExpense) {
    const key = t.category.trim() || ''
    byCategory.set(key, (byCategory.get(key) ?? 0) + base(t))
  }
  const expenseCategories: ExpenseCategory[] = [...byCategory.entries()]
    .map(([category, total]) => ({ category, total }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

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
  for (const t of periodIncome) byCurrency.set(t.currency, (byCurrency.get(t.currency) ?? 0) + t.amount)
  const revenueByCurrency = [...byCurrency.entries()].map(([currency, amount]) => ({ currency, amount }))

  // Any currency in use without a usable rate contributes 0 to the totals
  // above. Report it so the dashboard can warn instead of quietly under-
  // counting revenue.
  const unratedCurrencies = missingRates(
    [...txns.map((t) => t.currency), ...projects.map((p) => p.currency)],
    settings,
  )

  return {
    baseCurrency: settings.baseCurrency,
    generatedAt: nowDate.toISOString(),
    period: { from: range.from, to: range.to, preset: range.preset },
    unratedCurrencies,
    rates: settings.rates,
    ratesSource: settings.ratesSource,
    totalTransactions: txns.length,
    kpis: {
      revenue,
      expense: expenseTotal,
      profit,
      revenueAllTime,
      outstanding,
      overdue,
      activeProjects,
      totalClients: clients.length,
    },
    previous,
    dueRecurring: collectDue(recurring, today),
    monthly,
    topClients,
    statusBreakdown,
    expenseCategories,
    overdueProjects: overdueProjects.slice(0, 6),
    recentTransactions: txns.slice(0, 8),
    revenueByCurrency,
  }
}
