'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { CHANNEL_LABELS, conversion, mergeDays, subtractCounts, type Channel, type StatsDay } from '@/lib/stats/model'
import { COUNTING_SINCE, PRESETS, comparesTotals, periodQuery, rangeLabel, shortDay, type Period } from '@/lib/stats/periods'
import type { StatsPayload } from '@/lib/stats/store'
import { DailyChart, HoursChart } from './stats/charts'
import {
  DEVICE_LABELS, LEADS, LOCALE_LABELS, PEOPLE, card, countryName, decimal, fmt, leads, people, share, views, weekday,
} from './stats/format'
import { Breakdown, OnlineNow, PageName, Skeleton, Stat, countChange, pointsChange } from './stats/parts'
import { PeriodBar } from './stats/PeriodBar'
import { pluralRu } from '@/lib/utils'

/**
 * Admin → Статистика: the site's own visitor numbers (lib/stats), read from
 * /api/analytics/stats.
 *
 * The period is read once when it is picked: today, yesterday, 7, 30 or 90
 * days, a year, or any span of dates. After that, every minute while the tab
 * is in front, only today's counters and "on the site now" are read; when
 * the period includes today they replace today's share of what is shown. The
 * numbers move without the page blinking, and a tab left open costs two
 * Redis commands a minute, not one per day of the period.
 *
 * The period is in the page's address, so a reload or a shared link opens
 * on the same numbers; the last preset picked is remembered in the browser
 * and is what the screen opens on next time.
 */

type Payload = StatsPayload

const DEFAULT: Period = { kind: 'preset', preset: '30' }
const TODAY: Period = { kind: 'preset', preset: 'today' }
/** localStorage: the preset last picked. Dates are not remembered: they go stale. */
const STORE_KEY = 'maze-admin-stats-period'
const SINCE_NOTE = 'Счётчик работает с 12.11.2026: до этого дня считать было нечем, поэтому раньше данных нет.'

class LoadError extends Error {}

async function fetchStats(period: Period): Promise<Payload> {
  let res: Response
  try {
    res = await fetch(`/api/analytics/stats?${periodQuery(period)}`, { cache: 'no-store' })
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

const slim = ({ date, visitors, views: v, leads: l, newVisitors }: StatsDay): Payload['days'][number] =>
  ({ date, visitors, views: v, leads: l, newVisitors })

/** What a period's figures are held against, as it reads after «чем». */
const BEFORE = 'в предыдущем периоде'

function leadKinds(kinds: Record<string, number>): string {
  const parts: string[] = []
  if (kinds.inquiry) parts.push(`${fmt(kinds.inquiry)} ${pluralRu(kinds.inquiry, 'форма', 'формы', 'форм')}`)
  if (kinds.brief) parts.push(`${fmt(kinds.brief)} ${pluralRu(kinds.brief, 'бриф', 'брифа', 'брифов')}`)
  return parts.length ? parts.join(' · ') : 'формы и брифы'
}

/**
 * Whether a sticky bar is stuck: its sentinel, a line just above it, has
 * gone under the edge the bar sticks to. Follows the breakpoints, where the
 * bar's offset changes or it stops being sticky at all.
 */
function useStuck(sentinel: RefObject<HTMLElement>, bar: RefObject<HTMLElement>): boolean {
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const line = sentinel.current
    const el = bar.current
    if (!line || !el || typeof IntersectionObserver === 'undefined') return
    let observer: IntersectionObserver | null = null
    const watch = () => {
      observer?.disconnect()
      const style = window.getComputedStyle(el)
      if (style.position !== 'sticky') { setStuck(false); return }
      const top = parseFloat(style.top) || 0
      observer = new IntersectionObserver(
        ([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top <= top),
        { rootMargin: `-${top}px 0px 0px 0px` },
      )
      observer.observe(line)
    }
    watch()
    const queries = ['(min-width: 640px)', '(min-width: 1024px)'].map((q) => window.matchMedia(q))
    queries.forEach((q) => q.addEventListener('change', watch))
    return () => { observer?.disconnect(); queries.forEach((q) => q.removeEventListener('change', watch)) }
  }, [sentinel, bar])
  return stuck
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={spinning ? 'motion-safe:animate-spin' : ''}>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
      <path d="M13.5 2.5v2.6h-2.6" />
    </svg>
  )
}

