import { NextRequest, NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import {
  getFinanceSettings,
  saveFinanceSettings,
  getEffectiveFinanceSettings,
} from '@/lib/finance/settings'
import { FinanceSettingsSchema } from '@/lib/finance/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const [manual, effective] = await Promise.all([
    getFinanceSettings(),
    getEffectiveFinanceSettings(),
  ])
  return NextResponse.json({
    baseCurrency: manual.baseCurrency,
    autoRates: manual.autoRates,
    rates: manual.rates, // stored manual rates (for editing when auto is off)
    effectiveRates: effective.rates, // what's actually used (CBU when auto)
    ratesSource: effective.ratesSource,
    ratesUpdatedAt: effective.ratesUpdatedAt,
  })
}

export async function PUT(req: NextRequest) {
  const blocked = await requireFinance()
  if (blocked) return blocked
  const parsed = FinanceSettingsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }
  await saveFinanceSettings({
    baseCurrency: parsed.data.baseCurrency,
    rates: parsed.data.rates ?? {},
    autoRates: parsed.data.autoRates,
  })
  // Return the effective view so the UI immediately reflects CBU rates when on.
  const effective = await getEffectiveFinanceSettings()
  return NextResponse.json({
    baseCurrency: effective.baseCurrency,
    autoRates: effective.autoRates,
    rates: parsed.data.rates ?? {},
    effectiveRates: effective.rates,
    ratesSource: effective.ratesSource,
    ratesUpdatedAt: effective.ratesUpdatedAt,
  })
}
