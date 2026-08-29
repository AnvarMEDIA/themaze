'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatMoney } from '@/lib/finance/money'
import type { ExpenseBreakdown } from '@/lib/finance/expenseBreakdown'
import { useFinanceLang } from './lang'
import { FIN_COLORS } from './tokens'
import { periodQuery, type PeriodValue } from './PeriodPicker'

/**
 * Where the money went, by kind and by who was paid.
 *
 * A kind expands to the people or vendors inside it, because that is the shape
 * of the question: "we spent 40M on payroll" is only useful next to "of which
 * Islom 12M". Unclassified is shown as its own row, greyed — work still to do,
 * not a category of spending.
 */
export function Spending({ period }: { period: PeriodValue }) {
  const { t, locale, tKind } = useFinanceLang()
  const [data, setData] = useState<ExpenseBreakdown | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/finance/expenses?${periodQuery(period)}`, { cache: 'no-store' })
    if (!res.ok) return
    setData(await res.json())
  }, [period])

  useEffect(() => { load() }, [load])

  if (!data) return <div className="h-64 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />

  const cur = data.baseCurrency
  const money = (v: number) => formatMoney(v, cur, { locale })
  const compact = (v: number) => formatMoney(v, cur, { compact: true, locale })

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">{t('exp.title')}</h2>
          <p className="text-[12px] text-[#555] mt-0.5">{t('exp.subtitle', { currency: cur })}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[#666]">{t('exp.total')}</p>
          <p className="text-[17px] font-bold text-[#E27A5C] tabular-nums leading-none">{compact(data.total)}</p>
        </div>
      </div>

      {data.unratedCurrencies?.length > 0 && (
        <p className="text-[11px] text-[#FFD447] mb-4">
          {t('dash.unrated', { list: data.unratedCurrencies.join(', ') })}
        </p>
      )}

      {data.kinds.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-white font-semibold mb-1 text-sm">{t('exp.empty')}</p>
          <p className="text-[13px] text-[#666]">{t('exp.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.kinds.map((k) => {
            const isOpen = open === k.kind
            const unsorted = k.kind === 'unclassified'
            const colour = unsorted ? '#5A5A5A' : FIN_COLORS.expense
            return (
              <div key={k.kind} className="rounded-lg border border-[#1A1A1A] bg-[#0B0B0B] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : k.kind)}
                  aria-expanded={isOpen}
                  className="w-full text-left px-4 py-3 hover:bg-[#111] transition-colors active:scale-[0.997]"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colour }} />
                      <span className={`text-[13px] truncate ${unsorted ? 'text-[#888]' : 'text-white'}`}>
                        {tKind(k.kind)}
                      </span>
                      <span className="text-[11px] text-[#555] whitespace-nowrap">
                        {t('exp.payments', { n: k.count })}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px] text-[#666] tabular-nums">
                        {t('exp.share', { p: Math.round(k.share * 100) })}
                      </span>
                      <span className="text-[13px] tabular-nums font-semibold text-white">{money(k.total)}</span>
                      <span className={`text-[#555] text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true">›</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-out"
                      style={{ width: `${Math.max(k.share * 100, k.total > 0 ? 2 : 0)}%`, background: colour }}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-3 fin-fade">
                    {k.payees.length === 0 ? (
                      <p className="text-[12px] text-[#555] pt-2">{t('exp.emptyHint')}</p>
                    ) : (
                      <div className="pt-1 border-t border-[#1A1A1A]">
                        {k.payees.map((p) => (
                          <div key={p.key} className="flex items-center justify-between gap-3 py-2 border-b border-[#151515] last:border-b-0">
                            <span className="min-w-0">
                              <span className="block text-[13px] text-white truncate">{p.name}</span>
                              <span className="block text-[11px] text-[#666] tabular-nums">
                                {t('exp.payments', { n: p.count })} · {t('exp.lastPaid', { date: p.lastDate })}
                              </span>
                            </span>
                            <span className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-[13px] tabular-nums text-[#E27A5C]">{money(p.total)}</span>
                              {/* Straight from a total to the rows behind it. */}
                              <Link
                                href={`/admin/finance/transactions?kind=${encodeURIComponent(k.kind)}&payee=${encodeURIComponent(p.key)}`}
                                className="text-[11px] text-[#666] hover:text-[#C8FF47] transition-colors whitespace-nowrap"
                              >
                                {t('exp.viewRows')}
                              </Link>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
