'use client'

import { useMemo, useState } from 'react'
import { formatMoney } from '@/lib/finance/money'
import { MFC_RAMP, MFC_TRACK } from '@/lib/mfc/palette'
import type { Currency } from '@/lib/finance/types'
import type { MfcBucket } from '@/lib/mfc/types'
import { useFinanceLang } from '../lang'
import { todayIso } from './shared'

/**
 * Spending over the period — one column per day, or per month once a period
 * is long enough that daily columns would be a smear.
 *
 * A single series, so it needs no legend: the heading names it. Colour is one
 * hue at one value; height alone carries the magnitude. Empty days are drawn
 * as empty columns rather than skipped — a gap in spending is information,
 * and dropping it would silently compress the timeline.
 */
export function TrendBars({
  buckets,
  granularity,
  currency,
  onSelect,
}: {
  buckets: MfcBucket[]
  granularity: 'day' | 'month'
  currency: Currency
  /** Opening one column: the bucket's key, YYYY-MM-DD or YYYY-MM. */
  onSelect?: (key: string) => void
}) {
  const { t, locale, month } = useFinanceLang()
  const [hover, setHover] = useState<number | null>(null)

  const max = useMemo(() => Math.max(...buckets.map((b) => b.total), 0), [buckets])
  if (buckets.length === 0) return null

  const money = (v: number) => formatMoney(v, currency, { locale })
  const today = todayIso()

  /** A tick a person reads: "14" for a day, "Mar" for a month. */
  const label = (key: string) =>
    granularity === 'day' ? String(Number(key.slice(8, 10))) : month(Number(key.slice(5, 7)) - 1)

  const fullLabel = (key: string) => {
    if (granularity === 'month') return `${month(Number(key.slice(5, 7)) - 1)} ${key.slice(0, 4)}`
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }

  // Enough columns to be worth a tick every so often, not on every one.
  const tickEvery = Math.max(1, Math.ceil(buckets.length / 10))
  const active = hover === null ? null : buckets[hover]

  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5">
      {/* The heading IS the scale. "Over time · By day" said the same thing
          twice, and the second half is the part that answers what a column is
          — so it takes the title, and still tells the truth on a long period
          where the columns are months. */}
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold text-white">
          {granularity === 'day' ? t('mfc.byDay') : t('mfc.byMonth')}
        </h2>
        {onSelect && (
          <span className="text-[11px] text-[#5A5A5A]">
            {granularity === 'day' ? t('mfc.tapDay') : t('mfc.tapMonth')}
          </span>
        )}
      </div>

      {/* The readout sits above the chart so a finger on a phone never covers
          the value it just asked for. */}
      <div className="h-9 flex items-baseline gap-2" aria-live="polite">
        {active ? (
          <>
            <span className="text-[17px] font-bold text-white tabular-nums">{money(active.total)}</span>
            <span className="text-[12px] text-[#777]">{fullLabel(active.key)}</span>
          </>
        ) : (
          <span className="text-[12px] text-[#4A4A4A]">{max > 0 ? money(max) : ''}</span>
        )}
      </div>

      <div className="flex items-end gap-[2px] h-28" role="img"
           aria-label={`${granularity === 'day' ? t('mfc.byDay') : t('mfc.byMonth')}: ${buckets.length}`}>
        {buckets.map((b, i) => {
          const h = max > 0 ? (b.total / max) * 100 : 0
          const isToday = granularity === 'day' && b.key === today
          // A column with nothing in it has nothing to open. Leaving it
          // clickable would answer a tap with an empty sheet.
          const openable = Boolean(onSelect) && b.count > 0
          return (
            <button
              key={b.key}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={openable ? () => onSelect!(b.key) : undefined}
              // A whole-height target, so a 3px-tall column is still tappable.
              className={`flex-1 h-full flex items-end min-w-[3px] group ${
                openable ? 'cursor-pointer' : 'cursor-default'
              }`}
              title={`${fullLabel(b.key)} · ${money(b.total)}`}
              aria-label={
                openable
                  ? `${fullLabel(b.key)}: ${money(b.total)} — ${t('mfc.times', { n: b.count })}`
                  : `${fullLabel(b.key)}: ${money(b.total)}`
              }
            >
              <span
                className="w-full rounded-[3px] transition-all duration-150"
                style={{
                  height: b.total > 0 ? `${Math.max(h, 3)}%` : '2px',
                  background: b.total > 0
                    ? (hover === i ? '#E4FF9A' : MFC_RAMP[isToday ? 0 : 2])
                    : MFC_TRACK,
                }}
              />
            </button>
          )
        })}
      </div>

      {/* Ticks share the columns' geometry so each sits under the day it names.
          A column is a few pixels wide, so the label is allowed to overflow its
          own box and centre on the column — clipping it to the column width
          turned every two-digit day into "1." and "2.". Its neighbours are
          empty, so there is nothing to collide with. */}
      <div className="flex gap-[2px] mt-2">
        {buckets.map((b, i) => (
          <span key={b.key} className="flex-1 min-w-[3px] flex justify-center">
            <span className="text-[9px] text-[#4A4A4A] tabular-nums whitespace-nowrap">
              {i % tickEvery === 0 ? label(b.key) : ''}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
