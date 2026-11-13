import { test, expect } from '@playwright/test'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

// The store's local stand-in for Redis, in a folder of this test's own: set
// before the store is first used, which is when it picks its backend.
process.env.STATS_DEV_DIR = mkdtempSync(path.join(tmpdir(), 'maze-totals-'))
delete process.env.KV_REST_API_URL
delete process.env.UPSTASH_REDIS_REST_URL

import { readPageViews, recordView } from '../../lib/stats/store'

/**
 * Each page's views of all time and of the last seven days (lib/stats/store,
 * readPageViews), on the local backend; the Redis one runs the same steps as
 * scripts. All time = what the old counter recorded before 12.11.2026, the
 * days this counter had before the running total began, and the running
 * total, each view counted once.
 */
test.skip(({ isMobile }) => isMobile, 'server code: once is enough')
test.describe.configure({ mode: 'serial' })

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
// Noon in Tashkent on the given day.
const at = (day: string) => new Date(`${day}T07:00:00Z`)
const view = (page: string, day: string, ip = '198.51.100.9') => recordView({ page, ua: UA, ip, host: 'maze.uz', now: at(day) })

const unreadable = async (): Promise<Record<string, number>> => { throw new Error('Blob is down') }

test('without the old history the counts are this counter’s own, and nothing is stored', async () => {
  await view('/portfolio/axelus', '2026-11-12')
  await view('/ru/portfolio/axelus', '2026-11-12', '203.0.113.4')
  await view('/portfolio/centromed', '2026-11-12')
  await view('/portfolio/axelus', '2026-11-13')

  const expected = {
    '/portfolio/axelus': { total: 3, week: 3 },
    '/portfolio/centromed': { total: 1, week: 1 },
  }
  expect(await readPageViews(unreadable, at('2026-11-13'))).toEqual(expected)
  // Still not stored: asked again, the history is asked for again.
  let asked = 0
  await readPageViews(async () => { asked++; throw new Error('still down') }, at('2026-11-13'))
  expect(asked).toBe(1)
})

test('the old history is put together once, with the days before the running total', async () => {
  const history = { 'p:/portfolio/axelus': 100, 'p:/portfolio/old-name': 7 }
  expect(await readPageViews(async () => history, at('2026-11-13'))).toEqual({
    '/portfolio/axelus': { total: 103, week: 3 },
    '/portfolio/centromed': { total: 1, week: 1 },
    '/portfolio/old-name': { total: 7, week: 0 },
  })
})

test('every view after that adds one to all time, once; the week is the last seven days', async () => {
  await view('/portfolio/axelus', '2026-11-13')
  await view('/portfolio/centromed', '2026-11-21')
  await view('/en/portfolio/centromed', '2026-11-21', '203.0.113.4')

  const mustNotRead = async (): Promise<Record<string, number>> => { throw new Error('the history was read twice') }
  expect(await readPageViews(mustNotRead, at('2026-11-21'))).toEqual({
    // 12–13.11 are out of the week ending 21.11 (15–21.11), still in all time.
    '/portfolio/axelus': { total: 104, week: 0 },
    '/portfolio/centromed': { total: 3, week: 2 },
    '/portfolio/old-name': { total: 7, week: 0 },
  })
})

test('a page nobody opened is not listed; a bot is not counted', async () => {
  await recordView({ page: '/portfolio/axelus', ua: 'Mozilla/5.0 (compatible; YandexBot/3.0)', ip: '5.255.253.1', now: at('2026-11-21') })
  const pages = await readPageViews(async () => ({}), at('2026-11-21'))
  expect(pages['/portfolio/axelus']).toEqual({ total: 104, week: 0 })
  expect(pages['/portfolio/never-opened']).toBeUndefined()
})
