import { escapeHtml } from './notify'
import {
  dayStats, getAnalytics, previousDay, topPages, SITE_TZ,
  type AnalyticsData,
} from './analytics'
import { getInquiries } from './inquiries'
import type { Inquiry } from './inquiries'

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
 * Render the report as Telegram HTML.
 *
 * Returns null when there is nothing whatsoever to say — no views, no
 * inquiries, no comparison worth making. A message every evening that says
 * "0" trains its reader to stop opening messages, and the one evening it
 * matters it will not be read either.
 */
export function buildDigest({ date, analytics, inquiries }: DigestInput): string | null {
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

  if (views === 0 && leads.length === 0) return null

  const L: string[] = []
  L.push(`📊 <b>Итоги дня — ${escapeHtml(readableDate(date))}</b>`)
  L.push('')

  /* ── the two numbers the day is judged by ──────────────────────────── */
  if (!unmeasured) {
    L.push(`👥 Посетителей: <b>${today.visitors}</b>${trend(today.visitors, yest.visitors)}`)
    if (today.visitors > 0) {
      L.push(`   из них новых: <b>${today.newVisitors}</b> (${pct(today.newVisitors, today.visitors)}%)`)
    }
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
