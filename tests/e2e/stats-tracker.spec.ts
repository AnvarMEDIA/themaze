import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import path from 'path'
import { siteDay } from '../../lib/stats/time'

/**
 * The tracker on a real page, against the local server's statistics (its
 * stand-in for Redis, data/stats-dev): an ad click that brought only Google's
 * click marker is counted as Google Ads, on every page of the visit. On
 * 11 November such clicks read as direct visits.
 *
 * It reads the server's files, so it runs only against a server on this
 * machine, and only adds views there.
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 3100}`
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(BASE)

test.skip(({ isMobile }) => isMobile, 'once is enough')
// A phone in an app's web view, as an ad click arrives; the default
// HeadlessChrome would rightly be dropped as a bot.
test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A155F Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36' })

function today(): Record<string, number> {
  const file = path.join(process.cwd(), 'data', 'stats-dev', `stats_d_${siteDay()}.json`)
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return {} }
}

test('an ad click with only gclid is Google Ads, and the visit\'s next page too', async ({ page }) => {
  test.skip(!LOCAL, 'reads the local server\'s statistics files')
  const before = today()
  const ads = () => today()['s:Google Ads'] ?? 0

  await page.goto('/?gclid=TEST-CLICK')
  await expect.poll(ads, { timeout: 10_000 }).toBe((before['s:Google Ads'] ?? 0) + 1)

  // A second page, loaded afresh: no ad marker in its URL, the referrer is
  // our own page; the visit still came from the ad.
  await page.goto('/portfolio')
  await expect.poll(ads, { timeout: 10_000 }).toBe((before['s:Google Ads'] ?? 0) + 2)

  const after = today()
  expect(after['ch:ads'] - (before['ch:ads'] ?? 0)).toBe(2)
  expect((after['p:/portfolio'] ?? 0) - (before['p:/portfolio'] ?? 0)).toBe(1)
  // One person, however many pages.
  expect((after.visitors ?? 0) - (before.visitors ?? 0)).toBeLessThanOrEqual(1)
})
