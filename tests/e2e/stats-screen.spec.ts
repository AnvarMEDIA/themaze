import { test, expect, type Page } from '@playwright/test'
import { SignJWT } from 'jose'
import { emptyCounts, mergeDays, type StatsDay } from '../../lib/stats/model'
import { daysEndingOn, siteDay } from '../../lib/stats/time'

/**
 * Admin → Статистика and the dashboard's status lines.
 *
 * Without a session the data must be refused; that is checked against any
 * server. The screens need a session, signed with JWT_SECRET, so they run
 * only against a server on this machine. Their numbers are answered by the
 * test (a month of an ad campaign, an empty store, a store that is down), so
 * what is drawn is known and the screenshots can be compared by eye; the
 * real endpoint is checked separately, once, for its shape.
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

/* ── A month of numbers ─────────────────────────────────────────────────── */

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

/** A day of a phone-heavy site whose ads started a week ago. */
function sampleDay(date: string, i: number, n: number, today: string): StatsDay {
  const r = random(i + 7)
  const ads = i >= n - 8
  let visitors = Math.round((ads ? 620 : 45) + (ads ? 260 : 30) * r())
  if (date === today) visitors = Math.round(visitors * 0.35)
  const views = Math.round(visitors * (1.4 + r() * 0.5))
  const leads = Math.round(visitors * (ads ? 0.012 : 0.02) * r() + (r() > 0.6 ? 1 : 0))
  const brief = Math.min(leads, Math.round(leads * 0.4))
  const hours = Array.from({ length: 24 }, (_, h) => Math.max(0, Math.round(Math.exp(-((h - 15) ** 2) / 18) * 10 + (h > 8 && h < 23 ? 2 : 0))))
  const hsum = hours.reduce((s, v) => s + v, 0)
  const day: StatsDay = {
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
  return day
}

function payload(days: number, opts: { online?: number; empty?: boolean } = {}) {
  const today = siteDay()
  const dates = daysEndingOn(today, days)
  const rows = dates.map((d, i) => opts.empty ? { ...emptyCounts(), date: d } : sampleDay(d, i + (90 - days), 90, today))
  return { days: rows, totals: mergeDays(rows), online: opts.online ?? 4, from: dates[0], to: dates[dates.length - 1] }
}

/** Answer the screen's reads; returns the `days` asked for, in order. */
async function answerStats(page: Page, reply: (days: number) => { status?: number; body: unknown }) {
  const asked: number[] = []
  await page.route('**/api/analytics/stats?*', async (route) => {
    const days = Number(new URL(route.request().url()).searchParams.get('days'))
    asked.push(days)
    const { status = 200, body } = reply(days)
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  })
  return asked
}

async function signIn(page: Page) {
  await page.context().addCookies([{ name: 'maze_admin_token', value: await adminToken(), url: BASE }])
}

/* ── The endpoint ───────────────────────────────────────────────────────── */

test.describe('GET /api/analytics/stats', () => {
  test.skip(({ isMobile }) => isMobile, 'an endpoint: once is enough')

  test('is refused without a session', async ({ request }) => {
    const res = await request.get('/api/analytics/stats?days=7')
    expect(res.status()).toBe(401)
  })

  test('gives a signed-in admin the period, today last, and who is here now', async ({ request }) => {
    test.skip(!SIGNED_IN, 'needs a session: JWT_SECRET and a server on this machine')
    const res = await request.get('/api/analytics/stats?days=7', {
      headers: { cookie: `maze_admin_token=${await adminToken()}` },
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['cache-control']).toContain('no-store')
    const body = await res.json() as ReturnType<typeof payload>
    expect(body.days).toHaveLength(7)
    expect(body.to).toBe(siteDay())
    expect(body.days[6].date).toBe(body.to)
    expect(typeof body.online).toBe('number')
    expect(body.totals.views).toBe(body.days.reduce((s, d) => s + d.views, 0))
  })
})

/* ── The screen ─────────────────────────────────────────────────────────── */

test.describe('Admin → Статистика', () => {
  test.skip(!SIGNED_IN, 'needs a session: JWT_SECRET and a server on this machine')

  test('a month: the cards, the chart with its table, the breakdowns, the hours', async ({ page }, info) => {
    await signIn(page)
    await answerStats(page, (days) => ({ body: payload(days) }))
    await page.goto('/admin/stats')

    const month = payload(30)
    const t = month.totals
    await expect(page.getByRole('heading', { name: 'Статистика', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: '30 дней' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Сейчас на сайте:')).toContainText('4')

    const nf = new Intl.NumberFormat('ru-RU')
    await expect(page.getByText(nf.format(t.visitors), { exact: true })).toBeVisible()
    await expect(page.getByText(nf.format(t.views), { exact: true }).first()).toBeVisible()
    await expect(page.getByText('за 30 дней')).toBeVisible()
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
    const today = siteDay()
    const weekday = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][new Date(`${today}T12:00:00Z`).getUTCDay()]
    await expect(rows.first()).toContainText(`${today.slice(8, 10)}.${today.slice(5, 7)}, ${weekday}`)

    await page.screenshot({ path: `test-results/screens/stats-${info.project.name}.png`, fullPage: true })
  })

  test('the chart answers the pointer and the keyboard', async ({ page, isMobile }) => {
    await signIn(page)
    await answerStats(page, (days) => ({ body: payload(days) }))
    await page.goto('/admin/stats')

    const chart = page.getByRole('group', { name: /Посетители и заявки по дням/ })
    await expect(chart).toBeVisible()
    const box = (await chart.boundingBox())!
    if (isMobile) await chart.tap({ position: { x: box.width - 2, y: box.height / 2 } })
    else await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2)
    await expect(page.getByText('сегодня, день не закончился')).toBeVisible()

    await chart.focus()
    await page.keyboard.press('Home')
    const first = payload(30).days[0]
    await expect(page.locator('p[aria-live="polite"]').filter({ hasText: `${first.date.slice(8, 10)}.${first.date.slice(5, 7)}` })).toHaveCount(1)
  })

  test('another period is read once; after that only today, every minute', async ({ page }) => {
    await page.clock.install()
    await signIn(page)
    let online = 4
    const asked = await answerStats(page, (days) => ({ body: payload(days, { online }) }))
    await page.goto('/admin/stats')
    await expect(page.getByText('Сейчас на сайте:')).toContainText('4')

    await page.getByRole('button', { name: '7 дней' }).click()
    await expect(page.getByRole('button', { name: '7 дней' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('за 7 дней')).toBeVisible()
    expect(asked).toEqual([30, 7])

    online = 9
    await page.clock.fastForward(61_000)
    await expect(page.getByText('Сейчас на сайте:')).toContainText('9')
    expect(asked).toEqual([30, 7, 1])
    await expect(page.getByText('за 7 дней')).toBeVisible()
  })

  test('nothing counted yet: says why, and how to see the first numbers', async ({ page }, info) => {
    await signIn(page)
    await answerStats(page, (days) => ({ body: payload(days, { empty: true, online: 0 }) }))
    await page.goto('/admin/stats')
    await expect(page.getByText('Данных пока нет')).toBeVisible()
    await expect(page.getByText('Переходов с utm-метками пока не было')).toBeVisible()
    await expect(page.getByText('Сейчас на сайте:')).toContainText('0')
    await page.screenshot({ path: `test-results/screens/stats-empty-${info.project.name}.png`, fullPage: true })
  })

  test('a store that does not answer: the reason, and «Повторить» reads again', async ({ page }) => {
    await signIn(page)
    let down = true
    await answerStats(page, (days) => down
      ? { status: 503, body: { error: 'Статистика не подключена: в Vercel нет Redis (KV_REST_API_URL).' } }
      : { body: payload(days) })
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
    date: daysEndingOn(siteDay(), 2)[0], sent: true, via: 'secret', counts: { visitors: 812, views: 1290, leads: 9 },
  }

  test('both working: scheduled, last run sent with its figures, the store answers', async ({ page }, info) => {
    await signIn(page)
    await page.route('**/api/cron/daily-digest?runs=1', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, cronSecretConfigured: true, telegramConfigured: true, runs: [lastNight, { ...lastNight, at: new Date(Date.now() - 27 * 3_600_000).toISOString() }] }),
    }))
    await answerStats(page, (days) => ({ body: payload(days, { online: 3 }) }))
    let sent = false
    await page.route('**/api/cron/daily-digest?send=1', (route) => {
      sent = true
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, sent: true }) })
    })

    await page.goto('/admin')
    const status = page.getByRole('region', { name: 'Статистика и ежедневный отчёт' })
    await expect(status.getByText('Статистика за день — по расписанию')).toBeVisible()
    await expect(status.getByText(/Последний запуск: .* — отправлен/)).toContainText('812 чел. · 9 заявок')
    await expect(status.getByText(/База отвечает\. Сегодня/)).toContainText('сейчас на сайте 3')
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
