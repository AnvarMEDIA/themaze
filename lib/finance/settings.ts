import { readStore, writeStore } from '../store'
import { DEFAULT_FINANCE_SETTINGS } from './money'
import { getCbuRates } from './cbuRates'
import { CURRENCIES, type Currency, type FinanceSettings } from './types'

const STORE_KEY = 'finance_settings'

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const stored = await readStore<FinanceSettings | null>(STORE_KEY, null)
  if (!stored) return DEFAULT_FINANCE_SETTINGS
  const baseCurrency = stored.baseCurrency ?? DEFAULT_FINANCE_SETTINGS.baseCurrency
  // Once settings exist, the stored rates are the whole truth. The seed rates
  // are NOT merged back in: doing so made a rate impossible to clear and, more
  // importantly, presented a hard-coded guess as if it were a real rate — so a
  // currency the admin never priced was converted with a stale number instead
  // of being reported as unrated. (They are also UZS-denominated, so merging
  // them under another base would be wrong outright.)
  return {
    baseCurrency,
    rates: stored.rates ?? {},
    autoRates: stored.autoRates ?? DEFAULT_FINANCE_SETTINGS.autoRates,
    updatedAt: stored.updatedAt ?? DEFAULT_FINANCE_SETTINGS.updatedAt,
  }
}

export async function saveFinanceSettings(
  input: Pick<FinanceSettings, 'baseCurrency' | 'rates' | 'autoRates'>,
): Promise<FinanceSettings> {
  const next: FinanceSettings = {
    baseCurrency: input.baseCurrency,
    rates: input.rates,
    autoRates: input.autoRates,
    updatedAt: new Date().toISOString(),
  }
  await writeStore<FinanceSettings>(STORE_KEY, next)
  return next
}

export interface EffectiveSettings extends FinanceSettings {
  ratesSource: 'cbu' | 'manual'
  ratesUpdatedAt: string | null
}

/**
 * The settings actually used for conversion. When `autoRates` is on, live CBU
 * rates (value of 1 unit in UZS) are cross-converted into the base currency
 * and overlaid on top of the manual rates; any currency CBU doesn't cover, or
 * a total CBU outage, falls back to the manual rate. This is what stats/summary
 * consume, so the dashboard always reflects the Central Bank when available.
 */
export async function getEffectiveFinanceSettings(): Promise<EffectiveSettings> {
  const settings = await getFinanceSettings()
  if (!settings.autoRates) {
    return { ...settings, ratesSource: 'manual', ratesUpdatedAt: null }
  }

  const cbu = await getCbuRates()
  const cbuInUzs: Record<string, number> = { UZS: 1, ...cbu.rates }
  const baseInUzs = cbuInUzs[settings.baseCurrency]

  const derived: Partial<Record<Currency, number>> = {}
  if (baseInUzs && baseInUzs > 0) {
    for (const c of CURRENCIES) {
      if (c === settings.baseCurrency) continue
      const cInUzs = cbuInUzs[c]
      if (cInUzs && cInUzs > 0) derived[c] = cInUzs / baseInUzs
    }
  }

  const hasCbu = Object.keys(derived).length > 0
  return {
    ...settings,
    rates: hasCbu ? { ...settings.rates, ...derived } : settings.rates,
    ratesSource: hasCbu ? 'cbu' : 'manual',
    ratesUpdatedAt: hasCbu ? cbu.fetchedAt : null,
  }
}
