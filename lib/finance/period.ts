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
