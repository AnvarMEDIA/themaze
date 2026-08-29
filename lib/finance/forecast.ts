/**
 * Cash-flow forecast: what is expected in and out over the coming months.
 *
 * Three honesty rules shape this, because a forecast that reads as fact is
 * worse than no forecast:
 *
 *  1. It reports EXPECTED NET, never a balance. The module has no idea what is
 *     in the bank, and calling a running total "balance" would invent one.
 *  2. Every figure says where it came from. Receivables and scheduled payments
 *     are commitments; other spending is a run-rate estimate from recent
 *     months, reported separately with the basis attached so it can be judged.
 *  3. Money that cannot be placed on the timeline is not quietly dropped.
 *     A signed project with no end date has a real balance owed but no month
 *     to put it in, so it is reported as `unscheduled` instead of vanishing.
 *
 * Pure and client-safe.
 */
import { rateOf, toBase, txBaseValue, missingRates } from './money'
import { projectRollup } from './rollup'
import { dueDates } from './recurring'
import { addMonths, isoDate, monthOf } from './period'
import type {
  Currency,
  FinanceProject,
  FinanceRecurring,
  FinanceSettings,
  FinanceTransaction,
} from './types'

/** Months of history the "other spending" run-rate is averaged over. */
export const RUN_RATE_MONTHS = 3
export const DEFAULT_FORECAST_MONTHS = 6
export const MAX_FORECAST_MONTHS = 24

export interface ForecastMonth {
  month: string
  /** Unpaid project balances whose end date falls in this month. */
  receivables: number
  /** Already-overdue balances, all carried into the first month. */
  overdue: number
  /** Recurring income scheduled for this month. */
  scheduledIn: number
  /** Recurring expenses scheduled for this month. */
  scheduledOut: number
  /** Estimated non-recurring spending, from the recent run rate. */
  estimatedOut: number
  /** (receivables + overdue + scheduledIn) − (scheduledOut + estimatedOut). */
  net: number
  /** Running sum of `net`. Expected movement, NOT a bank balance. */
  cumulative: number
}

export interface Forecast {
  baseCurrency: Currency
  generatedAt: string
  months: ForecastMonth[]
  /** Owed on live work with no end date — real money, but unplaceable. */
  unscheduled: number
  runRate: {
    /** Months of history averaged. */
    months: number
    /** Average monthly non-recurring spend across them. */
    monthlyAverage: number
    /** False when there is no history yet, so the estimate is a guess of zero. */
    hasHistory: boolean
  }
  totals: {
    expectedIn: number
    expectedOut: number
    net: number
  }
  unratedCurrencies: Currency[]
}

export function buildForecast(
  projects: FinanceProject[],
  txns: FinanceTransaction[],
  recurring: FinanceRecurring[],
  settings: FinanceSettings,
  months: number = DEFAULT_FORECAST_MONTHS,
  now: Date = new Date(),
): Forecast {
  const span = Math.min(Math.max(1, Math.trunc(months)), MAX_FORECAST_MONTHS)
  const today = isoDate(now)
  const thisMonth = monthOf(today)

  const window: ForecastMonth[] = []
  const index = new Map<string, ForecastMonth>()
  for (let i = 0; i < span; i++) {
    const m = monthOf(addMonths(`${thisMonth}-01`, i, 1))
    const row: ForecastMonth = {
      month: m,
      receivables: 0, overdue: 0, scheduledIn: 0, scheduledOut: 0,
      estimatedOut: 0, net: 0, cumulative: 0,
    }
    window.push(row)
    index.set(m, row)
  }
  const first = window[0]
  const lastMonth = window[window.length - 1].month

  /* ── Receivables: unpaid balances, placed on their due month ─────────── */

  let unscheduled = 0
  for (const p of projects) {
    if (p.status !== 'active' && p.status !== 'completed') continue
    const { owed } = projectRollup(p, txns, settings)
    if (owed <= 0) continue
    const due = toBase(owed, p.currency, settings)

    if (!p.endDate) {
      // Owed, but there is no date to expect it on. Say so rather than
      // guessing a month or dropping the money.
      unscheduled += due
      continue
    }
    if (p.endDate < today) {
      // Already late: expect it now, not on a date that has passed.
      first.overdue += due
      continue
    }
    const row = index.get(monthOf(p.endDate))
    // Beyond the horizon — outside the window, so outside the forecast.
    if (row) row.receivables += due
  }

  /* ── Scheduled recurring payments ────────────────────────────────────── */

  const horizonEnd = `${lastMonth}-28`
  for (const rec of recurring) {
    // Ask the schedule as at the far end of the window, then keep what lands
    // inside it. Occurrences already due but unposted count too: they are
    // still money the studio expects to move.
    for (const date of dueDates(rec, horizonEnd).dates) {
      const row = index.get(monthOf(date)) ?? (date < today ? first : undefined)
      if (!row) continue
      const value = toBase(rec.amount, rec.currency, settings)
      if (rec.type === 'income') row.scheduledIn += value
      else row.scheduledOut += value
    }
  }

  /* ── Run rate for everything else ────────────────────────────────────── */

  // The last N COMPLETE months — the current one is still filling up, and
  // averaging a half-finished month drags the estimate down.
  const historyMonths: string[] = []
  for (let i = 1; i <= RUN_RATE_MONTHS; i++) {
    historyMonths.push(monthOf(addMonths(`${thisMonth}-01`, -i, 1)))
  }
  const historySet = new Set(historyMonths)

  let historicalOther = 0
  for (const t of txns) {
    if (t.type !== 'expense') continue
    if (!historySet.has(monthOf(t.date))) continue
    // Recurring commitments are counted explicitly above; including them here
    // as well would bill the studio twice for its own rent.
    if (t.recurringId) continue
    historicalOther += txBaseValue(t, settings)
  }

  const earliest = txns.reduce((min, t) => (t.date && t.date < min ? t.date : min), today)
  const hasHistory = earliest < `${thisMonth}-01`
  const monthlyAverage = hasHistory ? historicalOther / RUN_RATE_MONTHS : 0

  for (const row of window) row.estimatedOut = monthlyAverage

  /* ── Roll up ─────────────────────────────────────────────────────────── */

  let cumulative = 0
  let expectedIn = 0
  let expectedOut = 0
  for (const row of window) {
    const inflow = row.receivables + row.overdue + row.scheduledIn
    const outflow = row.scheduledOut + row.estimatedOut
    row.net = inflow - outflow
    cumulative += row.net
    row.cumulative = cumulative
    expectedIn += inflow
    expectedOut += outflow
  }

  return {
    baseCurrency: settings.baseCurrency,
    generatedAt: now.toISOString(),
    months: window,
    unscheduled,
    runRate: { months: RUN_RATE_MONTHS, monthlyAverage, hasHistory },
    totals: { expectedIn, expectedOut, net: expectedIn - expectedOut },
    unratedCurrencies: missingRates(
      [...txns.map((t) => t.currency), ...projects.map((p) => p.currency), ...recurring.map((r) => r.currency)],
      settings,
    ),
  }
}
