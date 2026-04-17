import { NextRequest, NextResponse } from 'next/server'
import { getPartners, savePartners } from '@/lib/partners'
import { getAdminSession } from '@/lib/auth'
import { PartnerSchema } from '@/lib/validation'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const parsed = PartnerSchema.partial().safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }
    const partners = await getPartners()
    const idx      = partners.findIndex((p) => p.id === params.id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    partners[idx] = { ...partners[idx], ...parsed.data }
    await savePartners(partners)
    return NextResponse.json(partners[idx])
  } catch {
    return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const partners = await getPartners()
    const filtered = partners.filter((p) => p.id !== params.id)
    if (filtered.length === partners.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await savePartners(filtered)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 })
  }
}
