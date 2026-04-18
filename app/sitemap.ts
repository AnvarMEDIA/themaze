import { MetadataRoute } from 'next'
import { getAllProjects } from '@/lib/portfolio'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getAllProjects()

  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    // English (default — no prefix)
    { url: SITE_URL,                  lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/portfolio`,   lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${SITE_URL}/services`,    lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/about`,       lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/contact`,     lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    // Russian locale
    { url: `${SITE_URL}/ru`,              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/ru/portfolio`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${SITE_URL}/ru/services`,     lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/ru/about`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/ru/contact`,      lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]

  const projectRoutes: MetadataRoute.Sitemap = projects.flatMap((project) => [
    {
      url:             `${SITE_URL}/portfolio/${project.slug}`,
      lastModified:    new Date(project.updatedAt),
      changeFrequency: 'monthly' as const,
      priority:        0.7,
    },
    {
      url:             `${SITE_URL}/ru/portfolio/${project.slug}`,
      lastModified:    new Date(project.updatedAt),
      changeFrequency: 'monthly' as const,
      priority:        0.7,
    },
  ])

  return [...staticRoutes, ...projectRoutes]
}
