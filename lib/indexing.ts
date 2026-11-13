import crypto from 'node:crypto'
import { INSIGHTS_ENABLED } from './features'

/**
 * IndexNow notifications — single POST tells Bing, Yandex, Seznam,
 * Naver and Yep about a URL change. Google does not participate
 * (they require Search Console / sitemap ping).
 *
 * Endpoint:  https://api.indexnow.org/IndexNow
 * Protocol:  https://www.indexnow.org/documentation
 *
 * THE KEY FILE IS AT THE SITE'S ROOT: https://www.maze.uz/<key>.txt, the
 * key itself its only content (next.config.js sends that name to
 * app/api/indexnow-key/[file]). Where the file lives decides which
 * addresses the key vouches for: a key file in a folder covers only the
 * addresses under that folder. It used to be served at /api/indexnow-key,
 * which covered nothing but /api/ (a folder robots.txt closes besides),
 * and IndexNow refused every page of the site with a 422, "One or more
 * URLs are not related to your site verified through the keylocation
 * parameter": the pings on publish and the admin button alike.
 *
 * Setup:
 *   - Set INDEXNOW_KEY (8–128 letters and digits). Without it a stable
 *     fallback is derived from a public seed, so dev environments still
 *     "work"; set a real one in production.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

function deriveFallbackKey(): string {
  // The IndexNow key is PUBLIC — it is served verbatim from the key file
  // for verification. It must therefore NEVER be derived from a secret:
  // hashing JWT_SECRET here would publish a brute-forceable function of
  // the signing key. Use a dedicated, non-secret seed (override with
  // INDEXNOW_SEED if desired).
  const seed = process.env.INDEXNOW_SEED ?? 'maze-indexnow-public-key-v1'
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)
}

/** Configured IndexNow key (or deterministic fallback). */
export function getIndexNowKey(): string {
  const env = process.env.INDEXNOW_KEY?.trim()
  if (env && /^[A-Za-z0-9]{8,128}$/.test(env)) return env
  return deriveFallbackKey()
}

/** The key file's name at the site's root: the key, then `.txt`. */
export function keyFileName(): string {
  return `${getIndexNowKey()}.txt`
}

/** Public URL of the key file the verifier fetches: at the root, so it covers every page. */
export function getKeyLocation(): string {
  return `${SITE_URL.replace(/\/+$/, '')}/${keyFileName()}`
}

export interface IndexNowResult {
  ok: boolean
  /** IndexNow's answer: 200 / 202 are success (lib/indexNowStatus.ts says what the others mean). */
  status?: number
  submitted: number
}

/**
 * The addresses as IndexNow will check them: this site's only, since one
 * address of another host gets the whole list refused, and each in its
 * normal form, so the home page is https://www.maze.uz/ with its slash,
 * inside the key file's folder rather than a character short of it.
 */
function inScope(urls: string[], host: string): string[] {
  const clean = urls.flatMap((u) => {
    try {
      const url = new URL(u)
      return url.protocol === 'https:' && url.host === host ? [url.href] : []
    } catch {
      return []
    }
  })
  return Array.from(new Set(clean))
    // While the journal is switched off (lib/features.ts) its pages answer
    // 404; announcing them would only get them dropped from the index.
    .filter((u) => INSIGHTS_ENABLED || !/\/insights(\/|$)/.test(new URL(u).pathname))
}

/**
 * Submit URLs to IndexNow. Returns the HTTP status from IndexNow.
 * Always resolves — failures are logged, not thrown, so a publish
 * mutation never breaks because the search-engine ping is down.
 */
export async function notifyIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (!SITE_URL.startsWith('https://')) return { ok: true, submitted: 0 }
  const host = new URL(SITE_URL).host
  const clean = inScope(urls, host)
  if (clean.length === 0) return { ok: true, submitted: 0 }

  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: getIndexNowKey(),
        keyLocation: getKeyLocation(),
        urlList: clean,
      }),
    })
    if (res.ok) {
      console.info('[indexnow]', res.status, `${clean.length} URLs`)
    } else {
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
