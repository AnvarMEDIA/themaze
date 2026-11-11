import { promises as fs } from 'fs'
import path from 'path'
import { Redis } from '@upstash/redis'

/**
 * Where the statistics live: Upstash Redis, connected to the Vercel project
 * as KV_REST_API_URL / KV_REST_API_TOKEN (or the UPSTASH_REDIS_REST_* pair).
 *
 * Counters are Redis increments, atomic, so two visits in the same second
 * both count. The store they replace read a whole JSON file from Blob, added
 * one, and wrote it back: under a day of ads, hundreds of those overlapped,
 * each overwrote the others, and a failed read started the file over, which
 * is how 11 November's 1 500 views were reported as 35.
 *
 * A visit is ONE command, a script run inside Redis, rather than the dozen
 * increments it takes: atomic as a whole, one round trip, and a twelfth of
 * the free tier's monthly allowance.
 *
 * Locally, without Redis, the same operations go to JSON files under
 * data/stats-dev (or STATS_DEV_DIR), one process, no concurrency to speak of.
 * On Vercel without Redis there is no backend at all, and every caller says
 * so: a stand-in that "works" and keeps nothing is how the first version of
 * this site's statistics collected nothing for weeks.
 */

export interface ViewKeys { day: string; visitors: string; online: string }
export interface ViewTtl { day: number; visitors: number; online: number }

export interface StatsBackend {
  readonly name: 'redis' | 'file'
  /** Count one view: add `fields` to the day, the visitor to the day's and the minute's sets. True when the visitor is new today. */
  view(keys: ViewKeys, visitor: string, fields: string[], ttl: ViewTtl): Promise<boolean>
  /** "Still here": the visitor into one minute's set. */
  beat(onlineKey: string, visitor: string, ttl: number): Promise<void>
  /** Add one to each of `fields` of a day. */
  increment(dayKey: string, fields: string[], ttl: number): Promise<void>
  /** Several days' hashes, in the order asked; {} for a day with none. */
  readDays(dayKeys: string[]): Promise<Array<Record<string, unknown>>>
  /** How many distinct members the given sets hold together. */
  unionSize(keys: string[]): Promise<number>
  /** Take a one-time flag; false when it was already taken. */
  claim(key: string, ttl: number): Promise<boolean>
  /** A real round trip, for the admin's health line. */
  ping(): Promise<void>
}

/* ── Redis ──────────────────────────────────────────────────────────────── */

// KEYS: day hash, the day's visitor set, this minute's set.
// ARGV: visitor, day TTL, visitor-set TTL, minute TTL, then the fields.
const VIEW_SCRIPT = `
local added = redis.call('SADD', KEYS[2], ARGV[1])
if added == 1 then redis.call('HINCRBY', KEYS[1], 'visitors', 1) end
for i = 5, #ARGV do redis.call('HINCRBY', KEYS[1], ARGV[i], 1) end
redis.call('EXPIRE', KEYS[1], ARGV[2])
redis.call('EXPIRE', KEYS[2], ARGV[3])
redis.call('SADD', KEYS[3], ARGV[1])
redis.call('EXPIRE', KEYS[3], ARGV[4])
return added
`

// KEYS: the day. ARGV: TTL, then the fields.
const INCREMENT_SCRIPT = `
for i = 2, #ARGV do redis.call('HINCRBY', KEYS[1], ARGV[i], 1) end
redis.call('EXPIRE', KEYS[1], ARGV[1])
return 1
`

// KEYS: the minute. ARGV: visitor, TTL.
const BEAT_SCRIPT = `
redis.call('SADD', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[2])
return 1
`

/**
 * A hash as Redis replied. With automatic deserialization off (counts are
 * read as written, nothing is JSON-parsed), HGETALL comes back as the flat
 * [field, value, field, value…] list Redis itself sends, not as an object;
 * read as an object, every day came back empty.
 */
export function hashFromReply(reply: unknown): Record<string, unknown> {
  if (Array.isArray(reply)) {
    const out: Record<string, unknown> = {}
    for (let i = 0; i + 1 < reply.length; i += 2) out[String(reply[i])] = reply[i + 1]
    return out
  }
  return reply && typeof reply === 'object' ? reply as Record<string, unknown> : {}
}

