import { NextRequest, NextResponse } from 'next/server'
import { updatePartner, deletePartner } from '@/lib/partners'
import { getAdminSession } from '@/lib/auth'
import { PartnerSchema } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const parsed = PartnerSchema.partial().safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }
    const updated = await updatePartner(params.id, parsed.data)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidatePath('/', 'layout')
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[partners PUT]', err)
    return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const removed = await deletePartner(params.id)
    if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidatePath('/', 'layout')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[partners DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 })
  }
}
