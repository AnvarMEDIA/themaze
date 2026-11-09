'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { HeroStats } from '@/components/home/HeroStats'
import { AboutStats } from '@/components/about/AboutStats'
import { PreviewSwitches, SitePreview, type PreviewLang, type PreviewTheme } from '@/components/admin/SitePreview'
import {
  ABOUT_PAGE_STAT_IDS, HOME_STAT_IDS, isShown, localizeStats,
  type HomeStat, type HomeStats, type StatId,
} from '@/lib/homeStats'
import { pluralRu } from '@/lib/utils'

/**
 * The studio's numbers: the strip under the homepage's first screen and
 * the row on the About page, each previewed by the component the site
 * uses, drawn from the draft. Years, projects and clients appear on both
 * pages, so they are edited once. Nothing reaches the site until "Save".
 */

// Each place's name here, and the captions it had first, as placeholders.
const PLACE: Record<StatId, { title: string; ru: string; en: string }> = {
  projects:  { title: 'Проекты', ru: 'Завершённых проектов', en: 'Projects completed' },
  clients:   { title: 'Клиенты', ru: 'Довольных клиентов',   en: 'Happy clients' },
  years:     { title: 'Опыт',    ru: 'Лет опыта',            en: 'Years of experience' },
  countries: { title: 'Страны',  ru: 'Стран охвата',         en: 'Countries served' },
  awards:    { title: 'Награды', ru: 'Наград',               en: 'Awards' },
}

