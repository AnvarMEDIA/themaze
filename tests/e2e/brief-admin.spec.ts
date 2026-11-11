import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { inflateSync } from 'zlib'
import { SignJWT } from 'jose'

/**
 * The brief's admin side: the form editor's API and page, and the brief as
 * a PDF file.
 *
 * Without a session every route must refuse; that is checked against any
 * server. What needs a session signs one with JWT_SECRET, the server's own
 * secret, and runs only against a server on this machine. Even there it
 * changes nothing: it reads the briefs that are there, a save it sends is one
 * the server must refuse, and in the editor the translation is answered by
 * the test and "Save" is never pressed.
 */

const SECRET = process.env.JWT_SECRET
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 3100}`
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(BASE)
const SIGNED_IN = !!SECRET && LOCAL

test.skip(({ isMobile }) => isMobile, 'admin routes: once is enough')

/** A session as /api/auth/login issues it (lib/auth). */
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

/**
 * The ToUnicode maps of a PDF: how each glyph reads when the text is copied
 * or searched. pdfkit compresses its streams, so each one is inflated; those
 * that are not compressed text are skipped.
 */
function toUnicodeMaps(pdf: Buffer): string[] {
  const raw = pdf.toString('latin1')
  const maps: string[] = []
  const start = /(?<![a-z])stream\r?\n/g
  for (let m = start.exec(raw); m; m = start.exec(raw)) {
    const from = m.index + m[0].length
    const to = raw.indexOf('endstream', from)
    if (to < 0) break
    try {
      const text = inflateSync(pdf.subarray(from, to)).toString('latin1')
      if (text.includes('beginbfrange') || text.includes('beginbfchar')) maps.push(text)
    } catch { /* not deflated */ }
    start.lastIndex = to
  }
  return maps
}

test.describe('Brief admin without a session', () => {
  test('every route refuses', async ({ request }) => {
    expect((await request.get('/api/brief-content')).status()).toBe(401)
    expect((await request.put('/api/brief-content', { data: {} })).status()).toBe(401)
    expect((await request.post('/api/brief-content/translate', {
      data: { from: 'ru', to: 'en', items: [{ id: 't:heading', text: 'Привет' }] },
    })).status()).toBe(401)
    expect((await request.get('/api/brief/some-id/pdf')).status()).toBe(401)
  })

  test('the old print page leads to the PDF file, language and all', async ({ request }) => {
    const res = await request.get('/admin/briefs/some-id/print?lang=en', { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toMatch(/\/api\/brief\/some-id\/pdf\?lang=en$/)
  })
})

test.describe('Brief admin signed in', () => {
  test.skip(!SIGNED_IN, 'needs JWT_SECRET and a server on this machine')

  let cookie = ''
  test.beforeAll(async () => { cookie = `maze_admin_token=${await adminToken()}` })

  test('the editor gets the content, the defaults, and the words for ids in both languages', async ({ request }) => {
    const res = await request.get('/api/brief-content', { headers: { cookie } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Object.keys(data).sort()).toEqual(['content', 'defaults', 'labels'])
    expect(data.labels.en.styles.minimal).toBeTruthy()
    expect(data.labels.ru.styles.minimal).toBeTruthy()
  })

  test('a save that would break the form is refused, and nothing is written', async ({ request }) => {
    const before = (await (await request.get('/api/brief-content', { headers: { cookie } })).json()).content
    const broken = { ...before, texts: { ...before.texts, heading: { ru: 'Привет {name}', en: 'Hello {name}' } } }

    const res = await request.put('/api/brief-content', { headers: { cookie }, data: broken })
    expect(res.status()).toBe(400)

    const after = (await (await request.get('/api/brief-content', { headers: { cookie } })).json()).content
    expect(after).toEqual(before)
  })

  test('a brief downloads as a PDF in either language, the second as clean as the first', async ({ request }) => {
    const briefs = await (await request.get('/api/brief', { headers: { cookie } })).json() as Array<{ id: string }>
    test.skip(briefs.length === 0, 'no brief on this server to download')
    const { id } = briefs[0]

    // Russian first, then English, twice: Manrope draws its Cyrillic from
    // Latin glyphs, and a Russian PDF once left the server's next documents
    // with Latin letters that vanished or copied as nothing.
    for (const lang of ['ru', 'en', 'ru', 'en']) {
      const res = await request.get(`/api/brief/${id}/pdf?lang=${lang}`, { headers: { cookie } })
      expect(res.status()).toBe(200)
      expect(res.headers()['content-type']).toBe('application/pdf')
      expect(res.headers()['content-disposition']).toMatch(/^attachment; filename="brief-[^"]+\.pdf"; filename\*=UTF-8''\S+\.pdf$/)

      const pdf = await res.body()
      expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
      const maps = toUnicodeMaps(pdf)
      expect(maps.length).toBeGreaterThan(0)
      for (const map of maps) expect(map, `${lang}: a glyph that copies as nothing`).not.toContain('<>')
    }
  })

  test('the PDF button downloads the file', async ({ page, context, request }) => {
    const briefs = await (await request.get('/api/brief', { headers: { cookie } })).json() as Array<{ name: string }>
    test.skip(briefs.length === 0, 'no brief on this server to open')

    await context.addCookies([{ name: 'maze_admin_token', value: await adminToken(), url: BASE }])
    await page.goto('/admin/briefs')
    await page.getByRole('button', { name: briefs[0].name }).first().click()

    await page.getByRole('group', { name: 'PDF language' }).getByRole('button', { name: 'EN' }).click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PDF', exact: true }).click(),
    ])
    expect(await download.failure()).toBeNull()
    expect(readFileSync(await download.path()).subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })

  test('an edit shows as out of date in the other language until it is translated', async ({ page, context }) => {
    await context.addCookies([{ name: 'maze_admin_token', value: await adminToken(), url: BASE }])

    // The translation is answered here: no request leaves for the API.
    const asked: Array<{ from: string; to: string; items: Array<{ id: string; text: string }> }> = []
    await page.route('**/api/brief-content/translate', async (route) => {
      const body = route.request().postDataJSON()
      asked.push(body)
      await route.fulfill({ json: { items: body.items.map((i: { id: string; text: string }) => ({ id: i.id, text: `EN ${i.text}` })) } })
    })
    const saves: string[] = []
    page.on('request', (r) => { if (r.method() === 'PUT') saves.push(r.url()) })

    await page.goto('/admin/briefs/form')
    const heading = page.locator('#t-heading')
    await expect(heading).not.toHaveValue('')
    const original = await heading.inputValue()
    const otherLanguage = heading.locator('xpath=following-sibling::p[1]')

    await heading.fill('Расскажите о проекте')
    await expect(otherLanguage).toContainText('устарел')
    const translate = page.getByRole('button', { name: /^Перевести на EN · \d+$/ })
    await expect(translate).toBeEnabled()

    await translate.click()
    await expect(otherLanguage).toContainText('EN Расскажите о проекте')
    await expect(otherLanguage).not.toContainText('устарел')
    expect(asked[0].from).toBe('ru')
    expect(asked[0].to).toBe('en')
    expect(asked[0].items).toContainEqual({ id: 't:heading', text: 'Расскажите о проекте' })

    // Editing in English shows the translation, with the Russian under it.
    await page.getByRole('group', { name: 'Язык правки' }).getByRole('button', { name: 'EN' }).click()
    await expect(heading).toHaveValue('EN Расскажите о проекте')
    await expect(otherLanguage).toContainText('Расскажите о проекте')

    // "Cancel" puts the saved texts back, and nothing was saved.
    await page.getByRole('button', { name: 'Отменить' }).click()
    await page.getByRole('group', { name: 'Язык правки' }).getByRole('button', { name: 'RU' }).click()
    await expect(heading).toHaveValue(original)
    expect(saves).toEqual([])
  })
})
