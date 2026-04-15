import { NextResponse } from 'next/server'
import { getPartners, savePartners } from '@/lib/partners'
import type { Partner } from '@/lib/partners'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const partners = getPartners()
    return NextResponse.json(partners)
  } catch {
    return NextResponse.json({ error: 'Failed to load partners' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Omit<Partner, 'id'>
    const partners = getPartners()
    const newPartner: Partner = {
      ...body,
      id: String(Date.now()),
    }
    savePartners([...partners, newPartner])
    return NextResponse.json(newPartner, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 })
  }
}
