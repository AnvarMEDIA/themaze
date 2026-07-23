import { NextResponse } from 'next/server'
import { requireFinance } from '@/lib/finance/guard'
import { forceRefreshCbu } from '@/lib/finance/cbuRates'
import { getEffectiveFinanceSettings } from '@/lib/finance/settings'

export const dynamic = 'force-dynamic'

// Force a live pull from the Central Bank (CBU). Returns whether it reached the
// bank plus the resulting effective rates so the settings UI can update.
export async function POST() {
  const blocked = await requireFinance()
  if (blocked) return blocked

  const { ok, cache } = await forceRefreshCbu()
  const effective = await getEffectiveFinanceSettings()
  return NextResponse.json({
    ok,
    ratesUpdatedAt: cache.fetchedAt,
    effectiveRates: effective.rates,
    ratesSource: effective.ratesSource,
  })
}
