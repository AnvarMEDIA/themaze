'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type MouseEvent, type PointerEvent,
} from 'react'
import toast from 'react-hot-toast'
import { PreviewSwitches, SitePreview, type PreviewLang, type PreviewTheme } from './SitePreview'
import { WorldMapSection } from '@/components/home/WorldMapSection'
import {
  COUNTRIES, countryByCode, countryDotsPath, sectionCountries,
  type MapCity, type MapCountry, type WorldMapData,
} from '@/lib/geo/mapData'
import { PRESET_CITIES, type PresetCity } from '@/lib/geo/cities'
import { MAP_COLS, MAP_ROWS, fromMap } from '@/lib/geo/projection'
import dots from '@/lib/geo/world-dots.json'
import { pluralRu } from '@/lib/utils'

/**
 * The admin's "World map" page: the homepage section itself, drawn with the
 * site's colours from the draft being edited, and the list that drives it.
 * Nothing reaches the site until "Save".
 *
 * On the map: click a country to add it; with "Point on the map" chosen in
 * a country's card, a click places a city.
 */

interface Copy { heading: string }

type Pick =
  | { kind: 'new-city';     code: string }
  | { kind: 'move-city';    code: string; id: string }
  | { kind: 'move-country'; code: string }
  | null

// Which country each dot of the map belongs to, for clicks.
const CELL_OWNER = (() => {
  const owner = new Map<number, string>()
  for (const [code, cells] of Object.entries(dots.countries as Record<string, number[]>)) {
    for (const cell of cells) owner.set(cell, code)
  }
  return owner
})()

const DOT_COUNT = (code: string) => (dots.countries as Record<string, number[]>)[code]?.length ?? 0

/** The country under a point of the map (percent), or next to it, within a dot. */
function countryAt(x: number, y: number): string | null {
  const fx = (x / 100) * MAP_COLS
  const fy = (y / 100) * MAP_ROWS
  let best: string | null = null
  let bestDistance = 1.2
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = Math.floor(fy) + dr
      const c = Math.floor(fx) + dc
      if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) continue
      const code = CELL_OWNER.get(r * MAP_COLS + c)
      if (!code) continue
      const d = Math.hypot(fx - (c + 0.5), fy - (r + 0.5))
      if (d < bestDistance) { bestDistance = d; best = code }
    }
  }
  return best
}

function pointIn(e: { clientX: number; clientY: number; currentTarget: Element }) {
  const r = e.currentTarget.getBoundingClientRect()
  return {
    x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
    y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
  }
}

const norm = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/** Matches at the start of a word first, then anywhere. */
function rank(q: string, ...names: string[]): number {
  let best = 0
  for (const name of names) {
    const n = norm(name)
    if (n.startsWith(q)) return 3
    if (n.split(/[\s-]+/).some((w) => w.startsWith(q))) best = Math.max(best, 2)
    else if (n.includes(q)) best = Math.max(best, 1)
  }
  return best
}

const newCityId = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const fmt = (n: number) => n.toFixed(2)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const inputClass =
  'w-full bg-[#111] border border-[#252525] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#C8FF47] transition-colors'
const chipClass =
  'px-3 py-1.5 text-xs font-medium bg-[#1A1A1A] border border-[#252525] rounded-lg text-[#888] hover:border-[#C8FF47] hover:text-[#C8FF47] transition-colors active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none'
const iconButton =
  'w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1A1A1A] transition-colors active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none'

