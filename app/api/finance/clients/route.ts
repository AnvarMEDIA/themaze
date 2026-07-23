import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { listClients, createClient } from '@/lib/finance/data'
import { ClientSchema } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked
  return NextResponse.json(await listClients())
}

export async function POST(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const parsed = ClientSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  const client = await createClient(parsed.data)
  return NextResponse.json(client, { status: 201 })
}
