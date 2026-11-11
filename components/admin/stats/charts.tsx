'use client'

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { peakHour } from '@/lib/stats/model'
import { rangeLabel, shortDay, weekBuckets, type Bucket, type DayFigures } from '@/lib/stats/periods'
import { shiftDay } from '@/lib/stats/time'
import {
  LEADS, PEOPLE, REFERENCE, axisTick, card, cardTitle, fmt, hh, leads, leadsWord, niceScale, people, views,
  viewsWord, weekday, weekdayShort,
} from './format'
import { ChangeChip, countChange } from './parts'

/**
 * The statistics screen's charts, in plain HTML: a charting library would
 * outweigh the page for two column charts.
 */

interface Series { name: string; color: string; lift: string }

export function Legend({ items }: { items: Array<{ name: string; color: string; kind?: 'box' | 'tick' }> }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#8A8A8A]">
      {items.map((s) => (
        <li key={s.name} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={s.kind === 'tick' ? 'h-[2px] w-3 rounded-full' : 'h-2 w-2 rounded-[2px]'}
            style={{ background: s.color }}
          />
          {s.name}
        </li>
      ))}
    </ul>
  )
}

/**
 * Columns, each a stack of the series' values from the baseline up, with a
 * tooltip that follows the pointer across the whole column (not just its
 * painted pixels) and the same readout from the keyboard: the chart is one
 * stop, the arrows move between columns. `marks` is an earlier value per
 * column, drawn as a tick across it.
 */
