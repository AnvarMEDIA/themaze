/**
 * The shape of the brief form's editable content: its languages, the keys of
 * its texts, the types of its options. Plain data with no imports, so the
 * validation schema, the server code and the admin editor in the browser
 * can all share it. The content itself lives in lib/briefContent.ts.
 */

export const BRIEF_LANGS = ['ru', 'en'] as const
export type BriefLang = (typeof BRIEF_LANGS)[number]
export type Loc = Record<BriefLang, string>

export const otherLang = (lang: BriefLang): BriefLang => (lang === 'ru' ? 'en' : 'ru')

export interface BriefOptionItem  { id: string; label: Loc; hidden?: boolean }
export interface BriefStyleItem   { id: string; label: Loc; desc: Loc; hidden?: boolean }
export interface BriefPaletteItem { id: string; label: Loc; desc: Loc; swatches: string[]; hidden?: boolean }
export interface BriefChoiceItem  { id: string; label: Loc }

export interface BriefContent {
  /** Every question, heading and hint, by a flat key (TEXT_KEYS). */
  texts:     Record<string, Loc>
  services:  BriefOptionItem[]
  styles:    BriefStyleItem[]
  palettes:  BriefPaletteItem[]
  timelines: BriefChoiceItem[]
  budgets:   BriefChoiceItem[]
}

/** The form's fields, as named in messages → brief.fields (a test keeps the two equal). */
export const FIELD_NAMES = [
  'name', 'namePlaceholder', 'email', 'emailPlaceholder', 'phone',
  'company', 'companyPlaceholder', 'website', 'websitePlaceholder',
  'services', 'servicesHint', 'description', 'descriptionPlaceholder',
  'goals', 'goalsPlaceholder', 'audience', 'audiencePlaceholder',
  'competitors', 'competitorsPlaceholder', 'styles', 'stylesHint',
  'colors', 'colorsHint', 'refLinks', 'refLinksPlaceholder',
  'timeline', 'budget', 'source', 'sourcePlaceholder', 'notes', 'notesPlaceholder',
] as const
export type FieldName = (typeof FIELD_NAMES)[number]

export const TEXT_KEYS: readonly string[] = [
  'label', 'heading', 'sub',
  'steps.0', 'steps.1', 'steps.2', 'steps.3',
  'step1.heading', 'step1.sub', 'step2.heading', 'step2.sub',
  'step3.heading', 'step3.sub', 'step4.heading', 'step4.sub',
  ...FIELD_NAMES.map((f) => `fields.${f}`),
  'success.label', 'success.heading', 'success.body', 'success.cta',
]

/** Texts that may be left empty: a hint, a placeholder, a line under a heading. */
export function isOptionalText(key: string): boolean {
  return /(Placeholder|Hint)$/.test(key) || key === 'sub' || /^step\d\.sub$/.test(key)
}

/**
 * The styles have drawings of their own (components/brief/styleArt), so
 * their set is fixed: their words can change, they can be hidden, no more.
 */
export const STYLE_IDS = ['bold', 'minimal', 'playful', 'classic', 'tech', 'luxury', 'organic', 'abstract'] as const

/** Limits the editor and the schema share. */
export const BRIEF_LIMITS = {
  text: 400,          // a heading, a question, a placeholder
  optionLabel: 80,
  optionDesc: 140,
  budgetLabel: 50,    // a brief stores the budget's words, up to 50 characters
  timelineLabel: 100, // and the timeline's, up to 100
  services: 20,
  palettes: 12,
  choices: 10,
  swatches: 5,
} as const

/** An id for an option added in the editor: short, readable in a stored brief. */
export function newOptionId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  for (let n = 1; ; n++) {
    const id = `${prefix}-${n}`
    if (!used.has(id)) return id
  }
}
