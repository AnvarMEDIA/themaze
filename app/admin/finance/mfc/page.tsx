'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatMoney } from '@/lib/finance/money'
import type { FinanceSettings } from '@/lib/finance/types'
import type { MfcCategory, MfcSummary } from '@/lib/mfc/types'
import { useFinanceLang } from '@/components/admin/finance/lang'
import { PeriodPicker, periodQuery, type PeriodValue } from '@/components/admin/finance/PeriodPicker'
import { Delta } from '@/components/admin/finance/Delta'
import { AddButton } from '@/components/admin/finance/mfc/MfcNav'
import { QuickAdd } from '@/components/admin/finance/mfc/QuickAdd'
import { CategoryBars } from '@/components/admin/finance/mfc/CategoryBars'
import { TrendBars } from '@/components/admin/finance/mfc/TrendBars'
import { Budgets } from '@/components/admin/finance/mfc/Budgets'
import { ExpenseList } from '@/components/admin/finance/mfc/ExpenseList'
import { catLabel, friendlyDate } from '@/components/admin/finance/mfc/shared'

// Its own remembered period, deliberately not the studio dashboard's: personal
// spending is looked at by the month, company figures by the year, and sharing
// one key made each screen keep changing the other's window.
const PERIOD_KEY = 'maze_mfc_period'
const DEFAULT_PERIOD: PeriodValue = { preset: 'month', from: '', to: '' }

export default function MfcDashboard() {
  const router = useRouter()
  const { t, lang, locale } = useFinanceLang()
  const [sum, setSum] = useState<MfcSummary | null>(null)
  const [cats, setCats] = useState<MfcCategory[]>([])
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PERIOD_KEY)
      if (raw) {
        const p = JSON.parse(raw) as PeriodValue
        if (p?.preset) setPeriod({ preset: p.preset, from: p.from ?? '', to: p.to ?? '' })
      }
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([
      fetch(`/api/finance/mfc/summary?${periodQuery(period)}`, { cache: 'no-store' }),
      fetch('/api/finance/mfc/categories', { cache: 'no-store' }),
    ])
    if (s.status === 401 || c.status === 401) { router.push('/admin/finance/unlock'); return }
    setSum(await s.json())
    setCats(await c.json())
    setLoading(false)
  }, [router, period])

  useEffect(() => { if (ready) load() }, [ready, load])

  const changePeriod = (p: PeriodValue) => {
    setPeriod(p)
    try { window.localStorage.setItem(PERIOD_KEY, JSON.stringify(p)) } catch { /* ignore */ }
  }

  // `txBase` needs a settings shape; autoRates is irrelevant to it — the rates
  // that produced these figures are the ones that must price the rows.
  const settings: FinanceSettings | null = useMemo(
    () => (sum ? { baseCurrency: sum.baseCurrency, rates: sum.rates, autoRates: false, updatedAt: '' } : null),
    [sum],
  )

  if (loading || !sum || !settings) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-[1400px] mx-auto">
        <div className="h-8 w-48 bg-[#141414] rounded animate-pulse mb-6" />
        <div className="h-32 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse mb-4" />
        <div className="h-72 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />
      </div>
    )
  }

  const cur = sum.baseCurrency
  const money = (v: number) => formatMoney(v, cur, { locale })
  const largestCat = sum.largest?.categoryId
    ? cats.find((c) => c.id === sum.largest?.categoryId)
    : undefined

  return (
    <div className="px-4 sm:px-6 py-6 pb-24 sm:pb-10 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('mfc.title')}</h1>
          <p className="text-sm text-[#555] mt-1">{t('mfc.subtitle', { currency: cur })}</p>
        </div>
        <AddButton onClick={() => setAdding(true)} />
      </div>

      <div className="mb-5">
        <PeriodPicker value={period} onChange={changePeriod} />
      </div>

      {sum.unratedCurrencies.length > 0 && (
        <div className="mb-4 rounded-xl border border-[#FFD447]/30 bg-[#FFD447]/[0.06] px-4 py-3 flex items-start gap-2.5">
          <span className="text-[#FFD447] text-sm leading-5" aria-hidden="true">⚠</span>
          <p className="text-[12px] text-[#E8D9A0]">
            {t('dash.unrated', { list: sum.unratedCurrencies.join(', ') })}
          </p>
        </div>
      )}

      {/* The one number this screen is opened for. */}
      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 sm:p-6 mb-4">
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5A5A5A] mb-2">
          {t('mfc.spentIn')}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-[38px] sm:text-[46px] leading-none font-bold text-white">
            {money(sum.total)}
          </p>
          {sum.previous ? (
            // Spending going DOWN is the good direction here — the opposite of
            // the studio dashboard, where the same widget tracks revenue.
            <Delta
              current={sum.total}
              previous={sum.previous.total}
              goodWhen="down"
              label={t('mfc.vsPrev')}
              fromNothingKey="mfc.vsFromNothing"
            />
          ) : null}
        </div>
        {sum.previous && (
          <p className="text-[11px] text-[#5A5A5A] mt-2">
            {t('mfc.vsPrev')}: {money(sum.previous.total)}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-[#1A1A1A]">
          <Stat label={t('mfc.perDay')} value={money(sum.dailyAverage)} hint={t('mfc.perDayHint')} />
          <Stat label={t('mfc.records')} value={String(sum.count)} />
          {sum.largest && (
            <Stat
              label={t('mfc.largest')}
              value={money(sum.largest.amount)}
              hint={`${largestCat ? catLabel(largestCat, lang, '') + ' · ' : ''}${friendlyDate(
                sum.largest.date, locale, { today: t('mfc.today'), yesterday: t('mfc.yesterday') },
              )}`}
            />
          )}
        </div>
      </div>

      {sum.count === 0 ? (
        <div className="rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-6 py-16 text-center">
          <p className="text-white font-semibold mb-1">{t('mfc.emptyPeriod')}</p>
          <p className="text-sm text-[#666]">{t('mfc.emptyPeriodHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <CategoryBars categories={sum.categories} total={sum.total} currency={cur} />
            <TrendBars buckets={sum.buckets} granularity={sum.granularity} currency={cur} />
          </div>

          <div className="space-y-4">
            <Budgets budgets={sum.budgets} month={sum.budgetMonth} currency={cur} />

            <div>
              <div className="flex items-baseline justify-between gap-3 mb-2.5 px-1">
                <h2 className="text-sm font-semibold text-white">{t('mfc.recent')}</h2>
                <Link
                  href="/admin/finance/mfc/expenses"
                  className="text-[12px] text-[#888] hover:text-[#C8FF47] transition-colors"
                >
                  {t('common.viewAll')}
                </Link>
              </div>
              <ExpenseList
                expenses={sum.recent}
                categories={cats}
                settings={settings}
                emptyTitle={t('mfc.empty')}
                emptyHint={t('mfc.emptyHint')}
              />
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-[#4A4A4A] leading-relaxed mt-6 max-w-[640px]">
        <span className="text-[#666]">{t('mfc.aboutTitle')}.</span> {t('mfc.aboutBody')}
      </p>

      <QuickAdd
        open={adding}
        onClose={() => setAdding(false)}
        categories={cats}
        baseCurrency={cur}
        onSaved={load}
      />
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] text-[#666] mb-1">{label}</p>
      <p className="text-[17px] font-semibold text-white tabular-nums leading-none">{value}</p>
      {hint && <p className="text-[10px] text-[#4F4F4F] mt-1.5 leading-snug">{hint}</p>}
    </div>
  )
}
