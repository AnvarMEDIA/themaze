import { shiftDay } from './time'

/**
 * The periods the statistics screen offers, and how each becomes a span of
 * days on the studio's calendar (Asia/Tashkent).
 *
 * Pure and free of Node and React, so the screen and the endpoint share it
 * and tests call it directly. The server decides what "today" is: the
 * screen sends a preset's name, not dates its own clock worked out.
 */

export type Preset = 'today' | 'yesterday' | '7' | '30' | '90' | 'year'

export type Period =
  | { kind: 'preset'; preset: Preset }
  | { kind: 'custom'; from: string; to: string }

export const PRESETS: ReadonlyArray<{ id: Preset; label: string }> = [
  { id: 'today', label: 'Сегодня' },
  { id: 'yesterday', label: 'Вчера' },
  { id: '7', label: '7 дней' },
  { id: '30', label: '30 дней' },
  { id: '90', label: '90 дней' },
  { id: 'year', label: 'Год' },
]

/** How far back a period can reach: a day's counters are kept for 400 days. */
export const MAX_SPAN = 400

/** The day the counter in Redis started; before it the days are empty because nothing counted them. */
export const COUNTING_SINCE = '2026-11-12'

/** A real calendar date written as YYYY-MM-DD (so not 2026-02-30). */
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const t = Date.parse(`${s}T00:00:00Z`)
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s
}

/** How many days from `from` to `to`, both included. */
export function spanDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
}

/** Every day from `from` to `to`, both included, oldest first. */
export function daysBetween(from: string, to: string): string[] {
  const n = spanDays(from, to)
  return n > 0 ? Array.from({ length: n }, (_, i) => shiftDay(from, i)) : []
}

/** The first day a period may start on, on a given day: as far back as anything is kept. */
export function earliestDay(today: string): string {
  return shiftDay(today, -(MAX_SPAN - 1))
}

/**
 * The days a request asks for. In order: `from` and `to` (swapped when
 * reversed, the end pulled back to today, the start to the oldest day still
 * kept); a preset's name in `period`; a number of days ending today in
 * `period` or `days` (the dashboard's older form). Anything else: 30 days.
 */
export function resolvePeriod(
  q: { period?: string | null; from?: string | null; to?: string | null; days?: string | null },
  today: string,
): { from: string; to: string } {
  if (isIsoDate(q.from) && isIsoDate(q.to)) {
    let [from, to] = q.from <= q.to ? [q.from, q.to] : [q.to, q.from]
    if (to > today) to = today
    if (from > to) from = to
    if (from < earliestDay(to)) from = earliestDay(to)
    return { from, to }
  }
  if (q.period === 'today') return { from: today, to: today }
  if (q.period === 'yesterday') {
    const yesterday = shiftDay(today, -1)
    return { from: yesterday, to: yesterday }
  }
  if (q.period === 'year') return { from: shiftDay(today, -364), to: today }
  const n = Number(q.period ?? q.days)
  const days = Number.isFinite(n) && n >= 1 ? Math.min(Math.round(n), MAX_SPAN) : 30
  return { from: shiftDay(today, -(days - 1)), to: today }
}

/** The query that asks the endpoint for a period. */
export function periodQuery(p: Period): string {
  return p.kind === 'custom'
    ? `from=${encodeURIComponent(p.from)}&to=${encodeURIComponent(p.to)}`
    : `period=${p.preset}`
}

/** Whether a period moves with the calendar (and so must be read again after midnight). */
export const isRelative = (p: Period): boolean => p.kind === 'preset'

/** 12.11, or 12.11.2026 when the year is not the current one. */
export function shortDay(iso: string, today: string): string {
  const dm = `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
  return iso.slice(0, 4) === today.slice(0, 4) ? dm : `${dm}.${iso.slice(0, 4)}`
}

/** A span of days as people write it: "12.11" or "12.11–20.11". */
export function rangeLabel(from: string, to: string, today: string): string {
  return from === to ? shortDay(from, today) : `${shortDay(from, today)}–${shortDay(to, today)}`
}

/** What the numbers on the cards cover: "сегодня", "за 30 дней", "с 12.11 по 20.11". */
export function periodLabel(p: Period, from: string, to: string, today: string): string {
  if (p.kind === 'preset') {
    if (p.preset === 'today') return 'сегодня'
    if (p.preset === 'yesterday') return 'вчера'
    if (p.preset === 'year') return 'за год'
    return `за ${p.preset} дней`
  }
  return from === to ? `за ${shortDay(from, today)}` : `с ${shortDay(from, today)} по ${shortDay(to, today)}`
}

/** One day as the chart needs it. */
export interface DayFigures { date: string; visitors: number; views: number; leads: number }

/** Several days as one column of the chart. */
export interface Bucket { key: string; from: string; to: string; visitors: number; views: number; leads: number }

/**
 * A long period's days as calendar weeks, Monday to Sunday, so that a year
 * is 53 columns rather than 365 one-pixel ones. The first and last week can
 * be partial: each says which of its days the period holds.
 */
export function weekBuckets(days: DayFigures[]): Bucket[] {
  const out: Bucket[] = []
  for (const d of days) {
    const weekday = (new Date(`${d.date}T12:00:00Z`).getUTCDay() + 6) % 7   // Monday 0 … Sunday 6
    const key = shiftDay(d.date, -weekday)
    const last = out[out.length - 1]
    if (last && last.key === key) {
      last.to = d.date
      last.visitors += d.visitors
      last.views += d.views
      last.leads += d.leads
    } else {
      out.push({ key, from: d.date, to: d.date, visitors: d.visitors, views: d.views, leads: d.leads })
    }
  }
  return out
}
