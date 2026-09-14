import { readStore, updateStore } from './store'

/**
 * Lightweight first-party pageview tracking.
 *
 * Data layout: one row per page path, with per-day counters. Daily
 * buckets keep storage bounded even for high-traffic pages and make
 * "last 7 days" trivial to compute. Paths are normalised (no locale
 * prefix, no trailing slash) so /en/portfolio/foo and
 * /ru/portfolio/foo aggregate as /portfolio/foo.
 */

export interface AnalyticsData {
  /** path → { 'YYYY-MM-DD': count } */
  daily: Record<string, Record<string, number>>
  /**
   * Per-DAY totals, as opposed to per-page ones.
   *
   * Optional because it arrived after the first rows were written; a store
   * from before this field simply has no history here, and every reader
   * treats a missing day as zero rather than as an error.
   */
  days?: Record<string, DayStats>
}

/** One day, summed across every page. */
export interface DayStats {
  views: number
  /** Browsers that opened the site that day (see the note on counting). */
  visitors: number
  /** Of those, the ones that had never been here before. */
  newVisitors: number
  /** Referrer host → visits. Bounded; smallest entries are dropped. */
  sources: Record<string, number>
  mobile: number
  desktop: number
}

export const EMPTY_DAY: DayStats = {
  views: 0, visitors: 0, newVisitors: 0, sources: {}, mobile: 0, desktop: 0,
}

/** How many referrer hosts a single day may remember. */
const MAX_SOURCES = 40

const RETENTION_DAYS = 90

/**
 * The studio's own clock.
 *
 * A "day" in these numbers is the day the people reading them lived through.
 * Keyed on UTC, a Tashkent evening (UTC+5) lands in the next bucket from
 * 05:00 local, so an evening's traffic was being reported as tomorrow's and
 * the daily digest would have summarised five hours of the wrong day.
 */
export const SITE_TZ = 'Asia/Tashkent'

/** A date as YYYY-MM-DD in the site's timezone. en-CA formats exactly that. */
export function dayKey(date = new Date(), timeZone = SITE_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)
}

/** The current day in the site's timezone. */
export function todayKey(date = new Date()): string {
  return dayKey(date)
}

/** The day before `key` (a YYYY-MM-DD string), without parsing it as local time. */
export function previousDay(key: string, back = 1): string {
  const [y, m, d] = key.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) - back * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

/** Strip locale prefix and trailing slash. Returns null for paths we
 *  do not want to track (admin, api, static, oddities). */
export function normalizePath(raw: string): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 200) return null
  if (raw.includes('..')) return null
  let p = raw.split('?')[0].split('#')[0]
  if (!p.startsWith('/')) p = '/' + p
  p = p.replace(/^\/(en|ru|uz)(\/|$)/, '/')
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  if (p.startsWith('/admin')) return null
  if (p.startsWith('/api'))   return null
  if (p.startsWith('/_next')) return null
  if (p.includes('.'))        return null   // static files
  return p
}

/**
 * What the browser can tell us about itself without being identified.
 *
 * There is no cookie and no visitor id, here or on the wire. The page keeps
 * two flags in its own localStorage — "I have been here before" and "I have
 * already been here today" — and sends the ANSWER, never the identity. So a
 * visitor count is a count of browsers that said "this is my first view
 * today", and nothing stored server-side can be traced back to anyone.
 *
 * The honest cost: a cleared browser, a private window or a second device
 * reads as a new visitor, and a browser that refuses storage is counted as a
 * view but not as a visitor. These numbers are a good trend, not a census.
 */
export interface ViewMeta {
  /** This browser had never opened the site before. */
  firstEver?: boolean
  /** First view of this day from this browser. */
  firstToday?: boolean
  /** Referrer host, already normalised, or undefined for direct traffic. */
  source?: string
  /** Derived server-side from the user-agent; no UA string is stored. */
  mobile?: boolean
}

/** A referrer host reduced to something safe to use as a store key. */
export function normalizeSource(raw: string | undefined | null): string | undefined {
  if (!raw || typeof raw !== 'string' || raw.length > 200) return undefined
  let host = raw.trim().toLowerCase()
  try {
    if (host.includes('://')) host = new URL(host).hostname
  } catch { return undefined }
  host = host.replace(/^www\./, '')
  if (!/^[a-z0-9][a-z0-9.-]{0,60}$/.test(host)) return undefined
  return host
}

