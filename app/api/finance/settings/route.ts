import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { getFinanceSettings, saveFinanceSettings } from '@/lib/finance/settings'
import { FinanceSettingsSchema } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked
  return NextResponse.json(await getFinanceSettings())
}

export async function PUT(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const parsed = FinanceSettingsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  const saved = await saveFinanceSettings({
    baseCurrency: parsed.data.baseCurrency,
    rates: parsed.data.rates ?? {},
  })
  return NextResponse.json(saved)
}
