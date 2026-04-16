import { NextRequest, NextResponse } from 'next/server'
import { getInquiries, addInquiry, markInquiryRead, deleteInquiry } from '@/lib/inquiries'
import { getAdminSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const inquiries = await getInquiries()
  return NextResponse.json(inquiries)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const inquiry = await addInquiry({
      name:    body.name,
      email:   body.email,
      company: body.company ?? '',
      service: body.service ?? '',
      budget:  body.budget ?? '',
      message: body.message,
    })
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
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await deleteInquiry(id)
  return NextResponse.json({ ok: true })
}
