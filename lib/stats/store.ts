import { createHash, createHmac } from 'crypto'
import { statsBackend } from './backend'
import { type Marketing } from './marketing'
import {
  F, SITE_LOCALES, classifySource, explodeDay, isBot, mergeDays, normalizePagePath, parseDevice,
  type Channel, type DayCounts, type Device, type StatsDay,
} from './model'
import { daysEndingOn, siteDay, siteHour } from './time'

/**
 * The site's own visitor statistics, in Redis (lib/stats/backend).
 *
 * PRIVACY. No IP address and no user agent is stored. A visitor is told
 * apart from another by a hash of (IP + user agent + a salt that changes
 * every day): within one day that is a pseudonym, enough to count people
 * once; from the next day the same person hashes to something else, so no
 * one can be followed from day to day. The hashes are kept only to count the
 * day's visitors, and expire two days later; what stays is the count.
 *
 * Keys, all expiring:
 *   stats:d:<YYYY-MM-DD>   hash   the day's counters (lib/stats/model, F)
 *   stats:u:<YYYY-MM-DD>   set    the day's visitor hashes            (2 days)
 *   stats:on:<minute>      set    who was here in that minute         (6 minutes)
 */

const DAY_TTL = 400 * 86_400
const VISITORS_TTL = 2 * 86_400
const ONLINE_TTL = 6 * 60
/** "On the site now" is anyone seen in the last five minutes. */
const ONLINE_WINDOW = 5

const dayKey = (date: string) => `stats:d:${date}`
const visitorsKey = (date: string) => `stats:u:${date}`
const onlineKey = (minute: number) => `stats:on:${minute}`
const minuteOf = (now: Date) => Math.floor(now.getTime() / 60_000)

/**
 * The visitor's pseudonym for one day. The salt is derived, never stored
 * (two first requests would race to create a stored one and split one person
 * into two), from a server secret, so the hash cannot be recomputed from an
 * IP address by someone who sees the database.
 */
function visitorHash(ip: string, ua: string, date: string): string {
  const secret = process.env.ANALYTICS_SALT || process.env.JWT_SECRET || 'maze-local-development'
  const salt = createHmac('sha256', secret).update(`stats-visitor|${date}`).digest()
  return createHash('sha256').update(salt).update(`|${ip}|${ua}`).digest('base64url').slice(0, 16)
}

let warned = false
function notConfigured(): void {
  if (warned) return
  warned = true
  console.error('[stats] no Redis connected (KV_REST_API_URL / KV_REST_API_TOKEN): visits are not being counted')
}

export interface VisitInput {
  page: unknown
  locale?: unknown
  /** The page's own referrer, when the browser sent one. */
  referrer?: string
  marketing?: Marketing
  ua: string
  ip: string
  country?: string | null
  host?: string | null
  /** The browser's own word that it has never been here before. */
  firstEver?: boolean
  now?: Date
}

export type RecordResult =
  | { counted: true; date: string; source: string; channel: Channel; device: Device; newVisitor: boolean }
  | { counted: false; reason: 'bot' | 'ignored' | 'not-configured' | 'error' }

/** Count one page view. Never throws: statistics must not be able to break a page. */
export async function recordView(v: VisitInput): Promise<RecordResult> {
  if (isBot(v.ua)) return { counted: false, reason: 'bot' }
  const page = normalizePagePath(v.page)
  if (!page) return { counted: false, reason: 'ignored' }
  const backend = statsBackend()
  if (!backend) { notConfigured(); return { counted: false, reason: 'not-configured' } }

  const now = v.now ?? new Date()
  const date = siteDay(now)
  const { device, os, browser } = parseDevice(v.ua)
  const { source, channel, campaign } = classifySource({ referrer: v.referrer, marketing: v.marketing, host: v.host ?? '' })
  const country = /^[A-Z]{2}$/.test(String(v.country ?? '').toUpperCase()) ? String(v.country).toUpperCase() : 'XX'
  const locale = (SITE_LOCALES as readonly string[]).includes(String(v.locale)) ? String(v.locale) : 'ru'

  const fields = [
    F.views, F.page(page), F.source(source), F.channel(channel),
    F.device(device), F.os(os), F.browser(browser), F.country(country), F.locale(locale), F.hour(siteHour(now)),
  ]
  if (campaign) fields.push(F.campaign(campaign))
  if (v.firstEver) fields.push(F.newVisitors)

  try {
    const newVisitor = await backend.view(
      { day: dayKey(date), visitors: visitorsKey(date), online: onlineKey(minuteOf(now)) },
      visitorHash(v.ip, v.ua, date),
      fields,
      { day: DAY_TTL, visitors: VISITORS_TTL, online: ONLINE_TTL },
    )
    return { counted: true, date, source, channel, device, newVisitor }
  } catch (err) {
    console.error('[stats] could not record a view:', err instanceof Error ? err.message : err)
    return { counted: false, reason: 'error' }
  }
}

