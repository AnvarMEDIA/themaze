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

/** The seed's own mark that it is made: its other fields are page fields. */
export const SEED_READY = '_ready'

/** `total`: the page views of all time, a hash that never expires. */
export interface ViewKeys { day: string; visitors: string; online: string; total: string }
export interface ViewTtl { day: number; visitors: number; online: number }

export interface StatsBackend {
  readonly name: 'redis' | 'file'
  /**
   * Count one view: add `fields` to the day, `pageField` to the views of all
   * time, the visitor to the day's and the minute's sets. True when the
   * visitor is new today.
   */
  view(keys: ViewKeys, visitor: string, fields: string[], ttl: ViewTtl, pageField: string): Promise<boolean>
  /** "Still here": the visitor into one minute's set. */
  beat(onlineKey: string, visitor: string, ttl: number): Promise<void>
  /** Add one to each of `fields` of a day. */
  increment(dayKey: string, fields: string[], ttl: number): Promise<void>
  /** Several hashes (days, mostly), in the order asked; {} for one there is not. */
  readDays(dayKeys: string[]): Promise<Array<Record<string, unknown>>>
  /**
   * Once ever: write into `seedKey` what the views of all time lack, the
   * views counted before `totalKey` was: `history`, plus the page views of
   * `dayKeys` (every day since the counter began) less those already in
   * `totalKey`. A view since then is in both, so that difference is the
   * same whenever it is taken; it is taken in one step all the same. False
   * when the seed was made before.
   */
  seedTotals(seedKey: string, totalKey: string, dayKeys: string[], history: Record<string, number>): Promise<boolean>
  /** Only the named fields of several days' hashes, in the order asked; a field a day lacks is left out. */
  readFields(dayKeys: string[], fields: string[]): Promise<Array<Record<string, unknown>>>
  /** How many distinct members the given sets hold together. */
  unionSize(keys: string[]): Promise<number>
  /** Take a one-time flag; false when it was already taken. */
  claim(key: string, ttl: number): Promise<boolean>
  /** Give a flag back, so that the next attempt may take it. */
  release(key: string): Promise<void>
  /** A real round trip, for the admin's health line. */
  ping(): Promise<void>
}

/* ── Redis ──────────────────────────────────────────────────────────────── */

// KEYS: day hash, the day's visitor set, this minute's set, the views of all time.
// ARGV: visitor, day TTL, visitor-set TTL, minute TTL, the page's field, then the fields.
const VIEW_SCRIPT = `
local added = redis.call('SADD', KEYS[2], ARGV[1])
if added == 1 then redis.call('HINCRBY', KEYS[1], 'visitors', 1) end
for i = 6, #ARGV do redis.call('HINCRBY', KEYS[1], ARGV[i], 1) end
redis.call('EXPIRE', KEYS[1], ARGV[2])
redis.call('EXPIRE', KEYS[2], ARGV[3])
redis.call('SADD', KEYS[3], ARGV[1])
redis.call('EXPIRE', KEYS[3], ARGV[4])
redis.call('HINCRBY', KEYS[4], ARGV[5], 1)
return added
`