/** Increment today's counters for `path`, applying cleanup of buckets
 *  older than RETENTION_DAYS to keep the row bounded. */
export async function trackPageview(rawPath: string, meta: ViewMeta = {}): Promise<void> {
  const path = normalizePath(rawPath)
  if (!path) return
  const today  = todayKey()
  const cutoff = todayKey(new Date(Date.now() - RETENTION_DAYS * 86_400_000))

  await updateStore<AnalyticsData>('analytics', { daily: {} }, (data) => {
    const daily = { ...data.daily }
    const byDate = { ...(daily[path] ?? {}) }
    byDate[today] = (byDate[today] ?? 0) + 1

    // Drop dates older than the retention window.
    for (const d of Object.keys(byDate)) {
      if (d < cutoff) delete byDate[d]
    }
    daily[path] = byDate

    const days = { ...(data.days ?? {}) }
    const day: DayStats = { ...EMPTY_DAY, ...(days[today] ?? {}), sources: { ...(days[today]?.sources ?? {}) } }
    day.views += 1
    if (meta.firstToday) day.visitors += 1
    if (meta.firstEver)  day.newVisitors += 1
    if (meta.mobile === true)  day.mobile += 1
    if (meta.mobile === false) day.desktop += 1
    if (meta.source) {
      day.sources[meta.source] = (day.sources[meta.source] ?? 0) + 1
      // A day remembers only so many hosts: referrer strings are attacker-
      // controlled, and an unbounded map is an unbounded write.
      const hosts = Object.entries(day.sources)
      if (hosts.length > MAX_SOURCES) {
        day.sources = Object.fromEntries(
          hosts.sort((a, b) => b[1] - a[1]).slice(0, MAX_SOURCES),
        )
      }
    }
    days[today] = day
    for (const d of Object.keys(days)) {
      if (d < cutoff) delete days[d]
    }

    return { daily, days }
  })
}

/** One day's totals, zeroed when nothing was recorded. */
export function dayStats(data: AnalyticsData, key: string): DayStats {
  const d = data.days?.[key]
  return d ? { ...EMPTY_DAY, ...d, sources: { ...(d.sources ?? {}) } } : { ...EMPTY_DAY, sources: {} }
}

/** Views per path on one day, biggest first. */
export function topPages(data: AnalyticsData, key: string, limit = 5): Array<{ path: string; views: number }> {
  return Object.entries(data.daily)
    .map(([path, byDate]) => ({ path, views: byDate?.[key] ?? 0 }))
    .filter((r) => r.views > 0)
    .sort((a, b) => b.views - a.views || a.path.localeCompare(b.path))
    .slice(0, limit)
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return readStore<AnalyticsData>('analytics', { daily: {} })
}

/** Sum a per-date map. If `days` is given, includes only the last N
 *  days (today inclusive). */
export function sumRange(byDate: Record<string, number> | undefined, days?: number): number {
  if (!byDate) return 0
  if (days === undefined) {
    let total = 0
    for (const v of Object.values(byDate)) total += v
    return total
  }
  const cutoff = todayKey(new Date(Date.now() - (days - 1) * 86_400_000))
  let total = 0
  for (const [d, v] of Object.entries(byDate)) {
    if (d >= cutoff) total += v
  }
  return total
}

/** Per-path summary (total, last 7 / 30 days). */
export function pathStats(data: AnalyticsData, path: string) {
  const byDate = data.daily[path]
  return {
    total: sumRange(byDate),
    week:  sumRange(byDate, 7),
    month: sumRange(byDate, 30),
  }
}

/** Daily totals across all paths for the last `days` days (oldest first). */
export function dailyTotals(data: AnalyticsData, days = 30): Array<{ date: string; count: number }> {
  const series: Array<{ date: string; count: number }> = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    const date = todayKey(d)
    let count = 0
    for (const byDate of Object.values(data.daily)) {
      count += byDate[date] ?? 0
    }
    series.push({ date, count })
  }
  return series
}
