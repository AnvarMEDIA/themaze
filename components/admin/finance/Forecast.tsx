'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/finance/money'
import type { Forecast as ForecastData } from '@/lib/finance/forecast'
import { useFinanceLang } from './lang'

const SPANS = [3, 6, 12] as const
const SPAN_KEY: Record<number, string> = { 3: 'fc.months3', 6: 'fc.months6', 12: 'fc.months12' }
const STORAGE_KEY = 'maze_finance_forecast_months'

/**
 * What is expected to move over the coming months.
 *
 * Every column is labelled by where it came from, and the running total is
 * called "running", never "balance": the module has no idea what is in the
 * bank, and a forecast that reads as fact is worse than no forecast.
 */
export function Forecast() {
  const router = useRouter()
  const { t, locale, month: monthName } = useFinanceLang()
  const [months, setMonths] = useState<number>(6)
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = Number(window.localStorage.getItem(STORAGE_KEY))
      if (SPANS.includes(raw as typeof SPANS[number])) setMonths(raw)
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/finance/forecast?months=${months}`, { cache: 'no-store' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    setData(await res.json())
    setLoading(false)
  }, [router, months])

  useEffect(() => { if (ready) load() }, [ready, load])

  const changeSpan = (n: number) => {
    setMonths(n)
    try { window.localStorage.setItem(STORAGE_KEY, String(n)) } catch { /* ignore */ }
  }

  if (!data) {
    return <div className="h-72 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />
  }

  const cur = data.baseCurrency
  const money = (v: number) => formatMoney(v, cur, { locale })
  const compact = (v: number) => formatMoney(v, cur, { compact: true, locale })
  const label = (m: string) => `${monthName(Number(m.slice(5, 7)) - 1)} ${m.slice(2, 4)}`

  const hasAnything =
    data.totals.expectedIn !== 0 || data.totals.expectedOut !== 0 || data.unscheduled !== 0

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">{t('fc.title')}</h2>
          <p className="text-[12px] text-[#555] mt-0.5">
            {t('fc.subtitle', { n: data.months.length, currency: cur })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-[#232323] bg-[#0B0B0B] p-0.5">
          {SPANS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => changeSpan(n)}
              aria-pressed={months === n}
              className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors ${
                months === n ? 'bg-[#C8FF47]/12 text-[#C8FF47]' : 'text-[#888] hover:text-white'
              }`}
            >
              {t(SPAN_KEY[n])}
            </button>
          ))}
        </div>
      </div>

      {!hasAnything ? (
        <div className="py-10 text-center">
          <p className="text-white font-semibold mb-1 text-sm">{t('fc.empty')}</p>
          <p className="text-[13px] text-[#666]">{t('fc.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Summary label={t('fc.expectedIn')} value={compact(data.totals.expectedIn)} tone="#8FC748" />
            <Summary label={t('fc.expectedOut')} value={compact(data.totals.expectedOut)} tone="#E27A5C" />
            <Summary
              label={t('fc.expectedNet')} value={compact(data.totals.net)}
              tone={data.totals.net >= 0 ? '#FFFFFF' : '#E27A5C'}
            />
          </div>

          <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-50' : ''}`}>
            <table className="w-full text-[13px] min-w-[720px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#555] border-b border-[#1E1E1E]">
                  <th className="py-3 pr-3 font-medium">{t('fc.month')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('fc.receivables')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('fc.overdue')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('fc.scheduledIn')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('fc.scheduledOut')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('fc.estimatedOut')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('fc.net')}</th>
                  <th className="pl-3 py-3 font-medium text-right">{t('fc.cumulative')}</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => (
                  <tr key={m.month} className="border-b border-[#151515] last:border-b-0">
                    <td className="py-3 pr-3 text-white tabular-nums whitespace-nowrap">{label(m.month)}</td>
                    <Cell value={m.receivables} money={money} tone="#8FC748" />
                    <Cell value={m.overdue} money={money} tone="#FFD447" />
                    <Cell value={m.scheduledIn} money={money} tone="#8FC748" />
                    <Cell value={m.scheduledOut} money={money} tone="#E27A5C" />
                    <Cell value={m.estimatedOut} money={money} tone="#B5852F" />
                    <td className={`px-3 py-3 text-right tabular-nums font-semibold ${m.net >= 0 ? 'text-white' : 'text-[#E27A5C]'}`}>
                      {money(m.net)}
                    </td>
                    <td className={`pl-3 py-3 text-right tabular-nums ${m.cumulative >= 0 ? 'text-[#999]' : 'text-[#E27A5C]'}`}>
                      {money(m.cumulative)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Where the numbers come from. An estimate presented without its
              basis is indistinguishable from a measurement. */}
          <div className="mt-4 pt-4 border-t border-[#1A1A1A] space-y-1.5">
            <p className="text-[11px] text-[#666] leading-relaxed">{t('fc.notBalance')}</p>
            <p className="text-[11px] text-[#666] leading-relaxed">
              {data.runRate.hasHistory
                ? t('fc.runRate', { v: money(data.runRate.monthlyAverage), n: data.runRate.months })
                : t('fc.noHistory')}
            </p>
            {data.unscheduled > 0 && (
              <p className="text-[11px] text-[#FFD447] leading-relaxed">
                {t('fc.unscheduled', { v: money(data.unscheduled) })}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Summary({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-[#1E1E1E] bg-[#0B0B0B] px-4 py-3">
      <p className="text-[11px] text-[#666] mb-1">{label}</p>
      <p className="text-[17px] font-bold tabular-nums leading-none" style={{ color: tone }}>{value}</p>
    </div>
  )
}

/** A zero reads as a dash: an empty month should look empty, not like a total. */
function Cell({ value, money, tone }: { value: number; money: (v: number) => string; tone: string }) {
  return (
    <td className="px-3 py-3 text-right tabular-nums" style={{ color: value > 0 ? tone : '#444' }}>
      {value > 0 ? money(value) : '—'}
    </td>
  )
}
