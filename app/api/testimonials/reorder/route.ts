import { NextRequest, NextResponse } from 'next/server'
import { reorderTestimonials } from '@/lib/testimonials'
import { getAdminSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { ReorderSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const parsed = ReorderSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }

    await reorderTestimonials(parsed.data.ids)
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Testimonials reorder error:', err)
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
  }
}
