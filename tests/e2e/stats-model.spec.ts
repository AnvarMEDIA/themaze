import { test, expect } from '@playwright/test'
import {
  F, classifySource, conversion, explodeDay, isBot, mergeDays, normalizePagePath, parseDevice, peakHour, topList,
} from '../../lib/stats/model'
import { marketingFromQuery, sanitizeMarketing, type Marketing } from '../../lib/stats/marketing'
import { daysEndingOn, shiftDay, siteDay, siteHour } from '../../lib/stats/time'

/**
 * The statistics' rules (lib/stats/model, marketing, time): where a visit
 * came from, who is a bot, how a day's counters are named. Pure functions,
 * tested without a store or a browser.
 */
test.skip(({ isMobile }) => isMobile, 'pure functions: once is enough')

const HOST = 'maze.uz'
const from = (referrer: string, marketing: Marketing | null = null, host = HOST) =>
  classifySource({ referrer, marketing, host })

test.describe('Where a visit came from', () => {
  const cases: Array<[string, ReturnType<typeof from>, ReturnType<typeof from>]> = [
    // 1. utm tags
    ['utm with a paid medium is an ad, with its campaign',
      from('', { source: 'google', medium: 'cpc', campaign: 'stands' }),
      { source: 'google', channel: 'ads', campaign: 'google / cpc / stands' }],
    ['utm with a paid click marker is an ad whatever the medium',
      from('', { source: 'google', medium: 'organic', clickType: 'gclid' }),
      { source: 'google', channel: 'ads', campaign: 'google / organic' }],
    ['utm without either is a campaign',
      from('', { source: 'newsletter', medium: 'email', campaign: 'nov' }),
      { source: 'newsletter', channel: 'campaign', campaign: 'newsletter / email / nov' }],
    ['ChatGPT tagging its own links is ChatGPT, not a campaign',
      from('', { source: 'chatgpt.com' }),
      { source: 'ChatGPT', channel: 'ai' }],
    // 2. click markers without utm
    ['gclid alone, no referrer: Google Ads (11 November read these as direct)',
      from('', { clickType: 'gclid' }), { source: 'Google Ads', channel: 'ads' }],
    ['gbraid alone: Google Ads', from('', { clickType: 'gbraid' }), { source: 'Google Ads', channel: 'ads' }],
    ['wbraid alone: Google Ads', from('', { clickType: 'wbraid' }), { source: 'Google Ads', channel: 'ads' }],
    ['gad_source alone, the id stripped: Google Ads', from('', { clickType: 'gad_source' }), { source: 'Google Ads', channel: 'ads' }],
    ['a click marker beats a search referrer',
      from('https://www.google.com/', { clickType: 'gclid' }), { source: 'Google Ads', channel: 'ads' }],
    ['yclid: Yandex Direct', from('', { clickType: 'yclid' }), { source: 'Яндекс.Директ', channel: 'ads' }],
    ['fbclid with no referrer: one of Meta\'s apps, not an ad', from('', { clickType: 'fbclid' }), { source: 'Meta', channel: 'social' }],
    ['fbclid with Instagram as the referrer: Instagram',
      from('https://l.instagram.com/', { clickType: 'fbclid' }), { source: 'Instagram', channel: 'social' }],
    // 3–4. referrers
    ['an ad frame as the only referrer is an ad', from('https://googleads.g.doubleclick.net/pagead/ads'), { source: 'Google Ads', channel: 'ads' }],
    ['adservice.google.com is an ad, not a search', from('https://adservice.google.com/ddm/'), { source: 'Google Ads', channel: 'ads' }],
    ['googlesyndication is an ad', from('https://tpc.googlesyndication.com/'), { source: 'Google Ads', channel: 'ads' }],
    ['Yandex\'s ad network is an ad', from('https://an.yandex.ru/count/x'), { source: 'Яндекс.Директ', channel: 'ads' }],
    ['Google search', from('https://www.google.com/'), { source: 'Google', channel: 'search' }],
    ['Google search in another country', from('https://www.google.co.uz/'), { source: 'Google', channel: 'search' }],
    ['the Google app on Android', from('android-app://com.google.android.googlequicksearchbox/'), { source: 'Google', channel: 'search' }],
    ['Yandex search', from('https://yandex.uz/search/?text=maze'), { source: 'Яндекс', channel: 'search' }],
    ['ya.ru', from('https://ya.ru/'), { source: 'Яндекс', channel: 'search' }],
    ['Telegram', from('https://t.me/mazestudio'), { source: 'Telegram', channel: 'social' }],
    ['Telegram\'s Android app', from('android-app://org.telegram.messenger/'), { source: 'Telegram', channel: 'social' }],
    ['ChatGPT as the referrer', from('https://chatgpt.com/'), { source: 'ChatGPT', channel: 'ai' }],
    ['Perplexity', from('https://www.perplexity.ai/search'), { source: 'Perplexity', channel: 'ai' }],
    ['any other site is a referral, by host', from('https://www.example.org/list'), { source: 'example.org', channel: 'referral' }],
    // 5. nothing
    ['no referrer and no campaign: direct', from(''), { source: 'Прямые заходы', channel: 'direct' }],
    ['our own site is not a source', from('https://www.maze.uz/ru/portfolio'), { source: 'Прямые заходы', channel: 'direct' }],
    ['our own site behind a port, locally', from('http://localhost:3100/', null, 'localhost:3100'), { source: 'Прямые заходы', channel: 'direct' }],
    ['a referrer that is not a URL is no referrer', from('not a url'), { source: 'Прямые заходы', channel: 'direct' }],
    ['the second page of a visit keeps the entry referrer',
      from('', { referrer: 'https://www.instagram.com/' }), { source: 'Instagram', channel: 'social' }],
    ['the page\'s own referrer wins over the visit\'s',
      from('https://www.google.com/', { referrer: 'https://www.instagram.com/' }), { source: 'Google', channel: 'search' }],
  ]
  for (const [name, actual, expected] of cases) {
    test(name, () => { expect(actual).toEqual(expected) })
  }
})

