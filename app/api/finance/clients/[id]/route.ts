import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getClient, updateClient, deleteClient } from '@/lib/finance/data'
import { ClientUpdateSchema, parsePatch } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

interface Ctx { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const client = await getClient(params.id)
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  // parsePatch, not safeParse: a PATCH must touch only the fields it sent.
  const parsed = parsePatch(ClientUpdateSchema, await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  const client = await updateClient(params.id, parsed.data)
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const ok = await deleteClient(params.id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
