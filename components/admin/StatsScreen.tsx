'use client'

import {
  useCallback, useEffect, useId, useRef, useState,
  type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react'
import {
  CHANNEL_LABELS, conversion, mergeDays, peakHour, topList,
  type Channel, type DayCounts, type StatsDay,
} from '@/lib/stats/model'
import { pluralRu } from '@/lib/utils'

/**
 * Admin → Статистика: the site's own visitor numbers (lib/stats), read from
 * /api/analytics/stats.
 *
 * The period is read once when it is picked. After that, every minute while
 * the tab is in front, only today's row and "on the site now" are read and
 * merged into what is shown: the numbers move without the page blinking, and
 * a tab left open costs two Redis commands a minute, not one per day of the
 * period.
 *
 * The charts are plain HTML: a charting library would outweigh the page.
 */

interface Payload { days: StatsDay[]; totals: DayCounts; online: number; from: string; to: string }

const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]

/** The first day of the counter in Redis; the days before it are empty because it did not exist. */
const COUNTING_SINCE = '2026-11-12'

// Series colours, checked as a pair on the card surface (#0D0D0D) for
// colour-blind separation, lightness and contrast: blue for people and
// views, a darker step of the admin's lime for requests. "Lift" is the
// hovered or focused column.
const PEOPLE = { color: '#3987E5', lift: '#5598E7' }
const LEADS = { color: '#74A11F', lift: '#8DBF2C' }
const GOOD = '#8FC748'

const nf = new Intl.NumberFormat('ru-RU')
const fmt = (n: number) => nf.format(n)

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
const dayIndex = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay()
const weekday = (iso: string) => WEEKDAYS[dayIndex(iso)]

const people = (n: number) => `${fmt(n)} чел.`
const views = (n: number) => `${fmt(n)} ${pluralRu(n, 'просмотр', 'просмотра', 'просмотров')}`
const leads = (n: number) => `${fmt(n)} ${pluralRu(n, 'заявка', 'заявки', 'заявок')}`