test.describe('Bots and devices', () => {
  const human = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    // An ad click inside an Android app's WebView.
    'Mozilla/5.0 (Linux; Android 14; SM-A155F Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36',
    // Telegram's in-app browser is a person; it used to be dropped as a bot.
    'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Telegram-Android/11.2.3',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 YaBrowser/24.10.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 YaSearchBrowser/24.84 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  ]
  const bots = [
    '',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36',
    'TelegramBot (like TwitterBot)',
    'WhatsApp/2.23.20.0',
    'curl/8.5.0',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; AdsBot-Google-Mobile; +http://www.google.com/mobile/adsbot.html)',
    'Mozilla/5.0 (Linux; Android 11) Chrome/130 Mobile Safari/537.36 Google-Read-Aloud',
  ]
  test('people are counted', () => { for (const ua of human) expect(isBot(ua), ua).toBe(false) })
  test('bots are not', () => { for (const ua of bots) expect(isBot(ua), ua || '(empty)').toBe(true) })

  test('devices, systems and browsers', () => {
    expect(parseDevice(human[0])).toEqual({ device: 'mobile', os: 'iOS', browser: 'Safari' })
    expect(parseDevice(human[1])).toEqual({ device: 'mobile', os: 'Android', browser: 'Chrome' })
    expect(parseDevice(human[3])).toEqual({ device: 'desktop', os: 'Windows', browser: 'Яндекс' })
    expect(parseDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1').device).toBe('tablet')
    expect(parseDevice('Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36').device).toBe('tablet')
  })
})

