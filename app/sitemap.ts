import { MetadataRoute } from 'next'
import { getPublishedProjects } from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { SITE_URL, localeHref } from '@/lib/seo'

type Entry = MetadataRoute.Sitemap[number]

function localized(
  path: string,
  lastModified: Date,
  changeFrequency: Entry['changeFrequency'],
  priority: number,
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
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts] = await Promise.all([getPublishedProjects(), getPublishedPosts()])
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

  const projectRoutes: MetadataRoute.Sitemap = projects.flatMap((p) =>
    localized(`portfolio/${p.slug}`, new Date(p.updatedAt), 'monthly', 0.7),
  )
  const postRoutes: MetadataRoute.Sitemap = posts.flatMap((p) =>
    localized(`insights/${p.slug}`, new Date(p.updatedAt), 'monthly', 0.7),
  )

  return SITE_URL
    ? [...staticRoutes, ...projectRoutes, ...postRoutes]
    : [...staticRoutes, ...projectRoutes, ...postRoutes]
}
