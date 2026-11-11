import { test, expect, type Page } from '@playwright/test'
import { SignJWT } from 'jose'
import { emptyCounts, mergeDays, type StatsDay } from '../../lib/stats/model'
import { COUNTING_SINCE, daysBetween, resolvePeriod, weekBuckets } from '../../lib/stats/periods'
import { shiftDay, siteDay } from '../../lib/stats/time'

/**
 * Admin → Статистика and the dashboard's status lines.
 *
 * Without a session the data must be refused; that is checked against any
 * server. The screens need a session, signed with JWT_SECRET, so they run
 * only against a server on this machine. Their numbers are answered by the
 * test (weeks of an ad campaign, an empty store, a store that is down), so
 * what is drawn is known and the screenshots can be compared by eye; the
 * real endpoint is checked separately for its shape and its periods.
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

/* ── Weeks of numbers ───────────────────────────────────────────────────── */

/**
 * The day the answered numbers take for today: five weeks after the counter
 * started, so that every period has days to show and the date fields have
 * days to offer. The screen takes "today" from the answer, never its clock.
 */
const TODAY = '2026-12-20'
const ddmm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
const nf = new Intl.NumberFormat('ru-RU')

function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

/** Split `total` across named parts by weight, the remainder to the first. */
function split(total: number, weights: Record<string, number>): Record<string, number> {
  const sum = Object.values(weights).reduce((s, w) => s + w, 0)
  const out: Record<string, number> = {}
  let left = total
  for (const [k, w] of Object.entries(weights).slice(1)) { out[k] = Math.floor((total * w) / sum); left -= out[k] }
  return { [Object.keys(weights)[0]]: left, ...out }
}

/**
 * A day of a phone-heavy site whose ads started a week before TODAY; today
 * a third done, plus `extra` people since. Before the counter started,
 * nothing, as in the real store.
 */
function sampleDay(date: string, extra = 0): StatsDay {
  if (date < COUNTING_SINCE) return { ...emptyCounts(), date }
  const r = random(Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000))
  const ads = date > shiftDay(TODAY, -8)
  let visitors = Math.round((ads ? 620 : 45) + (ads ? 260 : 30) * r())
  if (date === TODAY) visitors = Math.round(visitors * 0.35) + extra
  const views = Math.round(visitors * (1.4 + r() * 0.5))
  const leads = Math.round(visitors * (ads ? 0.012 : 0.02) * r() + (r() > 0.6 ? 1 : 0))
  const brief = Math.min(leads, Math.round(leads * 0.4))
  const hours = Array.from({ length: 24 }, (_, h) => Math.max(0, Math.round(Math.exp(-((h - 15) ** 2) / 18) * 10 + (h > 8 && h < 23 ? 2 : 0))))
  const hsum = hours.reduce((s, v) => s + v, 0)
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
    pages: split(views, { '/': 46, '/portfolio': 18, '/services': 11, '/contact': 8, '/brief': 7, '/about': 5, '/portfolio/uzum-market-rebrand': 3, '/insights/brand-strategy-2026': 2 }),
    devices: split(views, { mobile: 80, desktop: 18, tablet: 2 }),
    os: split(views, { Android: 55, iOS: 27, Windows: 14, macOS: 4 }),
    browsers: split(views, { Chrome: 52, Safari: 25, 'Яндекс': 12, Samsung: 7, Edge: 4 }),
    countries: split(views, { UZ: 86, RU: 5, KZ: 4, XX: 3, US: 2 }),
    locales: split(views, { ru: 84, en: 16 }),
    hours: hours.map((v) => Math.round((v / hsum) * views)),
  }
}

