import { MetadataRoute } from 'next'
import {
  getPublishedProjects,
  getClientSlugs,
  getTagSlugs,
} from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { SITE_URL, localeHref } from '@/lib/seo'
import { VALID_CATEGORIES } from '@/lib/utils'

type Entry = MetadataRoute.Sitemap[number]

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
    url:   localeHref(locale, path),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
    ...(images && images.length ? { images: images.filter(Boolean) } : {}),
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts, clients, tags] = await Promise.all([
    getPublishedProjects(),
    getPublishedPosts(),
    getClientSlugs(),
    getTagSlugs(2),
  ])
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    ...localized('',          now, 'weekly',  1.0),
    ...localized('portfolio', now, 'weekly',  0.9),
    ...localized('services',  now, 'monthly', 0.8),
    ...localized('insights',  now, 'weekly',  0.8),
    ...localized('about',     now, 'monthly', 0.8),
    ...localized('contact',   now, 'monthly', 0.7),
    ...localized('legal/privacy', now, 'yearly', 0.3),
    ...localized('legal/terms',   now, 'yearly', 0.3),
    ...localized('legal/cookies', now, 'yearly', 0.3),
  ]

  // Category landing pages — only emit those that actually have at
  // least one project so we don't ship empty pages to Google.
  const usedCategories = new Set<string>(projects.flatMap((p) => p.categories))
  const categoryRoutes: MetadataRoute.Sitemap = VALID_CATEGORIES
    .filter((c) => usedCategories.has(c))
    .flatMap((c) => localized(`portfolio/category/${c}`, now, 'weekly', 0.7))

  const clientRoutes: MetadataRoute.Sitemap = clients.flatMap(({ slug }) =>
    localized(`portfolio/client/${slug}`, now, 'monthly', 0.6),
  )

  const tagRoutes: MetadataRoute.Sitemap = tags.flatMap(({ slug }) =>
    localized(`portfolio/tag/${slug}`, now, 'monthly', 0.5),
  )

  // Project pages — include cover + gallery as image-sitemap entries
  // so Google Image Search has a direct signal.
  const projectRoutes: MetadataRoute.Sitemap = projects.flatMap((p) =>
    localized(
      `portfolio/${p.slug}`,
      new Date(p.updatedAt),
      'monthly',
      0.7,
      [p.coverImage, ...(p.images ?? [])].filter(Boolean),
    ),
  )

  const postRoutes: MetadataRoute.Sitemap = posts.flatMap((p) =>
    localized(
      `insights/${p.slug}`,
      new Date(p.updatedAt),
      'monthly',
      0.7,
      p.coverImage ? [p.coverImage] : undefined,
    ),
  )

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...clientRoutes,
    ...tagRoutes,
    ...projectRoutes,
    ...postRoutes,
  ]
}
