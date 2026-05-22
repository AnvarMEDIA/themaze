import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { rateLimitAsync } from '@/lib/rateLimit'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

interface TranslateInput {
  title?: string
  shortDescription?: string
  description?: string
  results?: string
  services?: string[]
  targetLang?: 'en' | 'uz'
}

interface TranslateOutput {
  title: string
  shortDescription: string
  description: string
  results: string
  services: string[]
}

export async function POST(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await rateLimitAsync(`translate:${ip}`, { limit: 20, windowMs: 60 * 1000 })
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })

  try {
    const body = await req.json() as TranslateInput
    const targetLang = body.targetLang ?? 'en'

    const { targetLang: _, ...fields } = body

    const client = new Anthropic({ apiKey })

    const targetName = targetLang === 'uz'
      ? 'Uzbek (Latin script, modern standard)'
      : 'English'

    const prompt = `You are a professional translator for a design studio portfolio. Translate the following project fields from Russian to ${targetName}.

Rules:
- Keep proper nouns (brand names, company names, city names) as-is
- Use professional design/branding industry terminology
- Keep the same tone and style
- For arrays, return the same number of items
- Return ONLY valid JSON, no explanation
${targetLang === 'uz' ? `- Use modern Uzbek Latin script (post-1992 orthography)
- Use professional Uzbek design terms: brendlash (branding), aydentika (identity), nomlash (naming), qadoqlash (packaging), dizayn (design), logotip (logo), tipografika (typography), rang (color), strategiya (strategy)` : ''}

Input JSON:
${JSON.stringify(fields, null, 2)}

Return JSON with exactly these keys: title, shortDescription, description, results, services
"results" and "description" may be empty strings if the input is empty.
"services" must be an array.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text

    const result = JSON.parse(jsonStr.trim()) as TranslateOutput

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Translation failed'
    console.error('[translate]', msg)
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' ? 'Translation failed' : msg },
      { status: 500 }
    )
  }
}
