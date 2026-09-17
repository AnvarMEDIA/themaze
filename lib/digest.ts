import { escapeHtml } from './notify'
import {
  dayStats, getAnalytics, previousDay, topPages, SITE_TZ,
  type AnalyticsData,
} from './analytics'
import { getInquiries } from './inquiries'
import type { Inquiry } from './inquiries'
import { readStore, updateStore } from './store'

/* ── run log ────────────────────────────────────────────────────────────── */

export const RUNS_KEY = 'digest_runs'
const KEEP_RUNS = 30

export interface DigestRun {
  at: string
  /** The day the report covered. */
  date: string
  sent: boolean
  /** How the caller was recognised: cron secret, Vercel's own cron, or admin. */
  via: 'secret' | 'vercel-cron' | 'admin'
  reason?: string
}

/**
 * Every attempt is recorded, successful or not.
 *
 * Without this there was no way to answer "did the report even try to go
 * out", and two evenings passed with nobody able to tell a quiet day from a
 * cron that never fired. Thirty runs is a month of evenings — enough to see a
 * pattern, small enough to keep in one row.
 */
export async function recordRun(run: DigestRun): Promise<void> {
  try {
    await updateStore<{ runs?: DigestRun[] }>(RUNS_KEY, {}, (cur) => ({
      runs: [run, ...(cur.runs ?? [])].slice(0, KEEP_RUNS),
    }))
  } catch (err) {
    console.error('[daily-digest] could not record the run —', err)
  }
}

export async function listRuns(): Promise<DigestRun[]> {
  const { runs = [] } = await readStore<{ runs?: DigestRun[] }>(RUNS_KEY, {})
  return runs
}

/** The first day visitor counting recorded anything, if it ever has. */
function countingSince(data: AnalyticsData): string | undefined {
  const keys = Object.keys(data.days ?? {}).sort()
  return keys[0]
}

/** Views on one day summed across every page — what the per-path counters know. */
function viewsFromPaths(data: AnalyticsData, key: string): number {
  let n = 0
  for (const byDate of Object.values(data.daily)) n += byDate?.[key] ?? 0
  return n
}


/**
 * The end-of-day report that lands in Telegram.
 *
 * It is written to be read on a phone, once, in about ten seconds. So it
 * leads with the two numbers that answer "how was today" — visitors and
 * inquiries — and every figure that can be compared is compared, because a
 * number on its own ("41 visitors") says nothing without yesterday beside it.
 *
 * Everything here is derived from the site's own first-party counters. There
 * is no external analytics account to depend on, and nothing in the message
 * identifies a person.
 */

/** A day, both as the store keys it and as a person reads it. */
export function readableDate(key: string, locale = 'ru-RU'): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC',
  })
}

/** Percent change, or null when there is nothing to compare against. */
export function delta(now: number, before: number): number | null {
  if (before <= 0) return now > 0 ? null : 0
  return Math.round(((now - before) / before) * 100)
}

/** "+18%" / "−7%" / "" — an arrow only when the change is worth a glance. */
function trend(now: number, before: number): string {
  const d = delta(now, before)
  if (d === null) return before === 0 && now > 0 ? ' 🆕' : ''
  if (d === 0) return ' =';
  const arrow = d > 0 ? '↑' : '↓'
  return ` ${arrow}${Math.abs(d)}%`
}

const pct = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 100) : 0

/** The inquiries filed on one day, in the site's timezone. */
export function inquiriesOn(all: Inquiry[], key: string): Inquiry[] {
  return all.filter((i) => {
    const t = new Date(i.createdAt)
    if (Number.isNaN(t.getTime())) return false
    return new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TZ }).format(t) === key
  })
}

export interface DigestInput {
  /** The day to report on, YYYY-MM-DD in the site's timezone. */
  date: string
  analytics: AnalyticsData
  inquiries: Inquiry[]
}

/** Gather everything the report needs. */
export async function collectDigest(date: string): Promise<DigestInput> {
  const [analytics, inquiries] = await Promise.all([getAnalytics(), getInquiries()])
  return { date, analytics, inquiries }
}

/**
 * Render the report as Telegram HTML. Always returns a message.
 *
 * It used to return null for a day with no views and no inquiries, on the
 * theory that a nightly "0" trains its reader to stop opening messages. That
 * was the wrong call twice over. The report was asked for at the end of EVERY
 * day, and suppressing it made silence ambiguous: a quiet day and a broken
 * cron looked identical from the outside, which is exactly how two days went
 * by without anyone being able to say which it was.
 *
 * So a quiet day now says it is quiet, in one line, and anything that looks
 * like a fault says so too.
 */
