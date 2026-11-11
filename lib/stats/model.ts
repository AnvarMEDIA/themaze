import { CLICK_ID_PARAMS, isPaidClick, type Marketing } from './marketing'

/**
 * How a visit is classified, and how a day's counters are named.
 *
 * Pure functions, no I/O, so every rule is tested directly
 * (tests/e2e/stats-model.spec.ts). Nothing here identifies a person: no IP,
 * no user agent, no id leaves this file; the only per-visitor value in the
 * store is a hash that changes every day (lib/stats/store).
 */

/* ── The visitor's device ───────────────────────────────────────────────── */

export type Device = 'mobile' | 'tablet' | 'desktop'

export function parseDevice(ua = ''): { device: Device; os: string; browser: string } {
  const u = String(ua).toLowerCase()
  const device: Device = /ipad|tablet|(android(?!.*mobile))/.test(u) ? 'tablet'
    : /mobile|android|iphone|ipod|blackberry|windows phone/.test(u) ? 'mobile'
    : 'desktop'
  const os = /windows nt/.test(u) ? 'Windows'
    : /android/.test(u)          ? 'Android'
    : /iphone|ipad|ipod/.test(u) ? 'iOS'
    : /mac os x/.test(u)         ? 'macOS'
    : /linux/.test(u)            ? 'Linux'
    : 'Другая'
  const browser = /edg\//.test(u)  ? 'Edge'
    : /yabrowser/.test(u)          ? 'Яндекс'
    : /opr\/|opera/.test(u)        ? 'Opera'
    : /samsungbrowser/.test(u)     ? 'Samsung'
    : /chrome|crios/.test(u)       ? 'Chrome'
    : /firefox|fxios/.test(u)      ? 'Firefox'
    : /safari/.test(u)             ? 'Safari'
    : 'Другой'
  return { device, os, browser }
}

/**
 * Crawlers, uptime checks, link-preview fetchers and headless browsers.
 * Counting them would inflate every number and make the conversion
 * meaningless. YandexBot runs a page's scripts, so it reaches the tracker:
 * 166 of the 1 500 beacons on 11 November were its. An empty user agent is a
 * bot too.
 *
 * Not "telegram": that is also the in-app browser a person opens a link in
 * (Telegram-Android/…), and it used to drop those visits; the bot that
 * fetches link previews says TelegramBot. Yandex's own browsers (YaBrowser,
 * YaSearchBrowser) are people, hence the lookahead.
 */
// "(?<!cu)": CUBOT is a phone brand, and its user agent says so.
const BOT_RE = /(?<!cu)bot|crawler|spider|crawl|slurp|curl|wget|python|java\/|go-http|headless|lighthouse|pingdom|monitor|preview|facebookexternalhit|whatsapp|telegrambot|vercel|gptbot|claudebot|perplexity|yandex(?!browser|searchbrowser)|googlebot|bingbot|ahrefs|semrush|mj12|dotbot|puppeteer|playwright|phantomjs|google-read-aloud|adsbot|mediapartners|bytespider|petalbot|applebot|baiduspider|duckduckbot|discordbot|skypeuri|vkshare/i

export const isBot = (ua = ''): boolean => !ua.trim() || BOT_RE.test(ua)

/* ── Where a visit came from ────────────────────────────────────────────── */

export type Channel = 'ads' | 'campaign' | 'ai' | 'search' | 'social' | 'referral' | 'direct'

export const CHANNEL_LABELS: Record<Channel, string> = {
  ads:      'Реклама',
  campaign: 'Кампании',
  ai:       'ИИ-ассистенты',
  search:   'Поиск',
  social:   'Соцсети',
  referral: 'Ссылки с сайтов',
  direct:   'Прямые заходы',
}

/** The source of a visit with no referrer and no campaign. */
export const DIRECT_SOURCE = 'Прямые заходы'

/**
 * Ad networks' own hosts: a banner click often arrives with the ad frame as
 * its only referrer. Checked before search engines, or adservice.google.com
 * would read as a Google search.
 */
