/**
 * Month ledger — the per-day view behind the dashboard calendar.
 *
 * Everything here works on calendar strings ("YYYY-MM-DD"), never Date
 * objects: a payment dated the 1st belongs to the 1st in Tashkent and in
 * London alike. See period.ts for the full reasoning.
 *
 * Pure and client-safe, so the grid can be laid out without a round trip and
 * the maths can be unit-tested on its own.
 */
import { rateOf, missingRates } from './money'
import { monthOf } from './period'
import type {
  Currency,
  FinanceClient,
  FinanceProject,
  FinanceRecurring,
  FinanceSettings,
  FinanceTransaction,
} from './types'
import { dueDates } from './recurring'

const pad = (n: number) => String(n).padStart(2, '0')

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

/** A day that has something on it. Days with no activity are not emitted. */
export interface CalendarDay {
  date: string
  /** Base-currency totals for the day. */
  income: number
  expense: number
  /** How many ledger rows fall on this day. */
  count: number
}

/** A project's agreed end date, shown so deadlines aren't a surprise. */
export interface CalendarDeadline {
  date: string
  projectId: string
  title: string
  client: string
  /** Still owed on it right now, in the project's own currency. */
  outstanding: number
  currency: Currency
}

/** A scheduled payment falling on this day (posted or not — it is a plan). */
export interface CalendarSchedule {
  date: string
  recurringId: string
  title: string
  type: 'income' | 'expense'
  amount: number
  currency: Currency
}

export interface MonthLedger {
  month: string
  baseCurrency: Currency
  /** Base-currency totals for the whole month. */
  income: number
  expense: number
  net: number
  days: CalendarDay[]
  /** Every ledger row in the month, so a day can be opened without refetching. */
  transactions: FinanceTransaction[]
  deadlines: CalendarDeadline[]
  schedule: CalendarSchedule[]
  /** Currencies present with no usable rate — their amounts count as zero. */
  unratedCurrencies: Currency[]
}

/** Normalise a month parameter; anything unparseable falls back to `fallback`. */
export function normaliseMonth(raw: string | null | undefined, fallback: string): string {
  return raw && MONTH_RE.test(raw) ? raw : fallback
}

/** The month a Date falls in, read with LOCAL calendar fields. */
export function monthOfDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** Step a "YYYY-MM" by whole months. */
export function shiftMonth(month: string, by: number): string {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7)) - 1 + by
  const ny = Math.floor(m / 12) + y
  const nm = m - (Math.floor(m / 12) * 12)
  return `${ny}-${pad(nm + 1)}`
}

/** Number of days in a "YYYY-MM". UTC is used only to read the day number. */
export function daysInMonth(month: string): number {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
}

export interface GridCell {
  date: string
  /** False for the leading/trailing days borrowed from the neighbouring month. */
  inMonth: boolean
}

/**
 * A Monday-first grid covering the month, padded to whole weeks.
 *
 * Only as many weeks as the month actually needs — a fixed six-row grid leaves
 * a blank row most months, which reads as missing data rather than as padding.
 */
export function monthGrid(month: string): GridCell[] {
  const year = Number(month.slice(0, 4))
  const m0 = Number(month.slice(5, 7)) - 1
  // getUTCDay(): 0 = Sunday. Shift so Monday = 0.
  const firstDow = (new Date(Date.UTC(year, m0, 1)).getUTCDay() + 6) % 7
  const total = daysInMonth(month)
  const cells: GridCell[] = []

  const prev = shiftMonth(month, -1)
  const prevTotal = daysInMonth(prev)
  for (let i = firstDow; i > 0; i--) {
    cells.push({ date: `${prev}-${pad(prevTotal - i + 1)}`, inMonth: false })
  }
  for (let d = 1; d <= total; d++) {
    cells.push({ date: `${month}-${pad(d)}`, inMonth: true })
  }
  const next = shiftMonth(month, 1)
  let d = 1
  while (cells.length % 7 !== 0) {
    cells.push({ date: `${next}-${pad(d++)}`, inMonth: false })
  }
  return cells
}

/**
 * Everything the calendar needs for one month.
 *
 * `schedule` lists recurring occurrences that fall in the month whether or not
 * they have been posted — it is a plan of what is expected, not a claim about
 * the books. Posted occurrences already appear in `transactions` on their own.
 */
export function buildMonthLedger(
  month: string,
  txns: FinanceTransaction[],
  projects: FinanceProject[],
  clients: FinanceClient[],
  recurring: FinanceRecurring[],
  settings: FinanceSettings,
): MonthLedger {
  const rows = txns.filter((t) => monthOf(t.date) === month)

  const byDay = new Map<string, CalendarDay>()
  let income = 0
  let expense = 0

  for (const t of rows) {
    const date = t.date.slice(0, 10)
    // Test the rate, not the converted result: a genuine zero-amount row is
    // convertible and must not be treated as unknown.
    const rate = rateOf(t.currency, settings)
    const value = rate === null ? 0 : t.amount * rate

    const day = byDay.get(date) ?? { date, income: 0, expense: 0, count: 0 }
    if (t.type === 'income') { day.income += value; income += value }
    else { day.expense += value; expense += value }
    day.count += 1
    byDay.set(date, day)
  }

  const clientLabel = (id: string | null) => {
    if (!id) return ''
    const c = clients.find((x) => x.id === id)
    return c ? (c.company.trim() || c.name.trim()) : ''
  }

  // Deadlines: only work that can still be delivered or paid for. A cancelled
  // project's old end date is not a date anyone needs to see.
  const deadlines: CalendarDeadline[] = projects
    .filter((p) => p.endDate && monthOf(p.endDate) === month)
    .filter((p) => p.status === 'active' || p.status === 'completed')
    .map((p) => {
      const paid = txns
        .filter((t) => t.type === 'income' && t.projectId === p.id)
        .reduce((s, t) => {
          const r = rateOf(t.currency, settings)
          const pr = rateOf(p.currency, settings)
          return r === null || pr === null ? s : s + (t.amount * r) / pr
        }, 0)
      return {
        date: p.endDate,
        projectId: p.id,
        title: p.title,
        client: clientLabel(p.clientId),
        outstanding: Math.max(0, p.amount - paid),
        currency: p.currency,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  // Scheduled occurrences landing in this month. `dueDates` only looks
  // backwards from today, so ask it as at the month's end to include the ones
  // still ahead — then keep just the month itself.
  const monthEnd = `${month}-${pad(daysInMonth(month))}`
  const schedule: CalendarSchedule[] = []
  for (const rec of recurring) {
    for (const date of dueDates(rec, monthEnd).dates) {
      if (monthOf(date) !== month) continue
      schedule.push({
        date,
        recurringId: rec.id,
        title: rec.title,
        type: rec.type,
        amount: rec.amount,
        currency: rec.currency,
      })
    }
  }
  schedule.sort((a, b) => a.date.localeCompare(b.date))

  return {
    month,
    baseCurrency: settings.baseCurrency,
    income,
    expense,
    net: income - expense,
    days: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    transactions: rows.sort((a, b) => a.date.localeCompare(b.date)),
    deadlines,
    schedule,
    unratedCurrencies: missingRates(rows.map((t) => t.currency), settings),
  }
}
