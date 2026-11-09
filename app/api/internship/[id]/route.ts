import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { InternApplicationPatchSchema } from '@/lib/validation'
import { deleteApplication, updateApplication } from '@/lib/internshipStore'

export const dynamic = 'force-dynamic'

interface Ctx {
  params: { id: string }
}

/** Move a candidate to another status, or change the studio's note on them. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const parsed = InternApplicationPatchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }
  try {
    const updated = await updateApplication(params.id, parsed.data)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[internship PATCH]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  try {
    await deleteApplication(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[internship DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
