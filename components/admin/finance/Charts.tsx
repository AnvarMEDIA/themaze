'use client'

import { formatMoney } from '@/lib/finance/money'
import type { Currency, MonthlyPoint } from '@/lib/finance/types'
import { FIN_COLORS } from './tokens'
import { useFinanceLang } from './lang'

/* ── Income vs expense, by month ──────────────────────────────────────────── */

/**
 * Two series, so the pair needs a legend — and income/expense are never told
 * apart by colour alone: income is always the left bar, expense always the
 * right, and the tooltip names both. Clicking a column selects that month.
 */
export function MonthlyBars({
  data, currency, selected, onSelect,
}: {
  data: MonthlyPoint[]
  currency: Currency
  /** "YYYY-MM" of the highlighted column, if any. */
  selected?: string
  onSelect?: (month: string) => void
}) {
  const { t, locale, month } = useFinanceLang()
  // One scale for both series, or the columns can't be compared to each other.
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]))

  const label = (m: string) => month(Number(m.split('-')[1]) - 1)
  const height = (v: number) => `${Math.max((v / max) * 100, v > 0 ? 2 : 0)}%`

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Key color={FIN_COLORS.income} label={t('cal.legendIn')} />
        <Key color={FIN_COLORS.expense} label={t('cal.legendOut')} />
      </div>

      <div className="flex items-end gap-1 h-52">
        {data.map((d) => {
          const isSelected = selected === d.month
          const net = d.income - d.expense
          const Cell = onSelect ? 'button' : 'div'
          return (
            <Cell
              key={d.month}
              {...(onSelect
                ? {
                    type: 'button' as const,
                    onClick: () => onSelect(d.month),
                    'aria-pressed': isSelected,
                    title: `${label(d.month)} ${d.month.split('-')[0]}`,
                  }
                : {})}
              // Selection is an underline, not a fill: a tinted block spanning
              // the column's full height reads as a third bar of data.
              className={`group relative flex-1 h-full flex flex-col justify-end border-b-2 transition-colors ${
                onSelect ? 'cursor-pointer active:scale-[0.97]' : ''
              } ${
                isSelected
                  ? 'border-[#C8FF47]'
                  : onSelect ? 'border-transparent hover:border-[#333]' : 'border-transparent'
              }`}
            >
              <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block whitespace-nowrap rounded-lg border border-[#252525] bg-[#141414] px-3 py-2 text-left shadow-xl">
                <p className="text-[10px] uppercase tracking-wide text-[#666] mb-1">{label(d.month)} {d.month.split('-')[0]}</p>
                <p className="text-[12px] text-white tabular-nums">
                  <span className="text-[#8FC748]">↑</span> {formatMoney(d.income, currency, { compact: true, locale })} <span className="text-[#8FC748]">{t('cal.in')}</span>
                </p>
                <p className="text-[12px] text-white tabular-nums">
                  <span className="text-[#E27A5C]">↓</span> {formatMoney(d.expense, currency, { compact: true, locale })} <span className="text-[#E27A5C]">{t('cal.out')}</span>
                </p>
                <p className="text-[11px] text-[#888] tabular-nums mt-0.5">
                  {t('cal.net')} {formatMoney(net, currency, { compact: true, locale })}
                </p>
              </div>

              {/* Income left, expense right — the order never changes, so the
                  pair reads without relying on hue. */}
              <div className="flex items-end justify-center gap-[2px] h-full px-[10%]">
                <div
                  className="flex-1 rounded-t-[3px] transition-[height] duration-200 ease-out"
                  style={{ height: height(d.income), background: FIN_COLORS.income, opacity: isSelected ? 1 : 0.8 }}
                />
                <div
                  className="flex-1 rounded-t-[3px] transition-[height] duration-200 ease-out"
                  style={{ height: height(d.expense), background: FIN_COLORS.expense, opacity: isSelected ? 1 : 0.8 }}
                />
              </div>
            </Cell>
          )
        })}
      </div>

      <div className="flex gap-1 mt-2">
        {data.map((d) => (
          <span
            key={d.month}
            className={`flex-1 text-center text-[9px] tabular-nums transition-colors ${
              selected === d.month ? 'text-[#C8FF47] font-semibold' : 'text-[#555]'
            }`}
          >
            {label(d.month)}
          </span>
        ))}
      </div>
    </div>
  )
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#888]">
      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
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
