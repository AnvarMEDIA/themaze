import type { Project } from './types'
import { categoryLabel } from './utils'
import { clampDescription } from './seo'

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

const key = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Characters the root template will append: " | MAZE Studio". */
const BRAND_TAIL = 14
/** Google truncates a result title around here. */
const TITLE_BUDGET = 60

/**
 * SEO meta title for a project. Override > composed default > plain title.
 *
 * The composed form wants to say three things — the work, the discipline and
 * the client — but "Samarkand Heritage — Branding for Samarkand Heritage
 * Hotel | MAZE Studio" is 72 characters, so the SERP cut it mid-client and
 * the visible half said the name twice. Rather than guess which clients are
 * redundant, drop the least important clause only when the fuller one would
 * not survive truncation anyway: "TechUZ — UI/UX for TechUZ Accelerator"
 * fits and keeps the client, the Samarkand one does not and loses it.
 */
export function projectMetaTitle(project: Project, locale = 'en'): string {
  const isRu     = locale === 'ru'
  const override = isRu ? project.metaTitleRu : project.metaTitle
  if (override?.trim()) return override.trim()

  const title    = isRu ? (project.titleRu || project.title) : project.title
  const first    = project.categories[0]
  const catLabel = first ? categoryLabel(first, locale) : ''
  const for_     = isRu ? 'для' : 'for'
  const client   = project.client?.trim() ?? ''
  // A client that only restates the title adds nothing at any length.
  const sameName = Boolean(client) && key(client) === key(title)

  const candidates = [
    catLabel && client && !sameName ? `${title} — ${catLabel} ${for_} ${client}` : '',
    catLabel ? `${title} — ${catLabel}` : '',
    client && !sameName ? `${title} — ${client}` : '',
    title,
  ].filter(Boolean)

  return candidates.find((c) => c.length + BRAND_TAIL <= TITLE_BUDGET) ?? candidates[candidates.length - 1]
}

/**
 * A case study's meta description.
 *
 * Case-study copy is written English-first, so a Russian page whose
 * `shortDescriptionRu` is empty used to serve the English sentence
 * verbatim — a Russian result with an English snippet. When the Russian
 * copy is missing we compose from the fields that ARE Russian (the
 * category label, the studio frame) and let the client and project names
 * stand as the proper nouns they are, rather than shipping the wrong
 * language. Either way the sentence is closed with where the work was
 * done, which is the part search engines and answer engines quote.
 */
export function projectMetaDescription(project: Project, locale = 'en'): string {
  const isRu     = locale === 'ru'
  const override = isRu ? project.metaDescriptionRu : project.metaDescription
  if (override?.trim()) return clampDescription(override.trim())

  const short = (isRu ? project.shortDescriptionRu : project.shortDescription)?.trim() ?? ''
  // On a Russian page, English fallback copy is worse than no copy: it
  // reads as a mistake in the result. Cyrillic is the test.
  const usable = short && (!isRu || /[а-яё]/i.test(short))

  const lead  = (usable ? short : projectMetaTitle(project, locale)).replace(/[.\s]+$/, '')
  const frame = isRu
    ? 'Кейс MAZE Studio — брендинговой и дизайн-студии из Ташкента.'
    : 'A MAZE Studio case study — branding and design from Tashkent, Uzbekistan.'

  return clampDescription(`${lead}. ${frame}`)
}
