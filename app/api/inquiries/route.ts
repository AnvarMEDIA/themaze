import { NextRequest, NextResponse } from 'next/server'
import { getInquiries, addInquiry, markInquiryRead, deleteInquiry, deleteInquiries } from '@/lib/inquiries'
import { getAdminSession } from '@/lib/auth'
import { InquirySchema } from '@/lib/validation'
import { rateLimitAsync, clientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const inquiries = await getInquiries()
  return NextResponse.json(inquiries)
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 submissions per 10 minutes per IP
  const ip = clientIp(req)
  const rl = await rateLimitAsync(`inquiry:${ip}`, { limit: 5, windowMs: 10 * 60 * 1000 })

  if (!rl.success) {
    const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  try {
    const parsed = InquirySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }

    // Honeypot: if the hidden field is filled, silently accept but do not store.
    // Returning 2xx prevents bots from learning they were caught.
    if (parsed.data.website && parsed.data.website.trim().length > 0) {
      console.warn(`[inquiries] Honeypot triggered from IP ${ip}`)
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    const { website: _hp, ...data } = parsed.data
    const inquiry = await addInquiry(data)
    return NextResponse.json(inquiry, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await req.json() as { id: string }
  await markInquiryRead(id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (id) {
    await deleteInquiry(id)
    return NextResponse.json({ ok: true, deleted: 1 })
  }

  // Bulk delete via JSON body { ids: string[] }
  try {
    const body = await req.json() as { ids?: unknown }
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 })
    }
    const ids = body.ids.filter((x): x is string => typeof x === 'string').slice(0, 500)
    const deleted = await deleteInquiries(ids)
    return NextResponse.json({ ok: true, deleted })
  } catch {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
}
