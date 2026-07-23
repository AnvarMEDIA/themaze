import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listProjects, createProject } from '@/lib/finance/data'
import { ProjectSchema } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked
  return NextResponse.json(await listProjects())
}

export async function POST(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const parsed = ProjectSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  const project = await createProject(parsed.data)
  return NextResponse.json(project, { status: 201 })
}
