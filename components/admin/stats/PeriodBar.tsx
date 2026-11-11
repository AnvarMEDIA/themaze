'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  COUNTING_SINCE, PRESETS, calendarRanges, earliestDay, isIsoDate, rangeLabel, shortDay, type Period,
} from '@/lib/stats/periods'

/**
 * The period the statistics are shown for: today, yesterday, 7, 30 or 90
 * days, a year, or any span of dates.
 *
 * From 640px up it is one row. On a phone the seven choices are a grid of
 * two rows, every label whole: a row cut off at the screen's edge would
 * hide the last ones.
 */

function CalendarIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
    </svg>
  )
}

const focusRing = 'outline-none focus-visible:ring-1 focus-visible:ring-[#C8FF47]/60'

/**
 * Any span of dates: the calendar spans asked for most, one tap each, and
 * two native date fields, which on a phone open the system's own picker.
 * Reversed dates are swapped; one date in both fields is that one day. Days
 * before the counter started, or older than the 400 kept, are not offered.
 */
function RangePanel({ id, from, to, today, onApply, onClose }: {
  id: string; from: string; to: string; today: string
  onApply: (from: string, to: string) => void
  onClose: () => void
}) {
  const min = COUNTING_SINCE > earliestDay(today) ? COUNTING_SINCE : earliestDay(today)
  const [a, setA] = useState(from < min ? min : from)
  const [b, setB] = useState(to < min ? min : to)
  const panel = useRef<HTMLDivElement>(null)
  // The first thing in the panel takes the focus: a named span when there is one, else the first date.
  useEffect(() => { panel.current?.querySelector<HTMLElement>('button, input')?.focus() }, [])

  // Named spans that hold at least one counted day, cut to the counted days.
  const named = calendarRanges(today)
    .filter((r) => r.to >= min)
    .map((r) => ({ ...r, from: r.from < min ? min : r.from }))

  const ok = isIsoDate(a) && isIsoDate(b)
  // 16px on a phone: below that, iOS zooms the page in when the field is focused.
  const field = `mt-1 block w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-base text-white [color-scheme:dark] transition-colors duration-150 focus:border-[#C8FF47]/60 focus:outline-none sm:text-[13px]`

  return (
    <div
      ref={panel}
      id={id}
      role="group"
      aria-label="Свой период"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
      className="stats-panel rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] p-4"
    >
      {named.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {named.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onApply(r.from, r.to)}
              title={rangeLabel(r.from, r.to, today)}
              className={`rounded-full border border-[#2A2A2A] bg-[#111] px-3 py-1.5 text-[12px] text-[#bbb] transition-[border-color,color,transform] duration-150 ease-out hover:border-[#3A3A3A] hover:text-white active:scale-[0.97] ${focusRing}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ok) return
          const [f, t] = a <= b ? [a, b] : [b, a]
          onApply(f, t)
        }}
      >
        <label className="min-w-0 flex-1 basis-[8.5rem] text-[12px] text-[#8A8A8A] sm:flex-none sm:basis-auto">
          С
          <input type="date" required value={a} min={min} max={today} onChange={(e) => setA(e.target.value)} className={field} />
        </label>
        <label className="min-w-0 flex-1 basis-[8.5rem] text-[12px] text-[#8A8A8A] sm:flex-none sm:basis-auto">
          По
          <input type="date" required value={b} min={min} max={today} onChange={(e) => setB(e.target.value)} className={field} />
        </label>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="submit"
            disabled={!ok}
            className={`rounded-lg bg-[#C8FF47] px-4 py-2 text-[13px] font-bold text-[#0A0A0A] transition-[background-color,transform] duration-150 ease-out hover:bg-[#F0EEE6] active:scale-[0.97] disabled:opacity-50 ${focusRing}`}
          >
            Показать
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg border border-[#2A2A2A] px-3 py-2 text-[13px] text-[#bbb] transition-[border-color,color,transform] duration-150 ease-out hover:border-[#333] hover:text-white active:scale-[0.97] ${focusRing}`}
          >
            Отмена
          </button>
        </div>
      </form>
      <p className="mt-3 text-[11px] text-[#6B6B6B]">
        Счёт идёт с {shortDay(min, today)}. Для одного дня выберите одну и ту же дату в обоих полях.
      </p>
    </div>
  )
}

export function PeriodBar({ period, ready, range, onPick }: {
  period: Period
  /** Whether the period is settled: until then no choice is shown as taken. */
  ready: boolean
  /** The period on screen and today, once the first numbers are in: what the dates panel opens on. */
  range: { from: string; to: string; today: string } | null
  onPick: (period: Period) => void
}) {
  const [picking, setPicking] = useState(false)
  const datesButton = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const pick = (p: Period) => { setPicking(false); onPick(p) }
  const custom = ready && period.kind === 'custom'
  const dates = period.kind === 'custom' ? rangeLabel(period.from, period.to, range?.today ?? period.to) : null

  const segment = (active: boolean) =>
    `inline-flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-1 text-[13px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] sm:h-8 sm:px-3 ${focusRing} ${
      active ? 'bg-[#1E1E1E] text-white' : 'text-[#777] hover:text-white'
    }`

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Период" className="grid grid-cols-4 gap-0.5 rounded-lg border border-[#252525] bg-[#0D0D0D] p-0.5 sm:inline-flex">
        {PRESETS.map((p) => {
          const active = ready && period.kind === 'preset' && period.preset === p.id
          return (
            <button key={p.id} type="button" onClick={() => pick({ kind: 'preset', preset: p.id })} aria-pressed={active} className={segment(active)}>
              {p.label}
            </button>
          )
        })}
        <button
          ref={datesButton}
          type="button"
          onClick={() => setPicking((open) => !open)}
          disabled={!range}
          aria-expanded={picking}
          aria-controls={panelId}
          aria-label={custom && dates ? `Свой период: ${dates}. Изменить даты` : 'Выбрать даты'}
          className={`${segment(custom || picking)} col-span-2 disabled:opacity-50`}
        >
          <CalendarIcon />
          {custom && dates ? dates : 'Даты'}
        </button>
      </div>

      {picking && range && (
        <RangePanel
          id={panelId}
          from={range.from}
          to={range.to}
          today={range.today}
          onApply={(from, to) => { pick({ kind: 'custom', from, to }); datesButton.current?.focus() }}
          onClose={() => { setPicking(false); datesButton.current?.focus() }}
        />
      )}
    </div>
  )
}