const inputClass =
  'w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export default function AdminNumbersPage() {
  const [saved,  setSaved]  = useState<HomeStats | null>(null)
  const [draft,  setDraft]  = useState<HomeStats>({ stats: [] })
  const [saving, setSaving] = useState(false)
  const [lang,   setLang]   = useState<PreviewLang>('ru')
  const [theme,  setTheme]  = useState<PreviewTheme>('light')
  const [mapCountries, setMapCountries] = useState<number | null>(null)

  const dirty = saved !== null && !same(saved, draft)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/home-stats', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json() as HomeStats
      setSaved(data)
      setDraft(data)
    } catch {
      toast.error('Не удалось загрузить цифры')
    }
    // Only for the hint by "Countries"; the page works without it.
    fetch('/api/world-map', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m: { countries?: unknown[] } | null) => { if (Array.isArray(m?.countries)) setMapCountries(m.countries.length) })
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const edit = (id: StatId, patch: Partial<HomeStat>) =>
    setDraft((d) => ({ ...d, stats: d.stats.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))

  const uncaptioned = draft.stats.some((s) => !(s.labelRu.trim() || s.labelEn.trim()))

  const save = async () => {
    if (uncaptioned) {
      toast.error('У каждой цифры должна быть подпись')
      return
    }
    setSaving(true)
    try {
      const res  = await fetch('/api/home-stats', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Не удалось сохранить')
      setSaved(data as HomeStats)
      setDraft(data as HomeStats)
      toast.success('Сохранено — цифры на сайте обновились')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  const homePreview  = useMemo(() => localizeStats(draft, lang, HOME_STAT_IDS), [draft, lang])
  const aboutPreview = useMemo(() => localizeStats(draft, lang, ABOUT_PAGE_STAT_IDS), [draft, lang])
  const stat = (id: StatId) => draft.stats.find((s) => s.id === id)
  const loading = saved === null

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Numbers</h1>
          <p className="text-sm text-[#555] mt-1 max-w-lg">
            Цифры студии на главной и на странице «О нас»: одна цифра везде одна и та же.
            На сайт попадут после «Сохранить».
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
          <PreviewSwitches lang={lang} onLang={setLang} theme={theme} onTheme={setTheme} />
          {dirty && (
            <button
              type="button"
              onClick={() => { if (saved) setDraft(saved) }}
              className="px-4 py-2.5 border border-[#252525] text-[#888] rounded-lg text-sm hover:border-[#333] hover:text-white transition-colors active:scale-[0.97]"
            >
              Отменить
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="px-5 py-2.5 bg-[#C8FF47] text-[#0A0A0A] font-bold rounded-lg text-sm hover:bg-[#F0EEE6] transition-colors active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
          >
            {saving ? 'Сохраняю…' : dirty ? 'Сохранить' : 'Сохранено'}
          </button>
        </div>
      </div>

      {/* ── Homepage ─────────────────────────────────────────────────────── */}
      <SectionTitle
        title="Главная"
        note="Полоса внизу первого экрана. Те же цифры показывает карточка в блоке «О студии»."
      />
      <div className="rounded-xl border border-[#1E1E1E] overflow-hidden">
        {/* The strip's top line parts it from the first screen on the site;
            here the card's own edge does that. */}
        <SitePreview theme={theme} className="[&>div]:border-t-0">
          {loading ? <div className="h-[120px] animate-pulse" /> : <HeroStats stats={homePreview} />}
        </SitePreview>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
        {loading
          ? [...Array(4)].map((_, i) => <div key={i} className="h-72 rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] animate-pulse" />)
          : HOME_STAT_IDS.map((id, i) => {
              const s = stat(id)
              if (!s) return null
              return (
                <StatCard key={id} index={i} stat={s} onEdit={(patch) => edit(id, patch)}>
                  {id === 'countries' && mapCountries !== null && mapCountries > 0 && (
                    <p className="text-[11px] text-[#555] mt-3 leading-relaxed">
                      На карте мира сейчас {mapCountries} {pluralRu(mapCountries, 'страна', 'страны', 'стран')}.
                      {s.value !== mapCountries && (
                        <>
                          {' '}
                          <button
                            type="button"
                            onClick={() => edit(id, { value: mapCountries })}
                            className="underline underline-offset-2 hover:text-[#C8FF47] transition-colors"
                          >
                            Подставить {mapCountries}
                          </button>
                        </>
                      )}
                    </p>
                  )}
                </StatCard>
              )
            })}
      </div>

      {/* ── About page ───────────────────────────────────────────────────── */}
      <div className="mt-12">
        <SectionTitle
          title="Страница «О нас»"
          note="Опыт, проекты и клиенты здесь те же, что на главной: правятся выше. Своя у страницы только четвёртая цифра, «Награды»: выключенная, она не показывается, и в ряду остаются три цифры."
        />
        <div className="rounded-xl border border-[#1E1E1E] overflow-hidden">
          {/* The row's bottom line parts it from the next block on the site. */}
          <SitePreview theme={theme} className="[&>div]:border-b-0">
            {loading ? <div className="h-[160px] animate-pulse" /> : <AboutStats stats={aboutPreview} />}
          </SitePreview>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
          {!loading && stat('awards') && (
            <StatCard
              index={HOME_STAT_IDS.length}
              stat={stat('awards')!}
              onEdit={(patch) => edit('awards', patch)}
              toggle
            />
          )}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555]">{title}</h2>
      <p className="text-xs text-[#444] mt-1">{note}</p>
    </div>
  )
}

function StatCard({
  index, stat: s, onEdit, toggle = false, children,
}: {
  index:     number
  stat:      HomeStat
  onEdit:    (patch: Partial<HomeStat>) => void
  /** Offer a switch that takes the number off the site. */
  toggle?:   boolean
  children?: React.ReactNode
}) {
  const missing = !(s.labelRu.trim() || s.labelEn.trim())
  const on      = isShown(s)
  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm font-semibold text-white">
          <span className="text-[11px] font-mono text-[#333] mr-2">{String(index + 1).padStart(2, '0')}</span>
          {PLACE[s.id].title}
        </p>
        {toggle ? (
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-medium ${on ? 'text-[#C8FF47]' : 'text-[#555]'}`} aria-hidden="true">
              {on ? 'Вкл' : 'Выкл'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={`${PLACE[s.id].title}: показывать на сайте`}
              title={on ? 'Показывается на сайте' : 'Не показывается на сайте'}
              onClick={() => onEdit({ visible: !on })}
              className={[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                on ? 'bg-maze-lime' : 'bg-maze-border',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-3.5 w-3.5 rounded-full bg-maze-ink transition-transform',
                  on ? 'translate-x-[18px]' : 'translate-x-[3px]',
                ].join(' ')}
              />
            </button>
          </div>
        ) : (
          <p className="text-lg font-black text-[#C8FF47] tabular-nums">{s.value}{s.suffix}</p>
        )}
      </div>

      {toggle && !on && (
        <p className="text-[11px] text-[#555] -mt-1 mb-4">
          Не показывается на сайте. Включите, когда будет что показать: число и подписи сохранятся.
        </p>
      )}

      {/* Switched off, the fields stay editable, only quieter. */}
      <div className={`transition-opacity duration-200 ${on ? '' : 'opacity-50'}`}>
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <label className="block">
          <span className="text-xs font-medium text-[#555] block mb-1.5">Число</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={1_000_000}
            step={1}
            value={s.value}
            onChange={(e) => {
              const n = Math.floor(Number(e.target.value))
              onEdit({ value: Number.isFinite(n) ? Math.min(1_000_000, Math.max(0, n)) : 0 })
            }}
            className={`${inputClass} tabular-nums`}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[#555] block mb-1.5">После</span>
          <input
            value={s.suffix}
            onChange={(e) => onEdit({ suffix: e.target.value })}
            maxLength={4}
            placeholder="+"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block mt-3">
        <span className="text-xs font-medium text-[#555] block mb-1.5">Подпись по-русски</span>
        <input
          value={s.labelRu}
          onChange={(e) => onEdit({ labelRu: e.target.value })}
          maxLength={40}
          placeholder={PLACE[s.id].ru}
          className={`${inputClass} ${missing ? '!border-red-500/60' : ''}`}
        />
      </label>
      <label className="block mt-3">
        <span className="text-xs font-medium text-[#555] block mb-1.5">Подпись по-английски</span>
        <input
          value={s.labelEn}
          onChange={(e) => onEdit({ labelEn: e.target.value })}
          maxLength={40}
          placeholder={PLACE[s.id].en}
          className={`${inputClass} ${missing ? '!border-red-500/60' : ''}`}
        />
      </label>
      </div>

      {children}
    </div>
  )
}
