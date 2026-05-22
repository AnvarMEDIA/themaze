import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { categoryLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface GenerateInput {
  titleRu?:            string
  title?:              string
  shortDescriptionRu?: string
  shortDescription?:   string
  descriptionRu?:      string
  description?:        string
  client?:             string
  categories?:         string[]
  services?:           string[]
  year?:               number
}

interface GenerateOutput {
  metaTitle:         string
  metaTitleRu:       string
  metaTitleUz:       string
  metaDescription:   string
  metaDescriptionRu: string
  metaDescriptionUz: string
}

export async function POST(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })

  try {
    const body = await req.json() as GenerateInput

    // At least one piece of source content is required.
    if (!body.titleRu && !body.title && !body.descriptionRu && !body.description) {
      return NextResponse.json(
        { error: 'Заполните название и описание проекта перед генерацией SEO' },
        { status: 400 },
      )
    }

    const catLabels = (body.categories ?? []).map((c) => categoryLabel(c, 'en')).join(', ')

    const client = new Anthropic({ apiKey })

    const prompt = `You are an SEO copywriter for MAZE Studio — a branding and design studio based in Tashkent, Uzbekistan.

Generate search-optimised meta titles and descriptions for a portfolio project page, in three languages:
- English (en)
- Russian (ru)
- Uzbek (uz, modern Latin script)

Project source data (Russian is the primary language):
- Russian title:         ${body.titleRu ?? '—'}
- English title:         ${body.title ?? '—'}
- Client:                ${body.client ?? '—'}
- Year:                  ${body.year ?? '—'}
- Categories:            ${catLabels || '—'}
- Services (RU):         ${(body.services ?? []).join(', ') || '—'}
- Russian short summary: ${body.shortDescriptionRu ?? body.shortDescription ?? '—'}
- Russian description:   ${(body.descriptionRu ?? body.description ?? '').slice(0, 1200)}

Rules:
1. Meta title: 50–60 chars, include the project name + main category + "MAZE Studio". Format like "{Project} — {Category} for {Client} | MAZE Studio" but adapt naturally.
2. Meta description: 140–155 chars, compelling and specific. Hint at what was done (branding / identity / packaging / etc) and the result. Avoid generic filler like "we created" — be concrete.
3. Russian and Uzbek must read naturally in their language — NOT translations of the English, but original copy aimed at the local search market (Tashkent / Uzbekistan / CIS).
4. Uzbek: modern Latin orthography. Professional design terms: brendlash (branding), aydentika (identity), nomlash (naming), qadoqlash (packaging), dizayn (design), logotip (logo), strategiya (strategy).
5. Keep proper nouns (brand/client names) as-is in all three languages.
6. Return STRICT JSON only — no markdown, no commentary.

Return JSON with exactly these keys:
{
  "metaTitle":         "...",
  "metaTitleRu":       "...",
  "metaTitleUz":       "...",
  "metaDescription":   "...",
  "metaDescriptionRu": "...",
  "metaDescriptionUz": "..."
}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text

    const result = JSON.parse(jsonStr.trim()) as GenerateOutput

    // Hard cap lengths so we never persist values that exceed the schema limits.
    const cap = (s: string | undefined, max: number): string => (s ?? '').trim().slice(0, max)
    const out: GenerateOutput = {
      metaTitle:         cap(result.metaTitle,         70),
      metaTitleRu:       cap(result.metaTitleRu,       70),
      metaTitleUz:       cap(result.metaTitleUz,       70),
      metaDescription:   cap(result.metaDescription,   200),
      metaDescriptionRu: cap(result.metaDescriptionRu, 200),
      metaDescriptionUz: cap(result.metaDescriptionUz, 200),
    }

    return NextResponse.json(out)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'SEO generation failed'
    console.error('[generate-seo]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
