import { readStoreStrict } from '../store'
import { F, normalizePagePath } from './model'

/**
 * The page views counted before 12 November 2026, by page field: then the
 * counter was one JSON file in Vercel Blob (store key "analytics"), views
 * per page per day. It kept the last 90 days and lost views when many came
 * at once (11 November most of all), so this is what it recorded, not all
 * there was. Read once, when the views of all time are first put together
 * (lib/stats/store, readPageViews).
 *
 * Throws when the store cannot be read: a history taken as empty would go
 * into the totals for good.
 */
export async function viewsBeforeRedis(): Promise<Record<string, number>> {
  const old = await readStoreStrict<{ daily?: Record<string, Record<string, number>> }>('analytics', { daily: {} })
  const out: Record<string, number> = {}
  for (const [raw, byDate] of Object.entries(old.daily ?? {})) {
    const page = normalizePagePath(raw)
    if (!page) continue
    const views = Object.values(byDate ?? {}).reduce((sum, n) => sum + (Number(n) || 0), 0)
    if (views > 0) out[F.page(page)] = (out[F.page(page)] ?? 0) + views
  }
  return out
}
