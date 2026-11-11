/**
 * Where a visit came from, as the browser can tell it: the landing link's
 * utm tags and which ad platform's click marker it carried.
 *
 * Shared by the tracker in the browser (components/PageviewTracker), which
 * reads it off the landing URL, and the server, which trusts none of it until
 * sanitizeMarketing has been through it. No React and no Node APIs here.
 *
 * The click id's VALUE never leaves the browser, only which platform's id it
 * was: the id identifies one click, and the type is all the classification
 * needs.
 */

/** utm_<name> query parameters that are kept, in the order they are shown. */
export const UTM_FIELDS = ['source', 'medium', 'campaign', 'content', 'term'] as const
export type UtmField = (typeof UTM_FIELDS)[number]

/**
 * Ad platforms' click markers, the first found wins. Google has three ids
 * (gbraid and wbraid stand in for gclid on iOS) and a marker, gad_source,
 * that it adds beside them; it outlives the id when a browser strips that
 * (Safari does in private windows), so it comes last, as proof of an ad.
 */
export const CLICK_ID_PARAMS: Record<string, string> = {
  gclid:      'Google Ads',
  gbraid:     'Google Ads',
  wbraid:     'Google Ads',
  yclid:      'Яндекс.Директ',
  fbclid:     'Meta',
  ttclid:     'TikTok',
  msclkid:    'Microsoft Ads',
  twclid:     'X (Twitter)',
  gad_source: 'Google Ads',
}

export interface Marketing {
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
  /** Which platform's click marker the landing URL carried (gclid, yclid…), never the id. */
  clickType?: string
  /** The other site the visit came from, kept for the whole visit. */
  referrer?: string
}

const known = (type: string | undefined): type is string =>
  !!type && Object.prototype.hasOwnProperty.call(CLICK_ID_PARAMS, type)

/**
 * Whether the click marker proves a paid click. All do except fbclid: Meta
 * adds it to every outbound link, an ad and a link in a profile alike.
 */
export function isPaidClick(m: Marketing | null | undefined): boolean {
  return known(m?.clickType) && m?.clickType !== 'fbclid'
}

const MAX_LEN = 200

/** A string, trimmed, bounded, without control characters (it can reach a Telegram message). */
function clean(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, MAX_LEN)
}

/** Whitelist and bound what the browser posted; undefined when nothing useful is left. */
export function sanitizeMarketing(input: unknown): Marketing | undefined {
  if (!input || typeof input !== 'object') return undefined
  const src = input as Record<string, unknown>
  const out: Marketing = {}
  for (const field of UTM_FIELDS) {
    const v = clean(src[field])
    if (v) out[field] = v
  }
  const type = clean(src.clickType)
  if (known(type)) out.clickType = type
  const referrer = clean(src.referrer)
  if (referrer) out.referrer = referrer
  return Object.keys(out).length ? out : undefined
}

/** The campaign a landing URL's query carries, or null when it carries none. */
export function marketingFromQuery(search: string): Marketing | null {
  let params: URLSearchParams
  try { params = new URLSearchParams(search) } catch { return null }
  const out: Marketing = {}
  for (const field of UTM_FIELDS) {
    const v = params.get(`utm_${field}`)?.trim()
    if (v) out[field] = v.slice(0, MAX_LEN)
  }
  for (const param of Object.keys(CLICK_ID_PARAMS)) {
    if (params.get(param)) { out.clickType = param; break }
  }
  return Object.keys(out).length ? out : null
}
