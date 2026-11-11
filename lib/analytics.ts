import { SITE_TZ } from './siteTime'
import { readDays } from './stats/store'
import { DIRECT_SOURCE, type StatsDay } from './stats/model'
import { daysEndingOn, shiftDay, siteDay } from './stats/time'

/**
 * The visitor numbers in the shape the daily report (lib/digest) and the
 * admin's statistics page read: views per page per day, and each day's
 * totals.
 *
 * Since 12 November 2026 they come from the site's own counters in Redis
 * (lib/stats). Before that they were one JSON file in Vercel Blob, read,
 * added to and written back on every view; under a day of ads those writes
 * overlapped and overwrote each other, and 11 November's 1 500 views were
 * reported as 35. That file is no longer read or written.
 */

export interface AnalyticsData {
  /** path → { 'YYYY-MM-DD': views } */
  daily: Record<string, Record<string, number>>
  /** The day's totals, by day. */
  days?: Record<string, DayStats>
}

/** One day, summed across every page. */
export interface DayStats {
  views: number
  /** People, counted once a day each (lib/stats/store). */
  visitors: number
  /** Of those, browsers that had never been here before. */
  newVisitors: number
  /** Where the views came from, by source: «Google Ads», «Google», «Прямые заходы», a site. */
  sources: Record<string, number>
  mobile: number
  desktop: number
  /** By channel: ads, campaign, ai, search, social, referral, direct (lib/stats/model). */
  channels?: Record<string, number>
  /** utm campaigns, as «source / medium / campaign». */
  campaigns?: Record<string, number>
  /** Views by hour of the day, on the studio's clock. */
  hours?: number[]
  /** Requests the server accepted (contact form and briefs). */
  leads?: number
}

export const EMPTY_DAY: DayStats = {
  views: 0, visitors: 0, newVisitors: 0, sources: {}, mobile: 0, desktop: 0,
}

/** The studio's clock: a "day" in these numbers is a Tashkent day. */
export { SITE_TZ }

/** A date as YYYY-MM-DD in the site's timezone. */
export function dayKey(date = new Date()): string {
  return siteDay(date)
}

/** The current day in the site's timezone. */
export function todayKey(date = new Date()): string {
  return siteDay(date)
}

/** The day `back` days before `key` (a YYYY-MM-DD string). */
export function previousDay(key: string, back = 1): string {
  return shiftDay(key, -back)
}

/** Views that came from an AI assistant on one day. */
export function aiViews(day: Pick<DayStats, 'channels'>): number {
  return day.channels?.ai ?? 0
}

function toDayStats(d: StatsDay): DayStats {
  return {
    views: d.views,
    visitors: d.visitors,
    newVisitors: d.newVisitors,
    sources: { ...d.sources },
    mobile: (d.devices.mobile ?? 0) + (d.devices.tablet ?? 0),
    desktop: d.devices.desktop ?? 0,
    channels: { ...d.channels },
    campaigns: { ...d.campaigns },
    hours: [...d.hours],
    leads: d.leads,
  }
}

/** The last `days` days of counters (today included), in the report's shape. */
export async function getAnalytics(days = 90): Promise<AnalyticsData> {
  const rows = await readDays(daysEndingOn(siteDay(), days))
  const daily: AnalyticsData['daily'] = {}
  const byDay: Record<string, DayStats> = {}
  for (const row of rows) {
    if (row.views === 0 && row.leads === 0) continue
    byDay[row.date] = toDayStats(row)
    for (const [path, views] of Object.entries(row.pages)) {
      (daily[path] ??= {})[row.date] = views
    }
  }
  return { daily, days: byDay }
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

/** Views on a day that came with no referrer and no campaign. */
export function directViews(day: Pick<DayStats, 'sources'>): number {
  return day.sources[DIRECT_SOURCE] ?? 0
}

/** Sum a per-date map; with `days`, only the last N days (today included). */
export function sumRange(byDate: Record<string, number> | undefined, days?: number): number {
  if (!byDate) return 0
  if (days === undefined) return Object.values(byDate).reduce((s, v) => s + v, 0)
  const cutoff = shiftDay(siteDay(), -(days - 1))
  let total = 0
  for (const [d, v] of Object.entries(byDate)) if (d >= cutoff) total += v
  return total
}

/** Daily totals across all paths for the last `days` days (oldest first). */
export function dailyTotals(data: AnalyticsData, days = 30): Array<{ date: string; count: number }> {
  return daysEndingOn(siteDay(), days).map((date) => ({
    date,
    count: data.days?.[date]?.views ?? Object.values(data.daily).reduce((n, byDate) => n + (byDate[date] ?? 0), 0),
  }))
}
