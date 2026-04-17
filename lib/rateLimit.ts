/**
 * Simple in-memory rate limiter.
 * Works per serverless instance — good enough for a single-admin panel.
 * For multi-region production, replace with Vercel KV or Upstash Redis.
 */

interface Window {
  count:     number
  resetAt:   number
}

const store = new Map<string, Window>()

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

export function rateLimit(key: string, opts: Options): RateLimitResult {
  const now = Date.now()

  let win = store.get(key)

  if (!win || now > win.resetAt) {
    win = { count: 0, resetAt: now + opts.windowMs }
    store.set(key, win)
  }

  win.count += 1
  const remaining = Math.max(0, opts.limit - win.count)

  return {
    success:  win.count <= opts.limit,
    remaining,
    resetAt:  win.resetAt,
  }
}

/** Clean up expired windows every 10 minutes to prevent memory leak */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, win] of store.entries()) {
      if (now > win.resetAt) store.delete(key)
    }
  }, 10 * 60 * 1000)
}
