import { NextRequest, NextResponse } from 'next/server'
import { getTestimonials, saveTestimonials } from '@/lib/testimonials'
import { getAdminSession } from '@/lib/auth'
import { TestimonialsSchema } from '@/lib/validation'
import { revalidatePath } from 'next/cache'
import { rateLimitAsync } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await rateLimitAsync(`testimonials-get:${ip}`, { limit: 60, windowMs: 60 * 1000 })
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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
