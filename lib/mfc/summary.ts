/**
 * Everything the MFC dashboard shows, computed in one pass.
 *
 * Pure and injectable (`now` is a parameter), so the arithmetic can be tested
 * without a store or a clock.
 */
import { txBase, missingRates, unlockedRows } from '../finance/money'
import {
  addDays,
  daysBetween,
  inPeriod,
  isoDate,
  previousPeriod,
  type Period,
} from '../finance/period'
import type { FinanceSettings } from '../finance/types'
import type {
  MfcBucket,
  MfcBudgetLine,
  MfcCategory,
  MfcCategoryTotal,
  MfcExpense,
  MfcSummary,
} from './types'

/** Past this many days a per-day chart is a smear; switch to months. */
const DAY_BUCKET_LIMIT = 62

const monthOf = (date: string) => date.slice(0, 7)

/**
 * The period's real span, in days. An open-ended period (all time) is bounded
 * by the data itself, so "all time" doesn't divide by infinity.
 */
function spanOf(period: Period, expenses: MfcExpense[], today: string): { from: string; to: string } {
  const dates = expenses.map((e) => e.date).filter(Boolean).sort()
  const from = period.from || dates[0] || today
  const to = period.to || dates[dates.length - 1] || today
  return { from, to: to < from ? from : to }
}

/** Every bucket in the span, including the empty ones — a gap IS information. */
function emptyBuckets(from: string, to: string, granularity: 'day' | 'month'): Map<string, MfcBucket> {
  const out = new Map<string, MfcBucket>()
  if (granularity === 'day') {
    for (let d = from; d <= to; d = addDays(d, 1)) out.set(d, { key: d, total: 0, count: 0 })
    return out
  }
  let y = Number(from.slice(0, 4))
  let m = Number(from.slice(5, 7))
  const end = monthOf(to)
  for (let guard = 0; guard < 600; guard++) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    out.set(key, { key, total: 0, count: 0 })
    if (key >= end) break
    if (++m > 12) { m = 1; y++ }
  }
  return out
}

export function buildMfcSummary(
  expenses: MfcExpense[],
  categories: MfcCategory[],
  settings: FinanceSettings,
  period: Period,
  now: Date = new Date(),
): MfcSummary {
  const today = isoDate(now)
  const inRange = expenses.filter((e) => inPeriod(e.date, period))

  const byId = new Map(categories.map((c) => [c.id, c]))
  const value = (e: MfcExpense) => txBase(e, settings).value ?? 0

  /* ── headline ────────────────────────────────────────────────────────── */
  let total = 0
  let largest: MfcSummary['largest'] = null
  const catTotals = new Map<string, { total: number; count: number }>()

  for (const e of inRange) {
    const v = value(e)
    total += v
    const key = e.categoryId ?? ''
    const cur = catTotals.get(key) ?? { total: 0, count: 0 }
    cur.total += v
    cur.count += 1
    catTotals.set(key, cur)
    if (!largest || v > largest.amount) {
      largest = { amount: v, date: e.date, note: e.note, categoryId: e.categoryId }
    }
  }

  /* ── buckets over time ───────────────────────────────────────────────── */
  const span = spanOf(period, inRange, today)
  const spanDays = Math.max(1, daysBetween(span.from, span.to) + 1)
  const granularity: 'day' | 'month' = spanDays > DAY_BUCKET_LIMIT ? 'month' : 'day'
  const buckets = emptyBuckets(span.from, span.to, granularity)

  for (const e of inRange) {
    const key = granularity === 'day' ? e.date.slice(0, 10) : monthOf(e.date)
    const b = buckets.get(key)
    if (!b) continue                     // a row outside the span can't happen, but don't invent a bucket
    b.total += value(e)
    b.count += 1
  }

  /**
   * The average is per day ELAPSED, not per day in the period. On the 3rd of
   * the month, dividing this month's spending by 31 reports a third of the
   * real burn rate and makes the number useless exactly when it is most
   * looked at.
   */
  const elapsedTo = span.to < today ? span.to : today
  const elapsed = Math.max(1, daysBetween(span.from, elapsedTo) + 1)
  const dailyAverage = total / elapsed

  /* ── categories, biggest first ───────────────────────────────────────── */
  const cats: MfcCategoryTotal[] = [...catTotals.entries()]
    .map(([id, agg]) => {
      const c = id ? byId.get(id) : undefined
      return {
        categoryId: id || null,
        name:   c?.name   ?? '',
        nameRu: c?.nameRu ?? '',
        icon:   c?.icon   ?? '',
        colorSlot: c?.colorSlot ?? 0,
        total: agg.total,
        count: agg.count,
        share: total > 0 ? agg.total / total : 0,
        monthlyLimit: c?.monthlyLimit ?? 0,
      }
    })
    // Ties break on the id so two equal categories don't swap places between
    // reloads — a list that reshuffles on refresh reads as a bug.
    .sort((a, b) => b.total - a.total || (a.categoryId ?? '').localeCompare(b.categoryId ?? ''))

  /* ── the window before this one ──────────────────────────────────────── */
  const prevPeriod = previousPeriod(period)
  const previous = prevPeriod
    ? {
        from: prevPeriod.from,
        to: prevPeriod.to,
        total: expenses
          .filter((e) => inPeriod(e.date, prevPeriod))
          .reduce((s, e) => s + value(e), 0),
      }
    : null

  /**
   * Budgets always read the CURRENT calendar month, whatever period is on
   * screen. A monthly cap measured against a quarter would show 300% every
   * time and mean nothing.
   */
  const budgetMonth = today.slice(0, 7)
  const monthSpend = new Map<string, number>()
  for (const e of expenses) {
    if (monthOf(e.date) !== budgetMonth || !e.categoryId) continue
    monthSpend.set(e.categoryId, (monthSpend.get(e.categoryId) ?? 0) + value(e))
  }
  const budgets: MfcBudgetLine[] = categories
    .filter((c) => c.monthlyLimit > 0 && !c.archived)
    .map((c) => {
      const spent = monthSpend.get(c.id) ?? 0
      return {
        categoryId: c.id,
        name: c.name,
        nameRu: c.nameRu,
        icon: c.icon,
        colorSlot: c.colorSlot,
        limit: c.monthlyLimit,
        spent,
        ratio: c.monthlyLimit > 0 ? spent / c.monthlyLimit : 0,
      }
    })
    // Closest to blowing the budget first — that is the one worth seeing.
    .sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name))

  return {
    baseCurrency: settings.baseCurrency,
    rates: settings.rates,
    generatedAt: now.toISOString(),
    period: { from: period.from, to: period.to, preset: period.preset },
    total,
    count: inRange.length,
    dailyAverage,
    largest,
    previous,
    categories: cats,
    granularity,
    buckets: [...buckets.values()],
    budgets,
    budgetMonth,
    recent: inRange.slice(0, 8),
    unratedCurrencies: missingRates(inRange.map((e) => e.currency), settings),
    unlockedFxCount: unlockedRows(inRange, settings).length,
  }
}
