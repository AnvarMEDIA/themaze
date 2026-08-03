'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatMoney, convert } from '@/lib/finance/money'
import { CURRENCIES, type Currency, type FinanceSummary } from '@/lib/finance/types'
import { MonthlyBars, HBars } from '@/components/admin/finance/Charts'
import { FIN_COLORS } from '@/components/admin/finance/tokens'
import { useFinanceLang } from '@/components/admin/finance/lang'
import { PeriodPicker, periodQuery, type PeriodValue } from '@/components/admin/finance/PeriodPicker'
import { Delta } from '@/components/admin/finance/Delta'

const PERIOD_KEY = 'maze_finance_period'
const DEFAULT_PERIOD: PeriodValue = { preset: 'year', from: '', to: '' }

export default function FinanceDashboard() {
  const router = useRouter()
  const { t, locale, tStatus } = useFinanceLang()
  const [sum, setSum] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD)
  const [ready, setReady] = useState(false)
  // "Show in other currencies" — remembered like the language choice.
  const [multiCurrency, setMultiCurrency] = useState(false)

  // Restore the remembered period/currency preference before the first fetch,
  // so the dashboard doesn't flash the default window and refetch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PERIOD_KEY)
      if (raw) {
        const p = JSON.parse(raw) as PeriodValue
        if (p?.preset) setPeriod({ preset: p.preset, from: p.from ?? '', to: p.to ?? '' })
      }
      setMultiCurrency(window.localStorage.getItem('maze_finance_multicurrency') === '1')
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  const load = useCallback(async () => {
    const res = await fetch(`/api/finance/summary?${periodQuery(period)}`, { cache: 'no-store' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    setSum(await res.json())
    setLoading(false)
  }, [router, period])

  useEffect(() => { if (ready) load() }, [ready, load])

  const changePeriod = (p: PeriodValue) => {
    setPeriod(p)
    try { window.localStorage.setItem(PERIOD_KEY, JSON.stringify(p)) } catch { /* ignore */ }
  }

  const toggleMultiCurrency = () => {
    setMultiCurrency((v) => {
      const next = !v
      try { window.localStorage.setItem('maze_finance_multicurrency', next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  if (loading || !sum) {
    return (
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        <div className="h-8 w-56 bg-[#141414] rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />)}
        </div>
        <div className="h-72 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />
      </div>
    )
  }

  const { kpis, baseCurrency } = sum
  const fmt = (v: number) => formatMoney(v, baseCurrency, { compact: true, locale })
  const hasData = kpis.revenueAllTime > 0 || sum.statusBreakdown.some((s) => s.count > 0)

  // Re-express a base-currency figure in every other currency we have a rate
  // for, using the rates the summary itself was computed with.
  const rateSettings = { baseCurrency, rates: sum.rates ?? {}, autoRates: true, updatedAt: '' }
  const otherCurrencies = CURRENCIES.filter(
    (c) => c !== baseCurrency && convert(1, baseCurrency, c, rateSettings) !== null,
  )
  const inOtherCurrencies = (value: number): string[] =>
    otherCurrencies
      .map((c) => {
        const v = convert(value, baseCurrency, c, rateSettings)
        return v === null ? null : formatMoney(v, c as Currency, { compact: true, locale })
      })
      .filter((s): s is string => s !== null)
  const showMulti = multiCurrency && otherCurrencies.length > 0

  const pct = (part: number, whole: number) =>
    whole > 0 ? Math.round((part / whole) * 100) : 0

  // Comparison against the window before this one. Absent for "all time" and
  // for an open-ended custom range, where there is nothing to compare with.
  const prev = sum.previous
  const COMPARE_LABEL: Record<string, string> = {
    month: t('dash.vsPrevMonth'),
    quarter: t('dash.vsPrevQuarter'),
    year: t('dash.vsPrevYear'),
  }
  // Short label on the tile; the exact window it compares against goes in the
  // tooltip, where it informs without crowding the number.
  const prevLabel = prev ? COMPARE_LABEL[period.preset] ?? t('dash.vsPrev') : ''
  const prevHint = prev ? `${prevLabel} · ${prev.from} – ${prev.to}` : ''

  const topClientItems = sum.topClients.map((c) => ({
    label: c.name || t('dash.unassignedClient'),
    value: c.total,
  }))
  const statusItems = sum.statusBreakdown
    .filter((s) => s.count > 0)
    .map((s) => ({
      label: tStatus(s.status),
      value: s.value,
      color: FIN_COLORS.status[s.status],
      sub: `${s.count}`,
    }))
  const expenseItems = (sum.expenseCategories ?? []).map((c) => ({
    label: c.category || t('dash.uncategorised'),
    value: c.total,
    color: FIN_COLORS.expense,
  }))

  const exportHref = `/api/finance/export?${periodQuery(period)}`

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-end justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('dash.title')}</h1>
          <p className="text-sm text-[#555] mt-1">
            {t('dash.figuresIn')} <span className="text-[#888] font-medium">{baseCurrency}</span>
            {' · '}
            {sum.ratesSource === 'cbu' ? t('dash.convertedCbu') : t('dash.convertedManual')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {otherCurrencies.length > 0 && (
            <button
              type="button"
              onClick={toggleMultiCurrency}
              aria-pressed={showMulti}
              title={showMulti ? t('dash.hideCurrencies') : t('dash.showCurrencies')}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors active:scale-[0.97] ${
                showMulti
                  ? 'border-[#C8FF47]/40 bg-[#C8FF47]/10 text-[#C8FF47]'
                  : 'border-[#2A2A2A] bg-[#161616] text-[#bbb] hover:text-white hover:border-[#333]'
              }`}
            >
              <IconCurrency size={15} />
              <span className="hidden md:inline">
                {showMulti ? t('dash.hideCurrencies') : t('dash.showCurrencies')}
              </span>
              <span className="md:hidden tabular-nums">{otherCurrencies.join(' · ')}</span>
            </button>
          )}
          <Link
            href="/admin/finance/transactions?new=1"
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97]"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">{t('dash.recordPayment')}</span>
          </Link>
        </div>
      </div>

      {/* Reporting period */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <PeriodPicker value={period} onChange={changePeriod} />
        <a
          href={exportHref}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2A2A2A] bg-[#161616] text-[13px] font-medium text-[#bbb] hover:text-white hover:border-[#333] transition-colors active:scale-[0.97]"
        >
          <IconDownload size={14} />
          {t('dash.export')}
        </a>
      </div>

      {sum.unratedCurrencies?.length > 0 && (
        <div className="mb-6 rounded-xl border border-[#FFD447]/30 bg-[#FFD447]/[0.06] px-5 py-4 flex items-start gap-3">
          <span className="text-[#FFD447] text-sm leading-5" aria-hidden="true">⚠</span>
          <p className="text-[13px] text-[#E8D9A0]">
            {t('dash.unrated', { list: sum.unratedCurrencies.join(', ') })}
          </p>
        </div>
      )}

      {/* Scheduled payments that have come due. Deliberately a prompt, not an
          action: nothing reaches the ledger until the studio confirms it. */}
      {sum.dueRecurring?.length > 0 && (
        <div className="mb-6 rounded-xl border border-[#C8FF47]/25 bg-[#C8FF47]/[0.05] px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#C8FF47]">
              {t('rec.dueBanner', { n: sum.dueRecurring.length })}
            </p>
            <p className="text-[12px] text-[#8a8a7a] mt-0.5">{t('rec.dueBannerHint')}</p>
          </div>
          <Link
            href="/admin/finance/recurring"
            className="px-3 py-2 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-[13px] font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97] whitespace-nowrap"
          >
            {t('rec.viewAll')}
          </Link>
        </div>
      )}

      {!hasData && (
        <div className="mb-6 rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-6 py-10 text-center">
          <p className="text-white font-semibold mb-1">{t('dash.emptyTitle')}</p>
          <p className="text-sm text-[#666] mb-5">{t('dash.emptyBody')}</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/admin/finance/clients?new=1" className="px-4 py-2 rounded-lg bg-[#161616] border border-[#252525] text-sm text-[#ddd] hover:border-[#333] transition-colors">{t('dash.addClient')}</Link>
            <Link href="/admin/finance/transactions?new=1" className="px-4 py-2 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97]">{t('dash.recordAPayment')}</Link>
          </div>
        </div>
      )}

      {/* KPI row — period figures, then receivables (point-in-time) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat
          label={t('dash.kpiRevenue')} value={fmt(kpis.revenue)} accent="#C8FF47"
          hint={prev ? prevLabel : t('dash.forPeriod')}
          alt={showMulti ? inOtherCurrencies(kpis.revenue) : undefined}
          delta={prev && <Delta current={kpis.revenue} previous={prev.revenue} label={prevHint} />}
        />
        <Stat
          label={t('dash.kpiExpenses')} value={fmt(kpis.expense)} accent={FIN_COLORS.expense}
          hint={kpis.revenue > 0 ? t('dash.ofRevenue', { p: pct(kpis.expense, kpis.revenue) }) : t('dash.forPeriod')}
          alt={showMulti ? inOtherCurrencies(kpis.expense) : undefined}
          // Spending more is not an improvement, so the arrow colours invert.
          delta={prev && <Delta current={kpis.expense} previous={prev.expense} goodWhen="down" label={prevHint} />}
        />
        <Stat
          label={t('dash.kpiProfit')} value={fmt(kpis.profit)}
          accent={kpis.profit >= 0 ? '#6FA02E' : '#D9563A'}
          hint={kpis.revenue > 0 ? t('dash.marginOf', { p: pct(kpis.profit, kpis.revenue) }) : t('dash.forPeriod')}
          alt={showMulti ? inOtherCurrencies(kpis.profit) : undefined}
          delta={prev && <Delta current={kpis.profit} previous={prev.profit} label={prevHint} />}
        />
        <Stat
          label={t('dash.kpiOutstanding')} value={fmt(kpis.outstanding)} accent="#FFD447"
          hint={kpis.overdue > 0 ? t('dash.overdueHint', { v: fmt(kpis.overdue) }) : t('dash.hintOutstanding')}
          hintAlert={kpis.overdue > 0}
          alt={showMulti ? inOtherCurrencies(kpis.outstanding) : undefined}
        />
      </div>

      {/* Secondary counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MiniStat label={t('dash.activeProjects')} value={kpis.activeProjects} href="/admin/finance/projects" />
        <MiniStat label={t('dash.clients')} value={kpis.totalClients} href="/admin/finance/clients" />
        <MiniStat label={t('dash.transactions')} value={sum.totalTransactions ?? sum.recentTransactions.length} href="/admin/finance/transactions" />
        <div className="rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] px-4 py-3.5 flex flex-col justify-center">
          <p className="text-[11px] text-[#555] mb-1">{t('dash.revenueAllTime')}</p>
          <p className="text-xl font-bold text-white tabular-nums">{fmt(kpis.revenueAllTime)}</p>
        </div>
      </div>

      {/* Overdue receivables — only when there is something to chase */}
      {sum.overdueProjects?.length > 0 && (
        <div className="rounded-xl bg-[#0D0D0D] border border-[#D9563A]/30 mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E1E]">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9563A]" />
              {t('dash.overdueTitle')}
            </h2>
            <span className="text-sm font-bold text-[#E27A5C] tabular-nums">{fmt(kpis.overdue)}</span>
          </div>
          <div>
            {sum.overdueProjects.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-3 border-b border-[#161616] last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{p.title}</p>
                  <p className="text-[11px] text-[#666] truncate">
                    {p.client || t('dash.unassignedClient')} · {t('dash.due', { d: p.dueDate })}
                  </p>
                </div>
                <span className="text-[11px] text-[#E27A5C] whitespace-nowrap">{t('dash.daysLate', { n: p.daysLate })}</span>
                <span className="text-sm text-white tabular-nums whitespace-nowrap">{fmt(p.outstanding)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly revenue */}
      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white">{t('dash.revLast12')}</h2>
          <span className="text-[11px] text-[#555]">{t('dash.hoverHint')}</span>
        </div>
        <MonthlyBars data={sum.monthly} currency={baseCurrency} />
      </div>

      {/* Three-up: clients, expenses, project statuses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6">
          <h2 className="text-sm font-semibold text-white mb-5">{t('dash.topClients')}</h2>
          <HBars items={topClientItems} currency={baseCurrency} emptyText={t('dash.noIncome')} />
        </div>
        <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6">
          <h2 className="text-sm font-semibold text-white mb-5">{t('dash.expenseMix')}</h2>
          <HBars items={expenseItems} currency={baseCurrency} emptyText={t('dash.noExpenses')} />
        </div>
        <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6">
          <h2 className="text-sm font-semibold text-white mb-5">{t('dash.projByStatus')}</h2>
          <HBars items={statusItems} currency={baseCurrency} emptyText={t('dash.noProjects')} />
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-white">{t('dash.recentTxns')}</h2>
          <Link href="/admin/finance/transactions" className="text-xs text-[#555] hover:text-[#C8FF47] transition-colors">{t('common.viewAll')}</Link>
        </div>
        {sum.recentTransactions.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#444]">{t('dash.nothingRecorded')}</p>
        ) : (
          <div>
            {sum.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-6 py-3 border-b border-[#161616] last:border-b-0">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                  style={{ background: tx.type === 'income' ? '#6FA02E20' : '#D9563A20', color: tx.type === 'income' ? '#8Fc748' : '#E27A5C' }}
                  aria-hidden="true"
                >
                  {/* Up for money in, down for money out — the arrow has to
                      agree with the +/− sign and the colour beside it, or the
                      row reads as a contradiction at a glance. */}
                  {tx.type === 'income' ? '↑' : '↓'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{tx.category || (tx.type === 'income' ? t('txn.payment') : t('txn.expense'))}</p>
                  <p className="text-[11px] text-[#555]">{tx.date}</p>
                </div>
                <span className={`text-sm tabular-nums font-medium ${tx.type === 'income' ? 'text-[#8FC748]' : 'text-[#E27A5C]'}`}>
                  {tx.type === 'income' ? '+' : '−'}{formatMoney(tx.amount, tx.currency, { locale })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({
  label, value, accent, hint, alt, hintAlert = false, delta,
}: {
  label: string
  value: string
  accent: string
  hint: string
  alt?: string[]
  hintAlert?: boolean
  delta?: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
        <p className="text-[11px] text-[#666]">{label}</p>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="text-[22px] font-bold text-white tabular-nums leading-none">{value}</p>
        {delta}
      </div>
      {alt && alt.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-[#1A1A1A] space-y-1 fin-fade">
          {alt.map((v) => (
            <p key={v} className="text-[12px] text-[#9a9a9a] tabular-nums leading-none">{v}</p>
          ))}
        </div>
      )}
      <p className={`text-[11px] mt-2 truncate ${hintAlert ? 'text-[#E27A5C]' : 'text-[#555]'}`}>{hint}</p>
    </div>
  )
}

function MiniStat({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <Link href={href} className="rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] px-4 py-3.5 hover:border-[#2A2A2A] transition-colors group">
      <p className="text-[11px] text-[#555] mb-1">{label}</p>
      <p className="text-xl font-bold text-white tabular-nums group-hover:text-[#C8FF47] transition-colors">{value}</p>
    </Link>
  )
}

function IconCurrency({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.2" cy="6.2" r="4.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.4 3.1a4.4 4.4 0 11-3.1 8.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" transform="translate(2.6 1.5)" />
    </svg>
  )
}

function IconDownload({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v7m0 0L5.4 6.4M8 9l2.6-2.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.8 11v1.4A1.6 1.6 0 004.4 14h7.2a1.6 1.6 0 001.6-1.6V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
