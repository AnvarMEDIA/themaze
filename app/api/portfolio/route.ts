import { NextRequest, NextResponse } from 'next/server'
import { getAllProjects, createProject } from '@/lib/portfolio'
import { getAdminSession }              from '@/lib/auth'
import { slugify }                      from '@/lib/utils'
import type { CreateProjectInput }      from '@/lib/types'

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
    const body = (await req.json()) as Partial<CreateProjectInput>

    if (!body.title || !body.client || !body.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const project = await createProject({
      title:            body.title,
      slug:             body.slug ?? slugify(body.title),
      client:           body.client,
      category:         body.category,
      year:             body.year ?? new Date().getFullYear(),
      description:      body.description ?? '',
      shortDescription: body.shortDescription ?? '',
      coverImage:       body.coverImage ?? '',
      images:           body.images ?? [],
      tags:             body.tags ?? [],
      services:         body.services ?? [],
      featured:         body.featured ?? false,
      accentColor:      body.accentColor ?? '#C8FF47',
      results:          body.results,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
