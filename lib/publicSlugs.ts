import { INSIGHTS_ENABLED } from './features'
import { getPublishedProjects } from './portfolio'
import { getPublishedPosts } from './posts'
import type { StoreKind } from './publicRoutes'
import { slugify } from './utils'

/**
 * Every slug the store vouches for, by the kind of page it opens.
 *
 * The middleware asks for this (through /api/public-slugs, since it cannot
 * read the store where it runs) to tell a project, client or tag that is
 * not there from one that is, before the page is rendered. Each list is the
 * page's own test turned into a list:
 *
 *   project   portfolio/[slug]            a published project with that slug
 *   client    portfolio/client/[slug]     getProjectsByClientSlug finds one
 *   tag       portfolio/tag/[slug]        getProjectsByTagSlug finds one
 *   category  portfolio/category/[slug]   a published project is in it
 *   post      insights/[slug]             a published post with that slug
 *
 * If a page changes what it accepts, its list changes here with it. A slug
 * that is wrongly missing here is a page answered 404.
 */
export async function getPublicSlugs(): Promise<Record<StoreKind, string[]>> {
  const [projects, posts] = await Promise.all([
    getPublishedProjects(),
    INSIGHTS_ENABLED ? getPublishedPosts() : [],
  ])
  const unique = (slugs: string[]) => Array.from(new Set(slugs.filter(Boolean)))

  return {
    project:  unique(projects.map((p) => p.slug)),
    client:   unique(projects.map((p) => slugify(p.client))),
    tag:      unique(projects.flatMap((p) => (p.tags ?? []).map(slugify))),
    category: unique(projects.flatMap((p) => p.categories)),
    post:     unique(posts.map((p) => p.slug)),
  }
}
