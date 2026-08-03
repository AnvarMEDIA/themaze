'use client'

import { useFinanceLang } from './lang'

/**
 * Change against the previous comparable period.
 *
 * Growth from zero has no percentage — "∞%" or a silent 0% would both be lies —
 * so that case says so in words instead. Direction is coloured by whether the
 * move is *good*, which is not the same as *up*: rising expenses are not a win.
 */
export function Delta({
  current, previous, goodWhen = 'up', label,
}: {
  current: number
  previous: number
  /** Which direction counts as an improvement for this metric. */
  goodWhen?: 'up' | 'down'
  /** Screen-reader/tooltip context, e.g. "vs last month". */
  label: string
}) {
  const { t } = useFinanceLang()
  const diff = current - previous

  // Nothing moved, or both sides are zero — a "0%" badge is just noise.
  if (Math.abs(diff) < 0.005) return null

  const fromNothing = Math.abs(previous) < 0.005
  const pct = fromNothing ? null : Math.round((diff / Math.abs(previous)) * 100)

  const good = goodWhen === 'up' ? diff > 0 : diff < 0
  const colour = good ? 'text-[#8FC748]' : 'text-[#E27A5C]'

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${colour}`} title={label}>
      <span aria-hidden="true">{diff > 0 ? '↑' : '↓'}</span>
      <span className="tabular-nums">
        {pct === null ? t('dash.vsFromNothing') : `${Math.abs(pct)}%`}
      </span>
    </span>
  )
}