const AD_NETWORKS: Array<[RegExp, string]> = [
  [/(^|\.)(doubleclick\.net|googlesyndication\.com|googleadservices\.com|syndicatedsearch\.goog)$|^adservice\.google\./i, 'Google Ads'],
  [/^(yabs|an)\.yandex\./i, 'Яндекс.Директ'],
]

/** AI assistants, as a referrer host or a link's utm_source. */
const AI: Array<[RegExp, string]> = [
  [/^(chatgpt(\.com)?|chat\.openai\.com|openai)$/i, 'ChatGPT'],
  [/^(perplexity(\.ai)?)$/i, 'Perplexity'],
  [/^(claude(\.ai)?)$/i, 'Claude'],
  [/^(gemini(\.google\.com)?)$/i, 'Gemini'],
  [/^(copilot(\.microsoft\.com|\.com)?)$/i, 'Copilot'],
  [/^(chat\.)?deepseek(\.com)?$/i, 'DeepSeek'],
  [/^grok(\.com)?$/i, 'Grok'],
  [/^alice\.yandex\.ru$/i, 'Алиса'],
]

/** Search engines, including Google's Android app (android-app://…googlequicksearchbox). */
const SEARCH: Array<[RegExp, string]> = [
  [/(^|\.)google\.[a-z.]+$|googlequicksearchbox/i, 'Google'],
  [/(^|\.)(yandex\.[a-z.]+|ya\.ru)$/i, 'Яндекс'],
  [/(^|\.)bing\.com$/i, 'Bing'],
  [/duckduckgo/i, 'DuckDuckGo'],
  [/(^|\.)yahoo\./i, 'Yahoo'],
  [/(^|\.)mail\.ru$/i, 'Mail.ru'],
]

const SOCIAL: Array<[RegExp, string]> = [
  [/instagram/i, 'Instagram'],
  [/facebook|(^|\.)fb\.(com|me)$|^com\.facebook/i, 'Facebook'],
  [/(^|\.)t\.me$|telegram/i, 'Telegram'],
  [/youtube|(^|\.)youtu\.be$/i, 'YouTube'],
  [/tiktok/i, 'TikTok'],
  [/linkedin|(^|\.)lnkd\.in$/i, 'LinkedIn'],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/i, 'X'],
  [/(^|\.)vk\.(com|ru)$/i, 'VK'],
  [/(^|\.)wa\.me$|whatsapp/i, 'WhatsApp'],
  [/threads\.net/i, 'Threads'],
  [/pinterest/i, 'Pinterest'],
  [/behance/i, 'Behance'],
  [/dribbble/i, 'Dribbble'],
]

const match = (list: Array<[RegExp, string]>, value: string): string | undefined =>
  list.find(([re]) => re.test(value))?.[1]

/** A referrer's host, without www.; '' for anything that is not a URL. */
function hostOf(url: string | undefined): string {
  if (!url) return ''
  try { return new URL(String(url).trim()).hostname.replace(/^www\./, '').toLowerCase() }
  catch { return '' }
}

/** Our own host, as a page sees it in a referrer: no www., no port. */
const ownHost = (host: string | undefined) =>
  String(host ?? '').toLowerCase().replace(/^www\./, '').replace(/:\d+$/, '')

/**
 * Where a visit came from, in rules taken in this order:
 *
 * 1. utm_source: a campaign, or an ad when the medium is a paid one or a
 *    paid click marker came with it. A link an AI assistant tags with its
 *    own name (?utm_source=chatgpt.com) is that assistant, not a campaign.
 * 2. No utm, but a paid click marker: an ad (Google Ads' auto-tagging adds
 *    gclid and no utm at all; without this rule every such click was a
 *    "direct" visit, which is how 11 November's ads read as 32 direct ones).
 * 3. The referrer: the page's own, else the visit's entry referrer, so the
 *    second page of a visit keeps the first one's source. Our own host is
 *    not a source.
 * 4. Ad networks' hosts, then AI assistants, search engines, social
 *    networks; any other site is a referral.
 * 5. Nothing at all: a direct visit (or Meta, when only fbclid came).
 */
