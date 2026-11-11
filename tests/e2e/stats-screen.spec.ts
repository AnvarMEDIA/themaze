import { test, expect, type Page } from '@playwright/test'
import { SignJWT } from 'jose'
import { emptyCounts, mergeDays, type StatsDay } from '../../lib/stats/model'
import {
  COUNTING_SINCE, changePercent, daysBetween, previousPeriod, resolvePeriod, weekBuckets,
} from '../../lib/stats/periods'
import { shiftDay, siteDay } from '../../lib/stats/time'

/**
 * Admin → Статистика and the dashboard's status lines.
 *
 * Without a session the data must be refused; that is checked against any
 * server. The screens need a session, signed with JWT_SECRET, so they run
 * only against a server on this machine. Their numbers are answered by the
 * test (months of visits, an ad campaign, an empty store, a store that is
 * down), so what is drawn is known and the screenshots can be compared by
 * eye; the real endpoint is checked separately for its shape and its periods.
 */

const SECRET = process.env.JWT_SECRET
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 3100}`
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(BASE)
const SIGNED_IN = !!SECRET && LOCAL

async function adminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('maze.uz/admin')
    .setAudience('maze.uz/admin-ui')
    .setSubject('admin')
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(SECRET))
}

/* ── Months of numbers ──────────────────────────────────────────────────── */

/**
 * The day and the hour the answered numbers take for now: a Sunday, 14:30,
 * a hundred days after the counter started, so that every period has days
 * to show and most have a period before them to be compared with. The
 * screen takes "today" from the answer, never from its own clock.
 */
const TODAY = '2027-02-21'
const NOW_HOUR = 14
const ddmm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
const nf = new Intl.NumberFormat('ru-RU')
const sum = (list: number[]) => list.reduce((s, v) => s + v, 0)
const upTo = (hours: number[], hour: number) => sum(hours.slice(0, hour))

function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

/** Split `total` across named parts by weight, the remainder to the first. */
function split(total: number, weights: Record<string, number>): Record<string, number> {
  const all = sum(Object.values(weights))
  const out: Record<string, number> = {}
  let left = total
  for (const [k, w] of Object.entries(weights).slice(1)) { out[k] = Math.floor((total * w) / all); left -= out[k] }
  return { [Object.keys(weights)[0]]: left, ...out }
}

interface Sample { today?: string; extra?: number; project?: string }

/**
 * A day of a phone-heavy site whose ads started a week before today. Today
 * has run to 14:30, plus `extra` people since. Before the counter started,
 * nothing, as in the real store.
 */
function sampleDay(date: string, { today = TODAY, extra = 0, project = 'uzum-market-rebrand' }: Sample = {}): StatsDay {
  if (date < COUNTING_SINCE || date > today) return { ...emptyCounts(), date }
  const r = random(Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000))
  const ads = date > shiftDay(today, -8)
  const shape = Array.from({ length: 24 }, (_, h) => Math.exp(-((h - 15) ** 2) / 18) * 10 + (h > 8 && h < 23 ? 2 : 0))
  const done = date === today ? shape.map((v, h) => (h < NOW_HOUR ? v : h === NOW_HOUR ? v / 2 : 0)) : shape
  const visitors = Math.round(((ads ? 620 : 45) + (ads ? 260 : 30) * r()) * (sum(done) / sum(shape))) + (date === today ? extra : 0)
  const views = Math.round(visitors * (1.4 + r() * 0.5))
  const leads = Math.round(visitors * (ads ? 0.012 : 0.02) * r() + (r() > 0.6 ? 1 : 0))
  const brief = Math.min(leads, Math.round(leads * 0.4))
  // The day's views by hour, adding up to the day's views exactly.
  const hours = done.map((w) => Math.floor((views * w) / sum(done)))
  hours[done.indexOf(Math.max(...done))] += views - sum(hours)
  return {
    ...emptyCounts(),
    date,
    views,
    visitors,
    newVisitors: Math.round(visitors * 0.8),
    leads,
    leadKinds: leads ? { inquiry: leads - brief, ...(brief ? { brief } : {}) } : {},
    channels: split(views, ads ? { ads: 64, direct: 14, search: 12, social: 7, referral: 3 } : { direct: 45, search: 35, social: 15, referral: 5 }),
    sources: split(views, ads
      ? { 'Google Ads': 64, 'Прямые заходы': 14, Google: 9, 'Яндекс': 3, Instagram: 4, Telegram: 3, 'behance.net': 3 }
      : { 'Прямые заходы': 45, Google: 25, 'Яндекс': 10, Instagram: 10, Telegram: 5, 'behance.net': 5 }),
    campaigns: ads ? split(Math.round(views * 0.3), { 'google / cpc / maze-first': 80, 'instagram / social / reels-november': 20 }) : {},
    // Fourteen pages: more than the list shows at first.
    pages: split(views, {
      '/': 400, '/portfolio': 160, '/services': 100, '/contact': 70, '/brief': 60, '/about': 45, [`/portfolio/${project}`]: 40,
      '/insights/brand-strategy-2026': 30, '/services/branding': 25, '/internship': 20, '/insights': 18,
      '/portfolio/tag/home-appliances': 14, '/services/naming': 10, '/legal/privacy': 8,
    }),
    devices: split(views, { mobile: 80, desktop: 18, tablet: 2 }),
    os: split(views, { Android: 55, iOS: 27, Windows: 14, macOS: 4 }),
    browsers: split(views, { Chrome: 52, Safari: 25, 'Яндекс': 12, Samsung: 7, Edge: 4 }),
    countries: split(views, { UZ: 86, RU: 5, KZ: 4, XX: 3, US: 2 }),
    locales: split(views, { ru: 84, en: 16 }),
    hours,
  }
}

/** What the endpoint answers for a query, as lib/stats/store builds it. */
function payloadFor(query: string, opts: Sample & { online?: number; empty?: boolean } = {}) {
  const today = opts.today ?? TODAY
  const q = new URLSearchParams(query)
  const { from, to } = resolvePeriod({ period: q.get('period'), from: q.get('from'), to: q.get('to'), days: q.get('days') }, today)
  const first = from < COUNTING_SINCE ? COUNTING_SINCE : from
  const rows = (first <= to ? daysBetween(first, to) : []).map((d) => (opts.empty ? { ...emptyCounts(), date: d } : sampleDay(d, opts)))
  const prev = previousPeriod(from, to)
  const before = prev.from < COUNTING_SINCE || opts.empty ? null : daysBetween(prev.from, prev.to).map((d) => sampleDay(d, { ...opts, extra: 0 }))
  return {
    days: rows.map(({ date, visitors, views, leads, newVisitors }) => ({ date, visitors, views, leads, newVisitors })),
    totals: mergeDays(rows),
    online: opts.online ?? 4,
    from,
    to,
    today,
    hour: NOW_HOUR,
    todayRow: rows.find((r) => r.date === today) ?? null,
    previous: before && {
      ...prev,
      visitors: sum(before.map((d) => d.visitors)),
      views: sum(before.map((d) => d.views)),
      leads: sum(before.map((d) => d.leads)),
      ...(before.length === 1 ? { hours: before[0].hours } : {}),
    },
  }
}

/** Answer the screen's reads; returns each query asked, in order ("period=30", "from=…&to=…"). */
async function answerStats(page: Page, reply: (query: string) => { status?: number; body: unknown }) {
  const asked: string[] = []
  await page.route('**/api/analytics/stats?*', async (route) => {
    const query = new URL(route.request().url()).search.slice(1)
    asked.push(query)
    const { status = 200, body } = reply(query)
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  })
  return asked
}

async function signIn(page: Page) {
  await page.context().addCookies([{ name: 'maze_admin_token', value: await adminToken(), url: BASE }])
}

/** A headline figure's card: its number, how it moved, its line of context. */
const tile = (page: Page, label: string) => page.getByText(label, { exact: true }).first().locator('xpath=..')
const pressed = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

/* ── The endpoint ───────────────────────────────────────────────────────── */

test.describe('GET /api/analytics/stats', () => {
  test.skip(({ isMobile }) => isMobile, 'an endpoint: once is enough')

  test('is refused without a session', async ({ request }) => {
    expect((await request.get('/api/analytics/stats?days=7')).status()).toBe(401)
    expect((await request.get('/api/analytics/stats?period=year')).status()).toBe(401)
  })

  test('gives a signed-in admin each period: its counted days, their totals, today, who is here now', async ({ request }) => {
    test.skip(!SIGNED_IN, 'needs a session: JWT_SECRET and a server on this machine')
    const headers = { cookie: `maze_admin_token=${await adminToken()}` }
    const get = async (query: string) => {
      const res = await request.get(`/api/analytics/stats?${query}`, { headers })
      expect(res.status()).toBe(200)
      expect(res.headers()['cache-control']).toContain('no-store')
      return await res.json() as ReturnType<typeof payloadFor>
    }
    const today = siteDay()
    /** The days of a span the counter existed on. */
    const counted = (from: string, to: string) => {
      const first = from < COUNTING_SINCE ? COUNTING_SINCE : from
      return first <= to ? daysBetween(first, to) : []
    }

    const week = await get('days=7')
    expect(week).toMatchObject({ from: shiftDay(today, -6), to: today, today })
    expect(week.days.map((d) => d.date)).toEqual(counted(shiftDay(today, -6), today))
    expect(week.todayRow?.date).toBe(today)
    expect(typeof week.online).toBe('number')
    expect(week.hour).toBeGreaterThanOrEqual(0)
    expect(week.hour).toBeLessThan(24)
    expect(week.totals.views).toBe(sum(week.days.map((d) => d.views)))
    // Compared with the week before only once the counter covers all of it.
    const weekBefore = previousPeriod(week.from, week.to)
    if (weekBefore.from < COUNTING_SINCE) expect(week.previous).toBeNull()
    else expect(week.previous).toMatchObject(weekBefore)

    expect(await get('period=today')).toMatchObject({ from: today, to: today, days: [{ date: today }] })
    const yesterday = await get('period=yesterday')
    expect(yesterday).toMatchObject({ from: shiftDay(today, -1), to: shiftDay(today, -1), todayRow: null })
    const year = await get('period=year')
    expect(year.from).toBe(shiftDay(today, -364))
    expect(year.days.map((d) => d.date)).toEqual(counted(year.from, today))

    // Chosen dates: reversed ones swapped, the future cut off at today.
    const span = await get(`from=${today}&to=${shiftDay(today, -4)}`)
    expect(span).toMatchObject({ from: shiftDay(today, -4), to: today })
    expect(span.days.map((d) => d.date)).toEqual(counted(span.from, today))
    expect(await get(`from=${shiftDay(today, -1)}&to=${shiftDay(today, 30)}`)).toMatchObject({ from: shiftDay(today, -1), to: today })
    // Not a date: the default month, not an error.
    expect(await get('from=2026-02-30&to=2026-03-02')).toMatchObject({ from: shiftDay(today, -29), to: today })
  })
})

/* ── The screen ─────────────────────────────────────────────────────────── */

test.describe('Admin → Статистика', () => {
  test.skip(!SIGNED_IN, 'needs a session: JWT_SECRET and a server on this machine')

  test('a month: figures with how they moved, the chart with its table, the breakdowns, the hours', async ({ page, isMobile }, info) => {
    await signIn(page)
    await answerStats(page, (q) => ({ body: payloadFor(q) }))
    await page.goto('/admin/stats')

    const month = payloadFor('period=30')
    const t = month.totals
    const before = month.previous!
    await expect(page.getByRole('heading', { name: 'Статистика', level: 1 })).toBeVisible()
    await expect(pressed(page, '30 дней')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Сейчас на сайте:')).toContainText('4')
    // What the numbers cover, and what they are compared with.
    await expect(page.getByText('23.01–21.02 · сравнение с 24.12.2026–22.01 · сегодня неполный день')).toBeVisible()
    // When they were read: beside the round arrow, or in its hint where a phone has no room.
    if (isMobile) await expect(page.getByRole('button', { name: 'Обновить' })).toHaveAttribute('title', /^Обновить · обновлено в \d\d:\d\d$/)
    else await expect(page.getByText(/^обновлено в \d\d:\d\d$/)).toBeVisible()

    // Each figure, and how it moved against the thirty days before.
    const moved = (now: number, was: number) => {
      const pct = changePercent(now, was)!
      return new RegExp(`${nf.format(Math.abs(pct))}%\\s*На ${nf.format(Math.abs(pct))}% ${pct > 0 ? 'больше' : 'меньше'}, чем в предыдущем периоде`)
    }
    await expect(tile(page, 'Посетители')).toContainText(nf.format(t.visitors))
    await expect(tile(page, 'Посетители')).toContainText(moved(t.visitors, before.visitors))
    await expect(tile(page, 'Посетители')).toContainText('новых 80%')
    await expect(tile(page, 'Просмотры')).toContainText(nf.format(t.views))
    await expect(tile(page, 'Просмотры')).toContainText(moved(t.views, before.views))
    await expect(tile(page, 'Заявки')).toContainText(moved(t.leads, before.leads))
    await expect(tile(page, 'Конверсия')).toContainText(/п\.п\./)
    await expect(tile(page, 'Конверсия')).toContainText('заявок на 100 посетителей')

    for (const title of ['Посетители по дням', 'Каналы', 'Источники', 'Страницы', 'Кампании', 'Часы посещений · по Ташкенту', 'Устройства', 'Страны', 'Браузеры', 'Язык сайта']) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible()
    }
    await expect(page.getByText('Реклама', { exact: true })).toBeVisible()
    await expect(page.getByText('google / cpc / maze-first')).toBeVisible()
    await expect(page.getByText('Узбекистан')).toBeVisible()
    await expect(page.getByText('Телефон')).toBeVisible()
    await expect(page.getByText(/Пик — 15:00/)).toBeVisible()

    // Every value of the chart is readable without hovering; newest day first.
    await page.getByText('Показать таблицей').first().click()
    const rows = page.locator('details[open] tbody tr')
    await expect(rows).toHaveCount(30)
    await expect(rows.first()).toContainText(`${ddmm(TODAY)}, вс`)

    await page.screenshot({ path: `test-results/screens/stats-${info.project.name}.png`, fullPage: true })
  })

  test('the chart answers the pointer and the keyboard', async ({ page, isMobile }) => {
    await signIn(page)
    await answerStats(page, (q) => ({ body: payloadFor(q) }))
    await page.goto('/admin/stats')

    const chart = page.getByRole('group', { name: /Посетители и заявки по дням/ })
    await expect(chart).toBeVisible()
    const box = (await chart.boundingBox())!
    if (isMobile) await chart.tap({ position: { x: box.width - 2, y: box.height / 2 } })
    else await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2)
    await expect(page.getByText('сегодня, день не закончился')).toBeVisible()

    await chart.focus()
    await page.keyboard.press('Home')
    const first = payloadFor('period=30').days[0]
    await expect(page.locator('p[aria-live="polite"]').filter({ hasText: ddmm(first.date) })).toHaveCount(1)
    // What takes the focus leaves room above itself for the bar that stays on top.
    await expect(chart).toHaveCSS('scroll-margin-top', '112px')
  })

  test('another period is read once; after that only today, every minute, into the totals', async ({ page }) => {
    await page.clock.install()
    await signIn(page)
    let online = 4
    let extra = 0
    const asked = await answerStats(page, (q) => ({ body: payloadFor(q, { online, extra }) }))
    await page.goto('/admin/stats')
    await expect(page.getByText('Сейчас на сайте:')).toContainText('4')

    await pressed(page, '7 дней').click()
    await expect(pressed(page, '7 дней')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText(/^15\.02–21\.02 · сравнение с 08\.02–14\.02/)).toBeVisible()
    expect(asked).toEqual(['period=30', 'period=7'])

    // A minute on, 40 more people today: today's share of the week is
    // replaced, the rest of the week stays as it was read.
    online = 9
    extra = 40
    await page.clock.fastForward(61_000)
    await expect(page.getByText('Сейчас на сайте:')).toContainText('9')
    expect(asked).toEqual(['period=30', 'period=7', 'period=today'])
    await expect(tile(page, 'Посетители')).toContainText(nf.format(payloadFor('period=7', { extra: 40 }).totals.visitors))

    // The round arrow reads the period again, whole.
    await page.getByRole('button', { name: 'Обновить' }).click()
    await expect.poll(() => asked).toEqual(['period=30', 'period=7', 'period=today', 'period=7'])
  })

  test('Сегодня: the hours against yesterday\'s, and no verdict on a day half gone', async ({ page }, info) => {
    await signIn(page)
    await answerStats(page, (q) => ({ body: payloadFor(q) }))
    await page.goto('/admin/stats')
    await pressed(page, 'Сегодня').click()
    await expect(pressed(page, 'Сегодня')).toHaveAttribute('aria-pressed', 'true')

    const now = payloadFor('period=today')
    await expect(page.getByText('21.02, воскресенье · день ещё идёт')).toBeVisible()
    await expect(tile(page, 'Посетители')).toContainText(nf.format(now.totals.visitors))
    // A day that has run to 14:30 is not held against a whole one.
    await expect(tile(page, 'Посетители')).not.toContainText('предыдущем периоде')
    await expect(tile(page, 'Просмотры')).not.toContainText('предыдущем периоде')

    // One day is one column: its hours are drawn instead, yesterday's marked on them.
    await expect(page.getByRole('heading', { name: 'Посетители по дням' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Часы посещений · по Ташкенту' })).toHaveCount(1)
    const hours = page.getByRole('heading', { name: 'Часы посещений · по Ташкенту' }).locator('xpath=../..')
    const legend = hours.locator('ul').first()
    await expect(legend.getByText('Просмотры, сегодня')).toBeVisible()
    await expect(legend.getByText('вчера', { exact: true })).toBeVisible()
    // The one fair comparison: both days up to the last full hour.
    const soFar = upTo(now.totals.hours, NOW_HOUR)
    const wasByNow = upTo(now.previous!.hours!, NOW_HOUR)
    await expect(hours).toContainText(`К 14:00 — ${nf.format(soFar)} просмотр`)
    await expect(hours).toContainText(`вчера к этому часу было ${nf.format(wasByNow)}`)
    const pct = changePercent(soFar, wasByNow)!
    await expect(hours).toContainText(pct === 0 ? 'столько же, сколько вчера к этому часу' : `На ${nf.format(Math.abs(pct))}% ${pct > 0 ? 'больше' : 'меньше'}, чем вчера к этому часу`, { ignoreCase: true })

    await page.screenshot({ path: `test-results/screens/stats-today-${info.project.name}.png`, fullPage: true })
  })

  test('Вчера: a whole day, compared with the day before', async ({ page }) => {
    await page.clock.install()
    await signIn(page)
    let online = 4
    let extra = 0
    const asked = await answerStats(page, (q) => ({ body: payloadFor(q, { online, extra }) }))
    await page.goto('/admin/stats')
    await pressed(page, 'Вчера').click()

    const day = payloadFor('period=yesterday')
    await expect(page.getByText('20.02, суббота · сравнение с 19.02')).toBeVisible()
    await expect(tile(page, 'Посетители')).toContainText(nf.format(day.totals.visitors))
    await expect(tile(page, 'Посетители')).toContainText('предыдущем периоде')
    const legend = page.getByRole('heading', { name: 'Часы посещений · по Ташкенту' }).locator('xpath=../..').locator('ul').first()
    await expect(legend.getByText('Просмотры, вчера')).toBeVisible()
    await expect(legend.getByText('19.02', { exact: true })).toBeVisible()
    expect(asked).toEqual(['period=30', 'period=yesterday'])

    // Yesterday is over: a minute on, only "on the site now" moves.
    online = 7
    extra = 40
    await page.clock.fastForward(61_000)
    await expect(page.getByText('Сейчас на сайте:')).toContainText('7')
    await expect(tile(page, 'Посетители')).toContainText(nf.format(day.totals.visitors))
  })

  test('Год: only the days counted, a column a week, a table of weeks', async ({ page }, info) => {
    await signIn(page)
    await answerStats(page, (q) => ({ body: payloadFor(q) }))
    await page.goto('/admin/stats')
    await pressed(page, 'Год').click()

    await expect(page.getByText('22.02.2026–21.02 · счёт идёт с 12.11.2026')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Посетители по неделям' })).toBeVisible()
    await expect(page.getByText(/Счётчик работает с 12\.11\.2026/)).toBeVisible()
    // A year ago there was no counter to compare with.
    await expect(tile(page, 'Посетители')).not.toContainText('предыдущем периоде')
    await page.getByText('Показать таблицей').first().click()
    const weeks = weekBuckets(payloadFor('period=year').days)
    expect(weeks.length).toBeLessThan(20)
    await expect(page.locator('details[open] tbody tr')).toHaveCount(weeks.length)
    await expect(page.locator('details[open] thead')).toContainText('Неделя')
    // The oldest week begins on the counter's first day, a Thursday.
    await expect(page.locator('details[open] tbody tr').last()).toContainText('12.11.2026–15.11.2026')
    await page.locator('details[open] summary').click()

    await page.screenshot({ path: `test-results/screens/stats-year-${info.project.name}.png`, fullPage: true })
  })

  test('Даты: a named span in one tap, or any days; reversed ones swapped, one date is one day', async ({ page }, info) => {
    await signIn(page)
    const asked = await answerStats(page, (q) => ({ body: payloadFor(q) }))
    await page.goto('/admin/stats')

    await page.getByRole('button', { name: 'Выбрать даты' }).click()
    const panel = page.getByRole('group', { name: 'Свой период' })
    await expect(panel).toBeVisible()
    const [from, to] = [panel.getByLabel('С', { exact: true }), panel.getByLabel('По', { exact: true })]
    // Opens on the period on screen, and offers no day the counter never saw.
    await expect(from).toHaveValue(shiftDay(TODAY, -29))
    await expect(to).toHaveValue(TODAY)
    await expect(from).toHaveAttribute('min', COUNTING_SINCE)
    await expect(to).toHaveAttribute('max', TODAY)
    await page.screenshot({ path: `test-results/screens/stats-dates-${info.project.name}.png` })

    // The spans asked for most are one tap.
    await panel.getByRole('button', { name: 'Прошлый месяц' }).click()
    await expect(panel).toHaveCount(0)
    expect(asked.at(-1)).toBe('from=2027-01-01&to=2027-01-31')
    await expect(page.getByRole('button', { name: /Свой период: 01\.01–31\.01/ })).toBeFocused()
    await expect(page.getByText(/^01\.01–31\.01 · сравнение с 01\.12\.2026–31\.12\.2026$/)).toBeVisible()

    await page.getByRole('button', { name: /Свой период/ }).click()
    await from.fill('2027-02-11')
    await to.fill('2027-02-05')
    await panel.getByRole('button', { name: 'Показать' }).click()
    await expect(panel).toHaveCount(0)
    expect(asked.at(-1)).toBe('from=2027-02-05&to=2027-02-11')
    await expect(page.getByRole('button', { name: /Свой период: 05\.02–11\.02/ })).toBeVisible()
    await page.getByText('Показать таблицей').first().click()
    await expect(page.locator('details[open] tbody tr')).toHaveCount(7)

    // One date in both fields: that day, with its hours.
    await page.getByRole('button', { name: /Свой период/ }).click()
    await from.fill('2027-02-08')
    await to.fill('2027-02-08')
    await to.press('Enter')
    await expect.poll(() => asked.at(-1)).toBe('from=2027-02-08&to=2027-02-08')
    await expect(page.getByText(/^08\.02, понедельник/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Посетители по дням' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Часы посещений · по Ташкенту' })).toBeVisible()

    // Escape puts the panel away and the focus back on its button.
    await page.getByRole('button', { name: /Свой период/ }).click()
    await expect(panel).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Свой период/ })).toBeFocused()

    // A preset again leaves the chosen dates behind.
    await pressed(page, '30 дней').click()
    await expect(page.getByRole('button', { name: 'Выбрать даты' })).toBeVisible()
  })

  test('the period is in the address, and the last preset is what the screen opens on', async ({ page }) => {
    await signIn(page)
    const asked = await answerStats(page, (q) => ({ body: payloadFor(q) }))

    // An address that names a period opens on it.
    await page.goto('/admin/stats?period=yesterday')
    await expect(pressed(page, 'Вчера')).toHaveAttribute('aria-pressed', 'true')
    expect(asked).toEqual(['period=yesterday'])

    // Picking a period puts it in the address: a reload keeps it.
    await pressed(page, '7 дней').click()
    await expect(page).toHaveURL(/\/admin\/stats\?period=7$/)
    await page.reload()
    await expect(pressed(page, '7 дней')).toHaveAttribute('aria-pressed', 'true')
    expect(asked.at(-1)).toBe('period=7')

    // Dates too.
    await page.goto('/admin/stats?from=2027-02-05&to=2027-02-11')
    await expect(page.getByRole('button', { name: /Свой период: 05\.02–11\.02/ })).toBeVisible()
    expect(asked.at(-1)).toBe('from=2027-02-05&to=2027-02-11')

    // Without a period in the address: the preset picked last (dates are not remembered).
    asked.length = 0
    await page.goto('/admin/stats')
    await expect(pressed(page, '7 дней')).toHaveAttribute('aria-pressed', 'true')
    expect(asked).toEqual(['period=7'])
  })

  test('pages go by their names and open in a new tab; a long list opens on request', async ({ page, request }) => {
    // A project the site has, so that its page has a name to be shown by.
    const projects = await (await request.get('/api/portfolio')).json() as Array<{ slug: string; title: string; client: string }>
    test.skip(!Array.isArray(projects) || projects.length === 0, 'no projects on this server')
    const project = projects[0]

    await signIn(page)
    await answerStats(page, (q) => ({ body: payloadFor(q, { project: project.slug }) }))
    await page.goto('/admin/stats')

    const pages = page.getByRole('heading', { name: 'Страницы' }).locator('xpath=..')
    const link = pages.getByRole('link', { name: new RegExp(`^${project.title} — ${project.client}`) })
    await expect(link).toHaveAttribute('href', `/portfolio/${project.slug}`)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(pages.getByRole('link', { name: /^Главная/ })).toHaveAttribute('href', '/')

    // Ten rows of fourteen; the rest one press away, and back.
    await expect(pages.getByRole('listitem')).toHaveCount(10)
    const more = pages.getByRole('button', { name: 'Показать все · 14' })
    await more.click()
    await expect(pages.getByRole('listitem')).toHaveCount(14)
    await pages.getByRole('button', { name: 'Свернуть' }).click()
    await expect(pages.getByRole('listitem')).toHaveCount(10)
    // A short list has nothing to open.
    await expect(page.getByRole('heading', { name: 'Устройства' }).locator('xpath=..').getByRole('button')).toHaveCount(0)
  })

  test('on a wide screen the period stays in reach while the page scrolls', async ({ page, isMobile }, info) => {
    await signIn(page)
    await answerStats(page, (q) => ({ body: payloadFor(q) }))
    await page.goto('/admin/stats')
    await expect(page.getByRole('heading', { name: 'Язык сайта' })).toBeVisible()

    const toBottom = () => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const bar = page.getByRole('group', { name: 'Период' })
    const today = pressed(page, 'Сегодня')
    await toBottom()
    if (isMobile) {
      // A phone's two rows of choices would take a fifth of the screen: they scroll away.
      await expect(today).not.toBeInViewport()
      return
    }
    await expect(today).toBeInViewport()
    expect((await bar.boundingBox())!.y).toBeLessThan(20)
    await page.screenshot({ path: `test-results/screens/stats-stuck-${info.project.name}.png` })

    // Between 640 and 1024px the admin's own header is fixed along the top: the bar stays under it.
    await page.setViewportSize({ width: 800, height: 900 })
    await toBottom()
    await expect(today).toBeInViewport()
    const y = (await bar.boundingBox())!.y
    expect(y).toBeGreaterThanOrEqual(56)
    expect(y).toBeLessThan(80)
    await page.screenshot({ path: `test-results/screens/stats-stuck-800-${info.project.name}.png` })

    // And it still works from there.
    await today.click()
    await expect(today).toHaveAttribute('aria-pressed', 'true')
  })

  test('while the first numbers load the page holds their places', async ({ page }) => {
    await signIn(page)
    let release = () => {}
    const held = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/api/analytics/stats?*', async (route) => {
      await held
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payloadFor(new URL(route.request().url()).search.slice(1))) })
    })
    await page.goto('/admin/stats')
    const loading = page.getByRole('status').filter({ hasText: 'Загружаем статистику' })
    await expect(loading).toHaveCount(1)
    await expect(page.getByText('Сейчас на сайте:')).toContainText('—')
    release()
    await expect(loading).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Посетители по дням' })).toBeVisible()
  })

  test('nothing counted yet: says why and how to see the first numbers, without empty charts', async ({ page }, info) => {
    await signIn(page)
    await answerStats(page, (q) => ({ body: payloadFor(q, { empty: true, online: 0 }) }))
    await page.goto('/admin/stats')
    await expect(page.getByText('Данных пока нет')).toBeVisible()
    await expect(page.getByText(/Откройте сайт в другом браузере/)).toBeVisible()
    await expect(page.getByText('Сейчас на сайте:')).toContainText('0')
    await expect(tile(page, 'Посетители')).toContainText('0')
    for (const title of ['Посетители по дням', 'Каналы', 'Часы посещений · по Ташкенту', 'Устройства']) {
      await expect(page.getByRole('heading', { name: title })).toHaveCount(0)
    }
    await page.screenshot({ path: `test-results/screens/stats-empty-${info.project.name}.png`, fullPage: true })
  })

  test('a period with one counted day shows that day\'s hours, not a chart of one column', async ({ page }) => {
    await signIn(page)
    // The counter's first day: a week, a month, a year all hold just it.
    await answerStats(page, (q) => ({ body: payloadFor(q, { today: COUNTING_SINCE }) }))
    await page.goto('/admin/stats?period=7')
    await expect(page.getByText('06.11–12.11 · счёт идёт с 12.11.2026')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Посетители по дням' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Часы посещений · по Ташкенту' })).toHaveCount(1)
    await expect(page.getByText(/Счётчик работает с 12\.11\.2026/)).toBeVisible()
    await expect(tile(page, 'Посетители')).not.toContainText('предыдущем периоде')
  })

  test('a store that does not answer: the reason, and «Повторить» reads again', async ({ page }) => {
    await signIn(page)
    let down = true
    await answerStats(page, (q) => down
      ? { status: 503, body: { error: 'Статистика не подключена: в Vercel нет Redis (KV_REST_API_URL).' } }
      : { body: payloadFor(q) })
    await page.goto('/admin/stats')
    // Ours, not Next's route announcer, which is an alert too.
    const alert = page.getByRole('alert').filter({ hasText: 'Redis' })
    await expect(alert).toContainText('нет Redis')
    down = false
    await alert.getByRole('button', { name: 'Повторить' }).click()
    await expect(alert).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Посетители по дням' })).toBeVisible()
  })
})

/* ── The dashboard ──────────────────────────────────────────────────────── */

test.describe('Admin dashboard: report and counter status', () => {
  test.skip(!SIGNED_IN, 'needs a session: JWT_SECRET and a server on this machine')

  const lastNight = {
    at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    date: shiftDay(siteDay(), -1), sent: true, via: 'secret', counts: { visitors: 812, views: 1290, leads: 9 },
  }

  test('both working: scheduled, last run sent with its figures, the store answers', async ({ page }, info) => {
    await signIn(page)
    await page.route('**/api/cron/daily-digest?runs=1', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, cronSecretConfigured: true, telegramConfigured: true, runs: [lastNight, { ...lastNight, at: new Date(Date.now() - 27 * 3_600_000).toISOString() }] }),
    }))
    const asked = await answerStats(page, (q) => ({ body: payloadFor(q, { online: 3 }) }))
    let sent = false
    await page.route('**/api/cron/daily-digest?send=1', (route) => {
      sent = true
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, sent: true }) })
    })

    await page.goto('/admin')
    const status = page.getByRole('region', { name: 'Статистика и ежедневный отчёт' })
    await expect(status.getByText('Статистика за день — по расписанию')).toBeVisible()
    await expect(status.getByText(/Последний запуск: .* — отправлен/)).toContainText('812 чел. · 9 заявок')
    await expect(status.getByText(/База отвечает\. Сегодня/)).toContainText(`Сегодня ${nf.format(payloadFor('period=today').totals.visitors)} чел.`)
    await expect(status.getByText(/База отвечает\. Сегодня/)).toContainText('сейчас на сайте 3')
    expect(asked).toEqual(['period=today'])
    await page.screenshot({ path: `test-results/screens/dashboard-${info.project.name}.png`, fullPage: true })

    await status.getByRole('button', { name: 'Отправить сейчас' }).click()
    await expect(page.getByText('Отчёт отправлен в Telegram')).toBeVisible()
    expect(sent).toBe(true)
  })

  test('not working: says what is missing and what to do', async ({ page }) => {
    await signIn(page)
    await page.route('**/api/cron/daily-digest?runs=1', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, cronSecretConfigured: false, telegramConfigured: false, runs: [] }),
    }))
    await answerStats(page, () => ({ status: 503, body: { error: 'Статистика не подключена: в Vercel нет Redis (KV_REST_API_URL).' } }))
    await page.goto('/admin')
    const status = page.getByRole('region', { name: 'Статистика и ежедневный отчёт' })
    await expect(status.getByText('Статистика за день — не работает')).toBeVisible()
    await expect(status.getByText(/TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID/)).toBeVisible()
    await expect(status.getByRole('button', { name: 'Отправить сейчас' })).toBeDisabled()
    await expect(status.getByText('Статистика — собственная: база не отвечает')).toBeVisible()
    await expect(status.getByText(/нет Redis/)).toBeVisible()
  })
})