// KEYS: the seed, the views of all time, then every day since the counter began.
// ARGV: the views before the counter, as field, count, field, count…
// Page fields are the ones that start "p:" (lib/stats/model, F.page).
const SEED_SCRIPT = `
if redis.call('HEXISTS', KEYS[1], '${SEED_READY}') == 1 then return 0 end
local sums = {}
for k = 3, #KEYS do
  local day = redis.call('HGETALL', KEYS[k])
  for i = 1, #day, 2 do
    if string.sub(day[i], 1, 2) == 'p:' then sums[day[i]] = (sums[day[i]] or 0) + tonumber(day[i + 1]) end
  end
end
local total = redis.call('HGETALL', KEYS[2])
for i = 1, #total, 2 do sums[total[i]] = (sums[total[i]] or 0) - tonumber(total[i + 1]) end
for i = 1, #ARGV, 2 do sums[ARGV[i]] = (sums[ARGV[i]] or 0) + tonumber(ARGV[i + 1]) end
for field, n in pairs(sums) do
  if n ~= 0 then redis.call('HSET', KEYS[1], field, string.format('%d', n)) end
end
redis.call('HSET', KEYS[1], '${SEED_READY}', '1')
return 1
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

/**
 * The fields asked of a hash, as Redis replied. HMGET answers with the
 * values alone, in the order of the fields asked and null for one that is
 * absent; with deserialization on, the client pairs them up itself.
 */
export function fieldsFromReply(fields: string[], reply: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (Array.isArray(reply)) {
    fields.forEach((field, i) => { if (reply[i] !== null && reply[i] !== undefined) out[field] = reply[i] })
  } else if (reply && typeof reply === 'object') {
    for (const field of fields) {
      const value = (reply as Record<string, unknown>)[field]
      if (value !== null && value !== undefined) out[field] = value
    }
  }
  return out
}

function redisBackend(redis: Redis): StatsBackend {
  const view = redis.createScript<number>(VIEW_SCRIPT)
  const increment = redis.createScript<number>(INCREMENT_SCRIPT)
  const beat = redis.createScript<number>(BEAT_SCRIPT)
  const seed = redis.createScript<number>(SEED_SCRIPT)
  return {
    name: 'redis',
    async view(keys, visitor, fields, ttl, pageField) {
      const added = await view.exec(
        [keys.day, keys.visitors, keys.online, keys.total],
        [visitor, String(ttl.day), String(ttl.visitors), String(ttl.online), pageField, ...fields],
      )
      return Number(added) === 1
    },
    async seedTotals(seedKey, totalKey, dayKeys, history) {
      const args = Object.entries(history).flatMap(([field, n]) => [field, String(Math.round(n))])
      return Number(await seed.exec([seedKey, totalKey, ...dayKeys], args)) === 1
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
      // A year is 365 hashes: read in pipelines of up to 92, side by side,
      // so that no single reply grows past what one request should carry.
      const chunks: string[][] = []
      for (let i = 0; i < dayKeys.length; i += 92) chunks.push(dayKeys.slice(i, i + 92))
      const replies = await Promise.all(chunks.map((keys) => {
        const p = redis.pipeline()
        for (const key of keys) p.hgetall(key)
        return p.exec<Array<unknown>>()
      }))
      return replies.flat().map(hashFromReply)
    },
    async readFields(dayKeys, fields) {
      if (dayKeys.length === 0) return []
      if (fields.length === 0) return dayKeys.map(() => ({}))
      const p = redis.pipeline()
      for (const key of dayKeys) p.hmget(key, ...fields)
      const rows = await p.exec<Array<unknown>>()
      return rows.map((row) => fieldsFromReply(fields, row))
    },
    async unionSize(keys) {
      if (keys.length === 0) return 0
      const [first, ...rest] = keys
      return (await redis.sunion(first, ...rest)).length
    },
    async claim(key, ttl) {
      return (await redis.set(key, '1', { nx: true, ex: ttl })) === 'OK'
    },
    async release(key) {
      await redis.del(key)
    },
    async ping() {
      await redis.ping()
    },
  }
}

/* ── Local files (development and tests only) ───────────────────────────── */

// The folder is looked up at each call, not once: test files that share a
// process each set their own (STATS_DEV_DIR) and must not see each other's.
function fileBackend(folder: () => string): StatsBackend {
  const file = (key: string) => path.join(folder(), `${key.replace(/[^a-zA-Z0-9_-]+/g, '_')}.json`)
  const read = async <T>(key: string, fallback: T): Promise<T> => {
    try { return JSON.parse(await fs.readFile(file(key), 'utf8')) as T } catch { return fallback }
  }
  const write = async (key: string, value: unknown) => {
    await fs.mkdir(folder(), { recursive: true })
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
    async view(keys, visitor, fields, _ttl, pageField) {
      const added = await addTo(keys.visitors, visitor)
      await bump(keys.day, added ? ['visitors', ...fields] : fields)
      await addTo(keys.online, visitor)
      await bump(keys.total, [pageField])
      return added
    },
    async seedTotals(seedKey, totalKey, dayKeys, history) {
      const made = await read<Record<string, unknown>>(seedKey, {})
      if (made[SEED_READY]) return false
      const sums: Record<string, number> = {}
      const add = (field: string, n: number) => { sums[field] = (sums[field] ?? 0) + n }
      for (const key of dayKeys) {
        for (const [field, n] of Object.entries(await read<Record<string, number>>(key, {}))) {
          if (field.startsWith('p:')) add(field, Number(n) || 0)
        }
      }
      for (const [field, n] of Object.entries(await read<Record<string, number>>(totalKey, {}))) add(field, -(Number(n) || 0))
      for (const [field, n] of Object.entries(history)) add(field, Math.round(n))
      const out: Record<string, number | string> = {}
      for (const [field, n] of Object.entries(sums)) if (n !== 0) out[field] = n
      out[SEED_READY] = '1'
      await write(seedKey, out)
      return true
    },
    async beat(onlineKey, visitor) { await addTo(onlineKey, visitor) },
    async increment(dayKey, fields) { await bump(dayKey, fields) },
    async readDays(dayKeys) { return Promise.all(dayKeys.map((k) => read<Record<string, unknown>>(k, {}))) },
    async readFields(dayKeys, fields) {
      const days = await Promise.all(dayKeys.map((k) => read<Record<string, unknown>>(k, {})))
      return days.map((day) => fieldsFromReply(fields, day))
    },
    async unionSize(keys) {
      const sets = await Promise.all(keys.map((k) => read<string[]>(k, [])))
      return new Set(sets.flat()).size
    },
    async claim(key) {
      // Created only if absent, in one step, as SET NX is: of two callers at
      // once exactly one gets it.
      await fs.mkdir(folder(), { recursive: true })
      try {
        await (await fs.open(file(key), 'wx')).close()
        return true
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false
        throw err
      }
    },
    async release(key) { await fs.rm(file(key), { force: true }) },
    async ping() { await fs.mkdir(folder(), { recursive: true }) },
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
    chosen = fileBackend(() => process.env.STATS_DEV_DIR || path.join(process.cwd(), 'data', 'stats-dev'))
  }
  return chosen
}
