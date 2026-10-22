import {
  getPublishedProjects,
  getClientSlugs,
  getTagSlugs,
} from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { INSIGHTS_ENABLED } from '@/lib/features'
import { SITE_URL, localeHref } from '@/lib/seo'
import { VALID_CATEGORIES, slugify } from '@/lib/utils'

/**
 * The sitemap, written out here rather than returned from app/sitemap.ts.
 * Next 14 serialises a sitemap entry's url, alternates, lastmod, changefreq
 * and priority, and nothing else: the `images` that file passed for project
 * covers, galleries and post covers were dropped without a word, so the
 * image entries it was written to produce never reached the XML.
 */

// The stores are read live everywhere else in the app; a project published
// from the admin is listed on the next request.
export const dynamic = 'force-dynamic'

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

interface Entry {
  url:             string
  lastModified:    Date
  changeFrequency: ChangeFrequency
  priority:        number
  languages:       Record<string, string>
  images:          string[]
}

/**
 * Static-page anchor date. Pages whose content rarely changes
 * (services, about, contact, legal) report this instead of `now()`
 * so crawlers stop treating them as constantly updated — Google
 * downweights last-mod hints that are obviously wrong.
 */
const SITE_LAUNCH = new Date('2024-01-01T00:00:00Z')

/* ── helpers ─────────────────────────────────────────────────────────── */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Uploads from before the Blob store are site-relative paths; an image
// sitemap only accepts absolute URLs.
function absoluteUrl(src: string): string {
  return /^https?:\/\//.test(src) ? src : `${SITE_URL}/${src.replace(/^\/+/, '')}`
}

function localized(
  path:            string,
  lastModified:    Date,
  changeFrequency: ChangeFrequency,
  priority:        number,
  images:          Array<string | undefined> = [],
): Entry[] {
  const languages = {
    'x-default': localeHref('en', path),
    en: localeHref('en', path),
    ru: localeHref('ru', path),
  }
  // A cover is often repeated as the first gallery image.
  const imageUrls = Array.from(new Set(
    images.filter((src): src is string => Boolean(src)).map(absoluteUrl),
  ))
  return (['en', 'ru'] as const).map((locale) => ({
    url: localeHref(locale, path),
    lastModified,
    changeFrequency,
    priority,
    languages,
    images: imageUrls,
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

function toXml(entries: Entry[]): string {
  const urls = entries.map((e) => [
    '<url>',
    `<loc>${escapeXml(e.url)}</loc>`,
    ...Object.entries(e.languages).map(([lang, href]) =>
      `<xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(href)}" />`),
    // An unparseable date would throw and take the whole sitemap down with
    // it; the element is optional, so a bad one is simply left out.
    ...(Number.isFinite(e.lastModified.getTime()) ? [`<lastmod>${e.lastModified.toISOString()}</lastmod>`] : []),
    `<changefreq>${e.changeFrequency}</changefreq>`,
    `<priority>${e.priority}</priority>`,
    ...e.images.map((src) => `<image:image><image:loc>${escapeXml(src)}</image:loc></image:image>`),
    '</url>',
  ].join('\n'))

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}

/* ── main ────────────────────────────────────────────────────────────── */

export async function GET() {
  const [projects, posts, clients, tags] = await Promise.all([
    getPublishedProjects(),
    INSIGHTS_ENABLED ? getPublishedPosts() : Promise.resolve([]),
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

  const staticPages: Entry[] = [
    ...localized('',              siteFreshness,   'weekly',  1.0),
    ...localized('portfolio',     freshestProject, 'weekly',  0.9),
    ...localized('services',      SITE_LAUNCH,     'monthly', 0.8),
    // The journal is submitted only once it has something in it. An empty
    // listing offered at priority 0.8 asks a crawler to spend its budget on a
    // heading and a "nothing yet" line; the page itself carries a matching
    // noindex while it is empty, and both lift the moment a post publishes.
    ...(posts.length ? localized('insights', freshestPost, 'weekly', 0.8) : []),
    ...localized('about',         SITE_LAUNCH,     'monthly', 0.7),
    ...localized('contact',       SITE_LAUNCH,     'yearly',  0.5),
    // Indexable, and the page every "Fill in the brief" button leads to, but
    // it had been left out.
    ...localized('brief',         SITE_LAUNCH,     'yearly',  0.5),
    ...localized('legal/privacy', SITE_LAUNCH,     'yearly',  0.3),
    ...localized('legal/terms',   SITE_LAUNCH,     'yearly',  0.3),
    ...localized('legal/cookies', SITE_LAUNCH,     'yearly',  0.3),
  ]

  // Service cluster landing pages — 9 indexable URLs targeting each
  // service vertical's commercial keyword. Updated each time a project
  // in the matching category is published, since the "Selected work"
  // block is pulled live from the portfolio.
  const servicePages: Entry[] = VALID_CATEGORIES.flatMap((slug) => localized(
    `services/${slug}`,
    lastByCategory.get(slug) ?? SITE_LAUNCH,
    'monthly',
    0.8,
  ))

  // Category landing pages — only emit ones that actually have at
  // least one project so we never ship 404s to crawlers.
  const categoryPages: Entry[] = VALID_CATEGORIES
    .filter((c) => usedCategories.has(c))
    .flatMap((c) => localized(
      `portfolio/category/${c}`,
      lastByCategory.get(c) ?? freshestProject,
      'weekly',
      0.8,
    ))

  const clientPages: Entry[] = clients.flatMap(({ slug }) => localized(
    `portfolio/client/${slug}`,
    lastByClient.get(slug) ?? freshestProject,
    'monthly',
    0.5,
  ))

  // Tag landing pages (only tags used by ≥2 projects so we don't
  // ship near-duplicate single-item pages).
  const tagPages: Entry[] = tags.flatMap(({ slug }) => localized(
    `portfolio/tag/${slug}`,
    lastByTag.get(slug) ?? freshestProject,
    'monthly',
    0.4,
  ))

  // Project pages — include cover + gallery as image-sitemap entries
  // so Google Image Search has a direct signal.
  // Featured projects float to the top of the homepage and get a
  // slightly higher priority.
  const projectPages: Entry[] = projects.flatMap((p) => localized(
    `portfolio/${p.slug}`,
    new Date(p.updatedAt),
    'monthly',
    p.featured ? 0.8 : 0.7,
    [p.coverImage, ...(p.images ?? [])],
  ))

  const postPages: Entry[] = posts.flatMap((p) => localized(
    `insights/${p.slug}`,
    new Date(p.updatedAt),
    'monthly',
    0.6,
    [p.coverImage],
  ))

  const xml = toXml([
    ...staticPages,
    ...servicePages,
    ...categoryPages,
    ...clientPages,
    ...tagPages,
    ...projectPages,
    ...postPages,
  ])

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
