import crypto from 'node:crypto'

/**
 * IndexNow notifications — single POST tells Bing, Yandex, Seznam,
 * Naver and Yep about a URL change. Google does not participate
 * (they require Search Console / sitemap ping).
 *
 * Endpoint:  https://api.indexnow.org/IndexNow
 * Protocol:  https://www.indexnow.org/documentation
 *
 * Setup:
 *   - Set INDEXNOW_KEY (32 alphanum chars). Without it we derive a
 *     stable fallback from JWT_SECRET so dev environments still
 *     "work", but you SHOULD set a real one in production.
 *   - The key file is exposed at /api/indexnow-key (plain text body
 *     is the key itself), which is what IndexNow checks to verify
 *     site ownership.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

function deriveFallbackKey(): string {
  // The IndexNow key is PUBLIC — it is served verbatim at
  // /api/indexnow-key for verification. It must therefore NEVER be
  // derived from a secret: hashing JWT_SECRET here would publish a
  // brute-forceable function of the signing key. Use a dedicated,
  // non-secret seed (override with INDEXNOW_SEED if desired).
  const seed = process.env.INDEXNOW_SEED ?? 'maze-indexnow-public-key-v1'
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)
}

/** Configured IndexNow key (or deterministic fallback). */
export function getIndexNowKey(): string {
  const env = process.env.INDEXNOW_KEY?.trim()
  if (env && /^[A-Za-z0-9]{8,128}$/.test(env)) return env
  return deriveFallbackKey()
}

/** Public URL of the key file the verifier fetches. */
export function getKeyLocation(): string {
  return `${SITE_URL.replace(/\/+$/, '')}/api/indexnow-key`
}

/**
 * Submit URLs to IndexNow. Returns the HTTP status from IndexNow
 * (200 / 202 are success, 422 means a URL didn't match `host`).
 * Always resolves — failures are logged, not thrown, so a publish
 * mutation never breaks because the search-engine ping is down.
 */
export async function notifyIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number; submitted: number }> {
  const clean = Array.from(new Set(urls.filter((u): u is string => typeof u === 'string' && u.startsWith('https://'))))
  if (clean.length === 0) return { ok: true, submitted: 0 }
  if (!SITE_URL.startsWith('https://')) return { ok: true, submitted: 0 }

  const host = new URL(SITE_URL).host
  const key  = getIndexNowKey()
  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: getKeyLocation(),
        urlList: clean,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn('[indexnow]', res.status, body)
    }
    return { ok: res.ok, status: res.status, submitted: clean.length }
  } catch (err) {
    console.warn('[indexnow] fetch failed', err)
    return { ok: false, submitted: clean.length }
  }
}

/** Convenience: localised pair of EN + RU URLs for a public path. */
export function localePair(path: string): string[] {
  const clean = path.replace(/^\/+/, '')
  const base  = SITE_URL.replace(/\/+$/, '')
  return [`${base}/${clean}`, `${base}/ru/${clean}`]
}
