import { test, expect } from '@playwright/test'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

// The store's local stand-in for Redis, in a folder of this test's own: set
// before the store is first used, which is when it picks its backend.
process.env.STATS_DEV_DIR = mkdtempSync(path.join(tmpdir(), 'maze-stats-'))
delete process.env.KV_REST_API_URL
delete process.env.UPSTASH_REDIS_REST_URL

import { onlineNow, readDays, recordLead, recordView } from '../../lib/stats/store'
import { hashFromReply } from '../../lib/stats/backend'

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

test('a day reads the same whether Redis sends the hash flat or as an object', () => {
  // With deserialization off, Upstash returns HGETALL as Redis does: flat.
  expect(hashFromReply(['views', '3', 'ch:ads', '2'])).toEqual({ views: '3', 'ch:ads': '2' })
  expect(hashFromReply({ views: 3 })).toEqual({ views: 3 })
  expect(hashFromReply(null)).toEqual({})
})
