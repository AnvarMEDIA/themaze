'use client'

import { formatMoney } from '@/lib/finance/money'
import type { Currency, MonthlyPoint } from '@/lib/finance/types'
import { FIN_COLORS } from './tokens'
import { useFinanceLang } from './lang'

/* ── Monthly revenue bars (single series → no legend, title names it) ─────── */

export function MonthlyBars({ data, currency }: { data: MonthlyPoint[]; currency: Currency }) {
  const { t, locale, month } = useFinanceLang()
  const max = Math.max(1, ...data.map((d) => d.income))
  const peakIdx = data.reduce((best, d, i) => (d.income > data[best].income ? i : best), 0)

  const label = (m: string) => {
    const [, mm] = m.split('-')
    return month(Number(mm) - 1)
  }

  return (
    <div>
      <div className="flex items-end gap-1 h-52">
        {data.map((d, i) => {
          const pct = (d.income / max) * 100
          const net = d.income - d.expense
          return (
            <div key={d.month} className="group relative flex-1 h-full flex flex-col justify-end items-center">
              {/* Hover tooltip */}
              <div className="pointer-events-none absolute bottom-full mb-2 z-10 hidden group-hover:block whitespace-nowrap rounded-lg border border-[#252525] bg-[#141414] px-3 py-2 text-left shadow-xl">
                <p className="text-[10px] uppercase tracking-wide text-[#666] mb-1">{label(d.month)} {d.month.split('-')[0]}</p>
                <p className="text-[12px] text-white tabular-nums">{formatMoney(d.income, currency, { compact: true, locale })} <span className="text-[#6FA02E]">{t('dash.in')}</span></p>
                {d.expense > 0 && (
                  <>
                    <p className="text-[12px] text-white tabular-nums">{formatMoney(d.expense, currency, { compact: true, locale })} <span className="text-[#D9563A]">{t('dash.out')}</span></p>
                    <p className="text-[11px] text-[#888] tabular-nums mt-0.5">{t('dash.net')} {formatMoney(net, currency, { compact: true, locale })}</p>
                  </>
                )}
              </div>
              {/* Peak direct-label */}
              {i === peakIdx && d.income > 0 && (
                <span className="absolute -top-0.5 text-[9px] font-semibold text-[#C8FF47] tabular-nums">
                  {formatMoney(d.income, currency, { compact: true, locale })}
                </span>
              )}
              <div
                className="w-full rounded-t-[4px] bg-[#C8FF47]/80 group-hover:bg-[#C8FF47] transition-[background,height] duration-200 ease-out"
                style={{ height: `${Math.max(pct, d.income > 0 ? 2 : 0)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-2">
        {data.map((d, i) => (
          <span key={d.month} className="flex-1 text-center text-[9px] text-[#555] tabular-nums">
            {i % 2 === 0 ? label(d.month) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Horizontal bars (magnitude + identity) ───────────────────────────────── */

export interface HBarItem {
  label: string
  value: number
  color?: string
  sub?: string
}

export function HBars({
  items,
  currency,
  emptyText = 'No data yet',
}: {
  items: HBarItem[]
  currency: Currency
  emptyText?: string
}) {
  const { locale } = useFinanceLang()
  if (!items.length) return <p className="py-8 text-center text-sm text-[#444]">{emptyText}</p>
  const max = Math.max(1, ...items.map((i) => i.value))

  return (
    <div className="space-y-3">
      {items.map((it, idx) => {
        const pct = (it.value / max) * 100
        return (
          <div key={`${it.label}-${idx}`} className="group">
            <div className="flex items-center justify-between mb-1.5 text-[12px]">
              <span className="flex items-center gap-2 text-[#bbb] truncate">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: it.color ?? FIN_COLORS.income }} />
                <span className="truncate">{it.label}</span>
                {it.sub && <span className="text-[#555] text-[11px]">{it.sub}</span>}
              </span>
              <span className="text-white tabular-nums flex-shrink-0 ml-3">{formatMoney(it.value, currency, { compact: true, locale })}</span>
            </div>
            <div className="h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300 ease-out group-hover:opacity-90"
                style={{ width: `${Math.max(pct, it.value > 0 ? 3 : 0)}%`, background: it.color ?? FIN_COLORS.income }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