/** What the endpoint answers for a query, as lib/stats/store builds it. */
function payloadFor(query: string, opts: { online?: number; empty?: boolean; extra?: number } = {}) {
  const q = new URLSearchParams(query)
  const { from, to } = resolvePeriod({ period: q.get('period'), from: q.get('from'), to: q.get('to'), days: q.get('days') }, TODAY)
  const rows = daysBetween(from, to).map((d) => (opts.empty ? { ...emptyCounts(), date: d } : sampleDay(d, opts.extra)))
  return {
    days: rows.map(({ date, visitors, views, leads, newVisitors }) => ({ date, visitors, views, leads, newVisitors })),
    totals: mergeDays(rows),
    online: opts.online ?? 4,
    from,
    to,
    today: TODAY,
    todayRow: rows.find((r) => r.date === TODAY) ?? null,
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

/** The "Посетители" card: its number and the period it covers. */
const visitorsCard = (page: Page) => page.getByText('Посетители', { exact: true }).first().locator('xpath=..')

/* ── The endpoint ───────────────────────────────────────────────────────── */

test.describe('GET /api/analytics/stats', () => {
  test.skip(({ isMobile }) => isMobile, 'an endpoint: once is enough')

  test('is refused without a session', async ({ request }) => {
    expect((await request.get('/api/analytics/stats?days=7')).status()).toBe(401)
    expect((await request.get('/api/analytics/stats?period=year')).status()).toBe(401)
  })

  test('gives a signed-in admin each period: its days, their totals, today, who is here now', async ({ request }) => {
    test.skip(!SIGNED_IN, 'needs a session: JWT_SECRET and a server on this machine')
    const headers = { cookie: `maze_admin_token=${await adminToken()}` }
    const get = async (query: string) => {
      const res = await request.get(`/api/analytics/stats?${query}`, { headers })
      expect(res.status()).toBe(200)
      expect(res.headers()['cache-control']).toContain('no-store')
      return await res.json() as ReturnType<typeof payloadFor>
    }
    const today = siteDay()

    const week = await get('days=7')
    expect(week.days).toHaveLength(7)
    expect(week).toMatchObject({ to: today, today })
    expect(week.days[6].date).toBe(today)
    expect(week.todayRow?.date).toBe(today)
    expect(typeof week.online).toBe('number')
    expect(week.totals.views).toBe(week.days.reduce((s, d) => s + d.views, 0))

    expect(await get('period=today')).toMatchObject({ from: today, to: today, days: [{ date: today }] })
    const yesterday = await get('period=yesterday')
    expect(yesterday).toMatchObject({ from: shiftDay(today, -1), to: shiftDay(today, -1), todayRow: null })
    expect((await get('period=year')).days).toHaveLength(365)

    // Chosen dates: reversed ones swapped, the future cut off at today.
    const span = await get(`from=${today}&to=${shiftDay(today, -4)}`)
    expect(span).toMatchObject({ from: shiftDay(today, -4), to: today })
    expect(span.days).toHaveLength(5)
    expect(await get(`from=${shiftDay(today, -1)}&to=${shiftDay(today, 30)}`)).toMatchObject({ from: shiftDay(today, -1), to: today })
    // Not a date: the default month, not an error.
    expect((await get('from=2026-02-30&to=2026-03-02')).days).toHaveLength(30)
  })
})

/* ── The screen ─────────────────────────────────────────────────────────── */

test.describe('Admin → Статистика', () => {
  test.skip(!SIGNED_IN, 'needs a session: JWT_SECRET and a server on this machine')

  test('a month: the cards, the chart with its table, the breakdowns, the hours', async ({ page }, info) => {
    await signIn(page)
    await answerStats(page, (q) => ({ body: payloadFor(q) }))
    await page.goto('/admin/stats')

    const t = payloadFor('period=30').totals
    await expect(page.getByRole('heading', { name: 'Статистика', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: '30 дней' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Сейчас на сайте:')).toContainText('4')

    await expect(visitorsCard(page)).toContainText(nf.format(t.visitors))
    await expect(page.getByText(nf.format(t.views), { exact: true }).first()).toBeVisible()
    await expect(visitorsCard(page)).toContainText('за 30 дней')
    await expect(page.getByText('заявок на 100 посетителей')).toBeVisible()

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
  })

  test('another period is read once; after that only today, every minute, into the totals', async ({ page }) => {
    await page.clock.install()
    await signIn(page)
    let online = 4
    let extra = 0
    const asked = await answerStats(page, (q) => ({ body: payloadFor(q, { online, extra }) }))
    await page.goto('/admin/stats')
    await expect(page.getByText('Сейчас на сайте:')).toContainText('4')

    await page.getByRole('button', { name: '7 дней' }).click()
    await expect(page.getByRole('button', { name: '7 дней' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('за 7 дней')).toBeVisible()
    expect(asked).toEqual(['period=30', 'period=7'])

    // A minute on, 40 more people today: today's share of the week is
    // replaced, the rest of the week stays as it was read.
    online = 9
    extra = 40
    await page.clock.fastForward(61_000)
    await expect(page.getByText('Сейчас на сайте:')).toContainText('9')
    expect(asked).toEqual(['period=30', 'period=7', 'period=today'])
    await expect(visitorsCard(page)).toContainText(nf.format(payloadFor('period=7', { extra: 40 }).totals.visitors))
    await expect(page.getByText('за 7 дней')).toBeVisible()
  })

  test('Сегодня and Вчера: one day shows its hours, not a one-column chart', async ({ page }) => {
    await page.clock.install()
    await signIn(page)
    let online = 4
    let extra = 0
    const asked = await answerStats(page, (q) => ({ body: payloadFor(q, { online, extra }) }))
    await page.goto('/admin/stats')
    await expect(page.getByRole('heading', { name: 'Посетители по дням' })).toBeVisible()

    await page.getByRole('button', { name: 'Сегодня' }).click()
    await expect(visitorsCard(page)).toContainText('сегодня')
    await expect(page.getByRole('heading', { name: 'Посетители по дням' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Часы посещений · по Ташкенту' })).toHaveCount(1)
    await expect(visitorsCard(page)).toContainText(nf.format(payloadFor('period=today').totals.visitors))

    await page.getByRole('button', { name: 'Вчера' }).click()
    await expect(visitorsCard(page)).toContainText('вчера')
    const yesterday = payloadFor('period=yesterday').totals.visitors
    await expect(visitorsCard(page)).toContainText(nf.format(yesterday))
    expect(asked).toEqual(['period=30', 'period=today', 'period=yesterday'])

    // Yesterday is over: a minute on, only "on the site now" moves.
    online = 7
    extra = 40
    await page.clock.fastForward(61_000)
    await expect(page.getByText('Сейчас на сайте:')).toContainText('7')
    await expect(visitorsCard(page)).toContainText(nf.format(yesterday))
  })

  test('Год: a column a week, and a table of weeks', async ({ page }, info) => {
    await signIn(page)
    await answerStats(page, (q) => ({ body: payloadFor(q) }))
    await page.goto('/admin/stats')
    await page.getByRole('button', { name: 'Год', exact: true }).click()

    await expect(visitorsCard(page)).toContainText('за год')
    await expect(page.getByRole('heading', { name: 'Посетители по неделям' })).toBeVisible()
    await expect(page.getByText(/Счётчик работает с 12\.11\.2026/)).toBeVisible()
    await page.getByText('Показать таблицей').first().click()
    const weeks = weekBuckets(payloadFor('period=year').days)
    await expect(page.locator('details[open] tbody tr')).toHaveCount(weeks.length)
    await expect(page.locator('details[open] thead')).toContainText('Неделя')
    await page.locator('details[open] summary').click()

    await page.screenshot({ path: `test-results/screens/stats-year-${info.project.name}.png`, fullPage: true })
  })

  test('Даты: any span of days, reversed ones swapped, one date is one day', async ({ page }, info) => {
    await signIn(page)
    const asked = await answerStats(page, (q) => ({ body: payloadFor(q) }))
    await page.goto('/admin/stats')

    const dates = page.getByRole('button', { name: 'Выбрать даты' })
    await dates.click()
    const panel = page.getByRole('group', { name: 'Свой период' })
    await expect(panel).toBeVisible()
    const [from, to] = [panel.getByLabel('С', { exact: true }), panel.getByLabel('По', { exact: true })]
    // Opens on the period on screen, and offers no day the counter never saw.
    await expect(from).toHaveValue(shiftDay(TODAY, -29))
    await expect(to).toHaveValue(TODAY)
    await expect(from).toHaveAttribute('min', COUNTING_SINCE)
    await expect(to).toHaveAttribute('max', TODAY)
    await page.screenshot({ path: `test-results/screens/stats-dates-${info.project.name}.png` })

    await from.fill('2026-12-11')
    await to.fill('2026-12-05')
    await panel.getByRole('button', { name: 'Показать' }).click()
    await expect(panel).toHaveCount(0)
    expect(asked.at(-1)).toBe('from=2026-12-05&to=2026-12-11')
    await expect(page.getByRole('button', { name: /Свой период: 05\.12–11\.12/ })).toBeVisible()
    await expect(visitorsCard(page)).toContainText('с 05.12 по 11.12')
    await page.getByText('Показать таблицей').first().click()
    await expect(page.locator('details[open] tbody tr')).toHaveCount(7)

    // One date in both fields: that day, with its hours.
    await page.getByRole('button', { name: /Свой период/ }).click()
    await from.fill('2026-12-08')
    await to.fill('2026-12-08')
    await to.press('Enter')
    await expect.poll(() => asked.at(-1)).toBe('from=2026-12-08&to=2026-12-08')
    await expect(visitorsCard(page)).toContainText('за 08.12')
    await expect(page.getByRole('heading', { name: 'Посетители по дням' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Часы посещений · по Ташкенту' })).toBeVisible()

    // Escape puts the panel away and the focus back on its button.
    await page.getByRole('button', { name: /Свой период/ }).click()
    await expect(panel).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Свой период/ })).toBeFocused()

    // A preset again leaves the chosen dates behind.
    await page.getByRole('button', { name: '30 дней' }).click()
    await expect(page.getByRole('button', { name: 'Выбрать даты' })).toBeVisible()
  })

  test('nothing counted yet: says why, and how to see the first numbers', async ({ page }, info) => {
    await signIn(page)
    await answerStats(page, (q) => ({ body: payloadFor(q, { empty: true, online: 0 }) }))
    await page.goto('/admin/stats')
    await expect(page.getByText('Данных пока нет')).toBeVisible()
    await expect(page.getByText('Переходов с utm-метками пока не было')).toBeVisible()
    await expect(page.getByText('Сейчас на сайте:')).toContainText('0')
    await page.screenshot({ path: `test-results/screens/stats-empty-${info.project.name}.png`, fullPage: true })
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
