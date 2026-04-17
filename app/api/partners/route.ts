import { NextRequest, NextResponse } from 'next/server'
import { getPartners, savePartners } from '@/lib/partners'
import { getAdminSession } from '@/lib/auth'
import { PartnerSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const partners = await getPartners()
    return NextResponse.json(partners)
  } catch {
    return NextResponse.json({ error: 'Failed to load partners' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const parsed = PartnerSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }
    const partners = await getPartners()
    const newPartner = { ...parsed.data, id: String(Date.now()) }
    await savePartners([...partners, newPartner])
    return NextResponse.json(newPartner, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 })
  }
}
