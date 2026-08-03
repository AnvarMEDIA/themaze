/**
 * Reporting periods for the finance dashboard.
 *
 * Dates here are calendar strings ("YYYY-MM-DD"), never Date objects: a
 * transaction dated 2026-01-01 belongs to January regardless of the server's
 * timezone. Parsing it with `new Date()` yields UTC midnight, which a local
 * `getFullYear()` can read as the previous year — so comparisons are done on
 * the strings themselves, which is both exact and cheaper.
 *
 * Client-safe.
 */

export const PERIOD_PRESETS = ['month', 'quarter', 'year', 'last12', 'all', 'custom'] as const
export type PeriodPreset = (typeof PERIOD_PRESETS)[number]

export interface Period {
  /** Inclusive start, YYYY-MM-DD. Empty string = unbounded. */
  from: string
  /** Inclusive end, YYYY-MM-DD. Empty string = unbounded. */
  to: string
  preset: PeriodPreset
}

const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD for a Date, read with local calendar fields. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** The month a calendar date falls in, as YYYY-MM. */
export function monthOf(date: string): string {
  return date.slice(0, 7)
}

/** The year a calendar date falls in. */
export function yearOf(date: string): string {
  return date.slice(0, 4)
}

/** Inclusive containment test on calendar strings. */
export function inPeriod(date: string, period: Pick<Period, 'from' | 'to'>): boolean {
  if (!date) return false
  const d = date.slice(0, 10)
  if (period.from && d < period.from) return false
  if (period.to && d > period.to) return false
  return true
}

/** Resolve a preset into a concrete window. `today` is injectable for tests. */
export function resolvePeriod(preset: PeriodPreset, today: Date = new Date()): Period {
  const y = today.getFullYear()
  const m = today.getMonth()

  switch (preset) {
    case 'month':
      return { from: isoDate(new Date(y, m, 1)), to: isoDate(new Date(y, m + 1, 0)), preset }
    case 'quarter': {
      const qStart = Math.floor(m / 3) * 3
      return {
        from: isoDate(new Date(y, qStart, 1)),
        to: isoDate(new Date(y, qStart + 3, 0)),
        preset,
      }
    }
    case 'year':
      return { from: `${y}-01-01`, to: `${y}-12-31`, preset }
    case 'last12':
      // 12 whole months ending with the current one.
      return { from: isoDate(new Date(y, m - 11, 1)), to: isoDate(new Date(y, m + 1, 0)), preset }
    case 'all':
    default:
      return { from: '', to: '', preset: 'all' }
  }
}

/** Days in a calendar month. UTC only to read the day number — never a local date. */
function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
}

/**
 * Shift a calendar date by whole months, clamping to the end of a shorter
 * month. `anchorDay` is the day the series was started on, so a run that
 * begins on the 31st gives 31 Jan → 28 Feb → 31 Mar rather than degrading to
 * the 28th forever.
 */
export function addMonths(date: string, months: number, anchorDay?: number): string {
  const y = Number(date.slice(0, 4))
  const m = Number(date.slice(5, 7)) - 1
  const day = anchorDay ?? Number(date.slice(8, 10))
  const total = y * 12 + m + months
  const ny = Math.floor(total / 12)
  const nm = total - ny * 12
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(day, daysInMonth(ny, nm)))}`
}

/** Whole days between two calendar dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

/** Shift a calendar date by whole days. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * The comparable window immediately before `period` — the basis for "up 12% on
 * last month". Calendar presets step back one calendar unit so February is
 * compared with January, not with "the 28 days before it". A custom range
 * steps back by its own length. "All time" has nothing to compare against.
 */
export function previousPeriod(period: Period): Period | null {
  const { from, to, preset } = period
  switch (preset) {
    case 'month':
      return { from: addMonths(from, -1, 1), to: addDays(from, -1), preset }
    case 'quarter':
      return { from: addMonths(from, -3, 1), to: addDays(from, -1), preset }
    case 'year':
      return { from: `${Number(from.slice(0, 4)) - 1}-01-01`, to: addDays(from, -1), preset }
    case 'last12':
      return { from: addMonths(from, -12, 1), to: addDays(from, -1), preset }
    case 'custom': {
      // Needs both ends to have a length to step back by.
      if (!from || !to) return null
      const len = daysBetween(from, to) + 1
      return { from: addDays(from, -len), to: addDays(from, -1), preset }
    }
    default:
      return null
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Build a period from request params. An explicit from/to wins and is treated
 * as a custom range; otherwise the named preset is resolved. Anything
 * unparseable falls back to the year, so a malformed URL can't silently show
 * "all time" figures as if they were the period's.
 */
export function periodFromParams(
  params: { preset?: string | null; from?: string | null; to?: string | null },
  today: Date = new Date(),
): Period {
  const from = params.from && DATE_RE.test(params.from) ? params.from : ''
  const to = params.to && DATE_RE.test(params.to) ? params.to : ''
  if (from || to) {
    // Tolerate a reversed range rather than returning nothing.
    const [a, b] = from && to && from > to ? [to, from] : [from, to]
    return { from: a, to: b, preset: 'custom' }
  }
  const preset = params.preset as PeriodPreset | undefined
  if (preset && (PERIOD_PRESETS as readonly string[]).includes(preset) && preset !== 'custom') {
    return resolvePeriod(preset, today)
  }
  return resolvePeriod('year', today)
}
