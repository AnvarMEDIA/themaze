import { NextRequest, NextResponse } from 'next/server'
import { getBriefs, addBrief, markBriefRead, deleteBrief } from '@/lib/briefs'
import { getAdminSession } from '@/lib/auth'
import { BriefSchema } from '@/lib/validation'
import { rateLimitAsync } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const briefs = await getBriefs()
  return NextResponse.json(briefs)
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await rateLimitAsync(`brief:${ip}`, { limit: 3, windowMs: 10 * 60 * 1000 })

  if (!rl.success) {
    const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After':          String(retryAfterSec),
          'X-RateLimit-Limit':    '3',
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  try {
    const parsed = BriefSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }

    if (parsed.data.hp && parsed.data.hp.trim().length > 0) {
      console.warn(`[brief] Honeypot triggered from IP ${ip}`)
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    const { hp: _hp, ...data } = parsed.data
    const brief = await addBrief(data)
    return NextResponse.json(brief, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await req.json() as { id: string }
  await markBriefRead(id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteBrief(id)
  return NextResponse.json({ ok: true })
}
