import { test, expect } from '@playwright/test'
import { getIndexNowKey, getKeyLocation, keyFileName, notifyIndexNow } from '../../lib/indexing'
import { indexNowMessage } from '../../lib/indexNowStatus'

/**
 * IndexNow (lib/indexing): the key file at the site's root, and what is
 * sent. A key file vouches only for the addresses under its own folder:
 * served from /api/ it covered none of the site's pages, and IndexNow
 * refused every one of them with a 422.
 */

test.describe('IndexNow key file', () => {
  test('the key is at /<key>.txt, as plain text', async ({ request }) => {
    const res = await request.get(`/${keyFileName()}`)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('text/plain')
    expect(await res.text()).toBe(getIndexNowKey())
  })

  test('any other such name at the root is not found', async ({ request }) => {
    const res = await request.get('/abcdefgh1234.txt')
    expect(res.status()).toBe(404)
    expect(await res.text()).not.toContain(getIndexNowKey())
  })

  test("the site's own .txt files are still served as before", async ({ request }) => {
    for (const path of ['/llms.txt', '/llms-full.txt', '/robots.txt']) {
      const res = await request.get(path)
      expect(res.status(), path).toBe(200)
      expect((await res.text()).length, path).toBeGreaterThan(100)
    }
  })

  test('robots.txt does not close the key file to the engines that check it', async ({ request }) => {
    const robots = await request.get('/robots.txt').then((r) => r.text())
    const closed = robots.split('\n')
      .filter((line) => /^disallow:/i.test(line.trim()))
      .map((line) => line.slice(line.indexOf(':') + 1).trim())
      .filter(Boolean)
    expect(closed.length).toBeGreaterThan(0)
    for (const prefix of closed) expect(`/${keyFileName()}`.startsWith(prefix), prefix).toBe(false)
  })
})

test.describe('IndexNow submission', () => {
  test.skip(!getKeyLocation().startsWith('https://'), 'IndexNow is sent only for an https site address')

  const origin = new URL(getKeyLocation()).origin

  /** Calls notifyIndexNow with IndexNow answered by `answer`; what was sent, and the result. */
  async function submit(urls: string[], answer: Response) {
    const sent: Array<{ url: string; body: Record<string, unknown> }> = []
    const real = globalThis.fetch
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      sent.push({ url: String(url), body: JSON.parse(String(init?.body)) })
      return answer
    }) as typeof fetch
    try {
      return { result: await notifyIndexNow(urls), sent }
    } finally {
      globalThis.fetch = real
    }
  }

  test('the key file is at the root, and every address sent is inside its folder', async () => {
    const { result, sent } = await submit([
      origin, `${origin}/ru`, `${origin}/portfolio/some-project`,
      `${origin}/portfolio/some-project`, // twice
      'https://example.com/elsewhere',     // another site: would get the whole list refused
      `http://${new URL(origin).host}/x`,  // not https
      'not an address',
    ], new Response('', { status: 200 }))

    expect(result).toEqual({ ok: true, status: 200, submitted: 3 })
    expect(sent).toHaveLength(1)
    const { url, body } = sent[0]
    expect(url).toBe('https://api.indexnow.org/IndexNow')
    expect(body.host).toBe(new URL(origin).host)
    expect(body.key).toBe(getIndexNowKey())
    expect(body.keyLocation).toBe(`${origin}/${getIndexNowKey()}.txt`)

    // What IndexNow checks: every address starts with the key file's folder.
    const keyLocation = String(body.keyLocation)
    const folder = keyLocation.slice(0, keyLocation.lastIndexOf('/') + 1)
    expect(folder).toBe(`${origin}/`)
    const list = body.urlList as string[]
    // The home page with its slash: without it, a character short of the folder.
    expect(list).toEqual([`${origin}/`, `${origin}/ru`, `${origin}/portfolio/some-project`])
    for (const u of list) expect(u.startsWith(folder), u).toBe(true)
  })

  test('a refusal comes back as such, with its code', async () => {
    const { result } = await submit([`${origin}/about`], new Response('{"errorCode":"InvalidRequestParameters"}', { status: 422 }))
    expect(result).toEqual({ ok: false, status: 422, submitted: 1 })
  })

  test('nothing is sent when no address is the site’s', async () => {
    const { result, sent } = await submit(['https://example.com/'], new Response('', { status: 200 }))
    expect(result).toEqual({ ok: true, submitted: 0 })
    expect(sent).toHaveLength(0)
  })
})

test('the admin is told in words what IndexNow answered', () => {
  expect(indexNowMessage(200, { ok: true, status: 200, submitted: 2 })).toEqual({ ok: true, text: 'IndexNow принял 2 адреса' })
  expect(indexNowMessage(200, { ok: true, status: 202, submitted: 21 })).toEqual({ ok: true, text: 'IndexNow принял 21 адрес · ключ ещё проверяется' })
  expect(indexNowMessage(200, { ok: true, submitted: 0 }).text).toBe('IndexNow: отправлять нечего')
  expect(indexNowMessage(200, { ok: false, status: 422, submitted: 5 })).toEqual({
    ok: false, text: 'IndexNow отклонил адреса (422): они не относятся к сайту или к его файлу ключа',
  })
  expect(indexNowMessage(200, { ok: false, status: 429, submitted: 5 }).text).toContain('повторите позже')
  expect(indexNowMessage(200, { ok: false, submitted: 5 }).text).toBe('Нет связи с IndexNow — повторите позже')
  expect(indexNowMessage(401, {})).toEqual({ ok: false, text: 'Сессия админки закончилась — войдите заново.' })
  expect(indexNowMessage(500, {}).text).toBe('Не удалось отправить (ошибка 500)')
})
