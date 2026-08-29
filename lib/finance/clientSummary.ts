/**
 * Everything about one client in one place: what they were billed, what they
 * have paid, what they still owe, and the work behind those numbers.
 *
 * Attribution is deliberately generous: a payment counts as theirs if it names
 * the client OR names one of their projects. Studios link one or the other and
 * rarely both, so requiring `clientId` would under-report a client who always
 * gets paid per project. The two paths are de-duplicated by row id.
 *
 * Pure and client-safe.
 */
import { txBaseValue, toBase, missingRates } from './money'
import { projectRollup } from './rollup'
import { isoDate, monthOf } from './period'
import type {
  Currency,
  FinanceClient,
  FinanceProject,
  FinanceSettings,
  FinanceTransaction,
  MonthlyPoint,
  ProjectStatus,
} from './types'

export interface ClientProjectLine {
  id: string
  title: string
  status: ProjectStatus
  currency: Currency
  /** In the project's own currency, as agreed. */
  amount: number
  received: number
  outstanding: number
  startDate: string
  endDate: string
  /** Past its end date with money still owed. */
  overdue: boolean
}

export interface ClientSummary {
  client: FinanceClient
  baseCurrency: Currency
  totals: {
    /** Agreed value of every project, cancelled ones excluded. */
    billed: number
    /** Money actually received, all time. */
    received: number
    /** Still owed on live work, right now. */
    outstanding: number
    /** The part of `outstanding` already past its due date. */
    overdue: number
    projects: number
    activeProjects: number
  }
  firstPayment: string
  lastPayment: string
  projects: ClientProjectLine[]
  /** Their payments, newest first. */
  payments: FinanceTransaction[]
  /** Income from this client over the last 12 months, in the base currency. */
  monthly: MonthlyPoint[]
  unratedCurrencies: Currency[]
}

/** Rows belonging to a client: named directly, or via one of their projects. */
export function clientTransactions(
  clientId: string,
  projects: FinanceProject[],
  txns: FinanceTransaction[],
): FinanceTransaction[] {
  const theirs = new Set(projects.filter((p) => p.clientId === clientId).map((p) => p.id))
  return txns.filter(
    (t) => t.clientId === clientId || (t.projectId !== null && theirs.has(t.projectId)),
  )
}

export function buildClientSummary(
  client: FinanceClient,
  projects: FinanceProject[],
  txns: FinanceTransaction[],
  settings: FinanceSettings,
  now: Date = new Date(),
): ClientSummary {
  const today = isoDate(now)
  const theirProjects = projects.filter((p) => p.clientId === client.id)
  const related = clientTransactions(client.id, projects, txns)
  const income = related.filter((t) => t.type === 'income')

  let outstanding = 0
  let overdue = 0
  let billed = 0

  const lines: ClientProjectLine[] = theirProjects.map((p) => {
    const roll = projectRollup(p, txns, settings)
    // `owed` is already zero for cancelled and lead work, so this needs no
    // status check of its own — one rule, one place.
    const isOverdue = roll.owed > 0 && !!p.endDate && p.endDate < today

    // A cancelled project was never really billed and can't be owed.
    if (p.status !== 'cancelled') billed += toBase(p.amount, p.currency, settings)
    const due = toBase(roll.owed, p.currency, settings)
    outstanding += due
    if (isOverdue) overdue += due

    return {
      id: p.id,
      title: p.title,
      status: p.status,
      currency: p.currency,
      amount: p.amount,
      received: roll.received,
      outstanding: roll.owed,
      startDate: p.startDate,
      endDate: p.endDate,
      overdue: isOverdue,
    }
  })

  // Sort by what needs attention: overdue first, then anything still owed.
  lines.sort((a, b) =>
    Number(b.overdue) - Number(a.overdue)
    || b.outstanding - a.outstanding
    || (b.startDate || '').localeCompare(a.startDate || ''),
  )

  const received = income.reduce((s, t) => s + txBaseValue(t, settings), 0)

  const dates = income.map((t) => t.date).filter(Boolean).sort()

  // Trailing 12 months, including empty ones so the shape reads as a timeline.
  const monthly: MonthlyPoint[] = []
  const index = new Map<string, MonthlyPoint>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const pt: MonthlyPoint = { month: monthOf(isoDate(d)), income: 0, expense: 0 }
    monthly.push(pt)
    index.set(pt.month, pt)
  }
  for (const t of related) {
    const pt = index.get(monthOf(t.date))
    if (!pt) continue
    const v = txBaseValue(t, settings)
    if (t.type === 'income') pt.income += v
    else pt.expense += v
  }

  return {
    client,
    baseCurrency: settings.baseCurrency,
    totals: {
      billed,
      received,
      outstanding,
      overdue,
      projects: theirProjects.length,
      activeProjects: theirProjects.filter((p) => p.status === 'active').length,
    },
    firstPayment: dates[0] ?? '',
    lastPayment: dates[dates.length - 1] ?? '',
    projects: lines,
    payments: [...related].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    monthly,
    unratedCurrencies: missingRates(
      [...related.map((t) => t.currency), ...theirProjects.map((p) => p.currency)],
      settings,
    ),
  }
}
