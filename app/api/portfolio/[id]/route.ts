import { NextRequest, NextResponse } from 'next/server'
import { getProjectById, updateProject, deleteProject, softDeleteProject, restoreProject } from '@/lib/portfolio'
import { getAdminSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { ProjectUpdateSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

interface Ctx {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const project = await getProjectById(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const parsed = ProjectUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }
    const project = await updateProject(params.id, parsed.data)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidatePath('/', 'layout')
    return NextResponse.json(project)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[portfolio PATCH]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const hard = new URL(req.url).searchParams.get('hard') === '1'
  if (hard) {
    const ok = await deleteProject(params.id)
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true, hard: true })
  }

  const project = await softDeleteProject(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, deletedAt: project.deletedAt })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const action = new URL(req.url).searchParams.get('action')
  if (action !== 'restore') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
  const project = await restoreProject(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidatePath('/', 'layout')
  return NextResponse.json(project)
}
