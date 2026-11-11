import { test, expect } from '@playwright/test'
import { buildDigest, type DigestInput } from '../../lib/digest'

/**
 * The end-of-day report that goes to Telegram (lib/digest.ts). It is a pure
 * function of what the stores hold, so it is tested here directly, without a
 * browser.
 */
test.skip(({ isMobile }) => isMobile, 'a pure function: once is enough')

const DAY = '2026-11-10' // a Tuesday
const SUNDAY = '2026-11-15'

const stats = (views: number, visitors: number) => ({
  views, visitors, newVisitors: 0, sources: {}, mobile: 0, desktop: 0,
})

/** Filed at noon, Tashkent time, on the given day. */
const at = (day: string) => `${day}T12:00:00+05:00`

const inquiry = (n: number, day = DAY) =>
  ({ id: `i${n}`, name: `Inquiry ${n}`, email: 'a@b.uz', service: 'Branding', budget: '$2 000', message: 'm', createdAt: at(day), read: false })
const brief = (n: number, day = DAY, extra = {}) =>
  ({ id: `b${n}`, name: `Brief ${n}`, services: ['branding', 'packaging'], description: 'd', styles: [], colors: [], budget: '$15 000', createdAt: at(day), read: false, ...extra })
const application = (n: number, day = DAY, extra = {}) =>
  ({ id: `a${n}`, name: `Applicant ${n}`, phone: '+998901234567', portfolio: 'https://behance.net/x', about: 'a', createdAt: at(day), status: 'new' as const, ...extra })

/** A busy Tuesday after an ordinary week: 77 visitors and 95 views against about 15 and 22. */
const busyDay = (): DigestInput => ({
  date: DAY,
  analytics: {
    daily: { '/': { [DAY]: 57 }, '/brief': { [DAY]: 2 } },
    days: {
      [DAY]: { ...stats(95, 77), newVisitors: 75, mobile: 39, desktop: 38 },
      '2026-11-09': stats(27, 15),
      '2026-11-08': stats(21, 15), '2026-11-07': stats(21, 15), '2026-11-06': stats(21, 15),
      '2026-11-05': stats(21, 15), '2026-11-04': stats(21, 15), '2026-11-03': stats(22, 15),
    },
  },
  inquiries: [],
  briefs: [],
  internship: { open: true, applications: [] },
})

const lines = (input: DigestInput) => buildDigest(input).split('\n')