/** A share of all views; "<1%" rather than a zero that is not one. */
function share(count: number, total: number): string {
  if (!total) return ''
  const p = (count / total) * 100
  return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`
}

const DEVICE_LABELS: Record<string, string> = { mobile: 'Телефон', desktop: 'Компьютер', tablet: 'Планшет' }
const LOCALE_LABELS: Record<string, string> = { ru: 'Русский', en: 'English', uz: 'O‘zbekcha' }
const PAGE_LABELS: Record<string, string> = {
  '/': 'Главная', '/portfolio': 'Портфолио', '/services': 'Услуги', '/about': 'О студии',
  '/contact': 'Контакты', '/brief': 'Бриф', '/insights': 'Статьи', '/internship': 'Стажировка',
}

let regionNames: Intl.DisplayNames | null | undefined
function countryLabel(code: string): ReactNode {
  if (code === 'XX') return 'Не определена'
  if (regionNames === undefined) {
    try { regionNames = new Intl.DisplayNames(['ru'], { type: 'region' }) } catch { regionNames = null }
  }
  try { return regionNames?.of(code) ?? code } catch { return code }
}

function pageLabel(path: string): ReactNode {
  const name = PAGE_LABELS[path]
  if (!name) return <span className="font-mono text-[12px]">{path}</span>
  return <>{name} <span className="font-mono text-[11px] text-[#6B6B6B]">{path}</span></>
}

/** Clean axis steps: 0 / 500 / 1 000 / 1 500, whole numbers only. */
function niceScale(max: number, count = 3): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0] }
  const raw = max / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw)
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v))
  return { top, ticks }
}
const tick = (v: number) => (v >= 10_000 ? `${fmt(Math.round(v / 1000))} тыс.` : fmt(v))

class LoadError extends Error {}

async function fetchStats(days: number): Promise<Payload> {
  let res: Response
  try {
    res = await fetch(`/api/analytics/stats?days=${days}`, { cache: 'no-store' })
  } catch {
    throw new LoadError('Нет связи с сайтом. Проверьте интернет и повторите.')
  }
  const body = await res.json().catch(() => ({})) as Partial<Payload> & { error?: string }
  if (res.status === 401) throw new LoadError('Сессия админки закончилась — войдите заново.')
  if (!res.ok || !Array.isArray(body.days) || !body.totals) {
    throw new LoadError(body.error || `Не удалось загрузить статистику (ошибка ${res.status}).`)
  }
  return body as Payload
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

const card = 'rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-4 sm:p-5'
const cardTitle = 'text-[13px] font-semibold text-white'

function Stat({ label, value, hint, swatch, good }: {
  label: string; value: string; hint?: string; swatch?: string; good?: boolean
}) {
  return (
    <div className={card}>
      <p className="flex items-center gap-1.5 text-[12px] text-[#8A8A8A]">
        {swatch && <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: swatch }} />}
        {label}
      </p>
      <p className="mt-1 text-[28px] font-bold leading-tight" style={{ color: good ? GOOD : '#FFFFFF' }}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-[#6B6B6B]">{hint}</p>}
    </div>
  )
}

/** One breakdown: name, count, share of all views, and a bar against the largest row. */
function Breakdown({ title, rows, total, label, empty = 'Пока нет данных' }: {
  title: string
  rows: Array<{ key: string; count: number }>
  total: number
  label?: (key: string) => ReactNode
  empty?: string
}) {
  const max = rows[0]?.count || 1
  return (
    <section className={card}>
      <h2 className={`${cardTitle} mb-3`}>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[#6B6B6B]">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline gap-3 text-[13px]">
                <span className="min-w-0 flex-1 truncate text-[#D6D4CC]" title={r.key}>{label ? label(r.key) : r.key}</span>
                <span className="tabular-nums font-medium text-white">{fmt(r.count)}</span>
                <span className="w-9 shrink-0 text-right tabular-nums text-[11px] text-[#777]">{share(r.count, total)}</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-[#171717]">
                <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: PEOPLE.color }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Legend({ items }: { items: Array<{ name: string; color: string }> }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#8A8A8A]">
      {items.map((s) => (
        <li key={s.name} className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />{s.name}
        </li>
      ))}
    </ul>
  )
}

interface Series { name: string; color: string; lift: string }

/**
 * Columns, each a stack of the series' values from the baseline up, with a
 * tooltip that follows the pointer across the whole column (not just its
 * painted pixels) and the same readout from the keyboard: the chart is one
 * stop, the arrows move between columns.
 */
function ColumnChart({ columns, series, height = 160, xLabels, tip, describe, label }: {
  columns: Array<{ key: string; values: number[] }>
  series: Series[]
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
  const scale = niceScale(Math.max(0, ...columns.map((c) => c.values.reduce((s, v) => s + v, 0))))

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
            <span key={v} className="absolute right-2 translate-y-1/2 leading-none" style={{ bottom: `${(v / scale.top) * 100}%` }}>{tick(v)}</span>
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
              return (
                // Reversed: the first series sits on the baseline, the next on top of it.
                <div key={c.key} className="flex h-full min-w-0 flex-1 flex-col-reverse items-center">
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
function TableView({ summary, head, rows }: { summary: string; head: string[]; rows: Array<Array<string | number>> }) {
  return (
    <details className="mt-4">
      <summary className="w-fit cursor-pointer select-none text-[12px] text-[#777] transition-colors duration-150 hover:text-white">
        {summary}
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

function DailyChart({ days, today }: { days: StatsDay[]; today: string }) {
  const n = days.length
  // A week: every day. Longer: five dates, the last one "сегодня", so a
  // short last column reads as a day still going rather than a drop.
  const sparse = n > 10
  const marks = sparse
    ? Array.from(new Set([0, 1, 2, 3, 4].map((k) => Math.round((k * (n - 1)) / 4))))
    : days.map((_, i) => i)
  const name = (d: StatsDay) => (sparse && d.date === today ? 'сегодня' : shortDate(d.date))
  const startsEmpty = days[0] && days[0].date < COUNTING_SINCE

  return (
    <section className={card}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={cardTitle}>Посетители по дням</h2>
        <Legend items={[{ name: 'Посетители', color: PEOPLE.color }, { name: 'Заявки', color: LEADS.color }]} />
      </div>
      <ColumnChart
        label="Посетители и заявки по дням. Стрелки влево и вправо переходят по дням."
        columns={days.map((d) => ({ key: d.date, values: [d.visitors, d.leads] }))}
        series={[{ name: 'Посетители', ...PEOPLE }, { name: 'Заявки', ...LEADS }]}
        xLabels={marks.map((i) => ({ index: i, text: name(days[i]) }))}
        tip={(i) => {
          const d = days[i]
          return (
            <>
              <p className="mb-1 text-[11px] text-[#8A8A8A]">
                {shortDate(d.date)}, {weekday(d.date)}{d.date === today ? ' · сегодня, день не закончился' : ''}
              </p>
              <TipRow color={PEOPLE.color} value={people(d.visitors)} name="посетители" />
              <TipRow color={LEADS.color} value={fmt(d.leads)} name={pluralRu(d.leads, 'заявка', 'заявки', 'заявок')} />
              <TipRow value={fmt(d.views)} name={pluralRu(d.views, 'просмотр', 'просмотра', 'просмотров')} />
            </>
          )
        }}
        describe={(i) => {
          const d = days[i]
          return `${shortDate(d.date)}, ${weekday(d.date)}: ${people(d.visitors)}, ${leads(d.leads)}, ${views(d.views)}`
        }}
      />
      {startsEmpty && (
        <p className="mt-3 text-[11px] text-[#6B6B6B]">
          Счётчик работает с 12.11.2026: дни раньше пустые, потому что считать было нечем, а не потому, что не было посетителей.
        </p>
      )}
      <TableView
        summary="Показать таблицей"
        head={['День', 'Посетители', 'Просмотры', 'Заявки']}
        rows={[...days].reverse().map((d) => [`${shortDate(d.date)}, ${WEEKDAYS_SHORT[dayIndex(d.date)]}`, d.visitors, d.views, d.leads])}
      />
    </section>
  )
}

function HoursChart({ hours }: { hours: number[] }) {
  const peak = peakHour(hours)
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`
  return (
    <section className={card}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={cardTitle}>Часы посещений · по Ташкенту</h2>
        <p className="text-[12px] text-[#8A8A8A]">
          {peak ? <>Пик — <span className="font-semibold text-white">{hh(peak.hour)}</span>, {views(peak.views)}</> : 'Пока нет данных'}
        </p>
      </div>
      <ColumnChart
        height={96}
        label="Просмотры по часам дня. Стрелки влево и вправо переходят по часам."
        columns={hours.map((v, h) => ({ key: String(h), values: [v] }))}
        series={[{ name: 'Просмотры', ...PEOPLE }]}
        xLabels={[0, 6, 12, 18, 23].map((h) => ({ index: h, text: String(h).padStart(2, '0') }))}
        tip={(h) => (
          <>
            <p className="mb-1 text-[11px] text-[#8A8A8A]">{hh(h)}–{String(h).padStart(2, '0')}:59</p>
            <TipRow color={PEOPLE.color} value={fmt(hours[h])} name={pluralRu(hours[h], 'просмотр', 'просмотра', 'просмотров')} />
          </>
        )}
        describe={(h) => `${hh(h)}: ${views(hours[h])}`}
      />
      <TableView
        summary="Показать таблицей"
        head={['Час', 'Просмотры']}
        rows={hours.map((v, h) => [hh(h), v])}
      />
    </section>
  )
}

