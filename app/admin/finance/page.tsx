'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/finance/money'
import type { FinanceSummary } from '@/lib/finance/types'
import { MonthlyBars, HBars } from '@/components/admin/finance/Charts'
import { FIN_COLORS } from '@/components/admin/finance/tokens'
import { useFinanceLang } from '@/components/admin/finance/lang'

export default function FinanceDashboard() {
  const router = useRouter()
  const { t, locale, tStatus } = useFinanceLang()
  const [sum, setSum] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/finance/summary', { cache: 'no-store' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    setSum(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

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

  const topClientItems = sum.topClients.map((c) => ({ label: c.name, value: c.total }))
  const statusItems = sum.statusBreakdown
    .filter((s) => s.count > 0)
    .map((s) => ({
      label: tStatus(s.status),
      value: s.value,
      color: FIN_COLORS.status[s.status],
      sub: `${s.count}`,
    }))

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-end justify-between gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('dash.title')}</h1>
          <p className="text-sm text-[#555] mt-1">
            {t('dash.figuresIn')} <span className="text-[#888] font-medium">{baseCurrency}</span> · {t('dash.convertedAt')}
          </p>
        </div>
        <Link
          href="/admin/finance/transactions?new=1"
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg bg-[#C8FF47] text-[#0A0A0A] text-sm font-bold hover:bg-[#F0EEE6] transition-colors active:scale-[0.97] flex-shrink-0"
        >
          <span className="text-base leading-none">+</span>
          <span className="hidden sm:inline">{t('dash.recordPayment')}</span>
        </Link>
      </div>

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

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label={t('dash.kpiRevenueYear')} value={fmt(kpis.revenueThisYear)} accent="#C8FF47" hint={t('dash.hintThisMonth', { v: fmt(kpis.revenueThisMonth) })} />
        <Stat label={t('dash.kpiOutstanding')} value={fmt(kpis.outstanding)} accent="#FFD447" hint={t('dash.hintOutstanding')} />
        <Stat label={t('dash.kpiProfitYear')} value={fmt(kpis.profitThisYear)} accent={kpis.profitThisYear >= 0 ? '#6FA02E' : '#D9563A'} hint={t('dash.hintExpenses', { v: fmt(kpis.expenseThisYear) })} />
        <Stat label={t('dash.kpiAllTime')} value={fmt(kpis.revenueAllTime)} accent="#47C8FF" hint={t('dash.hintSince')} />
      </div>

      {/* Secondary counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MiniStat label={t('dash.activeProjects')} value={kpis.activeProjects} href="/admin/finance/projects" />
        <MiniStat label={t('dash.clients')} value={kpis.totalClients} href="/admin/finance/clients" />
        <MiniStat label={t('dash.transactions')} value={sum.recentTransactions.length >= 8 ? '8+' : sum.recentTransactions.length} href="/admin/finance/transactions" />
        <div className="rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] px-4 py-3.5 flex flex-col justify-center">
          <p className="text-[11px] text-[#555] mb-1">{t('dash.revByCurrency')}</p>
          <p className="text-[13px] text-[#bbb] truncate">
            {sum.revenueByCurrency.length
              ? sum.revenueByCurrency.map((c) => formatMoney(c.amount, c.currency, { compact: true, locale })).join(' · ')
              : '—'}
          </p>
        </div>
      </div>

      {/* Monthly revenue */}
      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white">{t('dash.revLast12')}</h2>
          <span className="text-[11px] text-[#555]">{t('dash.hoverHint')}</span>
        </div>
        <MonthlyBars data={sum.monthly} currency={baseCurrency} />
      </div>

      {/* Two-up */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-6">
          <h2 className="text-sm font-semibold text-white mb-5">{t('dash.topClients')}</h2>
          <HBars items={topClientItems} currency={baseCurrency} emptyText={t('dash.noIncome')} />
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
                  {tx.type === 'income' ? '↓' : '↑'}
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

function Stat({ label, value, accent, hint }: { label: string; value: string; accent: string; hint: string }) {
  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
        <p className="text-[11px] text-[#666]">{label}</p>
      </div>
      <p className="text-[22px] font-bold text-white tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-[#555] mt-2 truncate">{hint}</p>
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
