'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/finance/money'
import type { ProfitabilityReport } from '@/lib/finance/types'
import { useFinanceLang } from '@/components/admin/finance/lang'
import { PeriodPicker, periodQuery, type PeriodValue } from '@/components/admin/finance/PeriodPicker'
import { FIN_COLORS } from '@/components/admin/finance/tokens'
import { Forecast } from '@/components/admin/finance/Forecast'

const PERIOD_KEY = 'maze_finance_period'
const DEFAULT_PERIOD: PeriodValue = { preset: 'year', from: '', to: '' }

export default function ReportsPage() {
  const router = useRouter()
  const { t, locale, tStatus } = useFinanceLang()
  const [rep, setRep] = useState<ProfitabilityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD)
  const [ready, setReady] = useState(false)

  // Share the dashboard's remembered window, so moving between the two screens
  // doesn't silently change which months you're looking at.
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
    const res = await fetch(`/api/finance/profitability?${periodQuery(period)}`, { cache: 'no-store' })
    if (res.status === 401) { router.push('/admin/finance/unlock'); return }
    setRep(await res.json())
    setLoading(false)
  }, [router, period])

  useEffect(() => { if (ready) load() }, [ready, load])

  const changePeriod = (p: PeriodValue) => {
    setPeriod(p)
    try { window.localStorage.setItem(PERIOD_KEY, JSON.stringify(p)) } catch { /* ignore */ }
  }

  if (loading || !rep) {
    return (
      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        <div className="h-8 w-56 bg-[#141414] rounded animate-pulse mb-8" />
        <div className="h-72 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />
      </div>
    )
  }

  const cur = rep.baseCurrency
  const money = (v: number) => formatMoney(v, cur, { locale })
  const compact = (v: number) => formatMoney(v, cur, { compact: true, locale })
  const rows = rep.projects

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('rep.title')}</h1>
          <p className="text-sm text-[#555] mt-1">{t('rep.subtitle', { currency: cur })}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <PeriodPicker value={period} onChange={changePeriod} />
        <a
          href={`/api/finance/profitability/export?${periodQuery(period)}`}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2A2A2A] bg-[#161616] text-[13px] font-medium text-[#bbb] hover:text-white hover:border-[#333] transition-colors active:scale-[0.97]"
        >
          {t('rep.export')}
        </a>
      </div>

      {rep.unratedCurrencies?.length > 0 && (
        <div className="mb-5 rounded-xl border border-[#FFD447]/30 bg-[#FFD447]/[0.06] px-5 py-4 flex items-start gap-3">
          <span className="text-[#FFD447] text-sm leading-5" aria-hidden="true">⚠</span>
          <p className="text-[13px] text-[#E8D9A0]">
            {t('dash.unrated', { list: rep.unratedCurrencies.join(', ') })}
          </p>
        </div>
      )}

      {/* Bottom line first — the number an accountant opens this page for. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Tile label={t('rep.totalReceived')} value={compact(rep.totals.received)} accent="#C8FF47" />
        <Tile label={t('rep.totalCost')} value={compact(rep.totals.directCost)} accent={FIN_COLORS.expense} />
        <Tile
          label={t('rep.overhead')} value={compact(rep.totals.overhead)} accent="#B5852F"
          hint={t('rep.overheadHint')}
        />
        <Tile
          label={t('rep.net')} value={compact(rep.totals.netProfit)}
          accent={rep.totals.netProfit >= 0 ? '#6FA02E' : '#D9563A'}
          hint={t('rep.netHint')}
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] px-6 py-14 text-center">
          <p className="text-white font-semibold mb-1">{t('rep.empty')}</p>
          <p className="text-sm text-[#666]">{t('rep.emptyHint')}</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
          {/* The table scrolls inside its own box; the page never does. */}
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[720px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#555] border-b border-[#1E1E1E]">
                  <th className="px-5 py-3 font-medium">{t('rep.project')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('rep.received')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('rep.directCost')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('rep.profit')}</th>
                  <th className="px-3 py-3 font-medium text-right">{t('rep.margin')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('rep.outstanding')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-[#151515] last:border-b-0 hover:bg-[#111] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-white truncate max-w-[260px]">{p.title}</p>
                      <p className="text-[11px] text-[#666] truncate max-w-[260px]">
                        {p.client || t('dash.unassignedClient')} · {tStatus(p.status)}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#8FC748]">{money(p.received)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#E27A5C]">
                      {p.directCost > 0 ? money(p.directCost) : <span className="text-[#444]">—</span>}
                    </td>
                    <td className={`px-3 py-3 text-right tabular-nums font-semibold ${p.profit >= 0 ? 'text-white' : 'text-[#E27A5C]'}`}>
                      {money(p.profit)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#999]">
                      {p.margin === null
                        ? <span className="text-[#444]">{t('rep.noMargin')}</span>
                        : `${Math.round(p.margin * 100)}%`}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[#FFD447]">
                      {p.outstanding > 0 ? money(p.outstanding) : <span className="text-[#444]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#232323] bg-[#0B0B0B] font-semibold">
                  <td className="px-5 py-3 text-[#999]">{t('rep.gross')}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-[#8FC748]">{money(rep.totals.received)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-[#E27A5C]">{money(rep.totals.directCost)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-white">{money(rep.totals.grossProfit)}</td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* How the numbers are arrived at — an accountant will ask, and guessing
          at an overhead allocation would look authoritative and be wrong. */}
      <p className="text-[11px] text-[#555] leading-relaxed mt-4 max-w-[760px]">{t('rep.basis')}</p>

      {/* Looking forward. Independent of the period above: a forecast always
          starts from today, whatever window you were reviewing. */}
      <div className="mt-8">
        <Forecast />
      </div>
    </div>
  )
}

function Tile({ label, value, accent, hint }: { label: string; value: string; accent: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
        <p className="text-[11px] text-[#666]">{label}</p>
      </div>
      <p className="text-[22px] font-bold text-white tabular-nums leading-none">{value}</p>
      {/* Wraps rather than truncates: "matches the dashboard" is the reassurance
          an accountant is looking for, and it lands at the end of the line. */}
      {hint && <p className="text-[11px] text-[#555] mt-2 leading-snug">{hint}</p>}
    </div>
  )
}
