/**
 * Exchange rates from the Central Bank of the Republic of Uzbekistan (CBU).
 *
 * CBU publishes an official JSON feed (updated on business days) at
 * https://cbu.uz/…/arkhiv-kursov-valyut/json/ — an array of rows where `Rate`
 * is the value of `Nominal` units of `Ccy` in UZS. We keep the value of ONE
 * unit in UZS, cache it in the KV store, and refresh when stale.
 *
 * Server-only (uses the store + outbound fetch). Fetching is best-effort:
 * on any failure we keep serving the last good cache (or fall back to the
 * user's manual rates upstream), so the dashboard never breaks when CBU is
 * briefly unreachable.
 */
import { readStore, writeStore } from '../store'
import { CURRENCIES, type Currency } from './types'

const CACHE_KEY = 'finance_cbu'
const CBU_URL = 'https://cbu.uz/ru/arkhiv-kursov-valyut/json/'
const TRACKED = CURRENCIES.filter((c) => c !== 'UZS') // USD, EUR, RUB
const DEFAULT_MAX_AGE = 6 * 60 * 60 * 1000 // 6h — CBU updates about once/business day
const RETRY_BACKOFF = 15 * 60 * 1000 // don't re-hit CBU on every request if it just failed
const EPOCH = '1970-01-01T00:00:00.000Z'

export interface CbuCache {
  /** Value of 1 unit of the currency in UZS. */
  rates: Partial<Record<Currency, number>>
  fetchedAt: string
  /** Last time a live fetch was attempted (success or failure) — powers backoff. */
  lastAttemptAt?: string
}

interface CbuRow {
  Ccy?: string
  Rate?: string | number
  Nominal?: string | number
}

/**
 * Pure parser — extracts {currency: valuePerUnitInUZS} for the tracked
 * currencies. Kept separate from the network call so it can be unit-tested.
 */
export function parseCbuRows(rows: unknown): Partial<Record<Currency, number>> {
  const out: Partial<Record<Currency, number>> = {}
  if (!Array.isArray(rows)) return out
  for (const raw of rows as CbuRow[]) {
    const ccy = raw?.Ccy
    if (!ccy || !(TRACKED as string[]).includes(ccy)) continue
    const rate = Number(raw.Rate)
    const nominal = Number(raw.Nominal) || 1
    if (Number.isFinite(rate) && rate > 0) out[ccy as Currency] = rate / nominal
  }
  return out
}

async function fetchCbuLive(timeoutMs = 8000): Promise<Partial<Record<Currency, number>>> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(CBU_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`CBU responded ${res.status}`)
    return parseCbuRows(await res.json())
  } finally {
    clearTimeout(timer)
  }
}

/** Cached CBU rates, refreshing from the live feed when older than maxAgeMs. */
export async function getCbuRates(maxAgeMs = DEFAULT_MAX_AGE): Promise<CbuCache> {
  const cached = await readStore<CbuCache | null>(CACHE_KEY, null)
  const hasData = cached && Object.keys(cached.rates ?? {}).length > 0
  const fresh = hasData && Date.now() - new Date(cached!.fetchedAt).getTime() < maxAgeMs
  if (fresh) return cached!

  // Backoff: if a live fetch was just attempted and we still have no fresh data,
  // don't hammer CBU on every page load — serve what we have until the window
  // passes. (A manual "Refresh now" bypasses this via forceRefreshCbu.)
  if (
    cached?.lastAttemptAt &&
    Date.now() - new Date(cached.lastAttemptAt).getTime() < RETRY_BACKOFF
  ) {
    return cached
  }

  const { ok, cache } = await forceRefreshCbu(cached ?? undefined)
  void ok
  return cache
}

/** Force a live refresh (used by the "Refresh now" button and by getCbuRates). */
export async function forceRefreshCbu(prev?: CbuCache | null): Promise<{ ok: boolean; cache: CbuCache }> {
  const cached = prev ?? (await readStore<CbuCache | null>(CACHE_KEY, null))
  const nowIso = new Date().toISOString()
  try {
    const rates = await fetchCbuLive()
    if (Object.keys(rates).length === 0) throw new Error('no tracked rates in feed')
    const cache: CbuCache = { rates, fetchedAt: nowIso, lastAttemptAt: nowIso }
    await writeStore(CACHE_KEY, cache)
    return { ok: true, cache }
  } catch (err) {
    console.warn('[cbu] fetch failed:', err instanceof Error ? err.message : err)
    // Persist the attempt time so backoff kicks in; keep any prior good rates.
    const cache: CbuCache = {
      rates: cached?.rates ?? {},
      fetchedAt: cached?.fetchedAt ?? EPOCH,
      lastAttemptAt: nowIso,
    }
    await writeStore(CACHE_KEY, cache)
    return { ok: false, cache }
  }
}
