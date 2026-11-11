import { SITE_TZ } from '@/lib/siteTime'

/**
 * Days and hours on the studio's clock (Asia/Tashkent), which is what the
 * statistics count in: a visit at 23:50 in Tashkent belongs to that evening
 * for the people reading the numbers, not to the next UTC day.
 */

/** A moment's calendar day, as YYYY-MM-DD (en-CA formats exactly that). */
export function siteDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TZ }).format(date)
}

/** A moment's hour, 0–23. hourCycle h23, so midnight is 0 and never 24. */
export function siteHour(date: Date = new Date()): number {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: SITE_TZ, hour: '2-digit', hourCycle: 'h23' }).format(date))
  return Number.isInteger(h) && h >= 0 && h < 24 ? h : 0
}

/** `key` (YYYY-MM-DD) moved by `by` calendar days, without parsing it as local time. */
export function shiftDay(key: string, by: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + by * 86_400_000).toISOString().slice(0, 10)
}

/** The `n` days ending on `last`, oldest first. */
export function daysEndingOn(last: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftDay(last, i - (n - 1)))
}
