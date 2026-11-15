import { test, expect } from '@playwright/test'
import { mkdirSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import {
  EMPTY_COVER, coverAltFor, defaultCoverAlt, getServiceCover, getServiceCovers, saveServiceCover,
} from '../../lib/serviceCovers'
import { coverFileProblem, coverFileTarget, coverSizeIssues } from '../../lib/serviceCoverSpec'
import { CoverImageError, processCover } from '../../lib/serviceCoverImage'
import { SERVICE_SLUGS } from '../../lib/services'
import sharp from 'sharp'
import { SignJWT } from 'jose'

const SECRET = process.env.JWT_SECRET
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 3100}`
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(BASE)

/** A plain picture of the given size, made here. */
const picture = (width: number, height: number, format: 'jpeg' | 'png' | 'webp' | 'gif' = 'jpeg') =>
  sharp({ create: { width, height, channels: 3, background: '#3a6ea5' } }).toFormat(format).toBuffer()

async function adminCookie(): Promise<string> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt()
    .setIssuer('maze.uz/admin').setAudience('maze.uz/admin-ui').setSubject('admin').setExpirationTime('10m')
    .sign(new TextEncoder().encode(SECRET))
  return `maze_admin_token=${token}`
}

/**
 * The covers of the service pages: where they are kept (lib/serviceCovers),
 * what a picture should be (lib/serviceCoverSpec).
 */

test.describe('Service covers: what is kept', () => {
  test.skip(({ isMobile }) => isMobile, 'server code: once is enough')
  test.describe.configure({ mode: 'serial' })

  // The local store is data/<name>.json under the working directory: a
  // folder of this test's own, so the project's own data is never written.
  const home = process.cwd()
  test.beforeAll(() => {
    const dir = mkdtempSync(path.join(tmpdir(), 'maze-covers-'))
    mkdirSync(path.join(dir, 'data'))
    process.chdir(dir)
  })
  test.afterAll(() => process.chdir(home))

  test('every service starts with no cover, and nothing breaks for it', async () => {
    const covers = await getServiceCovers()
    expect(Object.keys(covers)).toEqual([...SERVICE_SLUGS])
    for (const slug of SERVICE_SLUGS) expect(covers[slug]).toEqual(EMPTY_COVER)
  })

  test('a save is read back with its time, and gives what was there before', async () => {
    const at = new Date('2026-11-15T10:00:00Z')
    const first = await saveServiceCover('branding', {
      coverDesktop: 'https://x.public.blob.vercel-storage.com/services/branding/cover-desktop-1.webp',
      coverMobile: null,
      coverOg: 'https://x.public.blob.vercel-storage.com/services/branding/cover-og-1.jpg',
      coverAlt: { ru: '  Брендинг для кофейни  ', en: '' },
    }, at)
    expect(first.previous).toEqual(EMPTY_COVER)
    expect(first.saved.coverUpdatedAt).toBe('2026-11-15T10:00:00.000Z')
    expect(first.saved.coverAlt).toEqual({ ru: 'Брендинг для кофейни', en: '' })

    const second = await saveServiceCover('branding', { ...first.saved, coverMobile: 'https://x.public.blob.vercel-storage.com/services/branding/cover-mobile-2.webp' })
    expect(second.previous.coverMobile).toBeNull()
    expect((await getServiceCover('branding')).coverMobile).toContain('cover-mobile-2')
    // The other services are untouched.
    expect(await getServiceCover('naming')).toEqual(EMPTY_COVER)
  })

  test('the alt text: the one written, else «<service> — MAZE Studio»', async () => {
    const cover = await getServiceCover('branding')
    expect(coverAltFor('branding', cover, 'ru')).toBe('Брендинг для кофейни')
    expect(coverAltFor('branding', cover, 'en')).toBe('Branding — MAZE Studio')
    expect(defaultCoverAlt('ui-ux', 'ru')).toBe('UI / UX дизайн — MAZE Studio')
  })
})

test('a picture outside the recommended size is described, not refused', () => {
  expect(coverSizeIssues('desktop', 1913, 822)).toEqual([])
  expect(coverSizeIssues('desktop', 2560, 1100)).toEqual([])
  // The old 3.2:1 size is now off: the frame is the studio photos' 2.33:1.
  expect(coverSizeIssues('desktop', 2560, 800)).toEqual(['соотношение сторон 3,2:1, нужно 2,1–2,6:1'])
  expect(coverSizeIssues('desktop', 1600, 900)).toEqual([
    'ширина 1600 px, нужно от 1900 px',
    'соотношение сторон 1,78:1, нужно 2,1–2,6:1',
  ])
  expect(coverSizeIssues('mobile', 1080, 810)).toEqual([])
  expect(coverSizeIssues('mobile', 1080, 1920)).toEqual(['соотношение сторон 0,56:1, нужно 1,2–1,45:1'])
})

test('a file is checked for its type and weight, and its name can say where it goes', () => {
  expect(coverFileProblem({ name: 'a.jpg', type: 'image/jpeg', size: 1000 })).toBeNull()
  expect(coverFileProblem({ name: 'a.gif', type: 'image/gif', size: 1000 })).toBe('Нужен JPG, PNG или WebP.')
  expect(coverFileProblem({ name: 'a.webp', type: 'image/webp', size: 9 * 1024 * 1024 })).toBe('Файл 9 МБ, можно до 8 МБ.')

  expect(coverFileTarget('ui-ux-d.JPG', SERVICE_SLUGS)).toEqual({ slug: 'ui-ux', slot: 'desktop' })
  expect(coverFileTarget('branding-m.webp', SERVICE_SLUGS)).toEqual({ slug: 'branding', slot: 'mobile' })
  expect(coverFileTarget('branding.jpg', SERVICE_SLUGS)).toBeNull()
  expect(coverFileTarget('cooking-d.jpg', SERVICE_SLUGS)).toBeNull()
})

test.describe('Service covers: a picture made into a cover', () => {
  test.skip(({ isMobile }) => isMobile, 'server code: once is enough')

  test('desktop: WebP no wider than 2560, and a 1200×630 JPEG for link previews', async () => {
    const out = await processCover(await picture(3200, 1000), 'desktop')
    expect(out.source).toEqual({ width: 3200, height: 1000, format: 'jpeg' })
    expect([out.width, out.height]).toEqual([2560, 800])
    // The studio's own 1913×822 stays as it is: never made larger.
    const own = await processCover(await picture(1913, 822), 'desktop')
    expect([own.width, own.height]).toEqual([1913, 822])
    expect((await sharp(out.webp).metadata()).format).toBe('webp')
    const og = await sharp(out.og!).metadata()
    expect([og.format, og.width, og.height]).toEqual(['jpeg', 1200, 630])
  })

  test('mobile: never made larger, no preview picture', async () => {
    const out = await processCover(await picture(900, 675, 'png'), 'mobile')
    expect([out.width, out.height]).toEqual([900, 675])
    expect(out.og).toBeNull()
  })

  test('a photo turned by its EXIF orientation is stored upright', async () => {
    // Stored 1000×1500 with orientation 6: upright it is 1500×1000.
    const turned = await sharp({ create: { width: 1000, height: 1500, channels: 3, background: '#222' } })
      .withMetadata({ orientation: 6 }).jpeg().toBuffer()
    const out = await processCover(turned, 'mobile')
    expect(out.source).toMatchObject({ width: 1500, height: 1000 })
    expect([out.width, out.height]).toEqual([1080, 720])
    expect((await sharp(out.webp).metadata()).orientation).toBeUndefined()
  })

  test('what is not a JPG, PNG or WebP picture is refused, in words', async () => {
    await expect(processCover(await picture(2000, 700, 'gif'), 'desktop')).rejects.toThrow('Нужен JPG, PNG или WebP.')
    await expect(processCover(Buffer.from('not a picture'), 'desktop')).rejects.toBeInstanceOf(CoverImageError)
  })
})

test.describe('Service covers: upload', () => {
  test.skip(({ isMobile }) => isMobile, 'server code: once is enough')
  test.skip(!LOCAL, 'needs the local server')

  test('without the admin session an upload is refused with 401', async ({ request }) => {
    const res = await request.post('/api/services/covers/upload', {
      multipart: { slug: 'branding', slot: 'desktop', file: { name: 'b-d.jpg', mimeType: 'image/jpeg', buffer: await picture(2560, 800) } },
    })
    expect(res.status()).toBe(401)
  })

  test('signed in: the picture comes back as WebP at its address, with its preview picture', async ({ request }) => {
    test.skip(!SECRET, 'needs JWT_SECRET')
    const res = await request.post('/api/services/covers/upload', {
      headers: { cookie: await adminCookie() },
      multipart: { slug: 'strategy', slot: 'desktop', file: { name: 'strategy-d.jpg', mimeType: 'image/jpeg', buffer: await picture(2560, 800) } },
    })
    expect(res.status()).toBe(200)
    const body = await res.json() as { url: string; ogUrl: string; width: number; height: number }
    expect(body.url).toMatch(/\/services\/covers\/file\/strategy\/cover-desktop-\d+\.webp$|\/services\/strategy\/cover-desktop-\d+\.webp$/)
    expect([body.width, body.height]).toEqual([2560, 800])
    const file = await request.get(body.url)
    expect(file.headers()['content-type']).toBe('image/webp')
    expect((await request.get(body.ogUrl)).headers()['content-type']).toBe('image/jpeg')

    // A GIF, or a slot that does not exist, is refused before anything is stored.
    const gif = await request.post('/api/services/covers/upload', {
      headers: { cookie: await adminCookie() },
      multipart: { slug: 'strategy', slot: 'desktop', file: { name: 'x.gif', mimeType: 'image/gif', buffer: await picture(2000, 700, 'gif') } },
    })
    expect([gif.status(), (await gif.json()).error]).toEqual([400, 'Нужен JPG, PNG или WebP.'])
    const slot = await request.post('/api/services/covers/upload', {
      headers: { cookie: await adminCookie() },
      multipart: { slug: 'strategy', slot: 'tablet', file: { name: 'x.jpg', mimeType: 'image/jpeg', buffer: await picture(800, 600) } },
    })
    expect(slot.status()).toBe(400)
  })
})

test.describe('Service covers: save', () => {
  test.skip(({ isMobile }) => isMobile, 'server code: once is enough')
  test.skip(!LOCAL || !SECRET, 'needs the local server and its JWT_SECRET')
  test.describe.configure({ mode: 'serial' })

  type Saved = { cover: { coverDesktop: string | null; coverMobile: string | null; coverOg: string | null; coverAlt: { ru: string; en: string } }; removed: number }
  const SLUG = 'motion'

  async function upload(request: import('@playwright/test').APIRequestContext, slot: 'desktop' | 'mobile') {
    const size = slot === 'desktop' ? [1913, 822] : [1080, 810]
    const res = await request.post('/api/services/covers/upload', {
      headers: { cookie: await adminCookie() },
      multipart: { slug: SLUG, slot, file: { name: `${SLUG}.jpg`, mimeType: 'image/jpeg', buffer: await picture(size[0], size[1]) } },
    })
    expect(res.status()).toBe(200)
    return res.json() as Promise<{ url: string; ogUrl: string | null }>
  }
  const save = async (request: import('@playwright/test').APIRequestContext, body: object, cookie = true) =>
    request.put(`/api/services/covers/${SLUG}`, { headers: cookie ? { cookie: await adminCookie() } : {}, data: body })

  test('without the admin session a save is refused with 401', async ({ request }) => {
    const res = await save(request, { coverDesktop: null, coverMobile: null, coverAlt: { ru: '', en: '' } }, false)
    expect(res.status()).toBe(401)
  })

  test('a save keeps the pictures and the alt text; the preview picture comes with the desktop one', async ({ request }) => {
    const desktop = await upload(request, 'desktop')
    const mobile = await upload(request, 'mobile')
    const res = await save(request, { coverDesktop: desktop.url, coverMobile: mobile.url, coverAlt: { ru: 'Моушн', en: 'Motion' } })
    expect(res.status()).toBe(200)
    const { cover } = await res.json() as Saved
    expect(cover).toMatchObject({ coverDesktop: desktop.url, coverMobile: mobile.url, coverOg: desktop.ogUrl, coverAlt: { ru: 'Моушн', en: 'Motion' } })
  })

  test('a replaced picture and an upload never saved are deleted; the kept ones stay', async ({ request }) => {
    const before = (await (await save(request, { coverDesktop: null, coverMobile: null, coverAlt: { ru: '', en: '' } })).json() as Saved)
    expect(before.cover.coverDesktop).toBeNull()

    const first = await upload(request, 'desktop')
    await save(request, { coverDesktop: first.url, coverMobile: null, coverAlt: { ru: '', en: '' } })
    const abandoned = await upload(request, 'mobile')
    const second = await upload(request, 'desktop')
    const res = await save(request, { coverDesktop: second.url, coverMobile: null, coverAlt: { ru: '', en: '' } })
    const body = await res.json() as Saved
    // The first desktop picture, its preview picture, and the mobile one never saved.
    expect(body.removed).toBe(3)
    for (const gone of [first.url, first.ogUrl!, abandoned.url]) expect((await request.get(gone)).status()).toBe(404)
    for (const kept of [second.url, second.ogUrl!]) expect((await request.get(kept)).status()).toBe(200)
  })

  test('only this service’s own cover files can be saved', async ({ request }) => {
    const other = await request.post('/api/services/covers/upload', {
      headers: { cookie: await adminCookie() },
      multipart: { slug: 'rebranding', slot: 'desktop', file: { name: 'p.jpg', mimeType: 'image/jpeg', buffer: await picture(2560, 800) } },
    })
    const { url } = await other.json() as { url: string }
    for (const coverDesktop of [url, 'https://example.com/cover.webp', '/api/services/covers/file/motion/cover-desktop-1700000000000.webp']) {
      const res = await save(request, { coverDesktop, coverMobile: null, coverAlt: { ru: '', en: '' } })
      expect(res.status(), coverDesktop).toBe(400)
    }
    // Leave nothing behind: the upload goes with an empty save of that service.
    // (A service of this file's own: the admin's tests use print at the same time.)
    await request.put('/api/services/covers/rebranding', { headers: { cookie: await adminCookie() }, data: { coverDesktop: null, coverMobile: null, coverAlt: { ru: '', en: '' } } })
  })

  // Not in the mobile project, whose tests are skipped: it would clear these services mid-test.
  test.afterAll(async ({ request }, info) => {
    if (info.project.name === 'mobile') return
    // Back to no cover, which deletes this test's files.
    await save(request, { coverDesktop: null, coverMobile: null, coverAlt: { ru: '', en: '' } })
    await request.put('/api/services/covers/strategy', { headers: { cookie: await adminCookie() }, data: { coverDesktop: null, coverMobile: null, coverAlt: { ru: '', en: '' } } })
  })
})
