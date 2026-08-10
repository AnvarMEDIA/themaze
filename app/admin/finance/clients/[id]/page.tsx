'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/finance/money'
import type { ClientSummary } from '@/lib/finance/clientSummary'
import { MonthlyBars } from '@/components/admin/finance/Charts'
import { useFinanceLang } from '@/components/admin/finance/lang'

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { t, locale, tStatus, tMethod } = useFinanceLang()
  const [sum, setSum] = useState<ClientSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/finance/clients/${params.id}/summary`, { cache: 'no-store' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    if (res.status === 404) { setMissing(true); setLoading(false); return }
    setSum(await res.json())
    setLoading(false)
  }, [router, params.id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        <div className="h-8 w-56 bg-[#141414] rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />)}
        </div>
        <div className="h-64 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />
      </div>
    )
  }

  if (missing || !sum) {
    return (
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        <Link href="/admin/finance/clients" className="text-[13px] text-[#666] hover:text-[#C8FF47] transition-colors">{t('cd.back')}</Link>
        <p className="mt-6 text-white">{t('cd.notFound')}</p>
      </div>
    )
  }

  const c = sum.client
  const cur = sum.baseCurrency
  const money = (v: number) => formatMoney(v, cur, { locale })
  const compact = (v: number) => formatMoney(v, cur, { compact: true, locale })

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <Link href="/admin/finance/clients" className="text-[13px] text-[#666] hover:text-[#C8FF47] transition-colors">{t('cd.back')}</Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">{c.company || c.name}</h1>
          <p className="text-sm text-[#555] mt-1 truncate">
            {c.company && c.name ? c.name : ''}
            {c.email && <>{c.company && c.name ? ' · ' : ''}{c.email}</>}
            {c.phone && <> · {c.phone}</>}
          </p>
        </div>
        <a
          href={`/api/finance/export?preset=all&clientId=${c.id}`}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2A2A2A] bg-[#161616] text-[13px] font-medium text-[#bbb] hover:text-white hover:border-[#333] transition-colors active:scale-[0.97] flex-shrink-0"
        >
          {t('cd.statement')}
        </a>
      </div>

      {sum.unratedCurrencies?.length > 0 && (
        <div className="mb-5 rounded-xl border border-[#FFD447]/30 bg-[#FFD447]/[0.06] px-5 py-4 flex items-start gap-3">
          <span className="text-[#FFD447] text-sm leading-5" aria-hidden="true">⚠</span>
          <p className="text-[13px] text-[#E8D9A0]">{t('dash.unrated', { list: sum.unratedCurrencies.join(', ') })}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Tile label={t('cd.billed')} value={compact(sum.totals.billed)} accent="#3E92C8" hint={t('cd.billedHint')} />
        <Tile label={t('cd.received')} value={compact(sum.totals.received)} accent="#C8FF47" hint={t('cd.receivedHint')} />
        <Tile
          label={t('cd.outstanding')} value={compact(sum.totals.outstanding)} accent="#FFD447"
          hint={sum.totals.overdue > 0 ? t('cd.overdueHint', { v: compact(sum.totals.overdue) }) : t('cd.onTime')}
          hintAlert={sum.totals.overdue > 0}
        />
        <Tile
          label={t('cd.projectsCount')} value={String(sum.totals.projects)} accent="#9166D6"
          hint={t('cd.activeOf', { n: sum.totals.activeProjects })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] px-4 py-3.5">
          <p className="text-[11px] text-[#555] mb-1">{t('cd.firstPayment')}</p>
          <p className="text-[15px] font-semibold text-white tabular-nums">{sum.firstPayment || t('cd.never')}</p>
        </div>
        <div className="rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] px-4 py-3.5">
          <p className="text-[11px] text-[#555] mb-1">{t('cd.lastPayment')}</p>
          <p className="text-[15px] font-semibold text-white tabular-nums">{sum.lastPayment || t('cd.never')}</p>
        </div>
      </div>

      {sum.totals.received > 0 && (
        <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 sm:p-6 mb-6">
          <h2 className="text-sm font-semibold text-white mb-5">{t('cd.revenue12')}</h2>
          <MonthlyBars data={sum.monthly} currency={cur} />
        </div>
      )}

      {/* Their work */}
      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] mb-6 overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-white">{t('cd.projects')}</h2>
        </div>
        {sum.projects.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#444]">{t('cd.noProjects')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[620px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#555] border-b border-[#1E1E1E]">
                  <th className="px-5 sm:px-6 py-3 font-medium">{t('rep.project')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('pf.total')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('projs.received')}</th>
                  <th className="px-5 sm:px-6 py-3 font-medium text-right">{t('projs.outstanding')}</th>
                </tr>
              </thead>
              <tbody>
                {sum.projects.map((p) => (
                  <tr key={p.id} className={`border-b border-[#151515] last:border-b-0 ${p.overdue ? 'bg-[#D9563A]/[0.04]' : ''}`}>
                    <td className="px-5 sm:px-6 py-3">
                      <p className="text-white truncate max-w-[280px]">{p.title}</p>
                      <p className="text-[11px] text-[#666] truncate">
                        {tStatus(p.status)}
                        {p.endDate && ` · ${t('dash.due', { d: p.endDate })}`}
                        {p.overdue && <span className="text-[#E27A5C]"> · {t('cd.overdueTag')}</span>}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#999]">{formatMoney(p.amount, p.currency, { locale })}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#8FC748]">{formatMoney(p.received, p.currency, { locale })}</td>
                    <td className={`px-5 sm:px-6 py-3 text-right tabular-nums ${p.outstanding > 0 ? 'text-[#FFD447]' : 'text-[#444]'}`}>
                      {p.outstanding > 0 ? formatMoney(p.outstanding, p.currency, { locale }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Their money */}
      <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#1E1E1E]">
          <h2 className="text-sm font-semibold text-white">{t('cd.payments')}</h2>
          <Link href={`/admin/finance/transactions`} className="text-xs text-[#555] hover:text-[#C8FF47] transition-colors">{t('common.viewAll')}</Link>
        </div>
        {sum.payments.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#444]">{t('cd.noPayments')}</p>
        ) : (
          <div>
            {sum.payments.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-5 sm:px-6 py-3 border-b border-[#161616] last:border-b-0">
                <span
                  className="text-[11px] flex-shrink-0"
                  style={{ color: tx.type === 'income' ? '#8FC748' : '#E27A5C' }}
                  aria-hidden="true"
                >
                  {tx.type === 'income' ? '↑' : '↓'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white truncate">
                    {tx.category || (tx.type === 'income' ? t('txn.payment') : t('txn.expense'))}
                  </p>
                  <p className="text-[11px] text-[#666] tabular-nums">{tx.date} · {tMethod(tx.method)}</p>
                </div>
                <span className={`text-[13px] tabular-nums font-medium whitespace-nowrap ${tx.type === 'income' ? 'text-[#8FC748]' : 'text-[#E27A5C]'}`}>
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

function Tile({
  label, value, accent, hint, hintAlert = false,
}: {
  label: string; value: string; accent: string; hint: string; hintAlert?: boolean
}) {
  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
        <p className="text-[11px] text-[#666]">{label}</p>
      </div>
      <p className="text-[22px] font-bold text-white tabular-nums leading-none">{value}</p>
      <p className={`text-[11px] mt-2 truncate ${hintAlert ? 'text-[#E27A5C]' : 'text-[#555]'}`}>{hint}</p>
    </div>
  )
}
