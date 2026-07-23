import { readStore, writeStore } from '../store'
import { DEFAULT_FINANCE_SETTINGS } from './money'
import type { FinanceSettings } from './types'

const STORE_KEY = 'finance_settings'

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const stored = await readStore<FinanceSettings | null>(STORE_KEY, null)
  if (!stored) return DEFAULT_FINANCE_SETTINGS
  // Merge so a newly-added default currency rate still appears if unset.
  return {
    baseCurrency: stored.baseCurrency ?? DEFAULT_FINANCE_SETTINGS.baseCurrency,
    rates: { ...DEFAULT_FINANCE_SETTINGS.rates, ...stored.rates },
    updatedAt: stored.updatedAt ?? DEFAULT_FINANCE_SETTINGS.updatedAt,
  }
}

export async function saveFinanceSettings(
  input: Pick<FinanceSettings, 'baseCurrency' | 'rates'>,
): Promise<FinanceSettings> {
  const next: FinanceSettings = {
    baseCurrency: input.baseCurrency,
    rates: input.rates,
    updatedAt: new Date().toISOString(),
  }
  await writeStore<FinanceSettings>(STORE_KEY, next)
  return next
}