function OnlineNow({ count }: { count: number | null }) {
  const live = (count ?? 0) > 0
  return (
    <p className="ml-auto flex items-center gap-2 text-[13px] text-[#9A9A9A]">
      <span aria-hidden className="relative flex h-2 w-2">
        {live && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping motion-safe:[animation-duration:2s]" style={{ background: GOOD }} />}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: live ? GOOD : '#333' }} />
      </span>
      Сейчас на сайте: <b className="font-semibold text-white">{count === null ? '—' : fmt(count)}</b>
    </p>
  )
}

function leadKinds(kinds: Record<string, number>): string {
  const parts: string[] = []
  if (kinds.inquiry) parts.push(`${fmt(kinds.inquiry)} ${pluralRu(kinds.inquiry, 'форма', 'формы', 'форм')}`)
  if (kinds.brief) parts.push(`${fmt(kinds.brief)} ${pluralRu(kinds.brief, 'бриф', 'брифа', 'брифов')}`)
  return parts.length ? parts.join(' · ') : 'формы и брифы'
}

/* ── The screen ─────────────────────────────────────────────────────────── */

export function StatsScreen() {
  const [range, setRange] = useState<Range>(30)
  const [data, setData] = useState<Payload | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  // What is on screen, and which full read is the latest: a minute's update
  // must not land on top of a period picked while it was in flight.
  const shown = useRef<Payload | null>(null)
  const loading = useRef(false)
  const seq = useRef(0)

  const load = useCallback(async (days: Range) => {
    const id = ++seq.current
    loading.current = true
    setBusy(true)
    try {
      const next = await fetchStats(days)
      if (id !== seq.current) return
      shown.current = next
      setData(next)
      setError('')
    } catch (err) {
      if (id !== seq.current) return
      setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику.')
    } finally {
      if (id === seq.current) { loading.current = false; setBusy(false) }
    }
  }, [])

  useEffect(() => { void load(range) }, [range, load])

  // Every minute, while the tab is in front: today's row and who is here now.
  useEffect(() => {
    const refresh = async () => {
      const before = shown.current
      if (document.visibilityState !== 'visible' || loading.current || !before) return
      const id = seq.current
      try {
        const fresh = await fetchStats(1)
        if (id !== seq.current || shown.current !== before) return
        const today = fresh.days[fresh.days.length - 1]
        // Past midnight the period itself has moved: read it again.
        if (!today || today.date !== before.to) { void load(range); return }
        const days = [...before.days.slice(0, -1), today]
        const next = { ...before, days, totals: mergeDays(days), online: fresh.online }
        shown.current = next
        setData(next)
      } catch { /* what is on screen stays; the next minute tries again */ }
    }
    const timer = window.setInterval(refresh, 60_000)
    const onShow = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onShow)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onShow) }
  }, [range, load])

  const t = data?.totals
  const rate = t ? conversion(t.leads, t.visitors) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div role="group" aria-label="Период" className="inline-flex rounded-lg border border-[#252525] bg-[#0D0D0D] p-0.5">
          {RANGES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRange(n)}
              aria-pressed={range === n}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                range === n ? 'bg-[#1E1E1E] text-white' : 'text-[#777] hover:text-white'
              }`}
            >
              {n} дней
            </button>
          ))}
        </div>
        <span role="status" className="text-[12px] text-[#777]">{busy && data ? 'обновляем…' : ''}</span>
        <OnlineNow count={data ? data.online : null} />
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E27A5C]/40 bg-[#E27A5C]/10 px-4 py-3 text-[13px] text-[#F2B8A6]">
          <span className="min-w-[200px] flex-1">{error}</span>
          <button
            type="button"
            onClick={() => load(range)}
            className="rounded-lg border border-[#E27A5C]/40 px-3 py-1.5 text-[12px] font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-[#E27A5C]/15 active:scale-[0.97]"
          >
            Повторить
          </button>
        </div>
      )}

      {!data && !error && (
        <div className={`${card} text-[13px] text-[#777]`}>Загружаем статистику…</div>
      )}

      {data && t && (
        <div className={`space-y-4 transition-opacity duration-200 ${busy ? 'opacity-60' : ''}`} aria-busy={busy}>
          {t.views === 0 && (
            <div className="rounded-xl border border-[#C8FF47]/20 bg-[#C8FF47]/[0.04] p-4">
              <p className="text-[13px] font-semibold text-white">Данных пока нет</p>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[#9A9A9A]">
                Счётчик собственный и начал считать с момента установки — прошлые визиты в него не попадут.
                Откройте сайт в другом браузере (где не открыта админка), и первые цифры появятся здесь в течение минуты.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Посетители" swatch={PEOPLE.color} value={fmt(t.visitors)} hint={`за ${range} дней`} />
            <Stat
              label="Просмотры"
              value={fmt(t.views)}
              hint={t.visitors ? `${(t.views / t.visitors).toFixed(1).replace('.', ',')} на человека` : undefined}
            />
            <Stat label="Заявки" swatch={LEADS.color} value={fmt(t.leads)} hint={leadKinds(t.leadKinds)} />
            <Stat label="Конверсия" value={`${String(rate).replace('.', ',')}%`} good={rate >= 1} hint="заявок на 100 посетителей" />
          </div>

          <DailyChart days={data.days} today={data.to} />

          <div className="grid gap-3 lg:grid-cols-2">
            <Breakdown title="Каналы" rows={topList(t.channels, 8)} total={t.views} label={(k) => CHANNEL_LABELS[k as Channel] ?? k} />
            <Breakdown title="Источники" rows={topList(t.sources, 8)} total={t.views} />
            <Breakdown title="Страницы" rows={topList(t.pages, 10)} total={t.views} label={pageLabel} />
            <Breakdown title="Кампании" rows={topList(t.campaigns, 8)} total={t.views} empty="Переходов с utm-метками пока не было" />
          </div>

          <HoursChart hours={t.hours} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Breakdown title="Устройства" rows={topList(t.devices, 5)} total={t.views} label={(k) => DEVICE_LABELS[k] ?? k} />
            <Breakdown title="Страны" rows={topList(t.countries, 6)} total={t.views} label={countryLabel} />
            <Breakdown title="Браузеры" rows={topList(t.browsers, 6)} total={t.views} />
            <Breakdown title="Язык сайта" rows={topList(t.locales, 3)} total={t.views} label={(k) => LOCALE_LABELS[k] ?? k} />
          </div>

          <p className="max-w-3xl text-[11px] leading-relaxed text-[#6B6B6B]">
            Эти цифры считает сам сайт, без внешних сервисов. Посетители различаются по временному отпечатку,
            который меняется каждую ночь: ни IP-адрес, ни браузер посетителя нигде не сохраняются, и связать
            визиты разных дней нельзя. Поэтому «Посетители» за период — сумма по дням: кто заходил в разные дни,
            учтён в каждом из них. Боты, поисковые роботы и просмотры из браузера, где открыта админка, не считаются.
            Сутки и часы — по Ташкенту.
          </p>
        </div>
      )}
    </div>
  )
}