export function buildDigest({ date, analytics, inquiries }: DigestInput): string {
  const today = dayStats(analytics, date)
  const yest = dayStats(analytics, previousDay(date))

  // The same weekday matters more than the day before for a business site —
  // but a seven-day mean is the honest general baseline, so both are used:
  // yesterday for the headline, the week for context.
  let weekViews = 0, weekVisitors = 0, daysCounted = 0
  for (let i = 1; i <= 7; i++) {
    const d = dayStats(analytics, previousDay(date, i))
    if (d.views > 0) { weekViews += d.views; weekVisitors += d.visitors; daysCounted++ }
  }
  const avgViews = daysCounted ? Math.round(weekViews / daysCounted) : 0
  const avgVisitors = daysCounted ? Math.round(weekVisitors / daysCounted) : 0

  const leads = inquiriesOn(inquiries, date)
  const leadsYesterday = inquiriesOn(inquiries, previousDay(date)).length

  // A day with per-path views but no day record at all predates visitor
  // counting: its visitor number is unknown, not zero, and printing "0" would
  // read as "nobody came". A day with no views anywhere is a different thing —
  // there zero is simply the truth, and worth saying.
  const pathViews = viewsFromPaths(analytics, date)
  const views = today.views || pathViews
  const unmeasured = pathViews > 0 && today.views === 0 && today.visitors === 0

  const L: string[] = []
  L.push(`📊 <b>Итоги дня — ${escapeHtml(readableDate(date))}</b>`)
  L.push('')

  // A day with nothing on it. Said plainly and briefly, because the message
  // still has to arrive — its absence is what left us guessing before.
  if (views === 0 && leads.length === 0) {
    L.push('Тихий день: ни просмотров, ни заявок.')
    const recorded = Object.keys(analytics.days ?? {}).length
    const recentViews = [0, 1, 2, 3].reduce(
      (n, i) => n + dayStats(analytics, previousDay(date, i)).views + viewsFromPaths(analytics, previousDay(date, i)), 0)
    if (recentViews === 0) {
      // Four days without a single recorded view is not a quiet site, it is a
      // counter that is not writing. Say so here rather than let it look like
      // an unusually dull week.
      L.push('')
      L.push(recorded === 0
        ? '⚠️ За последние 4 дня не записано ни одного просмотра, и счётчик посетителей ещё ни разу ничего не сохранил. Похоже, статистика не пишется — стоит проверить.'
        : '⚠️ За последние 4 дня не записано ни одного просмотра. Похоже, статистика не пишется — стоит проверить.')
    }
    return L.join('\n')
  }

  /* ── the two numbers the day is judged by ──────────────────────────── */
  if (!unmeasured) {
    L.push(`👥 Посетителей: <b>${today.visitors}</b>${trend(today.visitors, yest.visitors)}`)
    if (today.visitors > 0) {
      L.push(`   из них новых: <b>${today.newVisitors}</b> (${pct(today.newVisitors, today.visitors)}%)`)
    }
  } else {
    // Say why the headline number is missing. A line that simply vanishes
    // reads as a bug to the person expecting it — and this one appears only
    // for the handful of days recorded before counting started, then never
    // again.
    const since = countingSince(analytics)
    L.push(since
      ? `👥 Посетителей: <i>за этот день не считались — счётчик работает с ${escapeHtml(readableDate(since).replace(/^[^,]+, /, ''))}</i>`
      : '👥 Посетителей: <i>счётчик ещё не собрал данных</i>')
  }
  L.push(`👁 Просмотров: <b>${views}</b>${trend(views, yest.views || viewsFromPaths(analytics, previousDay(date)))}`)
  if (today.visitors > 0) {
    L.push(`   страниц на посетителя: ${(views / today.visitors).toFixed(1)}`)
  }

  L.push('')
  if (leads.length === 0) {
    L.push('📬 Заявок: <b>0</b>')
  } else {
    L.push(`📬 Заявок: <b>${leads.length}</b>${trend(leads.length, leadsYesterday)}`)
    for (const i of leads.slice(0, 8)) {
      const who = escapeHtml(i.name || i.email || '—')
      const what = [i.service, i.budget].filter(Boolean).map(escapeHtml).join(' · ')
      L.push(`   • ${who}${what ? ` — ${what}` : ''}`)
    }
    if (leads.length > 8) L.push(`   …и ещё ${leads.length - 8}`)
    if (today.visitors > 0) {
      // Worth stating precisely because it is the number that decides whether
      // more traffic is the answer, or better pages are.
      L.push(`   конверсия: ${((leads.length / today.visitors) * 100).toFixed(1)}% от посетителей`)
    }
  }

  /* ── where they went and where they came from ──────────────────────── */
  const pages = topPages(analytics, date, 5)
  if (pages.length > 0) {
    L.push('')
    L.push('<b>Страницы дня</b>')
    for (const p of pages) L.push(`   ${p.views} · ${escapeHtml(p.path)}`)
  }

  const sources = Object.entries(today.sources).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const referred = Object.values(today.sources).reduce((s, n) => s + n, 0)
  if (!unmeasured && today.views > 0) {
    L.push('')
    L.push('<b>Откуда пришли</b>')
    const direct = Math.max(today.views - referred, 0)
    if (direct > 0) L.push(`   ${direct} · напрямую и закладки`)
    for (const [host, n] of sources) L.push(`   ${n} · ${escapeHtml(host)}`)
  }

  const devices = today.mobile + today.desktop
  if (devices > 0) {
    L.push('')
    L.push(`📱 Телефон ${pct(today.mobile, devices)}% · 💻 компьютер ${pct(today.desktop, devices)}%`)
  }

  /* ── context, so today's number means something ────────────────────── */
  if (daysCounted > 0) {
    L.push('')
    L.push(`<i>Среднее за 7 дней: ${avgVisitors} посетителей, ${avgViews} просмотров в день.</i>`)
  }

  // Sunday closes the week, so the weekly total goes out with it rather than
  // as a second message nobody asked for.
  const [wy, wm, wd] = date.split('-').map(Number)
  if (new Date(Date.UTC(wy, wm - 1, wd)).getUTCDay() === 0) {
    const weekLeads = inquiries.filter((i) => {
      const k = new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TZ }).format(new Date(i.createdAt))
      return k <= date && k > previousDay(date, 7)
    }).length
    L.push('')
    L.push(`<b>Неделя целиком:</b> ${weekVisitors + today.visitors} посетителей, `
      + `${weekViews + today.views} просмотров, ${weekLeads} заявок.`)
  }

  return L.join('\n')
}
