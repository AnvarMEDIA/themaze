import { NextResponse } from 'next/server'
import { getPartners, savePartners } from '@/lib/partners'
import type { Partner } from '@/lib/partners'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body     = await req.json() as Partial<Partner>
    const partners = await getPartners()
    const idx      = partners.findIndex((p) => p.id === params.id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    partners[idx] = { ...partners[idx], ...body }
    await savePartners(partners)
    return NextResponse.json(partners[idx])
  } catch {
    return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
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
