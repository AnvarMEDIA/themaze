import { test, expect } from '@playwright/test'
import {
  calendarRanges, changePercent, comparesTotals, daysBetween, isIsoDate, parsePeriod, periodQuery,
  previousPeriod, rangeLabel, resolvePeriod, spanDays, weekBuckets,
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

test('the query a period is asked with, and how a span of days is written', () => {
  expect(periodQuery({ kind: 'preset', preset: 'yesterday' })).toBe('period=yesterday')
  expect(periodQuery({ kind: 'custom', from: '2026-12-01', to: '2026-12-07' })).toBe('from=2026-12-01&to=2026-12-07')

  expect(rangeLabel('2026-12-01', '2026-12-07', TODAY)).toBe('01.12–07.12')
  expect(rangeLabel('2026-12-05', '2026-12-05', TODAY)).toBe('05.12')
  // Another year says which.
  expect(rangeLabel('2025-12-28', '2026-01-03', TODAY)).toBe('28.12.2025–03.01')
})

test('a page address names a period, and a period its address', () => {
  expect(parsePeriod({ period: 'today' })).toEqual({ kind: 'preset', preset: 'today' })
  expect(parsePeriod({ period: '90' })).toEqual({ kind: 'preset', preset: '90' })
  expect(parsePeriod({ from: '2026-12-07', to: '2026-12-01' })).toEqual({ kind: 'custom', from: '2026-12-01', to: '2026-12-07' })
  // Dates win over a preset; what names nothing is no period.
  expect(parsePeriod({ period: '7', from: '2026-12-01', to: '2026-12-01' })).toEqual({ kind: 'custom', from: '2026-12-01', to: '2026-12-01' })
  expect(parsePeriod({ period: '14' })).toBeNull()
  expect(parsePeriod({ from: '2026-12-01' })).toBeNull()
  expect(parsePeriod({})).toBeNull()
  for (const p of [{ kind: 'preset', preset: 'year' }, { kind: 'custom', from: '2026-12-01', to: '2026-12-07' }] as const) {
    const q = new URLSearchParams(periodQuery(p))
    expect(parsePeriod({ period: q.get('period'), from: q.get('from'), to: q.get('to') })).toEqual(p)
  }
})

test('a period is compared with the same number of days just before it', () => {
  expect(previousPeriod('2026-12-14', TODAY)).toEqual({ from: '2026-12-07', to: '2026-12-13' })
  expect(previousPeriod(TODAY, TODAY)).toEqual({ from: '2026-12-19', to: '2026-12-19' })
  expect(previousPeriod('2026-11-21', TODAY)).toEqual({ from: '2026-10-22', to: '2026-11-20' })

  // Totals are not compared while today is much of the period: today alone,
  // or a few days ending today. A week or more, or days all gone, are.
  expect(comparesTotals(TODAY, TODAY, TODAY)).toBe(false)
  expect(comparesTotals('2026-12-18', TODAY, TODAY)).toBe(false)
  expect(comparesTotals('2026-12-14', TODAY, TODAY)).toBe(true)
  expect(comparesTotals('2026-12-19', '2026-12-19', TODAY)).toBe(true)
  expect(comparesTotals('2026-12-17', '2026-12-19', TODAY)).toBe(true)

  expect(changePercent(112, 100)).toBe(12)
  expect(changePercent(50, 100)).toBe(-50)
  expect(changePercent(100, 100)).toBe(0)
  expect(changePercent(5, 0)).toBeNull()
})

test('this week and the last, this month and the last, as dates', () => {
  // 20.12.2026 is a Sunday: its week began on Monday the 14th.
  expect(calendarRanges(TODAY)).toEqual([
    { id: 'week', label: 'Эта неделя', from: '2026-12-14', to: TODAY },
    { id: 'last-week', label: 'Прошлая неделя', from: '2026-12-07', to: '2026-12-13' },
    { id: 'month', label: 'Этот месяц', from: '2026-12-01', to: TODAY },
    { id: 'last-month', label: 'Прошлый месяц', from: '2026-11-01', to: '2026-11-30' },
  ])
  // On a Monday the week is that one day; in January last month is last year's December.
  const monday = calendarRanges('2027-01-04')
  expect(monday[0]).toMatchObject({ from: '2027-01-04', to: '2027-01-04' })
  expect(monday[1]).toMatchObject({ from: '2026-12-28', to: '2027-01-03' })
  expect(monday[3]).toMatchObject({ from: '2026-12-01', to: '2026-12-31' })
  expect(calendarRanges('2028-03-31')[3]).toMatchObject({ from: '2028-02-01', to: '2028-02-29' })
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