export function WorldMapEditor({ copy }: { copy: Record<PreviewLang, Copy> }) {
  const [saved,   setSaved]   = useState<WorldMapData | null>(null)
  const [draft,   setDraft]   = useState<WorldMapData>({ countries: [] })
  const [saving,  setSaving]  = useState(false)
  const [lang,    setLang]    = useState<PreviewLang>('ru')
  const [theme,   setTheme]   = useState<PreviewTheme>('dark')
  const [pick,    setPick]    = useState<Pick>(null)
  const [query,   setQuery]   = useState('')
  const [hoverCode, setHoverCode] = useState<string | null>(null)
  const [selected,  setSelected]  = useState<string | null>(null)
  const [focusCity, setFocusCity] = useState<string | null>(null)

  const mapRef     = useRef<HTMLDivElement>(null)
  const tipRef     = useRef<HTMLDivElement>(null)
  const tipTextRef = useRef<HTMLSpanElement>(null)
  const hoverRef   = useRef<string | null>(null)

  const dirty = saved !== null && !same(saved, draft)

  /* ── Load ─────────────────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/world-map', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json() as WorldMapData
      setSaved(data)
      setDraft(data)
    } catch {
      toast.error('Не удалось загрузить карту')
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Esc leaves the "place on the map" mode.
  useEffect(() => {
    if (!pick) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPick(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pick])

  /* ── Edits ────────────────────────────────────────────────────────────── */

  const editCountries = (fn: (list: MapCountry[]) => MapCountry[]) =>
    setDraft((d) => ({ ...d, countries: fn(d.countries) }))

  const editCountry = (code: string, fn: (c: MapCountry) => MapCountry) =>
    editCountries((list) => list.map((c) => (c.code === code ? fn(c) : c)))

  const has = (code: string) => draft.countries.some((c) => c.code === code)

  const addCountry = (code: string) => {
    const c = countryByCode(code)
    if (!c || has(code)) return
    editCountries((list) => [...list, { code, nameEn: c.en, nameRu: c.ru, lat: c.lat, lng: c.lng, cities: [] }])
    setSelected(code)
  }

  const addPresetCity = (city: PresetCity) => {
    if (draft.countries.some((c) => c.cities.some((x) => x.id === city.id))) {
      toast(`${city.nameRu} уже на карте`)
      return
    }
    const entry: MapCity = { id: city.id, nameEn: city.nameEn, nameRu: city.nameRu, lat: city.lat, lng: city.lng }
    const country = countryByCode(city.country)
    editCountries((list) => {
      if (list.some((c) => c.code === city.country)) {
        return list.map((c) => (c.code === city.country ? { ...c, cities: [...c.cities, entry] } : c))
      }
      if (!country) return list
      return [...list, {
        code: city.country, nameEn: country.en, nameRu: country.ru, lat: country.lat, lng: country.lng, cities: [entry],
      }]
    })
    setSelected(city.country)
  }

  const removeCountry = (c: MapCountry) => {
    const name = c.nameRu || c.nameEn
    if (c.cities.length > 0 && !confirm(`Убрать «${name}» с карты вместе с городами?`)) return
    editCountries((list) => list.filter((x) => x.code !== c.code))
    if (pick?.code === c.code) setPick(null)
  }

  const moveCountry = (index: number, by: -1 | 1) =>
    editCountries((list) => {
      const next = [...list]
      const [item] = next.splice(index, 1)
      next.splice(index + by, 0, item)
      return next
    })

  const editCity = (code: string, id: string, patch: Partial<MapCity>) =>
    editCountry(code, (c) => ({ ...c, cities: c.cities.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))

  const removeCity = (code: string, id: string) => {
    editCountry(code, (c) => ({ ...c, cities: c.cities.filter((x) => x.id !== id) }))
    if (pick?.kind === 'move-city' && pick.id === id) setPick(null)
  }

  const startPick = (next: Pick) => {
    setPick(next)
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  /* ── The map under the pointer ────────────────────────────────────────── */

  const onMapMove = (e: PointerEvent<HTMLDivElement>) => {
    const { x, y } = pointIn(e)
    const code = pick ? null : countryAt(x, y)
    if (code !== hoverRef.current) {
      hoverRef.current = code
      setHoverCode(code)
    }
    // The tooltip follows the pointer without re-rendering the page.
    if (tipRef.current) {
      tipRef.current.style.left = `${x}%`
      tipRef.current.style.top  = `${y}%`
    }
    if (pick && tipTextRef.current) {
      const { lat, lng } = fromMap(x, y)
      tipTextRef.current.textContent = `${fmt(lat)}°, ${fmt(lng)}°`
    }
  }

  const onMapLeave = () => {
    hoverRef.current = null
    setHoverCode(null)
    if (tipRef.current) tipRef.current.style.left = '-999%'
  }

  const onMapClick = (e: MouseEvent<HTMLDivElement>) => {
    const { x, y } = pointIn(e)
    if (pick) {
      const { lat, lng } = fromMap(x, y)
      if (pick.kind === 'new-city') {
        const id = newCityId()
        editCountry(pick.code, (c) => ({ ...c, cities: [...c.cities, { id, nameEn: '', nameRu: '', lat, lng }] }))
        setFocusCity(id)
      } else if (pick.kind === 'move-city') {
        editCity(pick.code, pick.id, { lat, lng })
      } else {
        editCountry(pick.code, (c) => ({ ...c, lat, lng }))
      }
      setSelected(pick.code)
      setPick(null)
      return
    }
    const code = countryAt(x, y)
    if (!code) return
    if (has(code)) {
      setSelected(code)
      document.getElementById(`map-country-${code}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      addCountry(code)
    }
  }

  /* ── Save ─────────────────────────────────────────────────────────────── */

  const unnamed = draft.countries.some((c) => !(c.nameRu || c.nameEn) || c.cities.some((x) => !(x.nameRu || x.nameEn)))

  const save = async () => {
    if (unnamed) {
      toast.error('У каждой страны и города должно быть название')
      return
    }
    setSaving(true)
    try {
      const res  = await fetch('/api/world-map', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Не удалось сохранить')
      setSaved(data as WorldMapData)
      setDraft(data as WorldMapData)
      toast.success('Сохранено — карта на сайте обновилась')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  /* ── Derived ──────────────────────────────────────────────────────────── */

  const preview = useMemo(() => sectionCountries(draft, lang), [draft, lang])

  const results = useMemo(() => {
    const q = norm(query)
    if (!q) return { countries: [], cities: [] }
    const countries = COUNTRIES
      .map((c) => ({ c, r: c.code.toLowerCase() === q ? 4 : rank(q, c.ru, c.en) }))
      .filter((x) => x.r > 0)
      .sort((a, b) => b.r - a.r)
      .slice(0, 6)
      .map((x) => x.c)
    const cities = PRESET_CITIES
      .map((c) => ({ c, r: rank(q, c.nameRu, c.nameEn) }))
      .filter((x) => x.r > 0)
      .sort((a, b) => b.r - a.r)
      .slice(0, 6)
      .map((x) => x.c)
    return { countries, cities }
  }, [query])

  const cityIds = useMemo(
    () => new Set(draft.countries.flatMap((c) => c.cities.map((x) => x.id))),
    [draft],
  )

  const pickCountry = pick ? draft.countries.find((c) => c.code === pick.code) : undefined
  const pickHint = !pick ? '' :
    pick.kind === 'new-city'  ? `Кликните на карте, где находится новый город (${pickCountry?.nameRu ?? pick.code})` :
    pick.kind === 'move-city' ? 'Кликните на карте, куда переставить город' :
                                `Кликните, где поставить метку страны (${pickCountry?.nameRu ?? pick.code})`

  const hoverCountry = hoverCode ? countryByCode(hoverCode) : undefined

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* The admin forces the default cursor everywhere; the map needs its own. */}
      <style>{`
        .map-edit, .map-edit * { cursor: default !important; }
        .map-edit.is-land, .map-edit.is-land * { cursor: pointer !important; }
        .map-edit.is-pick, .map-edit.is-pick * { cursor: crosshair !important; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">World map</h1>
          <p className="text-sm text-[#555] mt-1 max-w-lg">
            Карта «Проекты по всему миру» на главной. Превью ниже — то же, что увидят на сайте; изменения попадут на сайт после «Сохранить».
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
          <PreviewSwitches lang={lang} onLang={setLang} theme={theme} onTheme={setTheme} />
          {dirty && (
            <button
              type="button"
              onClick={() => { if (saved) setDraft(saved); setPick(null) }}
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

      {/* Preview: the homepage section itself */}
      <div className="rounded-xl border border-[#1E1E1E] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#1E1E1E] bg-[#0D0D0D]">
          <p className={`text-xs ${pick ? 'text-[#C8FF47]' : 'text-[#555]'}`}>
            {pick
              ? <>{pickHint} · <span className="text-[#888]">Esc — отмена</span></>
              : 'Нажмите на страну на карте, чтобы добавить её. Наведите на точку города — появится подпись, как на сайте.'}
          </p>
          {pick && (
            <button type="button" onClick={() => setPick(null)} className={chipClass}>
              Отмена
            </button>
          )}
        </div>
        {/* The line under the section parts it from the next one on the
            site; here the card's own edge does that. */}
        <SitePreview ref={mapRef} theme={theme} className="[&>section]:border-b-0">
          {saved === null ? (
            <div className="h-[420px] animate-pulse" />
          ) : (
            <WorldMapSection
              countries={preview}
              heading={copy[lang].heading}
              interaction={{
                className:      `map-edit ${pick ? 'is-pick' : hoverCode ? 'is-land' : ''}`,
                onClick:        onMapClick,
                onPointerMove:  onMapMove,
                onPointerLeave: onMapLeave,
                overlay: (
                  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    {/* The country under the pointer, in the admin's colour: what a click adds. */}
                    {hoverCode && !has(hoverCode) && (
                      <svg viewBox={`0 0 ${MAP_COLS} ${MAP_ROWS}`} className="absolute inset-0 w-full h-full overflow-visible">
                        <path
                          d={countryDotsPath(hoverCode)}
                          fill="none" stroke="#C8FF47" strokeOpacity={0.7} strokeWidth={0.5} strokeLinecap="round"
                        />
                      </svg>
                    )}
                    <div ref={tipRef} className="absolute" style={{ left: '-999%', top: 0 }}>
                      {(pick || hoverCountry) && (
                        <div className="ml-4 mt-4 whitespace-nowrap rounded-md bg-[#111] border border-[#252525] px-2.5 py-1.5 text-[11px] leading-none text-white shadow-lg">
                          {pick ? (
                            <span ref={tipTextRef} className="font-mono" />
                          ) : hoverCountry && (
                            <>
                              {hoverCountry.ru}
                              <span className="text-[#777]"> · {has(hoverCountry.code) ? 'уже на карте' : 'нажмите, чтобы добавить'}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              }}
            />
          )}
        </SitePreview>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mt-6">
        {/* Add */}
        <div className="xl:col-span-2">
          <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 xl:sticky xl:top-6">
            <h2 className="text-sm font-semibold text-white mb-1">Добавить</h2>
            <p className="text-xs text-[#555] mb-4">Страну или город из списка. Город добавляет и свою страну.</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например: Казахстан, Dubai, Сеул"
              className={inputClass}
              aria-label="Найти страну или город"
            />
            {query.trim() && (
              <div className="mt-3 space-y-4">
                {results.countries.length === 0 && results.cities.length === 0 && (
                  <p className="text-xs text-[#555]">
                    Ничего не нашлось. Город, которого нет в списке, можно поставить на карте:
                    кнопка «Точка на карте» в карточке страны.
                  </p>
                )}
                {results.countries.length > 0 && (
                  <ResultGroup title="Страны">
                    {results.countries.map((c) => (
                      <ResultRow
                        key={c.code}
                        title={c.ru}
                        meta={`${c.en} · ${c.code}`}
                        done={has(c.code)}
                        onAdd={() => { addCountry(c.code); setQuery('') }}
                      />
                    ))}
                  </ResultGroup>
                )}
                {results.cities.length > 0 && (
                  <ResultGroup title="Города">
                    {results.cities.map((city) => (
                      <ResultRow
                        key={city.id}
                        title={city.nameRu}
                        meta={`${city.nameEn} · ${countryByCode(city.country)?.ru ?? city.country}`}
                        done={cityIds.has(city.id)}
                        onAdd={() => { addPresetCity(city); setQuery('') }}
                      />
                    ))}
                  </ResultGroup>
                )}
              </div>
            )}
          </div>
        </div>

        {/* The list */}
        <div className="xl:col-span-3">
          <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E]">
            <div className="px-5 py-4 border-b border-[#1E1E1E] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">На карте</h2>
              <span className="text-xs text-[#444]">
                {draft.countries.length} {pluralRu(draft.countries.length, 'страна', 'страны', 'стран')}
                {' · '}
                {cityIds.size} {pluralRu(cityIds.size, 'город', 'города', 'городов')}
              </span>
            </div>
            <p className="px-5 py-2 text-[11px] text-[#444] border-b border-[#1E1E1E]">
              Порядок здесь — порядок в списке под картой. Страна без городов мигает на карте сама.
            </p>

            {saved === null ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-[#111] animate-pulse" />)}
              </div>
            ) : draft.countries.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-[#444]">На карте пока ничего нет.</p>
                <p className="text-xs text-[#333] mt-1">Нажмите на страну на карте или найдите её слева. Пока список пуст, секции на сайте не видно.</p>
              </div>
            ) : (
              <ul className="p-3 space-y-3">
                {draft.countries.map((c, i) => (
                  <CountryCard
                    key={c.code}
                    country={c}
                    index={i}
                    last={i === draft.countries.length - 1}
                    selected={selected === c.code}
                    picking={pick?.code === c.code ? pick : null}
                    focusCity={focusCity}
                    takenIds={cityIds}
                    onSelect={() => setSelected(c.code)}
                    onMove={(by) => moveCountry(i, by)}
                    onRemove={() => removeCountry(c)}
                    onEdit={(patch) => editCountry(c.code, (x) => ({ ...x, ...patch }))}
                    onEditCity={(id, patch) => editCity(c.code, id, patch)}
                    onRemoveCity={(id) => removeCity(c.code, id)}
                    onAddPreset={addPresetCity}
                    onPick={startPick}
                    onFocused={() => setFocusCity(null)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */


function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#444] mb-1.5">{title}</p>
      <ul className="rounded-lg border border-[#1E1E1E] divide-y divide-[#1A1A1A] overflow-hidden">{children}</ul>
    </div>
  )
}

function ResultRow({ title, meta, done, onAdd }: { title: string; meta: string; done: boolean; onAdd: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onAdd}
        disabled={done}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#111] transition-colors disabled:pointer-events-none"
      >
        <span className="min-w-0">
          <span className="block text-sm text-white truncate">{title}</span>
          <span className="block text-[11px] text-[#555] truncate">{meta}</span>
        </span>
        <span className={`shrink-0 text-xs ${done ? 'text-[#444]' : 'text-[#C8FF47]'}`}>
          {done ? 'уже на карте' : '＋ Добавить'}
        </span>
      </button>
    </li>
  )
}

function CountryCard({
  country: c, index, last, selected, picking, focusCity, takenIds,
  onSelect, onMove, onRemove, onEdit, onEditCity, onRemoveCity, onAddPreset, onPick, onFocused,
}: {
  country:      MapCountry
  index:        number
  last:         boolean
  selected:     boolean
  picking:      Pick
  focusCity:    string | null
  takenIds:     Set<string>
  onSelect:     () => void
  onMove:       (by: -1 | 1) => void
  onRemove:     () => void
  onEdit:       (patch: Partial<MapCountry>) => void
  onEditCity:   (id: string, patch: Partial<MapCity>) => void
  onRemoveCity: (id: string) => void
  onAddPreset:  (city: PresetCity) => void
  onPick:       (pick: Pick) => void
  onFocused:    () => void
}) {
  const presets = PRESET_CITIES.filter((p) => p.country === c.code && !takenIds.has(p.id))
  const noDots  = DOT_COUNT(c.code) === 0
  const missing = (v: { nameRu: string; nameEn: string }) => !(v.nameRu || v.nameEn)

  return (
    <li
      id={`map-country-${c.code}`}
      onFocusCapture={onSelect}
      className={`rounded-lg border bg-[#0A0A0A] p-4 transition-colors ${selected ? 'border-[#C8FF47]/50' : 'border-[#1E1E1E]'}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono text-[#333] w-5 text-center shrink-0">{String(index + 1).padStart(2, '0')}</span>
        <p className="flex-1 min-w-0 text-sm font-semibold text-white truncate">
          {c.nameRu || c.nameEn || '—'} <span className="font-normal text-[#555]">· {c.code}</span>
        </p>
        <button type="button" className={iconButton} onClick={() => onMove(-1)} disabled={index === 0} aria-label="Выше" title="Выше">
          <Chevron up />
        </button>
        <button type="button" className={iconButton} onClick={() => onMove(1)} disabled={last} aria-label="Ниже" title="Ниже">
          <Chevron />
        </button>
        <button type="button" className={`${iconButton} hover:!text-red-400`} onClick={onRemove} aria-label="Убрать страну" title="Убрать страну">
          <Cross />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <input
          value={c.nameRu}
          onChange={(e) => onEdit({ nameRu: e.target.value })}
          placeholder="Название по-русски"
          maxLength={60}
          aria-label="Название страны по-русски"
          className={`${inputClass} ${missing(c) ? '!border-red-500/60' : ''}`}
        />
        <input
          value={c.nameEn}
          onChange={(e) => onEdit({ nameEn: e.target.value })}
          placeholder="Name in English"
          maxLength={60}
          aria-label="Название страны по-английски"
          className={`${inputClass} ${missing(c) ? '!border-red-500/60' : ''}`}
        />
      </div>

      {noDots && (
        <p className="text-[11px] text-[#666] mt-2">
          Страна меньше одной точки карты: на карте она видна только меткой.
        </p>
      )}

      {c.cities.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {c.cities.map((city) => {
            const moving = picking?.kind === 'move-city' && picking.id === city.id
            return (
              <li key={city.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  value={city.nameRu}
                  onChange={(e) => onEditCity(city.id, { nameRu: e.target.value })}
                  placeholder="Город по-русски"
                  maxLength={60}
                  aria-label="Город по-русски"
                  autoFocus={focusCity === city.id}
                  onFocus={focusCity === city.id ? onFocused : undefined}
                  className={`${inputClass} ${missing(city) ? '!border-red-500/60' : ''}`}
                />
                <input
                  value={city.nameEn}
                  onChange={(e) => onEditCity(city.id, { nameEn: e.target.value })}
                  placeholder="City in English"
                  maxLength={60}
                  aria-label="Город по-английски"
                  className={`${inputClass} ${missing(city) ? '!border-red-500/60' : ''}`}
                />
                <div className="flex items-center gap-0.5">
                  <span className="hidden sm:block text-[10px] font-mono text-[#444] tabular-nums w-[84px] text-right pr-1">
                    {fmt(city.lat)}, {fmt(city.lng)}
                  </span>
                  <button
                    type="button"
                    className={`${iconButton} ${moving ? '!text-[#C8FF47]' : ''}`}
                    onClick={() => onPick(moving ? null : { kind: 'move-city', code: c.code, id: city.id })}
                    aria-label="Переставить на карте"
                    title="Переставить на карте"
                  >
                    <Target />
                  </button>
                  <button
                    type="button"
                    className={`${iconButton} hover:!text-red-400`}
                    onClick={() => onRemoveCity(city.id)}
                    aria-label="Убрать город"
                    title="Убрать город"
                  >
                    <Cross />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-[11px] text-[#555] mt-3">
          Городов нет — мигает метка страны ({fmt(c.lat)}, {fmt(c.lng)}).{' '}
          <button
            type="button"
            onClick={() => onPick({ kind: 'move-country', code: c.code })}
            className={`underline underline-offset-2 hover:text-[#C8FF47] transition-colors ${picking?.kind === 'move-country' ? 'text-[#C8FF47]' : ''}`}
          >
            Переставить метку
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {presets.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const city = presets.find((p) => p.id === e.target.value)
              if (city) onAddPreset(city)
            }}
            className="px-3 py-1.5 text-xs font-medium bg-[#1A1A1A] border border-[#252525] rounded-lg text-[#888] hover:border-[#C8FF47] focus:outline-none focus:border-[#C8FF47] transition-colors"
            aria-label="Добавить город из списка"
          >
            <option value="">＋ Город из списка</option>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.nameRu}</option>)}
          </select>
        )}
        <button
          type="button"
          onClick={() => onPick(picking?.kind === 'new-city' ? null : { kind: 'new-city', code: c.code })}
          className={`${chipClass} ${picking?.kind === 'new-city' ? '!border-[#C8FF47] !text-[#C8FF47]' : ''}`}
        >
          ＋ Точка на карте
        </button>
      </div>
    </li>
  )
}

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={up ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Cross() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Target() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