export function classifySource(
  { referrer = '', marketing = null, host = '' }: { referrer?: string; marketing?: Marketing | null; host?: string } = {},
): { source: string; channel: Channel; campaign?: string } {
  const m = marketing ?? {}

  if (m.source) {
    const medium = String(m.medium ?? '').toLowerCase()
    const paid = /cpc|ppc|paid|ads|cpm|banner/.test(medium) || isPaidClick(m)
    const tagged = String(m.source).trim()
    const assistant = !paid ? match(AI, tagged.toLowerCase().replace(/^www\./, '')) : undefined
    if (assistant) return { source: assistant, channel: 'ai' }
    return {
      source: tagged.slice(0, 60),
      channel: paid ? 'ads' : 'campaign',
      campaign: [m.source, m.medium, m.campaign].filter(Boolean).join(' / ').slice(0, 120),
    }
  }

  if (isPaidClick(m)) return { source: CLICK_ID_PARAMS[m.clickType as string], channel: 'ads' }

  const own = ownHost(host)
  const external = (url: string | undefined) => { const h = hostOf(url); return h && h !== own ? h : '' }
  const from = external(referrer) || external(m.referrer)

  if (!from) {
    // No referrer, but Meta's marker: one of its apps opened the link.
    if (m.clickType === 'fbclid') return { source: CLICK_ID_PARAMS.fbclid, channel: 'social' }
    return { source: DIRECT_SOURCE, channel: 'direct' }
  }

  const ad = match(AD_NETWORKS, from)
  if (ad) return { source: ad, channel: 'ads' }
  const assistant = match(AI, from)
  if (assistant) return { source: assistant, channel: 'ai' }
  const engine = match(SEARCH, from)
  if (engine) return { source: engine, channel: 'search' }
  const network = match(SOCIAL, from)
  if (network) return { source: network, channel: 'social' }
  return { source: from.slice(0, 60), channel: 'referral' }
}

/* ── Pages and languages ────────────────────────────────────────────────── */

export const SITE_LOCALES = ['ru', 'en', 'uz'] as const

/**
 * A page as one row: the locale prefix dropped (/ru/portfolio and /portfolio
 * are one page; the language has its own breakdown), no query, no trailing
 * slash. null for what is not a page of the public site.
 */
export function normalizePagePath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 200) return null
  if (raw.includes('..')) return null
  let p = raw.split('?')[0].split('#')[0].trim()
  if (!p.startsWith('/')) p = '/' + p
  p = p.replace(/^\/(en|ru|uz)(\/|$)/, '/')
  if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '') || '/'
  if (p.startsWith('/admin') || p.startsWith('/api') || p.startsWith('/_next')) return null
  if (p.includes('.')) return null
  return p.slice(0, 120)
}

/* ── A day's counters ───────────────────────────────────────────────────── */

/**
 * One Redis hash holds a whole day, its fields prefixed by breakdown, so a
 * day is read in one command rather than one per breakdown.
 */
export const F = {
  views:    'views',
  visitors: 'visitors',
  /** Browsers that said they had never been here before (their own localStorage). */
  newVisitors: 'new',
  leads:    'leads',
  lead:     (kind: string) => `lead:${kind}`,
  page:     (v: string) => `p:${v}`,
  source:   (v: string) => `s:${v}`,
  channel:  (v: string) => `ch:${v}`,
  device:   (v: string) => `dev:${v}`,
  os:       (v: string) => `os:${v}`,
  browser:  (v: string) => `br:${v}`,
  country:  (v: string) => `c:${v}`,
  locale:   (v: string) => `l:${v}`,
  hour:     (v: number) => `h:${v}`,
  campaign: (v: string) => `cmp:${v}`,
}

