import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { rateLimitAsync, clientIp } from '@/lib/rateLimit'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

interface TranslateInput {
  title?: string
  shortDescription?: string
  description?: string
  results?: string
  services?: string[]
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

  // Admin-only, but cap frequency so a runaway client or stolen session
  // can't rack up unbounded LLM spend.
  const rl = await rateLimitAsync(`translate:${clientIp(req)}`, { limit: 20, windowMs: 5 * 60 * 1000 })
  if (!rl.success) return NextResponse.json({ error: 'Too many requests, slow down.' }, { status: 429 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })

  try {
    const body = await req.json() as TranslateInput
    // Cap field sizes so an oversized payload can't amplify per-call cost.
    const cap = (s: unknown, n: number): string => (typeof s === 'string' ? s.slice(0, n) : '')
    const safeBody = {
      title:            cap(body.title, 300),
      shortDescription: cap(body.shortDescription, 1000),
      description:      cap(body.description, 10000),
      results:          cap(body.results, 3000),
      services:         Array.isArray(body.services)
        ? body.services.filter((x): x is string => typeof x === 'string').slice(0, 30).map((s) => s.slice(0, 120))
        : [],
    }

    const client = new Anthropic({ apiKey })

    const prompt = `You are a professional translator for a design studio portfolio. Translate the following project fields from Russian to English.

Rules:
- Keep proper nouns (brand names, company names, city names) as-is
- Use professional design/branding industry terminology
- Keep the same tone and style
- For arrays, return the same number of items
- Return ONLY valid JSON, no explanation

Input JSON:
${JSON.stringify(safeBody, null, 2)}

Return JSON with exactly these keys: title, shortDescription, description, results, services
"results" and "description" may be empty strings if the input is empty.
"services" must be an array.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text

    const result = JSON.parse(jsonStr.trim()) as TranslateOutput

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Translation failed'
    console.error('[translate]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
