import { NextRequest, NextResponse } from 'next/server'
import { getAllProjects, createProject } from '@/lib/portfolio'
import { getAdminSession }              from '@/lib/auth'
import { slugify }                      from '@/lib/utils'
import { revalidatePath }               from 'next/cache'
import { ProjectSchema }                from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
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
    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
