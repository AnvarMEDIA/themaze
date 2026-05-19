import { NextRequest, NextResponse } from 'next/server'
import { reorderProjects } from '@/lib/portfolio'
import { getAdminSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { ProjectReorderSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const parsed = ProjectReorderSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }

    await reorderProjects(parsed.data.ids)
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Reorder error:', err)
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
  }
}