export function StatsScreen({ initialPeriod, pageTitles }: {
  /** The period the page's address names, if it names one. */
  initialPeriod: Period | null
  /** Names for the pages that have one (a project's, an article's), by path. */
  pageTitles: Record<string, string>
}) {
  const [period, setPeriod] = useState<Period>(initialPeriod ?? DEFAULT)
  // Without a period in the address, the one remembered in this browser is
  // looked up first; nothing is read, and no choice is shown as taken, until then.
  const [ready, setReady] = useState(initialPeriod !== null)
  const [data, setData] = useState<Payload | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  // What is on screen, and which full read is the latest: a minute's update
  // must not land on top of a period picked while it was in flight.
  const shown = useRef<Payload | null>(null)
  const loading = useRef(false)
  const seq = useRef(0)
  const sentinel = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const stuck = useStuck(sentinel, bar)

  const show = useCallback((next: Payload) => {
    shown.current = next
    setData(next)
    setUpdatedAt(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))
  }, [])

  const load = useCallback(async (p: Period) => {
    const id = ++seq.current
    loading.current = true
    setBusy(true)
    try {
      const next = await fetchStats(p)
      if (id !== seq.current) return
      show(next)
      setError('')
    } catch (err) {
      if (id !== seq.current) return
      setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику.')
    } finally {
      if (id === seq.current) { loading.current = false; setBusy(false) }
    }
  }, [show])

  useEffect(() => {
    if (ready) return
    try {
      const stored = PRESETS.find((p) => p.id === window.localStorage.getItem(STORE_KEY))
      if (stored) setPeriod({ kind: 'preset', preset: stored.id })
    } catch { /* storage refused: the default period */ }
    setReady(true)
  }, [ready])

  useEffect(() => { if (ready) void load(period) }, [ready, period, load])

  // Every minute, while the tab is in front: today's counters and who is
  // here now. When the period includes today, today's old share of the
  // totals is taken out and the new one put in; otherwise only "on the site
  // now" changes.
  useEffect(() => {
    const refresh = async () => {
      const before = shown.current
      if (document.visibilityState !== 'visible' || loading.current || !before) return
      const id = seq.current
      try {
        const fresh = await fetchStats(TODAY)
        if (id !== seq.current || shown.current !== before) return
        // Past midnight "today" is another day, and the period may have moved.
        if (fresh.today !== before.today) { void load(period); return }
        let next: Payload = { ...before, online: fresh.online, hour: fresh.hour }
        if (before.todayRow && fresh.todayRow) {
          const row = fresh.todayRow
          next = {
            ...next,
            days: before.days.map((d) => (d.date === row.date ? slim(row) : d)),
            totals: mergeDays([subtractCounts(before.totals, before.todayRow), row]),
            todayRow: row,
          }
        }
        show(next)
      } catch { /* what is on screen stays; the next minute tries again */ }
    }
    const timer = window.setInterval(refresh, 60_000)
    const onShow = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onShow)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onShow) }
  }, [period, load, show])

  const pick = (p: Period) => {
    try {
      window.history.replaceState(null, '', `${window.location.pathname}?${periodQuery(p)}`)
      if (p.kind === 'preset') window.localStorage.setItem(STORE_KEY, p.preset)
    } catch { /* the address or the storage refused: the period still changes */ }
    setPeriod(p)
  }

  const t = data?.totals
  const rate = t ? conversion(t.leads, t.visitors) : 0
  const single = !!data && data.from === data.to
  // A period of one day, or one whose only counted day it is, has no days to
  // chart against each other: its hours are shown instead.
  const chartDay = !data ? null : single ? data.from : data.days.length === 1 ? data.days[0].date : null
  const sinceNote = data && data.from < COUNTING_SINCE ? SINCE_NOTE : undefined
  // The period before, where the totals can fairly be compared with it.
  const before = data?.previous && comparesTotals(data.from, data.to, data.today) ? data.previous : null

  const meta: string[] = []
  if (data) {
    meta.push(single
      ? `${shortDay(data.from, data.today)}, ${weekday(data.from)}${data.from === data.today ? ' · день ещё идёт' : ''}`
      : rangeLabel(data.from, data.to, data.today))
    if (sinceNote && data.to >= COUNTING_SINCE) meta.push('счёт идёт с 12.11.2026')
    if (before) {
      meta.push(`сравнение с ${rangeLabel(before.from, before.to, data.today)}`)
      if (data.to === data.today) meta.push('сегодня неполный день')
    }
  }

  return (
    <div>
      <header className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">Статистика</h1>
        <div className="mt-1.5"><OnlineNow count={data ? data.online : null} /></div>
        <p className="col-span-2 text-sm text-[#8A8A8A]">
          Посетители, откуда они пришли и сколько оставили заявок — по счётчику самого сайта.
        </p>
      </header>

      {/* From 640px up the period stays in reach while the page scrolls. */}
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        ref={bar}
        className={`z-30 -mx-4 border-b px-4 py-2 sm:sticky sm:top-14 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8 ${
          stuck ? 'border-[#1E1E1E] bg-[#080808]/90 backdrop-blur-md' : 'border-transparent'
        }`}
      >
        <PeriodBar
          period={period}
          ready={ready}
          range={data ? { from: data.from, to: data.to, today: data.today } : null}
          onPick={pick}
        />
      </div>

      {/* What can take the focus leaves room above itself, so that the bar never covers it. */}
      <div className="mt-1 space-y-4 [&_[tabindex]]:scroll-mt-28 [&_a]:scroll-mt-28 [&_button]:scroll-mt-28 [&_summary]:scroll-mt-28">
        <div className="flex min-h-8 items-center gap-x-3 text-[12px] text-[#8A8A8A]">
          <p className="min-w-0 flex-1">{meta.join(' · ')}</p>
          <p className="flex shrink-0 items-center gap-1 self-start">
            {/* On a phone the line is short of room: the time is in the button's hint there. */}
            <span role="status" className="hidden sm:inline">{busy && data ? 'обновляем…' : updatedAt ? `обновлено в ${updatedAt}` : ''}</span>
            <button
              type="button"
              onClick={() => load(period)}
              disabled={busy || !ready}
              aria-label="Обновить"
              title={updatedAt ? `Обновить · обновлено в ${updatedAt}` : 'Обновить'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8A8A8A] outline-none transition-[color,background-color,transform] duration-150 ease-out hover:bg-[#141414] hover:text-white focus-visible:ring-1 focus-visible:ring-[#C8FF47]/60 active:scale-[0.97] disabled:opacity-50"
            >
              <RefreshIcon spinning={busy && !!data} />
            </button>
          </p>
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E27A5C]/40 bg-[#E27A5C]/10 px-4 py-3 text-[13px] text-[#F2B8A6]">
            <span className="min-w-[200px] flex-1">{error}</span>
            <button
              type="button"
              onClick={() => load(period)}
              className="rounded-lg border border-[#E27A5C]/40 px-3 py-1.5 text-[12px] font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-[#E27A5C]/15 active:scale-[0.97]"
            >
              Повторить
            </button>
          </div>
        )}

        {!data && !error && <Skeleton />}

        {data && t && (
          <div className={`space-y-4 transition-opacity duration-200 ${busy ? 'opacity-60' : ''}`} aria-busy={busy}>
            {t.views === 0 && (
              <div className="rounded-xl border border-[#C8FF47]/20 bg-[#C8FF47]/[0.04] p-4">
                <p className="text-[13px] font-semibold text-white">
                  {data.to < COUNTING_SINCE ? 'За этот период данных нет' : data.to === data.today ? 'Данных пока нет' : 'За этот период просмотров нет'}
                </p>
                <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[#9A9A9A]">
                  {data.to < COUNTING_SINCE
                    ? 'Счётчик работает с 12.11.2026 — более ранние визиты в него не попали.'
                    : data.to === data.today
                      ? 'Счётчик собственный и начал считать с момента установки — прошлые визиты в него не попадут. Откройте сайт в другом браузере (где не открыта админка), и первые цифры появятся здесь в течение минуты.'
                      : 'Счётчик за эти дни ничего не записал.'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label="Посетители"
                swatch={PEOPLE.color}
                value={fmt(t.visitors)}
                change={before ? countChange(t.visitors, before.visitors, BEFORE, people(before.visitors)) : undefined}
                hint={t.visitors ? `новых ${share(Math.min(t.newVisitors, t.visitors), t.visitors)}` : undefined}
                hintTitle={t.visitors ? `Впервые на сайте: ${people(Math.min(t.newVisitors, t.visitors))} из ${fmt(t.visitors)}` : undefined}
              />
              <Stat
                label="Просмотры"
                value={fmt(t.views)}
                change={before ? countChange(t.views, before.views, BEFORE, views(before.views)) : undefined}
                hint={t.visitors ? `${decimal(Number((t.views / t.visitors).toFixed(1)))} на человека` : undefined}
              />
              <Stat
                label="Заявки"
                swatch={LEADS.color}
                value={fmt(t.leads)}
                change={before ? countChange(t.leads, before.leads, BEFORE, leads(before.leads)) : undefined}
                hint={leadKinds(t.leadKinds)}
              />
              <Stat
                label="Конверсия"
                value={`${decimal(rate)}%`}
                good={rate >= 1}
                change={before && before.visitors > 0 ? pointsChange(rate, conversion(before.leads, before.visitors), BEFORE) : undefined}
                hint="заявок на 100 посетителей"
              />
            </div>

            {t.views > 0 && (
              <>
                {chartDay ? (
                  <HoursChart
                    hours={t.hours}
                    note={single ? undefined : sinceNote}
                    day={{
                      date: chartDay,
                      today: data.today,
                      nowHour: data.hour,
                      before: single && data.previous?.hours ? { date: data.previous.from, hours: data.previous.hours } : undefined,
                    }}
                  />
                ) : (
                  <DailyChart days={data.days} today={data.today} note={sinceNote} />
                )}

                <div className="grid gap-3 lg:grid-cols-2">
                  <Breakdown title="Каналы" counts={t.channels} total={t.views} limit={8} label={(k) => CHANNEL_LABELS[k as Channel] ?? k} />
                  <Breakdown title="Источники" counts={t.sources} total={t.views} limit={8} />
                  <Breakdown title="Страницы" counts={t.pages} total={t.views} limit={10} label={(k) => <PageName path={k} titles={pageTitles} />} />
                  <Breakdown title="Кампании" counts={t.campaigns} total={t.views} limit={8} empty="Переходов с utm-метками пока не было" />
                </div>

                {!chartDay && <HoursChart hours={t.hours} />}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Breakdown title="Устройства" counts={t.devices} total={t.views} limit={5} label={(k) => DEVICE_LABELS[k] ?? k} />
                  <Breakdown title="Страны" counts={t.countries} total={t.views} limit={6} label={countryName} />
                  <Breakdown title="Браузеры" counts={t.browsers} total={t.views} limit={6} />
                  <Breakdown title="Язык сайта" counts={t.locales} total={t.views} limit={3} label={(k) => LOCALE_LABELS[k] ?? k} />
                </div>
              </>
            )}

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
    </div>
  )
}
