import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth'
import { rateLimitAsync, clientIp } from '@/lib/rateLimit'
import { clampDescription } from '@/lib/seo'
import { categoryLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Writes a project's SEO title and description, in English and Russian,
 * for the "Generate SEO" button in the admin project form. Nothing is
 * saved here: the texts land in the form, to be read, edited and saved.
 *
 * Budgets: a title without "MAZE" in it gets " | MAZE Studio" appended by
 * resolveTitle() in lib/seo.ts, 14 characters, and Google cuts a result
 * title near 60; descriptions are cut near 160.
 */
const TITLE_MAX = 46
const DESC_MAX  = 160

const SeoTexts = z.object({
  metaTitle:         z.string(),
  metaTitleRu:       z.string(),
  metaDescription:   z.string(),
  metaDescriptionRu: z.string(),
})

const SYSTEM = `You write search-result titles and descriptions for case studies on the website of MAZE Studio, a branding and design studio in Tashkent, Uzbekistan. You get one project's data as JSON and return four texts: a title and a description in English, and the same pair in Russian.

Titles, at most ${TITLE_MAX} characters each (the site appends " | MAZE Studio" itself):
- Start with the project's name as given, then the main work the studio did, from the services list: name, logo, identity, packaging, rebrand. Add what the client does if it fits.
- Never put "MAZE" in a title.

Descriptions, 140 to ${DESC_MAX} characters each:
- Say what MAZE Studio made, for whom, and what the client does. Name MAZE Studio and Tashkent once each.

For all four:
- Use only facts present in the data. Add no results, numbers, years, awards, prices or claims of your own.
- Write the Russian texts as a native Russian copywriter would for readers in Uzbekistan and the CIS, not as a translation of the English ones.
- Keep brand and company names exactly as written in the data, Latin letters included; do not transliterate them.
- Plain text: no quotation marks around the whole text, no emoji, no exclamation marks, no keyword lists.`

const cap = (s: unknown, n: number): string => (typeof s === 'string' ? s.trim().slice(0, n) : '')
const list = (v: unknown, n = 30): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, n).map((s) => s.trim().slice(0, 120)) : []

// A title the model let run over the budget loses its last clause (from
// " — ", a comma, "for", "in", "для", "в"…) rather than stopping
// mid-phrase; only when no clause fits is it cut at a word, and then a
// dangling "for"/"и" or a Russian adjective left without its noun
// ("…стиль частной") goes too. Nothing is invented to fill it.
const CLAUSE_BREAKS = [' — ', ', ', ' for ', ' in ', ' from ', ' для ', ' в ', ' из ']
const TRAILING_FILLER =
  /(?:\s+(?:for|and|of|in|with|a|an|the|для|и|в|с|из|на|[а-яё]+(?:ой|ый|ий|ая|яя|ое|ее|ые|ие|ых|их|ого|его|ому|ему|ую|юю)))+$/i

function fitTitle(title: string): string {
  const clean = title.replace(/\s+/g, ' ').trim()
  if (clean.length <= TITLE_MAX) return clean
  let at = -1
  for (const b of CLAUSE_BREAKS) {
    for (let i = clean.indexOf(b); i !== -1 && i <= TITLE_MAX; i = clean.indexOf(b, i + 1)) at = Math.max(at, i)
  }
  const cut = at >= TITLE_MAX * 0.4
    ? clean.slice(0, at)
    : clean.slice(0, clean.lastIndexOf(' ', TITLE_MAX) > 0 ? clean.lastIndexOf(' ', TITLE_MAX) : TITLE_MAX)
  return cut.replace(TRAILING_FILLER, '').replace(/[\s,;:—-]+$/, '')
}

export async function POST(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Admin-only, but capped like the translate route so a runaway client or a
  // stolen session can't run up the bill.
  const rl = await rateLimitAsync(`seo-generate:${clientIp(req)}`, { limit: 20, windowMs: 5 * 60 * 1000 })
  if (!rl.success) return NextResponse.json({ error: 'Слишком много запросов, подождите пару минут.' }, { status: 429 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const project = {
    title:              cap(body.title, 200),
    titleRu:            cap(body.titleRu, 200),
    client:             cap(body.client, 200),
    categories:         list(body.categories, 9).map((c) => categoryLabel(c)),
    services:           list(body.services),
    servicesRu:         list(body.servicesRu),
    tags:               list(body.tags),
    shortDescription:   cap(body.shortDescription, 1000),
    shortDescriptionRu: cap(body.shortDescriptionRu, 1000),
    description:        cap(body.description, 4000),
    descriptionRu:      cap(body.descriptionRu, 4000),
  }
  if (!project.title && !project.titleRu) {
    return NextResponse.json({ error: 'Сначала заполните название проекта' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(project, null, 2) }],
      // Four short texts: low effort is plenty, and keeps the button quick.
      output_config: { effort: 'low', format: zodOutputFormat(SeoTexts) },
    })

    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      console.error('[seo-generate] no usable output, stop_reason:', response.stop_reason)
      return NextResponse.json({ error: 'Не удалось сгенерировать тексты, попробуйте ещё раз' }, { status: 502 })
    }

    const out = response.parsed_output
    return NextResponse.json({
      metaTitle:         fitTitle(out.metaTitle),
      metaTitleRu:       fitTitle(out.metaTitleRu),
      metaDescription:   clampDescription(out.metaDescription, DESC_MAX),
      metaDescriptionRu: clampDescription(out.metaDescriptionRu, DESC_MAX),
    })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Сервис генерации перегружен, попробуйте через минуту' }, { status: 429 })
    }
    if (err instanceof Anthropic.APIError) {
      console.error('[seo-generate]', err.status, err.message)
      return NextResponse.json({ error: `Ошибка сервиса генерации (${err.status ?? 'нет ответа'})` }, { status: 502 })
    }
    console.error('[seo-generate]', err)
    return NextResponse.json({ error: 'Не удалось сгенерировать тексты' }, { status: 500 })
  }
}
