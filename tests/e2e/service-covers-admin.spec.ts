import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { SignJWT } from 'jose'
import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import sharp from 'sharp'

/**
 * Admin → Услуги in the browser: the summary, one service's cover from
 * upload to removal, and many pictures loaded at once.
 */

const SECRET = process.env.JWT_SECRET
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 3100}`
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(BASE)

test.skip(!SECRET || !LOCAL, 'needs the local server and its JWT_SECRET')
test.skip(({ isMobile }) => isMobile, 'the admin is used at a desk; once is enough')
test.describe.configure({ mode: 'serial' })

const token = () => new SignJWT({ role: 'admin' })
  .setProtectedHeader({ alg: 'HS256' }).setIssuedAt()
  .setIssuer('maze.uz/admin').setAudience('maze.uz/admin-ui').setSubject('admin').setExpirationTime('10m')
  .sign(new TextEncoder().encode(SECRET))

async function signIn(page: Page) {
  await page.context().addCookies([{ name: 'maze_admin_token', value: await token(), url: BASE }])
}

const dir = mkdtempSync(path.join(tmpdir(), 'maze-cover-files-'))
async function file(name: string, width: number, height: number, format: 'jpeg' | 'png' = 'jpeg'): Promise<string> {
  const out = path.join(dir, name)
  writeFileSync(out, await sharp({ create: { width, height, channels: 3, background: '#5b7c99' } }).toFormat(format).toBuffer())
  return out
}

async function clear(request: APIRequestContext, slug: string) {
  await request.put(`/api/services/covers/${slug}`, {
    headers: { cookie: `maze_admin_token=${await token()}` },
    data: { coverDesktop: null, coverMobile: null, coverAlt: { ru: '', en: '' } },
  })
}

test.beforeAll(async ({ request }) => { for (const slug of ['branding', 'naming', 'print']) await clear(request, slug) })
test.afterAll(async ({ request }) => { for (const slug of ['branding', 'naming', 'print']) await clear(request, slug) })

test('the summary lists the nine services and says what is missing', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/services')
  await expect(page.getByRole('heading', { name: 'Услуги', level: 1 })).toBeVisible()
  await expect(page.locator('ul > li a[href^="/admin/services/"]')).toHaveCount(9)
  const branding = page.locator('a[href="/admin/services/branding"]')
  await expect(branding).toContainText('Брендинг')
  await expect(branding).toContainText('Нет обложки')
  // The sidebar leads here.
  await expect(page.getByRole('link', { name: 'Services' })).toBeVisible()
})

test('one cover: uploaded, warned about, saved, removed after a confirmation', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/services/branding')
  await expect(page.getByRole('heading', { name: 'Брендинг', level: 1 })).toBeVisible()
  const save = page.getByRole('button', { name: 'Сохранить' })
  await expect(save).toBeDisabled()

  const desktop = page.getByRole('region', { name: 'Десктоп' })
  const mobile = page.getByRole('region', { name: 'Мобайл' })
  await desktop.locator('input[type=file]').setInputFiles(await file('cover.jpg', 2560, 800))
  await expect(desktop.locator('img')).toHaveAttribute('src', /cover-desktop-\d+\.webp$/)
  await expect(desktop).toContainText('Новое фото · не сохранено')
  await expect(mobile).toContainText('на телефоне покажется десктопное')

  // Off the recommended size: the real numbers, and nothing sent until the admin says so.
  await mobile.locator('input[type=file]').setInputFiles(await file('tall.jpg', 900, 1600))
  const warning = mobile.getByRole('alert')
  await expect(warning).toContainText('Фото 900×1 600 px не по размеру')
  await expect(warning).toContainText('соотношение сторон 0,56:1, нужно 1,2–1,45:1')
  await expect(warning).not.toContainText('ширина')
  await expect(mobile.locator('img')).toHaveCount(0)
  await warning.getByRole('button', { name: 'Загрузить всё равно' }).click()
  await expect(mobile.locator('img')).toHaveAttribute('src', /cover-mobile-\d+\.webp$/)

  const altRu = page.getByLabel('Alt (RU)')
  await expect(altRu).toHaveValue('Брендинг — MAZE Studio')
  await altRu.fill('Брендинг кофейни — MAZE Studio')
  await save.click()
  await expect(page.getByRole('status')).toContainText('Сохранено. Страница услуги уже показывает новую обложку.')
  await expect(save).toBeDisabled()

  // As saved, after a reload.
  await page.reload()
  await expect(page.getByLabel('Alt (RU)')).toHaveValue('Брендинг кофейни — MAZE Studio')
  await expect(mobile.locator('img')).toHaveAttribute('src', /cover-mobile-\d+\.webp$/)

  // Removing asks first; declined, nothing changes.
  page.once('dialog', (d) => d.dismiss())
  await mobile.getByRole('button', { name: 'Удалить' }).click()
  await expect(mobile.locator('img')).toHaveCount(1)
  page.once('dialog', (d) => d.accept())
  await mobile.getByRole('button', { name: 'Удалить' }).click()
  await expect(mobile).toContainText('Удалено · не сохранено')
  await save.click()
  await expect(page.getByRole('status')).toContainText('Сохранено')
  await page.reload()
  await expect(mobile.locator('img')).toHaveCount(0)
  await expect(desktop.locator('img')).toHaveCount(1)
})

test('many pictures at once go where their names say', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/services')
  const bulk = page.getByRole('region', { name: 'Загрузить пачкой' })
  await bulk.locator('input[type=file]').setInputFiles([
    await file('naming-d.png', 2560, 800, 'png'),
    await file('naming-m.jpg', 1080, 810),
    await file('print-d.jpg', 1600, 900),
    await file('holiday.jpg', 800, 600),
  ])
  await expect(bulk).toContainText('→ Нейминг · Десктоп')
  await expect(bulk).toContainText('ширина 1600 px, нужно от 1920 px')
  await expect(bulk).toContainText('Имя не подходит')
  await bulk.getByRole('button', { name: 'Загрузить всё равно (3)' }).click()
  await expect(bulk.getByRole('status')).toContainText('Сохранено фото: 3', { timeout: 20_000 })

  await expect(page.locator('a[href="/admin/services/naming"]')).toContainText('Готово')
  await expect(page.locator('a[href="/admin/services/print"]')).toContainText('Нет мобильного')
})

test.describe('The service page with its cover', () => {
  const SLUG = 'packaging'
  test.afterAll(async ({ request }) => clear(request, SLUG))

  async function setCover(request: APIRequestContext, slots: Array<'desktop' | 'mobile'>) {
    const urls: Record<string, string | null> = { desktop: null, mobile: null }
    for (const slot of slots) {
      const [w, h] = slot === 'desktop' ? [2560, 800] : [1080, 810]
      const res = await request.post('/api/services/covers/upload', {
        headers: { cookie: `maze_admin_token=${await token()}` },
        multipart: { slug: SLUG, slot, file: { name: `${SLUG}.jpg`, mimeType: 'image/jpeg', buffer: await sharp({ create: { width: w, height: h, channels: 3, background: '#a85' } }).jpeg().toBuffer() } },
      })
      urls[slot] = (await res.json() as { url: string }).url
    }
    const res = await request.put(`/api/services/covers/${SLUG}`, {
      headers: { cookie: `maze_admin_token=${await token()}` },
      data: { coverDesktop: urls.desktop, coverMobile: urls.mobile, coverAlt: { ru: '', en: '' } },
    })
    expect(res.status()).toBe(200)
    return urls
  }

  test('saved, it is on the page at once, in both languages; its preview picture is the og:image', async ({ request }) => {
    const urls = await setCover(request, ['desktop', 'mobile'])
    // English first: a visit to /ru leaves the language cookie, and the English address would then answer in Russian.
    for (const [path, alt] of [[`/services/${SLUG}`, 'Packaging — MAZE Studio'], [`/ru/services/${SLUG}`, 'Упаковка — MAZE Studio']]) {
      const html = await (await request.get(path)).text()
      expect(html, path).toContain(`<source media="(max-width: 767px)" srcSet="${urls.mobile}"/>`)
      expect(html, path).toMatch(new RegExp(`<img src="${urls.desktop}" alt="${alt}" class="service-cover" width="2560" height="800" fetchpriority="high"`))
      expect(html, path).toMatch(/<meta property="og:image" content="[^"]*cover-og-\d+\.jpg"\/>/)
    }
  })

  test('on a phone the 4:3 picture, on a desktop the wide one: the whole width, no sideways scroll', async ({ browser }) => {
    for (const [width, file] of [[375, 'cover-mobile'], [1440, 'cover-desktop']] as const) {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await context.newPage()
      await page.goto(`/ru/services/${SLUG}`)
      const img = page.locator('img.service-cover')
      await expect(img).toBeVisible()
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.currentSrc)).toContain(file)
      const box = await img.boundingBox()
      expect(Math.round(box!.width)).toBe(width)
      // 31vw at 1440 is 446px; at 375 the frame is 4:3.
      expect(Math.round(box!.height)).toBe(width === 375 ? 281 : 446)
      expect(await page.evaluate(() => document.scrollingElement!.scrollWidth - document.documentElement.clientWidth)).toBe(0)
      await context.close()
    }
  })

  test('without the desktop picture there is no cover at all, and the card is the og:image again', async ({ request }) => {
    await setCover(request, ['mobile'])
    const html = await (await request.get(`/ru/services/${SLUG}`)).text()
    expect(html).not.toContain('service-cover')
    expect(html).toContain(`<meta property="og:image" content="https://www.maze.uz/api/og/service/ru/${SLUG}"/>`)
    const card = await request.get(`/api/og/service/ru/${SLUG}`)
    expect([card.status(), card.headers()['content-type']]).toEqual([200, 'image/png'])
  })
})
