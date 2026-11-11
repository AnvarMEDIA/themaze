'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { topList } from '@/lib/stats/model'
import { changePercent } from '@/lib/stats/periods'
import { BAD, GOOD, PAGE_LABELS, PEOPLE, card, cardTitle, decimal, fmt, share } from './format'

/** A figure against the period before: which way it went, by how much, and the same in words. */
export interface Change {
  tone: 'up' | 'down' | 'flat'
  /** What the chip says: «12%», «0,3 п.п.», «было 0». */
  text: string
  /** The whole sentence, for a screen reader and the hover hint. */
  label: string
}

const TONE: Record<Change['tone'], string> = { up: GOOD, down: BAD, flat: '#8A8A8A' }

function Arrow({ tone }: { tone: Change['tone'] }) {
  if (tone === 'flat') return null
  return (
    <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {tone === 'up' ? <path d="M5 8.5v-7M2 4.5l3-3 3 3" /> : <path d="M5 1.5v7M2 5.5l3 3 3-3" />}
    </svg>
  )
}

/**
 * How a count moved against an earlier one; nothing when both were nothing.
 * `than` is what it is held against, as it reads after «чем»: «в предыдущем
 * периоде», «вчера к этому часу»; `was` is the earlier figure in words.
 */
export function countChange(now: number, before: number, than: string, was: string): Change | undefined {
  const pct = changePercent(now, before)
  if (pct === null) {
    return now > 0 ? { tone: 'flat', text: 'было 0', label: `${than.charAt(0).toUpperCase()}${than.slice(1)} было 0` } : undefined
  }
  if (pct === 0) {
    return {
      tone: 'flat',
      text: '0%',
      label: now === before ? `Столько же, сколько ${than}: ${was}` : `Почти столько же, сколько ${than}: было ${was}`,
    }
  }
  const by = `${fmt(Math.abs(pct))}%`
  return { tone: pct > 0 ? 'up' : 'down', text: by, label: `На ${by} ${pct > 0 ? 'больше' : 'меньше'}, чем ${than}: было ${was}` }
}

/** How a percentage moved, in percentage points: a percent of a percent would mislead. */
export function pointsChange(now: number, before: number, than: string): Change {
  const diff = Math.round((now - before) * 10) / 10
  const was = `${decimal(before)}%`
  if (diff === 0) return { tone: 'flat', text: '0 п.п.', label: `Как ${than}: ${was}` }
  const by = `${decimal(Math.abs(diff))} п.п.`
  return { tone: diff > 0 ? 'up' : 'down', text: by, label: `На ${by} ${diff > 0 ? 'выше' : 'ниже'}, чем ${than}: было ${was}` }
}

/** The change beside a figure: an arrow, the amount, and the whole sentence for a screen reader and the hover hint. */
export function ChangeChip({ change }: { change: Change }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 whitespace-nowrap text-[12px] font-semibold tabular-nums"
      style={{ color: TONE[change.tone] }}
      title={change.label}
    >
      <Arrow tone={change.tone} />
      <span aria-hidden>{change.text}</span>
      <span className="sr-only">{change.label}</span>
    </span>
  )
}

/** One headline figure: what it is, the number, how it moved, and a line of context. */
export function Stat({ label, value, hint, hintTitle, swatch, good, change }: {
  label: string
  value: string
  hint?: string
  hintTitle?: string
  swatch?: string
  /** The figure itself is good news (a conversion of one percent or more). */
  good?: boolean
  change?: Change
}) {
  return (
    <div className={card}>
      <p className="flex items-center gap-1.5 text-[12px] text-[#8A8A8A]">
        {swatch && <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: swatch }} />}
        {label}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[26px] font-bold leading-tight sm:text-[28px]" style={{ color: good ? GOOD : '#FFFFFF' }}>{value}</span>
        {change && <ChangeChip change={change} />}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-[#6B6B6B]" title={hintTitle}>{hint}</p>}
    </div>
  )
}

/**
 * One breakdown: name, count, share of all views, and a bar against the
 * largest row. The first `limit` rows; the rest on request.
 */
export function Breakdown({ title, counts, total, limit, label, empty = 'Пока нет данных' }: {
  title: string
  counts: Record<string, number>
  total: number
  limit: number
  label?: (key: string) => ReactNode
  empty?: string
}) {
  const [open, setOpen] = useState(false)
  const all = useMemo(() => topList(counts, Infinity), [counts])
  const rows = open ? all : all.slice(0, limit)
  const max = all[0]?.count || 1
  return (
    <section className={card}>
      <h2 className={`${cardTitle} mb-3`}>{title}</h2>
      {all.length === 0 ? (
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
      {all.length > limit && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="-mx-1 mt-3 rounded px-1 py-1 text-[12px] text-[#8A8A8A] outline-none transition-[color,transform] duration-150 ease-out hover:text-white focus-visible:ring-1 focus-visible:ring-[#C8FF47]/60 active:scale-[0.97]"
        >
          {open ? 'Свернуть' : `Показать все · ${fmt(all.length)}`}
        </button>
      )}
    </section>
  )
}

/**
 * A page of the site as a row's name: the section's or the project's name
 * with its address beside it, opening the page itself in a new tab.
 */
export function PageName({ path, titles }: { path: string; titles: Record<string, string> }) {
  const name = PAGE_LABELS[path] ?? titles[path]
  return (
    <a
      href={path}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded outline-none transition-colors duration-150 hover:text-white hover:underline focus-visible:ring-1 focus-visible:ring-[#C8FF47]/60"
    >
      {name
        ? <>{name} <span className="font-mono text-[11px] text-[#6B6B6B]">{path}</span></>
        : <span className="font-mono text-[12px]">{path}</span>}
    </a>
  )
}

/** People on the site in the last five minutes; the dot pulses while there are any. */
export function OnlineNow({ count }: { count: number | null }) {
  const live = (count ?? 0) > 0
  return (
    <p className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] text-[#9A9A9A]">
      <span aria-hidden className="relative flex h-2 w-2">
        {live && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping motion-safe:[animation-duration:2s]" style={{ background: GOOD }} />}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: live ? GOOD : '#333' }} />
      </span>
      Сейчас на сайте: <b className="font-semibold text-white">{count === null ? '—' : fmt(count)}</b>
    </p>
  )
}

/**
 * The page's shape while the first numbers load, so that they arrive into
 * their places rather than push the page around.
 */
export function Skeleton() {
  const bar = 'rounded bg-[#161616] motion-safe:animate-pulse'
  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">Загружаем статистику…</p>
      <div aria-hidden className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={card}>
            <div className={`${bar} my-[3px] h-3 w-20`} />
            <div className={`${bar} mt-2 h-7 w-24`} />
            <div className={`${bar} mt-2.5 h-2.5 w-28`} />
          </div>
        ))}
      </div>
      <div aria-hidden className={card}>
        <div className={`${bar} h-3.5 w-44`} />
        <div className={`${bar} mt-6 h-[188px] w-full`} />
      </div>
      <div aria-hidden className="grid gap-3 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={card}>
            <div className={`${bar} h-3.5 w-28`} />
            {[0, 1, 2, 3, 4].map((r) => <div key={r} className={`${bar} mt-4 h-3 w-full`} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
