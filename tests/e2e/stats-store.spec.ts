import { test, expect } from '@playwright/test'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

// The store's local stand-in for Redis, in a folder of this test's own: set
// before the store is first used, which is when it picks its backend.
process.env.STATS_DEV_DIR = mkdtempSync(path.join(tmpdir(), 'maze-stats-'))
delete process.env.KV_REST_API_URL
delete process.env.UPSTASH_REDIS_REST_URL

import { onlineNow, readDays, readPeriod, recordLead, recordView } from '../../lib/stats/store'
import { fieldsFromReply, hashFromReply } from '../../lib/stats/backend'

/**
 * Counting (lib/stats/store) end to end on the local backend: an ad visit of
 * two pages, a direct visit, a bot, a brief; then the next day. The Redis
 * backend runs the same operations as one script.
 */
test.skip(({ isMobile }) => isMobile, 'server code: once is enough')
test.describe.configure({ mode: 'serial' })

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
// 15:00 on 12 November in Tashkent.
const AT = new Date('2026-11-12T10:00:00Z')

test('a day of visits is counted once per person, by source, page, device and hour', async () => {
  const ad = { ua: IPHONE, ip: '203.0.113.7', country: 'UZ', host: 'maze.uz', locale: 'ru', now: AT, marketing: { clickType: 'gclid' } }
  expect(await recordView({ ...ad, page: '/ru', firstEver: true })).toMatchObject({ counted: true, channel: 'ads', source: 'Google Ads', newVisitor: true })
  expect(await recordView({ ...ad, page: '/ru/portfolio' })).toMatchObject({ counted: true, channel: 'ads', newVisitor: false })
  expect(await recordView({ page: '/brief', locale: 'en', ua: WINDOWS, ip: '198.51.100.2', host: 'maze.uz', now: AT }))
    .toMatchObject({ counted: true, channel: 'direct' })
  expect(await recordView({ page: '/', ua: 'Mozilla/5.0 (compatible; YandexBot/3.0)', ip: '5.255.253.1', now: AT }))
    .toEqual({ counted: false, reason: 'bot' })
  expect(await recordView({ page: '/admin', ua: WINDOWS, ip: '198.51.100.2', now: AT })).toEqual({ counted: false, reason: 'ignored' })
  expect(await recordLead('brief', AT)).toBe(true)

  const [day] = await readDays(['2026-11-12'])
  expect(day.views).toBe(3)
  expect(day.visitors).toBe(2)
  expect(day.newVisitors).toBe(1)
  expect(day.leads).toBe(1)
  expect(day.leadKinds).toEqual({ brief: 1 })
  expect(day.channels).toEqual({ ads: 2, direct: 1 })
  expect(day.sources).toEqual({ 'Google Ads': 2, 'Прямые заходы': 1 })
  expect(day.pages).toEqual({ '/': 1, '/portfolio': 1, '/brief': 1 })
  expect(day.devices).toEqual({ mobile: 2, desktop: 1 })
  expect(day.countries).toEqual({ UZ: 2, XX: 1 })
  expect(day.locales).toEqual({ ru: 2, en: 1 })
  expect(day.hours[15]).toBe(3)

  expect(await onlineNow(AT)).toBe(2)
})

test('the next day the same person is a new visitor: the daily salt changed', async () => {
  const next = new Date('2026-11-13T06:00:00Z')
  await recordView({ page: '/', ua: IPHONE, ip: '203.0.113.7', now: next })
  const [day] = await readDays(['2026-11-13'])
  expect(day.visitors).toBe(1)
  expect(day.views).toBe(1)
})

test('a period comes with the one before it, when the counter covers that one', async () => {
  // Two more days: two views on 14.11, four on 15.11, at noon in Tashkent.
  for (const [date, n] of [['2026-11-14', 2], ['2026-11-15', 4]] as const) {
    for (let i = 0; i < n; i++) {
      await recordView({ page: '/', ua: IPHONE, ip: `10.0.${n}.${i}`, now: new Date(`${date}T07:00:00Z`) })
    }
  }
  const at = new Date('2026-11-15T07:00:00Z')

  // Two days against the two before: 12.11 (3 views, 2 people, a brief) and 13.11 (1 view).
  const two = await readPeriod('2026-11-14', '2026-11-15', at)
  expect(two.days.map((d) => [d.date, d.views])).toEqual([['2026-11-14', 2], ['2026-11-15', 4]])
  expect(two.previous).toEqual({ from: '2026-11-12', to: '2026-11-13', visitors: 3, views: 4, leads: 1 })
  expect(two).toMatchObject({ from: '2026-11-14', to: '2026-11-15', today: '2026-11-15', hour: 12 })
  expect(two.todayRow?.date).toBe('2026-11-15')
  expect(two.totals.views).toBe(6)

  // One day against the day before, with that day's hours for the chart.
  const one = await readPeriod('2026-11-15', '2026-11-15', at)
  expect(one.previous).toMatchObject({ from: '2026-11-14', to: '2026-11-14', visitors: 2, views: 2, leads: 0 })
  expect(one.previous?.hours).toHaveLength(24)
  expect(one.previous?.hours?.[12]).toBe(2)
})

test('days before the counter existed are neither listed nor compared with', async () => {
  const at = new Date('2026-11-15T07:00:00Z')
  // The two days before 13–14.11 are 11–12.11, and on the 11th nothing was counted.
  expect((await readPeriod('2026-11-13', '2026-11-14', at)).previous).toBeNull()

  const early = await readPeriod('2026-11-01', '2026-11-13', at)
  expect(early.days.map((d) => d.date)).toEqual(['2026-11-12', '2026-11-13'])
  expect(early).toMatchObject({ from: '2026-11-01', to: '2026-11-13', previous: null, todayRow: null })
  expect(early.totals.views).toBe(4)

  const before = await readPeriod('2026-10-01', '2026-10-31', at)
  expect(before.days).toEqual([])
  expect(before.totals.views).toBe(0)
})

test('a period is not compared with days older than the 400 that are kept', async () => {
  // On 1 January 2029 the year before last year's is mostly gone from the store.
  const at = new Date('2029-01-01T07:00:00Z')
  const year = await readPeriod('2028-01-03', '2029-01-01', at)
  expect(year.days).toHaveLength(365)
  expect(year.previous).toBeNull()
  // Half a year still has its half-year before it: 182 + 182 days are within the 400.
  const half = await readPeriod('2028-07-04', '2029-01-01', at)
  expect(half.previous).toMatchObject({ from: '2028-01-04', to: '2028-07-03', views: 0 })
})

test('a day reads the same whether Redis sends the hash flat or as an object', () => {
  // With deserialization off, Upstash returns HGETALL as Redis does: flat.
  expect(hashFromReply(['views', '3', 'ch:ads', '2'])).toEqual({ views: '3', 'ch:ads': '2' })
  expect(hashFromReply({ views: 3 })).toEqual({ views: 3 })
  expect(hashFromReply(null)).toEqual({})

  // HMGET answers with the values alone, null for a field the day lacks.
  expect(fieldsFromReply(['visitors', 'views', 'leads'], ['3', '4', null])).toEqual({ visitors: '3', views: '4' })
  expect(fieldsFromReply(['visitors', 'views'], { visitors: 3, views: null, pages: 9 })).toEqual({ visitors: 3 })
  expect(fieldsFromReply(['visitors'], null)).toEqual({})
})
