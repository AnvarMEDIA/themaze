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
}

const RETENTION_DAYS = 90

/** Today's UTC date as YYYY-MM-DD. */
export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
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

/** Increment today's counter for `path`, applying cleanup of buckets
 *  older than RETENTION_DAYS to keep the row bounded. */
export async function trackPageview(rawPath: string): Promise<void> {
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
    return { daily }
  })
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
