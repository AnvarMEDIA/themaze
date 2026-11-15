import { readStore, updateStore } from './store'
import { SERVICE_SLUGS, type ServiceSlug } from './services'
import en from '@/messages/en.json'
import ru from '@/messages/ru.json'

/**
 * Each service page's cover: a wide picture for desktop, a 4:3 one for
 * phones, and the alt text both share (one <img> shows them).
 *
 * Kept under the store key "service-covers" (lib/store: a JSON document in
 * Vercel Blob, data/service-covers.json locally), beside the projects and
 * the team. The services themselves are not stored: their list is
 * lib/services.ts and their words the message files. A service with no
 * entry simply has no cover, so nothing needs migrating.
 */

export interface ServiceCoverAlt { ru: string; en: string }

export interface ServiceCover {
  /** The desktop picture, WebP, up to 2560 px wide. Without it there is no cover at all. */
  coverDesktop: string | null
  /** The phone picture, WebP, up to 1080 px wide; phones get the desktop one when it is missing. */
  coverMobile: string | null
  /** 1200×630 JPEG cut from the desktop picture: the page's og:image. Made with it, removed with it. */
  coverOg: string | null
  /** Empty means the default, «<service> — MAZE Studio». */
  coverAlt: ServiceCoverAlt
  /** ISO time of the last save. */
  coverUpdatedAt: string | null
}

const KEY = 'service-covers'
type Stored = { covers?: Record<string, Partial<ServiceCover> | undefined> }

export const EMPTY_COVER: ServiceCover = {
  coverDesktop: null, coverMobile: null, coverOg: null, coverAlt: { ru: '', en: '' }, coverUpdatedAt: null,
}

const url = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const text = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 300) : '')

function normalize(raw?: Partial<ServiceCover>): ServiceCover {
  return {
    coverDesktop:   url(raw?.coverDesktop),
    coverMobile:    url(raw?.coverMobile),
    coverOg:        url(raw?.coverOg),
    coverAlt:       { ru: text(raw?.coverAlt?.ru), en: text(raw?.coverAlt?.en) },
    coverUpdatedAt: typeof raw?.coverUpdatedAt === 'string' ? raw.coverUpdatedAt : null,
  }
}

/** Every service's cover, empty ones included. A store that cannot be read gives no covers, not an error. */
export async function getServiceCovers(): Promise<Record<ServiceSlug, ServiceCover>> {
  const data = await readStore<Stored>(KEY, { covers: {} })
  return Object.fromEntries(SERVICE_SLUGS.map((slug) => [slug, normalize(data.covers?.[slug])])) as Record<ServiceSlug, ServiceCover>
}

export async function getServiceCover(slug: ServiceSlug): Promise<ServiceCover> {
  return (await getServiceCovers())[slug]
}

/** Write one service's cover; what it was before comes back with what is saved. */
export async function saveServiceCover(
  slug: ServiceSlug,
  cover: Omit<ServiceCover, 'coverUpdatedAt'>,
  now: Date = new Date(),
): Promise<{ previous: ServiceCover; saved: ServiceCover }> {
  let previous = EMPTY_COVER
  const saved = normalize({ ...cover, coverUpdatedAt: now.toISOString() })
  await updateStore<Stored>(KEY, { covers: {} }, (data) => {
    previous = normalize(data.covers?.[slug])
    return { ...data, covers: { ...(data.covers ?? {}), [slug]: saved } }
  })
  return { previous, saved }
}

type Cluster = Record<string, { title?: string }>
const clusters = {
  en: (en as { servicesPage: { cluster: Cluster } }).servicesPage.cluster,
  ru: (ru as { servicesPage: { cluster: Cluster } }).servicesPage.cluster,
}

/** A service's name in each language, as its page heads it. */
export function serviceTitles(slug: ServiceSlug): ServiceCoverAlt {
  return { ru: clusters.ru[slug]?.title ?? slug, en: clusters.en[slug]?.title ?? slug }
}

/** The alt text a cover has when none is written: «<service> — MAZE Studio». */
export function defaultCoverAlt(slug: ServiceSlug, locale: string): string {
  const titles = serviceTitles(slug)
  return `${locale === 'ru' ? titles.ru : titles.en} — MAZE Studio`
}

/** The alt text the page uses: the one written, else the default. */
export function coverAltFor(slug: ServiceSlug, cover: ServiceCover, locale: string): string {
  const written = locale === 'ru' ? cover.coverAlt.ru : cover.coverAlt.en
  return written || defaultCoverAlt(slug, locale)
}
