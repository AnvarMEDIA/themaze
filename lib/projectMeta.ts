import type { Project } from './types'
import { categoryLabel, getLocalized } from './utils'

export function imageAlt(project: Project, url: string, locale = 'en'): string {
  const custom = project.imageAlts?.[url]?.trim()
  if (custom) return custom

  const title    = getLocalized(locale, project.title, project.titleRu, project.titleUz)
  const first    = project.categories[0]
  const catLabel = first ? categoryLabel(first, locale) : ''
  const for_     = locale === 'ru' ? 'для' : locale === 'uz' ? 'uchun' : 'for'
  const projWord = locale === 'ru' ? 'проект' : locale === 'uz' ? 'loyiha' : 'project'

  return catLabel
    ? `${title} — ${catLabel} ${projWord} ${for_} ${project.client}`
    : `${title} — ${project.client}`
}

/** SEO meta title for a project. Override > smart default > plain title. */
export function projectMetaTitle(project: Project, locale = 'en'): string {
  const override = locale === 'uz' ? project.metaTitleUz
                 : locale === 'ru' ? project.metaTitleRu
                 : project.metaTitle
  if (override?.trim()) return override.trim()

  const title    = getLocalized(locale, project.title, project.titleRu, project.titleUz)
  const first    = project.categories[0]
  const catLabel = first ? categoryLabel(first, locale) : ''
  const for_     = locale === 'ru' ? 'для' : locale === 'uz' ? 'uchun' : 'for'

  return catLabel
    ? `${title} — ${catLabel} ${for_} ${project.client}`
    : `${title} — ${project.client}`
}

export function projectMetaDescription(project: Project, locale = 'en'): string {
  const override = locale === 'uz' ? project.metaDescriptionUz
                 : locale === 'ru' ? project.metaDescriptionRu
                 : project.metaDescription
  if (override?.trim()) return override.trim()
  return getLocalized(locale, project.shortDescription, project.shortDescriptionRu, project.shortDescriptionUz)
}