export function ColumnChart({ columns, series, marks, height = 160, xLabels, tip, describe, label }: {
  columns: Array<{ key: string; values: number[] }>
  series: Series[]
  marks?: number[]
  height?: number
  /** Which columns get a label under the axis, and what it says. */
  xLabels: Array<{ index: number; text: string }>
  tip: (index: number) => ReactNode
  /** The same readout as plain text, for screen readers. */
  describe: (index: number) => string
  label: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const plot = useRef<HTMLDivElement>(null)
  const liveId = useId()
  const n = columns.length
  const scale = niceScale(Math.max(0, ...columns.map((c) => c.values.reduce((s, v) => s + v, 0)), ...(marks ?? [])))

  const pick = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = plot.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    setActive(Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * n))))
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    if (step) { e.preventDefault(); setActive((i) => Math.min(n - 1, Math.max(0, (i ?? n - 1) + step))) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(n - 1) }
    else if (e.key === 'Escape') setActive(null)
  }

  const at = active === null ? null : ((active + 0.5) / n) * 100
  return (
    <div>
      <div className="flex">
        {/* Y axis: a few clean values, a hairline each. */}
        <div aria-hidden className="relative w-10 shrink-0 text-[10px] tabular-nums text-[#6B6B6B]" style={{ height }}>
          {scale.ticks.map((v) => (
            <span key={v} className="absolute right-2 translate-y-1/2 leading-none" style={{ bottom: `${(v / scale.top) * 100}%` }}>{axisTick(v)}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div aria-hidden className="absolute inset-0">
            {scale.ticks.map((v) => (
              <div key={v} className="absolute inset-x-0 h-px bg-[#1C1C1C]" style={{ bottom: `${(v / scale.top) * 100}%` }} />
            ))}
          </div>
          <div
            ref={plot}
            tabIndex={0}
            role="group"
            aria-label={label}
            aria-describedby={liveId}
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null) }}
            onFocus={() => setActive((i) => i ?? n - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={onKey}
            className={`relative flex items-end ${n > 45 ? 'gap-px' : 'gap-[2px]'} touch-pan-y rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-[#C8FF47]/60`}
            style={{ height }}
          >
            {columns.map((c, i) => {
              const top = c.values.reduce((last, v, s) => (v > 0 ? s : last), -1)
              const mark = marks?.[i] ?? 0
              return (
                // Reversed: the first series sits on the baseline, the next on top of it.
                <div key={c.key} className="relative flex h-full min-w-0 flex-1 flex-col-reverse items-center">
                  {c.values.map((v, s) => v > 0 && (
                    <div
                      key={s}
                      className={`w-full max-w-[24px] shrink-0 ${s === top ? 'rounded-t-[4px]' : ''}`}
                      style={{
                        height: `max(${s === 0 ? 2 : 3}px, ${(v / scale.top) * 100}%)`,
                        // The surface gap between stacked segments, none off the baseline.
                        marginBottom: c.values.slice(0, s).some((below) => below > 0) ? 2 : 0,
                        background: active === i ? series[s].lift : series[s].color,
                        transition: 'background-color 120ms ease',
                      }}
                    />
                  ))}
                  {mark > 0 && (
                    // Ringed in the surface colour, so it reads where it crosses a column.
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 h-[2px] w-full max-w-[28px] -translate-x-1/2 rounded-full"
                      style={{ bottom: `calc(${(mark / scale.top) * 100}% - 1px)`, background: REFERENCE, boxShadow: '0 0 0 1px #0D0D0D' }}
                    />
                  )}
                </div>
              )
            })}
            {active !== null && at !== null && (
              <div
                aria-hidden
                className={`pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${
                  at < 18 ? '' : at > 82 ? '-translate-x-full' : '-translate-x-1/2'
                }`}
                style={{ left: `${at}%` }}
              >
                {tip(active)}
              </div>
            )}
          </div>
          <div aria-hidden className="relative mt-2 h-3 text-[10px] tabular-nums text-[#6B6B6B]">
            {xLabels.map(({ index, text }) => {
              const edge = index === 0 ? 'left-0' : index === n - 1 ? 'right-0' : '-translate-x-1/2'
              return (
                <span
                  key={index}
                  className={`absolute whitespace-nowrap leading-none ${edge}`}
                  style={index === 0 || index === n - 1 ? undefined : { left: `${((index + 0.5) / n) * 100}%` }}
                >
                  {text}
                </span>
              )
            })}
          </div>
        </div>
      </div>
      <p id={liveId} className="sr-only" aria-live="polite">{active === null ? '' : describe(active)}</p>
    </div>
  )
}

/** A tooltip row: a short stroke of the series colour, the value first, then what it is. */
function TipRow({ color, value, name }: { color?: string; value: string; name: string }) {
  return (
    <p className="flex items-center gap-2 leading-5">
      <span aria-hidden className="h-[2px] w-3 rounded-full" style={{ background: color ?? 'transparent' }} />
      <span className="font-semibold text-white tabular-nums">{value}</span>
      <span className="text-[#8A8A8A]">{name}</span>
    </p>
  )
}

/** The chart's numbers as a table: every value readable without hovering. */
function TableView({ head, rows }: { head: string[]; rows: Array<Array<string | number>> }) {
  return (
    <details className="mt-4">
      <summary className="w-fit origin-left cursor-pointer select-none rounded text-[12px] text-[#777] outline-none transition-[color,transform] duration-150 ease-out hover:text-white focus-visible:ring-1 focus-visible:ring-[#C8FF47]/60 active:scale-[0.97]">
        Показать таблицей
      </summary>
      <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-[#1E1E1E]">
        <table className="w-full text-[12px] tabular-nums">
          <thead className="sticky top-0 bg-[#111] text-[#8A8A8A]">
            <tr>{head.map((h, i) => <th key={h} className={`whitespace-nowrap px-3 py-2 font-medium ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#161616] text-[#D6D4CC]">
            {rows.map((r) => (
              <tr key={String(r[0])}>
                {r.map((v, i) => <td key={i} className={`whitespace-nowrap px-3 py-1.5 ${i ? 'text-right' : ''}`}>{typeof v === 'number' ? fmt(v) : v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

/**
 * People per day, the day's requests on top. Past 92 days a column is a
 * calendar week instead: a year of days would be columns a pixel wide.
 * `days` are the counted days of the period; `note` says so when the period
 * began before the counter did.
 */
export function DailyChart({ days, today, note }: { days: DayFigures[]; today: string; note?: string }) {
  const weekly = days.length > 92
  const cols: Bucket[] = weekly
    ? weekBuckets(days)
    : days.map((d) => ({ key: d.date, from: d.date, to: d.date, visitors: d.visitors, views: d.views, leads: d.leads }))
  const n = cols.length
  const unit = weekly ? 'неделям' : 'дням'
  // A week: every day. Longer: five dates, the last one "сегодня" when it is,
  // so a short last column reads as a day still going rather than a drop.
  const sparse = n > 10
  const marks = sparse
    ? Array.from(new Set([0, 1, 2, 3, 4].map((k) => Math.round((k * (n - 1)) / 4))))
    : cols.map((_, i) => i)
  const mark = (c: Bucket) => (!weekly && sparse && c.to === today ? 'сегодня' : shortDay(c.from, today))
  const name = (c: Bucket) => (weekly
    ? rangeLabel(c.from, c.to, today)
    : `${shortDay(c.from, today)}, ${weekday(c.from)}`)
  const going = (c: Bucket) => (c.to !== today ? '' : weekly ? ' · неделя ещё идёт' : ' · сегодня, день не закончился')

  return (
    <section className={card}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={cardTitle}>Посетители по {unit}</h2>
        <Legend items={[{ name: 'Посетители', color: PEOPLE.color }, { name: 'Заявки', color: LEADS.color }]} />
      </div>
      <ColumnChart
        label={`Посетители и заявки по ${unit}. Стрелки влево и вправо переходят по ${unit}.`}
        columns={cols.map((c) => ({ key: c.key, values: [c.visitors, c.leads] }))}
        series={[{ name: 'Посетители', ...PEOPLE }, { name: 'Заявки', ...LEADS }]}
        xLabels={marks.map((i) => ({ index: i, text: mark(cols[i]) }))}
        tip={(i) => {
          const c = cols[i]
          return (
            <>
              <p className="mb-1 text-[11px] text-[#8A8A8A]">{name(c)}{going(c)}</p>
              <TipRow color={PEOPLE.color} value={people(c.visitors)} name="посетители" />
              <TipRow color={LEADS.color} value={fmt(c.leads)} name={leadsWord(c.leads)} />
              <TipRow value={fmt(c.views)} name={viewsWord(c.views)} />
            </>
          )
        }}
        describe={(i) => {
          const c = cols[i]
          return `${name(c)}: ${people(c.visitors)}, ${leads(c.leads)}, ${views(c.views)}`
        }}
      />
      {note && <p className="mt-3 text-[11px] text-[#6B6B6B]">{note}</p>}
      <TableView
        head={[weekly ? 'Неделя' : 'День', 'Посетители', 'Просмотры', 'Заявки']}
        rows={[...cols].reverse().map((c) => [
          weekly ? rangeLabel(c.from, c.to, today) : `${shortDay(c.from, today)}, ${weekdayShort(c.from)}`,
          c.visitors, c.views, c.leads,
        ])}
      />
    </section>
  )
}

const upTo = (hours: number[], hour: number) => hours.slice(0, hour).reduce((s, v) => s + v, 0)

/**
 * Views by hour of the day, on Tashkent time. For a period of several days,
 * their hours added up: when during the day people come. For one day, that
 * day's hours, with the day before marked on each column; and for today,
 * the one fair comparison a day half gone allows: both days up to the last
 * full hour.
 */
export function HoursChart({ hours, day, note }: {
  hours: number[]
  day?: { date: string; today: string; nowHour: number; before?: { date: string; hours: number[] } }
  note?: string
}) {
  const peak = peakHour(hours)
  const before = day?.before
  const isToday = !!day && day.date === day.today
  // A day by the word for it when there is one: сегодня, вчера, else its date.
  const name = (date: string) => {
    if (!day) return date
    return date === day.today ? 'сегодня' : date === shiftDay(day.today, -1) ? 'вчера' : shortDay(date, day.today)
  }

  // Today against the day before, both up to the last full hour: the hour
  // now running is left out of both, or today would always be behind.
  const soFar = day && before && isToday && day.nowHour > 0
    ? { now: upTo(hours, day.nowHour), was: upTo(before.hours, day.nowHour), than: `${name(before.date)} к этому часу` }
    : null
  const moved = soFar ? countChange(soFar.now, soFar.was, soFar.than, views(soFar.was)) : undefined

  return (
    <section className={card}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className={cardTitle}>Часы посещений · по Ташкенту</h2>
        {day && before
          ? <Legend items={[{ name: `Просмотры, ${name(day.date)}`, color: PEOPLE.color }, { name: name(before.date), color: REFERENCE, kind: 'tick' }]} />
          : <p className="text-[12px] text-[#8A8A8A]">{peak ? <>Пик — <span className="font-semibold text-white">{hh(peak.hour)}</span>, {views(peak.views)}</> : 'Пока нет данных'}</p>}
      </div>
      <ColumnChart
        height={day ? 160 : 96}
        label="Просмотры по часам дня. Стрелки влево и вправо переходят по часам."
        columns={hours.map((v, h) => ({ key: String(h), values: [v] }))}
        series={[{ name: 'Просмотры', ...PEOPLE }]}
        marks={before?.hours}
        xLabels={[0, 6, 12, 18, 23].map((h) => ({ index: h, text: String(h).padStart(2, '0') }))}
        tip={(h) => (
          <>
            <p className="mb-1 text-[11px] text-[#8A8A8A]">{hh(h)}–{String(h).padStart(2, '0')}:59{isToday && h === day?.nowHour ? ' · час ещё идёт' : ''}</p>
            <TipRow color={PEOPLE.color} value={fmt(hours[h])} name={before && day ? `${viewsWord(hours[h])}, ${name(day.date)}` : viewsWord(hours[h])} />
            {before && <TipRow color={REFERENCE} value={fmt(before.hours[h] ?? 0)} name={name(before.date)} />}
          </>
        )}
        describe={(h) => `${hh(h)}: ${views(hours[h])}${before ? `; ${name(before.date)} — ${fmt(before.hours[h] ?? 0)}` : ''}`}
      />
      {day && before && (soFar || peak) && (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px] text-[#8A8A8A]">
          {soFar && (
            <>
              <span>
                <span className="font-semibold text-white">К {hh(day.nowHour)} — {views(soFar.now)}</span>
                , {soFar.than} было {fmt(soFar.was)}
              </span>
              {moved && <ChangeChip change={moved} />}
            </>
          )}
          {soFar && peak && <span aria-hidden>·</span>}
          {peak && <span>Пик — {hh(peak.hour)}, {views(peak.views)}</span>}
        </p>
      )}
      {note && <p className="mt-3 text-[11px] text-[#6B6B6B]">{note}</p>}
      <TableView
        head={before && day ? ['Час', `Просмотры, ${name(day.date)}`, name(before.date)] : ['Час', 'Просмотры']}
        rows={hours.map((v, h) => (before ? [hh(h), v, before.hours[h] ?? 0] : [hh(h), v]))}
      />
    </section>
  )
}
