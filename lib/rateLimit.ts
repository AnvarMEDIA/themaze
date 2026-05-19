/**
 * Rate limiter with two backends:
 *
 * 1. Upstash Redis sliding-window — used when UPSTASH_REDIS_REST_URL
 *    and UPSTASH_REDIS_REST_TOKEN are set. Works correctly across
 *    multiple serverless instances (Vercel fluid compute / edge / fn).
 *
 * 2. In-memory fallback — per-instance Map; good enough for a single
 *    instance or local dev. On Vercel, concurrent instances will each
 *    hold their own counter, so effective limit = limit × N.
 */

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

interface Window {
  count:   number
  resetAt: number
}
const memStore = new Map<string, Window>()

interface Options {
  /** Max requests in the window */
  limit:    number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  success:   boolean
  remaining: number
  resetAt:   number
}

/* ── Upstash (optional) ──────────────────────────────────────────────── */

const upstashUrl   = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = upstashUrl && upstashToken
  ? new Redis({ url: upstashUrl, token: upstashToken })
  : null

/** Cache Ratelimit instances keyed by `${limit}:${windowMs}`. */
const limiterCache = new Map<string, Ratelimit>()

function getLimiter(opts: Options): Ratelimit | null {
  if (!redis) return null
  const cacheKey = `${opts.limit}:${opts.windowMs}`
  let limiter = limiterCache.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(opts.limit, `${opts.windowMs} ms`),
      prefix:  'maze-rl',
      analytics: false,
    })
    limiterCache.set(cacheKey, limiter)
  }
  return limiter
}

/* ── Public API ──────────────────────────────────────────────────────── */

export async function rateLimitAsync(
  key: string,
  opts: Options,
): Promise<RateLimitResult> {
  const limiter = getLimiter(opts)
  if (limiter) {
    try {
      const res = await limiter.limit(key)
      return {
        success:   res.success,
        remaining: res.remaining,
        resetAt:   res.reset,
      }
    } catch (err) {
      console.warn('[rateLimit] Upstash error, falling back to memory', err)
    }
  }
  return rateLimit(key, opts)
}

/**
 * Synchronous in-memory limiter. Kept for callers that cannot await
 * (e.g. existing code paths). Prefer rateLimitAsync for new work.
 */
export function rateLimit(key: string, opts: Options): RateLimitResult {
  const now = Date.now()
  let win = memStore.get(key)
  if (!win || now > win.resetAt) {
    win = { count: 0, resetAt: now + opts.windowMs }
    memStore.set(key, win)
  }
  win.count += 1
  const remaining = Math.max(0, opts.limit - win.count)
  return {
    success:  win.count <= opts.limit,
    remaining,
    resetAt:  win.resetAt,
  }
}

/** Clean up expired windows every 10 minutes to prevent memory leak. */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, win] of memStore.entries()) {
      if (now > win.resetAt) memStore.delete(key)
    }
  }, 10 * 60 * 1000)
}