type Breakdown = 'pages' | 'sources' | 'channels' | 'devices' | 'os' | 'browsers' | 'countries' | 'locales' | 'campaigns' | 'leadKinds'

const BUCKETS: Record<string, Breakdown> = {
  'p:': 'pages', 's:': 'sources', 'ch:': 'channels', 'dev:': 'devices', 'os:': 'os', 'br:': 'browsers',
  'c:': 'countries', 'l:': 'locales', 'cmp:': 'campaigns', 'lead:': 'leadKinds',
}
// Longest first, so that a field is never read under a shorter prefix.
const PREFIXES = Object.keys(BUCKETS).sort((a, b) => b.length - a.length)

export interface DayCounts {
  views: number
  visitors: number
  newVisitors: number
  leads: number
  pages: Record<string, number>
  sources: Record<string, number>
  channels: Record<string, number>
  devices: Record<string, number>
  os: Record<string, number>
  browsers: Record<string, number>
  countries: Record<string, number>
  locales: Record<string, number>
  campaigns: Record<string, number>
  leadKinds: Record<string, number>
  /** Views by hour of the day, 0–23, on the studio's clock. */
  hours: number[]
}

export interface StatsDay extends DayCounts { date: string }

export function emptyCounts(): DayCounts {
  return {
    views: 0, visitors: 0, newVisitors: 0, leads: 0,
    pages: {}, sources: {}, channels: {}, devices: {}, os: {}, browsers: {},
    countries: {}, locales: {}, campaigns: {}, leadKinds: {},
    hours: Array(24).fill(0),
  }
}

/** A stored day hash back into named breakdowns. */
export function explodeDay(hash: Record<string, unknown> | null | undefined): DayCounts {
  const out = emptyCounts()
  for (const [field, raw] of Object.entries(hash ?? {})) {
    const n = Number(raw)
    if (!Number.isFinite(n)) continue
    if (field === F.views) { out.views = n; continue }
    if (field === F.visitors) { out.visitors = n; continue }
    if (field === F.newVisitors) { out.newVisitors = n; continue }
    if (field === F.leads) { out.leads = n; continue }
    if (field.startsWith('h:')) {
      const h = Number(field.slice(2))
      if (Number.isInteger(h) && h >= 0 && h < 24) out.hours[h] = n
      continue
    }
    const prefix = PREFIXES.find((p) => field.startsWith(p))
    if (prefix) out[BUCKETS[prefix]][field.slice(prefix.length)] = n
  }
  return out
}

/** Several days as one set of totals. */
export function mergeDays(days: DayCounts[]): DayCounts {
  const total = emptyCounts()
  const maps: Breakdown[] = ['pages', 'sources', 'channels', 'devices', 'os', 'browsers', 'countries', 'locales', 'campaigns', 'leadKinds']
  for (const d of days) {
    total.views += d.views
    total.visitors += d.visitors
    total.newVisitors += d.newVisitors
    total.leads += d.leads
    for (const key of maps) {
      for (const [k, v] of Object.entries(d[key])) total[key][k] = (total[key][k] ?? 0) + v
    }
    d.hours.forEach((v, i) => { total.hours[i] += v })
  }
  return total
}

/** A map of counts as a list, biggest first, ties by name. */
export function topList(map: Record<string, number>, limit = 10): Array<{ key: string; count: number }> {
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }))
}

/**
 * Leads per hundred visitors, one decimal. Visitors, not views: one person
 * reading five pages is one chance to leave a request.
 */
export function conversion(leads: number, visitors: number): number {
  if (!visitors) return 0
  return Math.round((leads / visitors) * 1000) / 10
}

/** The busiest hour of a day, or null for a day with no views. */
export function peakHour(hours: number[]): { hour: number; views: number } | null {
  let best = -1
  hours.forEach((v, h) => { if (v > 0 && (best < 0 || v > hours[best])) best = h })
  return best < 0 ? null : { hour: best, views: hours[best] }
}
