import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getProject, updateProject, deleteProject } from '@/lib/finance/data'
import { ProjectUpdateSchema, parsePatch } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

interface Ctx { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const project = await getProject(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  // parsePatch, not safeParse: a PATCH must touch only the fields it sent.
  const parsed = parsePatch(ProjectUpdateSchema, await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  const project = await updateProject(params.id, parsed.data)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const ok = await deleteProject(params.id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
