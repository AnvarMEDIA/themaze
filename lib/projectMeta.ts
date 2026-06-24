import type { Project } from './types'
import { categoryLabel } from './utils'

/**
 * Resolve the alt text for a project image:
 *   1. admin-supplied override from project.imageAlts[url]
 *   2. descriptive default: "{title} — {category} project for {client}"
 *
 * The default carries the project title, primary category and client so
 * Google Image Search has meaningful context even before captions are set.
 */
export function imageAlt(project: Project, url: string, locale = 'en'): string {
  const custom = project.imageAlts?.[url]?.trim()
  if (custom) return custom

  const isRu      = locale === 'ru'
  const title     = isRu ? (project.titleRu || project.title) : project.title
  const first     = project.categories[0]
  const catLabel  = first ? categoryLabel(first, locale) : ''
  const for_      = isRu ? 'для' : 'for'
  const projWord  = isRu ? 'проект' : 'project'

  return catLabel
    ? `${title} — ${catLabel} ${projWord} ${for_} ${project.client}`
    : `${title} — ${project.client}`
}

/** SEO meta title for a project. Override > smart default > plain title. */
export function projectMetaTitle(project: Project, locale = 'en'): string {
  const isRu     = locale === 'ru'
  const override = isRu ? project.metaTitleRu : project.metaTitle
  if (override?.trim()) return override.trim()

  const title    = isRu ? (project.titleRu || project.title) : project.title
  const first    = project.categories[0]
  const catLabel = first ? categoryLabel(first, locale) : ''
  const for_     = isRu ? 'для' : 'for'

  return catLabel
    ? `${title} — ${catLabel} ${for_} ${project.client}`
    : `${title} — ${project.client}`
}

export function projectMetaDescription(project: Project, locale = 'en'): string {
  const isRu     = locale === 'ru'
  const override = isRu ? project.metaDescriptionRu : project.metaDescription
  if (override?.trim()) return override.trim()
  return isRu
    ? (project.shortDescriptionRu || project.shortDescription)
    : project.shortDescription
}
