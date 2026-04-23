import { NextRequest, NextResponse } from 'next/server'
import { getTestimonials, saveTestimonials } from '@/lib/testimonials'
import { getAdminSession } from '@/lib/auth'
import { TestimonialsSchema } from '@/lib/validation'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  const testimonials = await getTestimonials()
  return NextResponse.json(testimonials)
}

export async function PUT(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const parsed = TestimonialsSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  await saveTestimonials(parsed.data)
  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
