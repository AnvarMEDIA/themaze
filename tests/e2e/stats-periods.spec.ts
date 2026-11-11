import { test, expect } from '@playwright/test'
import {
  daysBetween, isIsoDate, periodLabel, periodQuery, rangeLabel, resolvePeriod, spanDays, weekBuckets,
} from '../../lib/stats/periods'
import { emptyCounts, mergeDays, subtractCounts, type DayCounts } from '../../lib/stats/model'

/**
 * The statistics screen's periods (lib/stats/periods) and the arithmetic of
 * its minute update (subtractCounts): pure functions, called directly.
 */
test.skip(({ isMobile }) => isMobile, 'pure functions: once is enough')

const TODAY = '2026-12-20'   // a Sunday

test('each preset is the span of days it says', () => {
  expect(resolvePeriod({ period: 'today' }, TODAY)).toEqual({ from: TODAY, to: TODAY })
  expect(resolvePeriod({ period: 'yesterday' }, TODAY)).toEqual({ from: '2026-12-19', to: '2026-12-19' })
  expect(resolvePeriod({ period: '7' }, TODAY)).toEqual({ from: '2026-12-14', to: TODAY })
  expect(resolvePeriod({ period: '30' }, TODAY)).toEqual({ from: '2026-11-21', to: TODAY })
  expect(resolvePeriod({ period: 'year' }, TODAY)).toEqual({ from: '2025-12-21', to: TODAY })
  expect(spanDays('2025-12-21', TODAY)).toBe(365)
  // The dashboard's older form, and anything unreadable: 30 days.
  expect(resolvePeriod({ days: '1' }, TODAY)).toEqual({ from: TODAY, to: TODAY })
  expect(resolvePeriod({ period: 'fortnight' }, TODAY)).toEqual({ from: '2026-11-21', to: TODAY })
  expect(resolvePeriod({}, TODAY)).toEqual({ from: '2026-11-21', to: TODAY })
})

test('chosen dates are kept, reversed ones swapped, the future and the forgotten cut off', () => {
  expect(resolvePeriod({ from: '2026-12-01', to: '2026-12-07' }, TODAY)).toEqual({ from: '2026-12-01', to: '2026-12-07' })
  expect(resolvePeriod({ from: '2026-12-07', to: '2026-12-01' }, TODAY)).toEqual({ from: '2026-12-01', to: '2026-12-07' })
  expect(resolvePeriod({ from: '2026-12-10', to: '2027-03-01' }, TODAY)).toEqual({ from: '2026-12-10', to: TODAY })
  expect(resolvePeriod({ from: '2027-01-01', to: '2027-02-01' }, TODAY)).toEqual({ from: TODAY, to: TODAY })
  // Days are kept 400 days: a span cannot start earlier than that before its end.
  expect(resolvePeriod({ from: '2020-01-01', to: TODAY }, TODAY)).toEqual({ from: '2025-11-16', to: TODAY })
  expect(spanDays('2025-11-16', TODAY)).toBe(400)
  // Not a date: the default, not an error.
  expect(resolvePeriod({ from: '2026-02-30', to: '2026-03-02' }, TODAY)).toEqual({ from: '2026-11-21', to: TODAY })
  expect(resolvePeriod({ from: '2026-12-01' }, TODAY)).toEqual({ from: '2026-11-21', to: TODAY })
  expect(isIsoDate('2028-02-29')).toBe(true)
  expect(isIsoDate('2027-02-29')).toBe(false)
  expect(isIsoDate('20.12.2026')).toBe(false)
})

test('the query a period is asked with, and how it is captioned', () => {
  expect(periodQuery({ kind: 'preset', preset: 'yesterday' })).toBe('period=yesterday')
  expect(periodQuery({ kind: 'custom', from: '2026-12-01', to: '2026-12-07' })).toBe('from=2026-12-01&to=2026-12-07')

  const cap = (p: Parameters<typeof periodLabel>[0], from: string, to: string) => periodLabel(p, from, to, TODAY)
  expect(cap({ kind: 'preset', preset: 'today' }, TODAY, TODAY)).toBe('сегодня')
  expect(cap({ kind: 'preset', preset: 'yesterday' }, '2026-12-19', '2026-12-19')).toBe('вчера')
  expect(cap({ kind: 'preset', preset: '90' }, '2026-09-22', TODAY)).toBe('за 90 дней')
  expect(cap({ kind: 'preset', preset: 'year' }, '2025-12-21', TODAY)).toBe('за год')
  expect(cap({ kind: 'custom', from: '2026-12-01', to: '2026-12-07' }, '2026-12-01', '2026-12-07')).toBe('с 01.12 по 07.12')
  expect(cap({ kind: 'custom', from: '2026-12-05', to: '2026-12-05' }, '2026-12-05', '2026-12-05')).toBe('за 05.12')
  // Another year says which.
  expect(rangeLabel('2025-12-28', '2026-01-03', TODAY)).toBe('28.12.2025–03.01')
})

test('a long period is drawn in calendar weeks, Monday to Sunday, partial at the edges', () => {
  const days = daysBetween('2026-11-12', TODAY).map((date) => ({ date, visitors: 2, views: 3, leads: date === '2026-11-16' ? 1 : 0 }))
  const weeks = weekBuckets(days)
  // Thursday 12.11 to Sunday 15.11, then whole weeks to Sunday 20.12.
  expect(weeks[0]).toEqual({ key: '2026-11-09', from: '2026-11-12', to: '2026-11-15', visitors: 8, views: 12, leads: 0 })
  expect(weeks[1]).toEqual({ key: '2026-11-16', from: '2026-11-16', to: '2026-11-22', visitors: 14, views: 21, leads: 1 })
  expect(weeks.at(-1)).toMatchObject({ from: '2026-12-14', to: TODAY })
  expect(weeks).toHaveLength(6)
  expect(weeks.reduce((s, w) => s + w.visitors, 0)).toBe(days.length * 2)
  // A year: 53 columns rather than 365.
  expect(weekBuckets(daysBetween('2025-12-21', TODAY).map((date) => ({ date, visitors: 0, views: 0, leads: 0 })))).toHaveLength(53)
})

test("a day's newer counters replace its older ones in the totals", () => {
  const day = (views: number, page: string, hour: number): DayCounts => {
    const d = emptyCounts()
    d.views = views
    d.visitors = views
    d.pages = { [page]: views }
    d.sources = { Google: views }
    d.hours[hour] = views
    return d
  }
  const earlier = day(10, '/', 9)
  const todayBefore = day(3, '/brief', 10)
  const todayNow = day(5, '/brief', 10)
  const totals = mergeDays([earlier, todayBefore])

  const updated = mergeDays([subtractCounts(totals, todayBefore), todayNow])
  expect(updated).toEqual(mergeDays([earlier, todayNow]))

  // What reaches zero is gone, and nothing goes below it.
  const without = subtractCounts(totals, todayBefore)
  expect(without.pages).toEqual({ '/': 10 })
  expect(subtractCounts(earlier, todayNow).views).toBe(5)
  expect(subtractCounts(todayBefore, todayNow).views).toBe(0)
  expect(subtractCounts(todayBefore, todayNow).pages).toEqual({})
})
