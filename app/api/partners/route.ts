import { NextRequest, NextResponse } from 'next/server'
import { getPartners, createPartner } from '@/lib/partners'
import { getAdminSession } from '@/lib/auth'
import { PartnerSchema } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

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
    const partner = await createPartner(parsed.data)
    revalidatePath('/', 'layout')
    return NextResponse.json(partner, { status: 201 })
  } catch (err) {
    console.error('[partners POST]', err)
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 })
  }
}
