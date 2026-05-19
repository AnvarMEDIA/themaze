import { MetadataRoute } from 'next'
import {
  getPublishedProjects,
  getClientSlugs,
  getTagSlugs,
} from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { localeHref } from '@/lib/seo'
import { VALID_CATEGORIES, slugify } from '@/lib/utils'

type Entry = MetadataRoute.Sitemap[number]

/**
 * Static-page anchor date. Pages whose content rarely changes
 * (services, about, contact, legal) report this instead of `now()`
 * so crawlers stop treating them as constantly updated — Google
 * downweights last-mod hints that are obviously wrong.
 */
const SITE_LAUNCH = new Date('2024-01-01T00:00:00Z')

/* ── helpers ─────────────────────────────────────────────────────────── */

function localized(
  path:            string,
  lastModified:    Date,
  changeFrequency: Entry['changeFrequency'],
  priority:        number,
  images?:         string[],
): Entry[] {
  const languages = {
    'x-default': localeHref('en', path),
    en: localeHref('en', path),
    ru: localeHref('ru', path),
  }
  return (['en', 'ru'] as const).map((locale) => ({
    url: localeHref(locale, path),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
    ...(images?.length ? { images: images.filter(Boolean) } : {}),
  }))
}

function maxDate(values: Array<Date | string | undefined | null>): Date | undefined {
  let best = -Infinity
  for (const v of values) {
    if (!v) continue
    const ms = new Date(v).getTime()
    if (Number.isFinite(ms) && ms > best) best = ms
  }
  return best === -Infinity ? undefined : new Date(best)
}

/* ── main ────────────────────────────────────────────────────────────── */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts, clients, tags] = await Promise.all([
    getPublishedProjects(),
    getPublishedPosts(),
    getClientSlugs(),
    getTagSlugs(2),
  ])

  const freshestProject = maxDate(projects.map((p) => p.updatedAt)) ?? SITE_LAUNCH
  const freshestPost    = maxDate(posts.map((p) => p.updatedAt))    ?? SITE_LAUNCH
  const siteFreshness   = maxDate([freshestProject, freshestPost])  ?? SITE_LAUNCH

  // Per-category freshest update
  const usedCategories = new Set<string>(projects.flatMap((p) => p.categories))
  const lastByCategory = new Map<string, Date>()
  for (const p of projects) {
    const d = new Date(p.updatedAt)
    for (const c of p.categories) {
      const prev = lastByCategory.get(c)
      if (!prev || d > prev) lastByCategory.set(c, d)
    }
  }

  // Per-client freshest update
  const lastByClient = new Map<string, Date>()
  for (const p of projects) {
    const slug = slugify(p.client)
    if (!slug) continue
    const d = new Date(p.updatedAt)
    const prev = lastByClient.get(slug)
    if (!prev || d > prev) lastByClient.set(slug, d)
  }

  // Per-tag freshest update
  const lastByTag = new Map<string, Date>()
  for (const p of projects) {
    const d = new Date(p.updatedAt)
    for (const tag of p.tags ?? []) {
      const slug = slugify(tag)
      if (!slug) continue
      const prev = lastByTag.get(slug)
      if (!prev || d > prev) lastByTag.set(slug, d)
    }
  }

  const staticPages: MetadataRoute.Sitemap = [
    ...localized('',              siteFreshness,   'weekly',  1.0),
    ...localized('portfolio',     freshestProject, 'weekly',  0.9),
    ...localized('services',      SITE_LAUNCH,     'monthly', 0.8),
    ...localized('insights',      freshestPost,    'weekly',  0.8),
    ...localized('about',         SITE_LAUNCH,     'monthly', 0.7),
    ...localized('contact',       SITE_LAUNCH,     'yearly',  0.5),
    ...localized('legal/privacy', SITE_LAUNCH,     'yearly',  0.3),
    ...localized('legal/terms',   SITE_LAUNCH,     'yearly',  0.3),
    ...localized('legal/cookies', SITE_LAUNCH,     'yearly',  0.3),
  ]

  // Category landing pages — only emit ones that actually have at
  // least one project so we never ship 404s to crawlers.
  const categoryPages: MetadataRoute.Sitemap = VALID_CATEGORIES
    .filter((c) => usedCategories.has(c))
    .flatMap((c) => localized(
      `portfolio/category/${c}`,
      lastByCategory.get(c) ?? freshestProject,
      'weekly',
      0.8,
    ))

  const clientPages: MetadataRoute.Sitemap = clients.flatMap(({ slug }) => localized(
    `portfolio/client/${slug}`,
    lastByClient.get(slug) ?? freshestProject,
    'monthly',
    0.5,
  ))

  // Tag landing pages (only tags used by ≥2 projects so we don't
  // ship near-duplicate single-item pages).
  const tagPages: MetadataRoute.Sitemap = tags.flatMap(({ slug }) => localized(
    `portfolio/tag/${slug}`,
    lastByTag.get(slug) ?? freshestProject,
    'monthly',
    0.4,
  ))

  // Project pages — include cover + gallery as image-sitemap entries
  // so Google Image Search has a direct signal.
  // Featured projects float to the top of the homepage and get a
  // slightly higher priority.
  const projectPages: MetadataRoute.Sitemap = projects.flatMap((p) => localized(
    `portfolio/${p.slug}`,
    new Date(p.updatedAt),
    'monthly',
    p.featured ? 0.8 : 0.7,
    [p.coverImage, ...(p.images ?? [])].filter(Boolean),
  ))

  const postPages: MetadataRoute.Sitemap = posts.flatMap((p) => localized(
    `insights/${p.slug}`,
    new Date(p.updatedAt),
    'monthly',
    0.6,
    p.coverImage ? [p.coverImage] : undefined,
  ))

  return [
    ...staticPages,
    ...categoryPages,
    ...clientPages,
    ...tagPages,
    ...projectPages,
    ...postPages,
  ]
}