function redisBackend(redis: Redis): StatsBackend {
  const view = redis.createScript<number>(VIEW_SCRIPT)
  const increment = redis.createScript<number>(INCREMENT_SCRIPT)
  const beat = redis.createScript<number>(BEAT_SCRIPT)
  return {
    name: 'redis',
    async view(keys, visitor, fields, ttl) {
      const added = await view.exec(
        [keys.day, keys.visitors, keys.online],
        [visitor, String(ttl.day), String(ttl.visitors), String(ttl.online), ...fields],
      )
      return Number(added) === 1
    },
    async beat(onlineKey, visitor, ttl) {
      await beat.exec([onlineKey], [visitor, String(ttl)])
    },
    async increment(dayKey, fields, ttl) {
      if (fields.length === 0) return
      await increment.exec([dayKey], [String(ttl), ...fields])
    },
    async readDays(dayKeys) {
      if (dayKeys.length === 0) return []
      const p = redis.pipeline()
      for (const key of dayKeys) p.hgetall(key)
      const rows = await p.exec<Array<unknown>>()
      return rows.map(hashFromReply)
    },
    async unionSize(keys) {
      if (keys.length === 0) return 0
      const [first, ...rest] = keys
      return (await redis.sunion(first, ...rest)).length
    },
    async claim(key, ttl) {
      return (await redis.set(key, '1', { nx: true, ex: ttl })) === 'OK'
    },
    async ping() {
      await redis.ping()
    },
  }
}

/* ── Local files (development and tests only) ───────────────────────────── */

function fileBackend(dir: string): StatsBackend {
  const file = (key: string) => path.join(dir, `${key.replace(/[^a-zA-Z0-9_-]+/g, '_')}.json`)
  const read = async <T>(key: string, fallback: T): Promise<T> => {
    try { return JSON.parse(await fs.readFile(file(key), 'utf8')) as T } catch { return fallback }
  }
  const write = async (key: string, value: unknown) => {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(file(key), JSON.stringify(value), 'utf8')
  }
  const addTo = async (key: string, member: string): Promise<boolean> => {
    const set = await read<string[]>(key, [])
    if (set.includes(member)) return false
    set.push(member)
    await write(key, set)
    return true
  }
  const bump = async (key: string, fields: string[]) => {
    const hash = await read<Record<string, number>>(key, {})
    for (const f of fields) hash[f] = (hash[f] ?? 0) + 1
    await write(key, hash)
  }
  return {
    name: 'file',
    async view(keys, visitor, fields) {
      const added = await addTo(keys.visitors, visitor)
      await bump(keys.day, added ? ['visitors', ...fields] : fields)
      await addTo(keys.online, visitor)
      return added
    },
    async beat(onlineKey, visitor) { await addTo(onlineKey, visitor) },
    async increment(dayKey, fields) { await bump(dayKey, fields) },
    async readDays(dayKeys) { return Promise.all(dayKeys.map((k) => read<Record<string, unknown>>(k, {}))) },
    async unionSize(keys) {
      const sets = await Promise.all(keys.map((k) => read<string[]>(k, [])))
      return new Set(sets.flat()).size
    },
    async claim(key) {
      const taken = await read<boolean>(key, false)
      if (taken) return false
      await write(key, true)
      return true
    },
    async ping() { await fs.mkdir(dir, { recursive: true }) },
  }
}

/* ── Which one ──────────────────────────────────────────────────────────── */

let chosen: StatsBackend | null | undefined

/** The backend in use, or null on a server with nowhere to keep statistics. */
export function statsBackend(): StatsBackend | null {
  if (chosen !== undefined) return chosen
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (url && token) {
    chosen = redisBackend(new Redis({ url, token, automaticDeserialization: false }))
  } else if (process.env.VERCEL) {
    chosen = null
  } else {
    chosen = fileBackend(process.env.STATS_DEV_DIR || path.join(process.cwd(), 'data', 'stats-dev'))
  }
  return chosen
}
