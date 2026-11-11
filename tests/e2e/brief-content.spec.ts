import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import ru from '../../messages/ru.json'
import { DEFAULT_BRIEF_CONTENT, briefLabels, completeBriefContent, localizeBrief } from '../../lib/briefContent'
import { FIELD_NAMES, STYLE_IDS, newOptionId, type BriefContent } from '../../lib/briefTexts'
import { BriefContentSchema } from '../../lib/validation'
import { TRANSLATE_MODEL, TranslateError, translateBriefTexts } from '../../lib/translateBrief'

/**
 * The brief form's editable content (lib/briefContent): the questions and
 * options the admin edits at /admin/briefs/form, and the "Translate" button
 * behind it (lib/translateBrief). Pure functions, tested without a browser;
 * the translation runs against a stand-in for the API client, so nothing is
 * sent anywhere.
 */
test.skip(({ isMobile }) => isMobile, 'pure functions: once is enough')

const copy = (): BriefContent => JSON.parse(JSON.stringify(DEFAULT_BRIEF_CONTENT))
const accepts = (change: (c: BriefContent) => void) => {
  const c = copy()
  change(c)
  return BriefContentSchema.safeParse(c).success
}

test.describe('The brief form content', () => {
  test('knows every field and style the message files have', () => {
    expect([...FIELD_NAMES].sort()).toEqual(Object.keys(en.brief.fields).sort())
    expect([...FIELD_NAMES].sort()).toEqual(Object.keys(ru.brief.fields).sort())
    expect(en.brief.styleCards.map((s) => s.id)).toEqual([...STYLE_IDS])
  })

  test('before any save, the form reads exactly as the message files', () => {
    for (const [lang, { brief: m }] of [['ru', ru], ['en', en]] as const) {
      expect(localizeBrief(DEFAULT_BRIEF_CONTENT, lang)).toEqual({
        label: m.label, heading: m.heading, sub: m.sub, steps: m.steps,
        step1: m.step1, step2: m.step2, step3: m.step3, step4: m.step4,
        fields: m.fields,
        services: m.services, styleCards: m.styleCards, colorCards: m.colorCards,
        timelines: m.timelines, budgets: m.budgets,
        success: m.success,
      })
    }
  })

  test('the defaults pass the schema a save is checked against', () => {
    expect(BriefContentSchema.safeParse(DEFAULT_BRIEF_CONTENT).success).toBe(true)
  })

  test('a hidden option leaves the form but keeps its words for briefs that chose it', () => {
    const c = copy()
    c.services[0].hidden = true
    c.styles[1].hidden = true
    c.palettes[0].hidden = true

    const form = localizeBrief(c, 'en')
    expect(form.services.map((s) => s.id)).not.toContain(c.services[0].id)
    expect(form.styleCards.map((s) => s.id)).not.toContain(c.styles[1].id)
    expect(form.colorCards.map((p) => p.id)).not.toContain(c.palettes[0].id)

    const words = briefLabels(c, 'en')
    expect(words.services[c.services[0].id]).toBe(c.services[0].label.en)
    expect(words.styles[c.styles[1].id]).toBe(c.styles[1].label.en)
    expect(words.palettes[c.palettes[0].id].swatches).toEqual(c.palettes[0].swatches)
  })

  test('a renamed option reads its new name; one gone from the content keeps its old one', () => {
    const c = copy()
    const gone = c.services[1]
    c.services[0].label = { ru: 'Айдентика', en: 'Identity' }
    c.services = c.services.filter((s) => s.id !== gone.id)

    const words = briefLabels(c, 'ru')
    expect(words.services[c.services[0].id]).toBe('Айдентика')
    expect(words.services[gone.id]).toBe(gone.label.ru)
  })

  test('a question missing in one language shows the other; a hint may stay empty', () => {
    const c = copy()
    c.texts.heading = { ru: 'Расскажите о проекте', en: '' }
    c.texts['fields.namePlaceholder'] = { ru: 'Иван', en: '' }

    const form = localizeBrief(c, 'en')
    expect(form.heading).toBe('Расскажите о проекте')
    expect(form.fields.namePlaceholder).toBe('')
  })

  test('a save from before a text was added gets its default; styles keep their order', () => {
    const c = copy()
    delete c.texts['success.cta']
    c.styles.reverse()

    const full = completeBriefContent(c)
    expect(full.texts['success.cta']).toEqual(DEFAULT_BRIEF_CONTENT.texts['success.cta'])
    expect(full.styles.map((s) => s.id)).toEqual([...STYLE_IDS])
  })

  test('the schema refuses what would break the form', () => {
    expect(accepts((c) => { c.texts.heading.en = 'Hello {name}' }), 'braces: next-intl syntax').toBe(false)
    expect(accepts((c) => { c.texts.heading.en = '' }), 'a question left empty').toBe(false)
    expect(accepts((c) => { c.texts['fields.namePlaceholder'].en = '' }), 'a placeholder left empty').toBe(true)
    expect(accepts((c) => { c.texts.nonsense = { ru: 'а', en: 'a' } }), 'an unknown text').toBe(false)
    expect(accepts((c) => { for (const s of c.services) s.hidden = true }), 'every service hidden').toBe(false)
    expect(accepts((c) => { c.services[1].id = c.services[0].id }), 'two services, one id').toBe(false)
    expect(accepts((c) => { c.palettes[0].swatches = ['red'] }), 'a colour that is not #RRGGBB').toBe(false)
    expect(accepts((c) => { (c.styles[0] as { id: string }).id = 'grunge' }), 'a style without a drawing').toBe(false)
    expect(accepts((c) => { c.budgets = [] }), 'no budgets').toBe(false)
  })

  test('an added option gets the first free id', () => {
    expect(newOptionId('service', ['service-1', 'service-3'])).toBe('service-2')
  })
})

