import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getTeam, saveTeam } from '@/lib/team'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  const team = await getTeam()
  return NextResponse.json(team)
}

export async function PUT(req: NextRequest) {
  const authed = await getAdminSession()
  if (!authed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const members = await req.json()
  if (!Array.isArray(members)) {
    return NextResponse.json({ error: 'Expected array' }, { status: 400 })
  }

  await saveTeam(members)
  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
