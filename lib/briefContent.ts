import en from '@/messages/en.json'
import ru from '@/messages/ru.json'
import { readStore, writeStore } from './store'
import { BriefContentSchema } from './validation'
import {
  FIELD_NAMES, STYLE_IDS, TEXT_KEYS, isOptionalText, otherLang,
  type BriefContent, type BriefLang, type FieldName, type Loc,
} from './briefTexts'

/**
 * The brief form's questions and answer options, as the admin edits them
 * (/admin/briefs/form).
 *
 * Each text is kept in both languages side by side, so a question edited in
 * one is visibly out of date in the other until it is translated. Until the
 * admin saves anything the content is what the message files say.
 *
 * Services, styles and palettes are stored in a brief by id, so an option
 * that was used must stay resolvable: it is hidden from the form, never
 * deleted. Timelines and budgets are stored as the words the client saw, so
 * those can simply be removed.
 */

/** `fields.name` → obj.fields.name, `steps.2` → obj.steps[2]. */
function textAt(obj: unknown, key: string): string {
  let cur: unknown = obj
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object') return ''
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : ''
}

/* ── Defaults: the message files ────────────────────────────────────────── */

export const DEFAULT_BRIEF_CONTENT: BriefContent = {
  texts: Object.fromEntries(TEXT_KEYS.map((k) => [k, { ru: textAt(ru.brief, k), en: textAt(en.brief, k) }])),
  services: en.brief.services.map((s, i) => ({
    id: s.id, label: { en: s.label, ru: ru.brief.services[i].label },
  })),
  styles: en.brief.styleCards.map((s, i) => ({
    id: s.id,
    label: { en: s.label, ru: ru.brief.styleCards[i].label },
    desc:  { en: s.desc,  ru: ru.brief.styleCards[i].desc },
  })),
  palettes: en.brief.colorCards.map((c, i) => ({
    id: c.id,
    label: { en: c.label, ru: ru.brief.colorCards[i].label },
    desc:  { en: c.desc,  ru: ru.brief.colorCards[i].desc },
    swatches: [...c.swatches],
  })),
  timelines: en.brief.timelines.map((t, i) => ({ id: `timeline-${i + 1}`, label: { en: t, ru: ru.brief.timelines[i] } })),
  budgets:   en.brief.budgets.map((b, i) => ({ id: `budget-${i + 1}`, label: { en: b, ru: ru.brief.budgets[i] } })),
}

/**
 * A saved set, filled out: every text key (one added to the form after the
 * save gets its default), every style, in its fixed order.
 */
export function completeBriefContent(stored: BriefContent): BriefContent {
  return {
    texts: Object.fromEntries(TEXT_KEYS.map((k) => [k, stored.texts[k] ?? DEFAULT_BRIEF_CONTENT.texts[k]])),
    services:  stored.services,
    styles:    STYLE_IDS.map((id) =>
      stored.styles.find((s) => s.id === id) ?? DEFAULT_BRIEF_CONTENT.styles.find((s) => s.id === id)!),
    palettes:  stored.palettes,
    timelines: stored.timelines,
    budgets:   stored.budgets,
  }
}

/* ── Store ──────────────────────────────────────────────────────────────── */

const KEY = 'briefcontent'

export async function getBriefContent(): Promise<BriefContent> {
  const stored = await readStore<unknown>(KEY, DEFAULT_BRIEF_CONTENT)
  const parsed = BriefContentSchema.safeParse(stored)
  if (parsed.success) return completeBriefContent(parsed.data)
  // Saves are validated, so this is a record edited by hand or a schema that
  // moved on: the form is better served by its defaults than by nothing.
  console.warn('[briefContent] stored content is invalid, using the defaults', parsed.error.issues.slice(0, 3))
  return DEFAULT_BRIEF_CONTENT
}

export async function saveBriefContent(content: BriefContent): Promise<BriefContent> {
  const full = completeBriefContent(content)
  await writeStore<BriefContent>(KEY, full)
  return full
}

/* ── For the site: one language, in the message files' shape ────────────── */

const say = (l: Loc, lang: BriefLang) => l[lang].trim() || l[otherLang(lang)].trim()

/**
 * A text in `lang`. A required text left empty shows the other language
 * rather than a blank label; a hint or a placeholder may stay empty.
 */
function pick(content: BriefContent, key: string, lang: BriefLang): string {
  const l = content.texts[key] ?? DEFAULT_BRIEF_CONTENT.texts[key]
  if (!l) return ''
  return isOptionalText(key) ? l[lang].trim() : say(l, lang)
}

/**
 * The `brief` namespace of the messages for one language, made of the
 * admin's texts and options. The brief page merges it over the message
 * files, so the form reads it through next-intl as before.
 */
export function localizeBrief(content: BriefContent, lang: BriefLang) {
  const p = (key: string) => pick(content, key, lang)
  return {
    label: p('label'), heading: p('heading'), sub: p('sub'),
    steps: [0, 1, 2, 3].map((i) => p(`steps.${i}`)),
    step1: { heading: p('step1.heading'), sub: p('step1.sub') },
    step2: { heading: p('step2.heading'), sub: p('step2.sub') },
    step3: { heading: p('step3.heading'), sub: p('step3.sub') },
    step4: { heading: p('step4.heading'), sub: p('step4.sub') },
    fields: Object.fromEntries(FIELD_NAMES.map((f) => [f, p(`fields.${f}`)])) as Record<FieldName, string>,
    services:   content.services.filter((s) => !s.hidden).map((s) => ({ id: s.id, label: say(s.label, lang) })),
    styleCards: content.styles.filter((s) => !s.hidden).map((s) => ({ id: s.id, label: say(s.label, lang), desc: say(s.desc, lang) })),
    colorCards: content.palettes.filter((c) => !c.hidden).map((c) => ({
      id: c.id, label: say(c.label, lang), desc: say(c.desc, lang), swatches: c.swatches,
    })),
    timelines: content.timelines.map((t) => say(t.label, lang)),
    budgets:   content.budgets.map((b) => say(b.label, lang)),
    success: {
      label: p('success.label'), heading: p('success.heading'),
      body: p('success.body'), cta: p('success.cta'),
    },
  }
}

export type LocalizedBrief = ReturnType<typeof localizeBrief>

/* ── For what reads a sent brief: ids to words ──────────────────────────── */

export interface BriefLabels {
  services: Record<string, string>
  styles:   Record<string, string>
  palettes: Record<string, { label: string; swatches: string[] }>
}

/**
 * How a sent brief's ids read in `lang`: every option, hidden ones too, over
 * the original defaults, so a brief keeps its words whatever has been renamed
 * or hidden since. An id found nowhere stays as it is.
 */
export function briefLabels(content: BriefContent, lang: BriefLang): BriefLabels {
  const out: BriefLabels = { services: {}, styles: {}, palettes: {} }
  for (const src of [DEFAULT_BRIEF_CONTENT, content]) {
    for (const s of src.services) out.services[s.id] = say(s.label, lang)
    for (const s of src.styles)   out.styles[s.id]   = say(s.label, lang)
    for (const c of src.palettes) out.palettes[c.id] = { label: say(c.label, lang), swatches: c.swatches }
  }
  return out
}

/** Ids as their words, in the order given. */
export function resolveIds(ids: string[] | undefined, words: Record<string, string>): string[] {
  return (ids ?? []).map((id) => words[id] ?? id).filter(Boolean)
}