test.describe('A day\'s counters', () => {
  test('every field comes back under its own breakdown; "ch:" is not read as "c:"', () => {
    const day = explodeDay({
      views: '12', visitors: '7', new: '3', leads: '2',
      'ch:ads': '9', 'c:UZ': '10', 'cmp:google / cpc / x': '4', 'lead:brief': '1', 'lead:inquiry': '1',
      'h:15': '5', 'h:0': '1', 'p:/': '8', 's:Google Ads': '9', 'l:ru': '11', 'dev:mobile': '12', 'os:iOS': '6', 'br:Safari': '6',
      'h:24': '9', 'nonsense': 'x',
    })
    expect(day.views).toBe(12)
    expect(day.visitors).toBe(7)
    expect(day.newVisitors).toBe(3)
    expect(day.leads).toBe(2)
    expect(day.channels).toEqual({ ads: 9 })
    expect(day.countries).toEqual({ UZ: 10 })
    expect(day.campaigns).toEqual({ 'google / cpc / x': 4 })
    expect(day.leadKinds).toEqual({ brief: 1, inquiry: 1 })
    expect(day.hours[15]).toBe(5)
    expect(day.hours[0]).toBe(1)
    expect(day.hours).toHaveLength(24)
    expect(day.pages).toEqual({ '/': 8 })
    expect(day.locales).toEqual({ ru: 11 })
  })

  test('field names are what the store writes', () => {
    expect([F.page('/'), F.channel('ads'), F.country('UZ'), F.hour(3), F.lead('brief')]).toEqual(['p:/', 'ch:ads', 'c:UZ', 'h:3', 'lead:brief'])
  })

  test('days merge; lists sort; conversion never divides by zero; the peak is the busiest hour', () => {
    const a = explodeDay({ views: 3, visitors: 2, leads: 1, 's:Google': 3, 'h:9': 3 })
    const b = explodeDay({ views: 5, visitors: 4, 's:Google': 1, 's:Instagram': 4, 'h:9': 1, 'h:20': 4 })
    const total = mergeDays([a, b])
    expect(total.views).toBe(8)
    expect(total.visitors).toBe(6)
    expect(total.sources).toEqual({ Google: 4, Instagram: 4 })
    expect(topList(total.sources)).toEqual([{ key: 'Google', count: 4 }, { key: 'Instagram', count: 4 }])
    expect(conversion(1, 0)).toBe(0)
    expect(conversion(14, 1316)).toBe(1.1)
    expect(peakHour(total.hours)).toEqual({ hour: 9, views: 4 })
    expect(peakHour(Array(24).fill(0))).toBeNull()
  })
})

test.describe('Campaigns, pages and days', () => {
  test('the landing URL\'s campaign: utm tags and which click marker, never its value', () => {
    expect(marketingFromQuery('?gclid=Cj0KCQ&gad_source=1')).toEqual({ clickType: 'gclid' })
    expect(marketingFromQuery('?gad_source=1')).toEqual({ clickType: 'gad_source' })
    expect(marketingFromQuery('?utm_source=google&utm_medium=cpc&utm_campaign=stands')).toEqual({ source: 'google', medium: 'cpc', campaign: 'stands' })
    expect(marketingFromQuery('?page=2')).toBeNull()
  })

  test('what the browser posts is whitelisted and bounded', () => {
    expect(sanitizeMarketing({ source: ' google\n', clickType: 'gclid', clickId: 'secret', evil: 'x', referrer: 'https://t.me/' }))
      .toEqual({ source: 'google', clickType: 'gclid', referrer: 'https://t.me/' })
    expect(sanitizeMarketing({ clickType: 'made-up' })).toBeUndefined()
    expect(sanitizeMarketing('nope')).toBeUndefined()
    expect(sanitizeMarketing({ campaign: 'x'.repeat(500) })?.campaign).toHaveLength(200)
  })

  test('pages without the language prefix, the query or a trailing slash', () => {
    expect(normalizePagePath('/ru/portfolio/')).toBe('/portfolio')
    expect(normalizePagePath('/ru')).toBe('/')
    expect(normalizePagePath('/brief?gclid=x')).toBe('/brief')
    expect(normalizePagePath('/admin/stats')).toBeNull()
    expect(normalizePagePath('/logo.png')).toBeNull()
    expect(normalizePagePath(42)).toBeNull()
  })

  test('days and hours on the studio\'s clock', () => {
    // 00:19 on 12 November in Tashkent is 19:19 on the 11th in UTC.
    expect(siteDay(new Date('2026-11-11T19:19:00Z'))).toBe('2026-11-12')
    expect(siteHour(new Date('2026-11-11T10:30:00Z'))).toBe(15)
    expect(siteHour(new Date('2026-11-11T19:00:00Z'))).toBe(0)
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28')
    expect(daysEndingOn('2026-11-12', 3)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12'])
  })
})