/**
 * "The tab is still open", every minute: what "on the site now" is made of.
 * Not a view: counting it as one would make ten minutes of reading ten views.
 */
export async function recordBeat({ ua, ip, now = new Date() }: { ua: string; ip: string; now?: Date }): Promise<void> {
  if (isBot(ua)) return
  const backend = statsBackend()
  if (!backend) return
  try {
    await backend.beat(onlineKey(minuteOf(now)), visitorHash(ip, ua, siteDay(now)), ONLINE_TTL)
  } catch (err) {
    console.error('[stats] heartbeat failed:', err instanceof Error ? err.message : err)
  }
}

export type LeadKind = 'inquiry' | 'brief'

/**
 * A request a client sent that the server accepted, counted on the day it
 * arrived. Counted here, by the API that saved it, and never by the page: a
 * form that never reached us must not raise the conversion. Never throws.
 */
export async function recordLead(kind: LeadKind, now: Date = new Date()): Promise<boolean> {
  const backend = statsBackend()
  if (!backend) { notConfigured(); return false }
  try {
    await backend.increment(dayKey(siteDay(now)), [F.leads, F.lead(kind)], DAY_TTL)
    return true
  } catch (err) {
    console.error('[stats] could not count a lead:', err instanceof Error ? err.message : err)
    return false
  }
}

export class StatsUnavailable extends Error {}

/** The given days' counters, in the order asked. Throws StatsUnavailable without a backend. */
export async function readDays(dates: string[]): Promise<StatsDay[]> {
  const backend = statsBackend()
  if (!backend) throw new StatsUnavailable('Статистика не подключена: в Vercel нет Redis (KV_REST_API_URL).')
  const hashes = await backend.readDays(dates.map(dayKey))
  return dates.map((date, i) => ({ date, ...explodeDay(hashes[i]) }))
}

/** How many distinct people were on the site in the last five minutes. */
export async function onlineNow(now: Date = new Date()): Promise<number> {
  const backend = statsBackend()
  if (!backend) return 0
  const current = minuteOf(now)
  return backend.unionSize(Array.from({ length: ONLINE_WINDOW }, (_, i) => onlineKey(current - i)))
}

export interface StatsPayload {
  days: StatsDay[]
  totals: DayCounts
  online: number
  from: string
  to: string
}

/** The last `days` days (today included), their totals, and who is here now. */
export async function readStats(days = 30, now: Date = new Date()): Promise<StatsPayload> {
  const dates = daysEndingOn(siteDay(now), Math.min(Math.max(Math.round(days) || 1, 1), 180))
  const [rows, online] = await Promise.all([readDays(dates), onlineNow(now).catch(() => 0)])
  return { days: rows, totals: mergeDays(rows), online, from: dates[0], to: dates[dates.length - 1] }
}

/** Take a one-time flag (a report already sent, say); false when it was taken before. */
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const backend = statsBackend()
  if (!backend) throw new StatsUnavailable('Статистика не подключена')
  return backend.claim(`stats:once:${key}`, ttlSeconds)
}

/** Whether the store answers, by an actual round trip. */
export async function statsHealth(): Promise<{ ok: boolean; backend: 'redis' | 'file' | 'none'; error?: string }> {
  const backend = statsBackend()
  if (!backend) return { ok: false, backend: 'none', error: 'Redis не подключён' }
  try {
    await backend.ping()
    return { ok: true, backend: backend.name }
  } catch (err) {
    return { ok: false, backend: backend.name, error: err instanceof Error ? err.message : String(err) }
  }
}
