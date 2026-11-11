import type Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import type { BriefLang } from './briefTexts'

/**
 * Translating the brief form's texts for the admin's "Translate" button
 * (/admin/briefs/form): a batch of short UI strings, Russian to English or
 * back, returned under the ids they were sent with.
 *
 * The client is passed in, so the request and the handling of the answer
 * are tested without calling the API.
 */

export const TRANSLATE_MODEL = 'claude-opus-5-5'

/** One string to translate, under an id the editor maps back to its field. */
export interface TranslateItem { id: string; text: string }

export const TRANSLATE_LIMITS = { items: 40, text: 800 } as const

const LANGUAGE: Record<BriefLang, string> = { ru: 'Russian', en: 'English' }

const SYSTEM = `You translate the user interface of a client brief form for MAZE, a branding and design studio in Tashkent, Uzbekistan. Clients fill the form in to start a project; the studio reads it to prepare a proposal.

Each item is one piece of the form: a step title, a question, a hint under it, a placeholder inside an input, an answer option, a timeline or a budget range.

- Write natural, concise interface copy a native speaker would expect on a studio's website, not a literal rendering. Keep each item about as long as the original.
- Keep the register of the original: a question stays a question, a placeholder stays a placeholder, and an item without final punctuation stays without it.
- Keep brand and company names, and the names of design disciplines that are usually left in English (UI / UX), as they are.
- Money: keep the currency and the amounts, written as the target language writes numbers ("$5 000 – $15 000" in Russian is "$5,000 – $15,000" in English).
- Never use curly braces { }; the site reads them as code.
- Translate every item, and return each under the same id it came with.`

const OUTPUT = jsonSchemaOutputFormat({
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id:   { type: 'string' },
          text: { type: 'string' },
        },
        required: ['id', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const)

export class TranslateError extends Error {}

/** Braces would be read as message syntax by next-intl; nothing else is touched. */
const clean = (s: string) => s.replace(/[{}]/g, '').trim()

export async function translateBriefTexts(
  client: Pick<Anthropic, 'messages'>,
  { from, to, items }: { from: BriefLang; to: BriefLang; items: TranslateItem[] },
): Promise<TranslateItem[]> {
  if (items.length === 0) return []

  const message = await client.messages.parse({
    model: TRANSLATE_MODEL,
    max_tokens: 16000,
    // Short, well-specified strings: little to think about.
    output_config: { effort: 'low', format: OUTPUT },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content:
        `Translate these ${items.length} items from ${LANGUAGE[from]} to ${LANGUAGE[to]}.\n\n` +
        JSON.stringify({ items }, null, 2),
    }],
  })

  if (message.stop_reason === 'refusal') throw new TranslateError('The model declined to translate these texts.')
  if (message.stop_reason === 'max_tokens') throw new TranslateError('The translation was cut short. Try fewer texts at once.')

  const answer = message.parsed_output?.items
  if (!answer) throw new TranslateError('The translation came back in an unexpected form.')

  // Only the ids that were asked for, in the order they were asked; one
  // that did not come back is reported rather than silently left out.
  const byId = new Map(answer.map((i) => [i.id, clean(i.text)]))
  const missing = items.filter((i) => !byId.get(i.id))
  if (missing.length) throw new TranslateError(`${missing.length} of ${items.length} texts came back untranslated.`)
  return items.map((i) => ({ id: i.id, text: byId.get(i.id)! }))
}
