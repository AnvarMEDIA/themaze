import { NextRequest, NextResponse } from 'next/server'
import { getAllProjects, createProject } from '@/lib/portfolio'
import { getAdminSession }              from '@/lib/auth'
import { slugify }                      from '@/lib/utils'
import { revalidatePath }               from 'next/cache'
import { ProjectSchema }                from '@/lib/validation'
import { notifyIndexNow, localePair }   from '@/lib/indexing'
import { rateLimitAsync }               from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await rateLimitAsync(`portfolio-get:${ip}`, { limit: 60, windowMs: 60 * 1000 })
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const projects = await getAllProjects()
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const parsed = ProjectSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }

    const data    = parsed.data
    const project = await createProject({
      ...data,
      slug: data.slug ?? slugify(data.title),
      year: data.year ?? new Date().getFullYear(),
    })

    revalidatePath('/', 'layout')
    // Fire-and-forget IndexNow ping — never blocks the response.
    if (project.status !== 'draft') {
      void notifyIndexNow([
        ...localePair(`portfolio/${project.slug}`),
        ...localePair('portfolio'),
      ])
    }
    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