/* ── Translating ──────────────────────────────────────────────────────────── */

type Client = Parameters<typeof translateBriefTexts>[0]

/** A stand-in for the API client: answers once, as told, and records the request. */
function fakeClient(answer: { stop_reason?: string; items?: Array<{ id: string; text: string }> | null }) {
  const requests: Array<Record<string, unknown>> = []
  const client = {
    messages: {
      parse: async (params: Record<string, unknown>) => {
        requests.push(params)
        return {
          stop_reason: answer.stop_reason ?? 'end_turn',
          parsed_output: answer.items === null ? null : { items: answer.items ?? [] },
        }
      },
    },
  } as unknown as Client
  return { client, requests }
}

const ASK = { from: 'ru' as const, to: 'en' as const, items: [{ id: 'a', text: 'Ваше имя' }, { id: 'b', text: 'Бюджет' }] }

test.describe('Translating the brief texts', () => {
  test('sends the texts in one request and maps the answers back by id, in order', async () => {
    const { client, requests } = fakeClient({ items: [{ id: 'b', text: 'Budget' }, { id: 'a', text: 'Your {name}' }] })
    const out = await translateBriefTexts(client, ASK)

    // In the order asked, braces taken out: next-intl would read them as code.
    expect(out).toEqual([{ id: 'a', text: 'Your name' }, { id: 'b', text: 'Budget' }])
    expect(requests).toHaveLength(1)
    expect(requests[0].model).toBe(TRANSLATE_MODEL)
    const prompt = JSON.stringify(requests[0].messages)
    expect(prompt).toContain('from Russian to English')
    expect(prompt).toContain('Ваше имя')
  })

  test('nothing to translate, no request', async () => {
    const { client, requests } = fakeClient({ items: [] })
    expect(await translateBriefTexts(client, { ...ASK, items: [] })).toEqual([])
    expect(requests).toHaveLength(0)
  })

  test('a refusal, a cut-off or an incomplete answer is an error, not a silent gap', async () => {
    const tries = [
      fakeClient({ stop_reason: 'refusal' }),
      fakeClient({ stop_reason: 'max_tokens' }),
      fakeClient({ items: null }),
      fakeClient({ items: [{ id: 'a', text: 'Your name' }] }),
      fakeClient({ items: [{ id: 'a', text: 'Your name' }, { id: 'b', text: '  {}  ' }] }),
    ]
    for (const { client } of tries) {
      await expect(translateBriefTexts(client, ASK)).rejects.toBeInstanceOf(TranslateError)
    }
  })
})