test.describe('Daily report', () => {
  test('a brief has its own line and is not counted under "Заявок"', () => {
    const report = lines({ ...busyDay(), briefs: [brief(1)] })
    expect(report).toContain('📬 Заявок: <b>0</b>')
    expect(report).toContain('📋 Брифов: <b>1</b> 🆕')
    expect(report).toContain('   • Brief 1 — Branding, Packaging · $15 000')
  })

  test('a zero says the briefs and the internship were counted', () => {
    const report = lines(busyDay())
    expect(report).toContain('📋 Брифов: <b>0</b>')
    expect(report).toContain('🎓 Стажировка: <b>0</b>')
  })

  test('the internship line is shown while the intake is open, or when someone applied', () => {
    const closed = { open: false, applications: [] }
    expect(lines({ ...busyDay(), internship: closed }).some((l) => l.startsWith('🎓'))).toBe(false)

    const applied = lines({ ...busyDay(), internship: { open: false, applications: [application(1, DAY, { city: 'Ташкент' })] } })
    expect(applied).toContain('🎓 Стажировка: <b>1</b> 🆕')
    expect(applied).toContain('   • Applicant 1 — Ташкент')
  })

  test('only what was filed on the day is counted, by the site’s clock', () => {
    // 22:00 on the 9th in Tashkent is 17:00 UTC on the 9th; 01:00 on the 11th is still the 10th in UTC.
    const report = lines({
      ...busyDay(),
      briefs: [
        brief(1, DAY),
        { ...brief(2), createdAt: '2026-11-09T22:00:00+05:00' },
        { ...brief(3), createdAt: '2026-11-11T01:00:00+05:00' },
      ],
    })
    expect(report).toContain('📋 Брифов: <b>1</b> =')
  })

  test('the conversion counts the contact form and the brief, not the internship', () => {
    const report = buildDigest({
      ...busyDay(),
      inquiries: [inquiry(1)],
      briefs: [brief(1)],
      internship: { open: true, applications: [application(1), application(2)] },
    })
    // 2 of 77 visitors.
    expect(report).toContain('конверсия: 2.6% от посетителей (заявки и брифы)')
  })

  test('a list stops at eight names and says how many more', () => {
    const report = lines({ ...busyDay(), briefs: Array.from({ length: 10 }, (_, i) => brief(i + 1)) })
    expect(report.filter((l) => l.startsWith('   • Brief')).length).toBe(8)
    expect(report).toContain('   …и ещё 2')
  })

  test('a name from a form cannot break the message', () => {
    const report = buildDigest({ ...busyDay(), briefs: [brief(1, DAY, { name: '<b>Evil</b> & Co' })] })
    expect(report).toContain('• &lt;b&gt;Evil&lt;/b&gt; &amp; Co')
  })

  test('a store that cannot be read is said so, and the report still goes out', () => {
    const report = lines({ ...busyDay(), inquiries: [inquiry(1)], briefs: null, internship: null })
    expect(report).toContain('📋 Брифов: <i>не удалось прочитать</i>')
    expect(report).toContain('🎓 Стажировка: <i>не удалось прочитать</i>')
    expect(report).toContain('   конверсия: 1.3% от посетителей (только заявки)')
    expect(report).toContain('👥 Посетителей: <b>77</b> ↑413%')
  })

  test('a day with a brief but no recorded views is not a quiet day', () => {
    const report = buildDigest({
      date: DAY, analytics: { daily: {}, days: {} }, inquiries: [],
      briefs: [brief(1)], internship: { open: true, applications: [] },
    })
    expect(report).not.toContain('Тихий день')
    expect(report).toContain('📋 Брифов: <b>1</b>')
  })

  test('a day with nothing at all is still reported as quiet', () => {
    const report = buildDigest({
      date: DAY, analytics: { daily: {}, days: {} }, inquiries: [],
      briefs: [], internship: { open: true, applications: [] },
    })
    expect(report).toContain('Тихий день: ни просмотров, ни заявок.')
  })

  test('a number in a sentence takes its noun’s form', () => {
    const average = (n: number) => {
      const input = busyDay()
      // The mean is over the seven days before the report day: one counted day gives n.
      input.analytics.days = { [DAY]: stats(1, 1), '2026-11-09': stats(n, n) }
      return lines(input).find((l) => l.includes('Среднее за 7 дней')) ?? ''
    }
    expect(average(1)).toContain('1 посетитель, 1 просмотр в день')
    expect(average(2)).toContain('2 посетителя, 2 просмотра в день')
    expect(average(5)).toContain('5 посетителей, 5 просмотров в день')
    expect(average(11)).toContain('11 посетителей, 11 просмотров в день')
    expect(average(21)).toContain('21 посетитель, 21 просмотр в день')
    // The case that was wrong: "22 просмотров".
    expect(average(22)).toContain('22 посетителя, 22 просмотра в день')
  })

  test('on a Sunday the week is totalled, briefs and internship included, in the right forms', () => {
    const days: Record<string, ReturnType<typeof stats>> = {}
    for (let d = 9; d <= 15; d++) days[`2026-11-${String(d).padStart(2, '0')}`] = stats(d === 15 ? 3 : 8, d === 15 ? 2 : 7)
    const week = lines({
      date: SUNDAY,
      analytics: { daily: { '/': { [SUNDAY]: 3 } }, days },
      // Monday the 9th to Sunday the 15th; the 8th is the week before.
      inquiries: [inquiry(1, '2026-11-13'), inquiry(2, '2026-11-09'), inquiry(3, '2026-11-08')],
      briefs: [brief(1, '2026-11-12'), brief(2, '2026-11-15'), brief(3, '2026-11-08')],
      internship: { open: true, applications: [application(1, '2026-11-14')] },
    }).find((l) => l.startsWith('<b>Неделя целиком:</b>'))
    // 6 days of 7 visitors and 8 views, and Sunday's 2 and 3.
    expect(week).toBe('<b>Неделя целиком:</b> 44 посетителя, 51 просмотр, 2 заявки, 2 брифа, 1 заявка на стажировку.')
  })

  test('the week line leaves out what could not be read, and a closed, empty intake', () => {
    const days: Record<string, ReturnType<typeof stats>> = {}
    for (let d = 9; d <= 15; d++) days[`2026-11-${String(d).padStart(2, '0')}`] = stats(5, 5)
    const base = { date: SUNDAY, analytics: { daily: { '/': { [SUNDAY]: 5 } }, days }, inquiries: [] }
    const week = (input: DigestInput) => lines(input).find((l) => l.startsWith('<b>Неделя целиком:</b>'))

    expect(week({ ...base, briefs: [], internship: { open: false, applications: [] } }))
      .toBe('<b>Неделя целиком:</b> 35 посетителей, 35 просмотров, 0 заявок, 0 брифов.')
    expect(week({ ...base, briefs: null, internship: null }))
      .toBe('<b>Неделя целиком:</b> 35 посетителей, 35 просмотров, 0 заявок.')
  })
})

test.describe('Daily report: where the views came from', () => {
  test('channels, sources, campaigns and the busiest hour, from the site\'s own counters', () => {
    const input = busyDay()
    const days = input.analytics.days!
    days[DAY] = {
      ...days[DAY],
      channels: { ads: 60, direct: 30, search: 5 },
      sources: { 'Google Ads': 60, 'Прямые заходы': 30, Google: 5 },
      campaigns: { 'google / cpc / stands': 12 },
      hours: Array.from({ length: 24 }, (_, h) => (h === 15 ? 40 : 1)),
    }
    const report = lines(input)
    expect(report).toContain('🚪 Каналы: Реклама 60 · Прямые заходы 30 · Поиск 5')
    expect(report).toContain('🔗 Источники: Google Ads 60 · Прямые заходы 30 · Google 5')
    expect(report).toContain('📣 Кампании: google / cpc / stands 12')
    expect(report).toContain('🕒 Пик: 15:00 — 40 просмотров')
  })

  test('a source from a referrer is escaped for Telegram', () => {
    const input = busyDay()
    input.analytics.days![DAY] = { ...input.analytics.days![DAY], channels: { referral: 3 }, sources: { 'a<b>.example': 3 } }
    expect(lines(input)).toContain('🔗 Источники: a&lt;b&gt;.example 3')
  })

  test('when the statistics cannot be read, the report still goes out with the requests and says so', () => {
    const report = lines({ ...busyDay(), analytics: { daily: {}, days: {} }, analyticsError: 'Redis не подключён', briefs: [brief(1)] })
    expect(report.join('\n')).toContain('не удалось прочитать статистику (Redis не подключён)')
    expect(report.join('\n')).not.toContain('Тихий день')
    expect(report).toContain('📋 Брифов: <b>1</b> 🆕')
  })
})
