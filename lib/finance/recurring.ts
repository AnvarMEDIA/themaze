/**
 * Scheduling maths for recurring payments. Pure and client-safe, so the list
 * screen can show "3 due" without asking the server what it already knows.
 *
 * All dates are calendar strings; see period.ts for why never Date objects.
 */
import { addMonths, isoDate } from './period'
import type { DueOccurrence, FinanceRecurring, RecurInterval } from './types'

const MONTHS_PER: Record<RecurInterval, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
}

/**
 * A runaway guard, not a business rule. A series left dormant for years would
 * otherwise generate hundreds of entries the moment someone opens the page;
 * the UI says how many were withheld rather than posting them silently.
 */
export const MAX_CATCH_UP = 24

/** The occurrence after `date` for this series. */
export function nextOccurrence(date: string, interval: RecurInterval, anchorDay: number): string {
  return addMonths(date, MONTHS_PER[interval], anchorDay)
}

/** The day of the month a series is anchored to (from its start date). */
export function anchorDayOf(rec: Pick<FinanceRecurring, 'startDate'>): number {
  return Number(rec.startDate.slice(8, 10)) || 1
}

/**
 * Every occurrence of `rec` that has fallen due on or before `today` and has
 * not been posted yet — i.e. from `nextDate` forwards.
 *
 * Returns at most MAX_CATCH_UP dates; `truncated` says whether more remain.
 */
export function dueDates(
  rec: FinanceRecurring,
  today: string = isoDate(new Date()),
): { dates: string[]; truncated: boolean } {
  if (!rec.active || !rec.nextDate) return { dates: [], truncated: false }

  const anchor = anchorDayOf(rec)
  const dates: string[] = []
  let cursor = rec.nextDate

  while (cursor <= today) {
    if (rec.endDate && cursor > rec.endDate) break
    if (dates.length >= MAX_CATCH_UP) return { dates, truncated: true }
    dates.push(cursor)
    const advanced = nextOccurrence(cursor, rec.interval, anchor)
    // Defensive: a corrupted row must not spin here forever.
    if (advanced <= cursor) break
    cursor = advanced
  }

  return { dates, truncated: false }
}

/** Flatten every series' due occurrences into one list, soonest-overdue last. */
export function collectDue(
  rows: FinanceRecurring[],
  today: string = isoDate(new Date()),
): DueOccurrence[] {
  const out: DueOccurrence[] = []
  for (const rec of rows) {
    for (const date of dueDates(rec, today).dates) {
      out.push({
        recurringId: rec.id,
        title: rec.title,
        type: rec.type,
        amount: rec.amount,
        currency: rec.currency,
        date,
        daysLate: Math.max(
          0,
          Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000),
        ),
      })
    }
  }
  return out.sort((a, b) => b.daysLate - a.daysLate)
}

/**
 * Where `nextDate` should sit after posting `posted` occurrences.
 * Returns '' once the series has run past its end date, which also ends it.
 */
export function advanceAfter(rec: FinanceRecurring, lastPosted: string): string {
  const next = nextOccurrence(lastPosted, rec.interval, anchorDayOf(rec))
  if (rec.endDate && next > rec.endDate) return ''
  return next
}
