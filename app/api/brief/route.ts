import { NextRequest, NextResponse } from 'next/server'
import { getBriefs, addBrief, markBriefRead, deleteBrief, setBriefNotified } from '@/lib/briefs'
import { getAdminSession } from '@/lib/auth'
import { BriefSchema } from '@/lib/validation'
import { rateLimitAsync, clientIp } from '@/lib/rateLimit'
import { notifyNewBrief } from '@/lib/notify'
import { SITE_URL } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return NextResponse.json(await getBriefs())
}

export async function POST(req: NextRequest) {
  // A brief is long to fill in, so the limit is tighter than the contact form.
  const ip = clientIp(req)
  const rl = await rateLimitAsync(`brief:${ip}`, { limit: 3, windowMs: 10 * 60 * 1000 })
  if (!rl.success) {
    const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After':           String(retryAfterSec),
          'X-RateLimit-Limit':     '3',
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

    // Honeypot: accept silently so a bot doesn't learn it was caught.
    if (parsed.data.hp && parsed.data.hp.trim().length > 0) {
      console.warn(`[brief] Honeypot triggered from IP ${ip}`)
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    const { hp: _hp, ...data } = parsed.data
    const brief = await addBrief(data)

    // Same contract as the contact form: the brief is already saved, so a
    // Telegram outage must never surface as an error to the visitor — but it
    // is recorded so an undelivered alert is visible in the admin panel.
    const notified = await notifyNewBrief(brief, SITE_URL)
    if (!notified.ok) {
      console.error(`[brief] saved ${brief.id} but the alert failed: ${notified.error ?? 'unknown'}`)
    }
    await setBriefNotified(brief.id, notified).catch(() => {})

    return NextResponse.json({ ok: true, id: brief.id }, { status: 201 })
  } catch (err) {
    console.error('[brief] Server error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const { id } = await req.json() as { id: string }
  await markBriefRead(id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteBrief(id)
  return NextResponse.json({ ok: true })
}
