import { test, expect } from '@playwright/test'
import { formatSiteTime, SITE_TZ } from '../../lib/siteTime'

/**
 * Dates and times people read are on the studio's clock (lib/siteTime),
 * whatever the clock of the machine that renders them: UTC on Vercel, the
 * viewer's own zone in a browser.
 */
test.skip(({ isMobile }) => isMobile, 'a pure function: once is enough')

// The brief from the bug report: sent at 00:19 on 12 November in Tashkent,
// which is 19:19 on the 11th in UTC.
const SENT = '2026-11-11T19:19:00.000Z'
const WITH_TIME = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' } as const

test.describe('The studio clock', () => {
  test('is Tashkent', () => {
    expect(SITE_TZ).toBe('Asia/Tashkent')
  })

  test('a brief sent after midnight in Tashkent is dated the next day, not the UTC evening', () => {
    expect(formatSiteTime(SENT, 'ru-RU', WITH_TIME)).toBe('12 ноября 2026 г. в 00:19')
    expect(formatSiteTime(SENT, 'en-GB', WITH_TIME)).toBe('12 November 2026 at 00:19')
  })

  test('a timestamp, a Date and an ISO string read the same', () => {
    const asDate = new Date(SENT)
    expect(formatSiteTime(asDate, 'en-GB', WITH_TIME)).toBe(formatSiteTime(SENT, 'en-GB', WITH_TIME))
    expect(formatSiteTime(asDate.getTime(), 'en-GB', WITH_TIME)).toBe(formatSiteTime(SENT, 'en-GB', WITH_TIME))
  })

  test('a date-only string keeps its calendar day', () => {
    expect(formatSiteTime('2026-11-12', 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })).toBe('12 November 2026')
  })

  test('what is not a date comes back as it was', () => {
    expect(formatSiteTime('soon', 'en-GB', WITH_TIME)).toBe('soon')
  })
})
