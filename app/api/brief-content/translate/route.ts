import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth'
import { rateLimitAsync, clientIp } from '@/lib/rateLimit'
import { BRIEF_LANGS } from '@/lib/briefTexts'
import { TRANSLATE_LIMITS, TranslateError, translateBriefTexts } from '@/lib/translateBrief'

export const dynamic = 'force-dynamic'
// A batch of texts takes a few seconds to translate, sometimes more.
export const maxDuration = 60

const Body = z.object({
  from:  z.enum(BRIEF_LANGS),
  to:    z.enum(BRIEF_LANGS),
  items: z.array(z.object({
    id:   z.string().min(1).max(120),
    text: z.string().trim().min(1).max(TRANSLATE_LIMITS.text),
  })).min(1).max(TRANSLATE_LIMITS.items),
}).refine((b) => b.from !== b.to, 'Pick two different languages')

/**
 * POST /api/brief-content/translate — the editor's "Translate" button: one
 * batch of the brief form's texts into the other language. Admin-only, and
 * capped, so a runaway page or a stolen session cannot run up the bill.
 */
export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rl = await rateLimitAsync(`brief-translate:${clientIp(req)}`, { limit: 40, windowMs: 5 * 60_000 })
  if (!rl.success) return NextResponse.json({ error: 'Too many translations at once. Wait a few minutes.' }, { status: 429 })

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Translation is not set up: ANTHROPIC_API_KEY is missing.' }, { status: 503 })

  try {
    const items = await translateBriefTexts(new Anthropic({ apiKey }), parsed.data)
    return NextResponse.json({ items })
  } catch (err) {
    if (err instanceof TranslateError) return NextResponse.json({ error: err.message }, { status: 502 })
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'The translation service is busy. Try again in a minute.' }, { status: 503 })
    }
    if (err instanceof Anthropic.APIError) {
      console.error('[brief-translate]', err.status, err.message)
      return NextResponse.json({ error: `The translation service answered ${err.status ?? 'with an error'}.` }, { status: 502 })
    }
    console.error('[brief-translate]', err)
    return NextResponse.json({ error: 'Translation failed.' }, { status: 500 })
  }
}
