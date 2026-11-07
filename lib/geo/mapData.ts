import dots from './world-dots.json'
import countries from './countries.json'
import { MAP_COLS, MAP_ROWS } from './projection'

/**
 * The homepage "Geography" section's data: the countries the studio has
 * worked for, each with the cities to mark on the map. Edited in the admin
 * at /admin/map and stored under the "worldmap" key.
 *
 * Imports the dot data, so it belongs to the server and the admin; the
 * public section itself only receives what sectionCountries() returns.
 */

export interface MapCity {
  id:     string
  nameEn: string
  nameRu: string
  lat:    number
  lng:    number
}

export interface MapCountry {
  /** ISO 3166-1 alpha-2, the key into lib/geo/world-dots.json. */
  code:   string
  nameEn: string
  nameRu: string
  /** Where the country's own marker goes when it has no cities. */
  lat:    number
  lng:    number
  cities: MapCity[]
}

export interface WorldMapData {
  countries: MapCountry[]
}

export interface PickableCountry {
  code: string
  en:   string
  ru:   string
  lat:  number
  lng:  number
}

export const COUNTRIES = countries as PickableCountry[]

export function countryByCode(code: string): PickableCountry | undefined {
  return COUNTRIES.find((c) => c.code === code)
}

function country(code: string, cities: MapCity[] = []): MapCountry {
  const c = countryByCode(code)!
  return { code, nameEn: c.en, nameRu: c.ru, lat: c.lat, lng: c.lng, cities }
}

/**
 * Until the admin saves its own list: the countries the published case
 * studies name — Uzbekistan (Tashkent, and Chinar Mall in Bukhara),
 * Kazakhstan (Mega Project), Russia (PDZ), the UAE (Chocoluxe, made in
 * Dubai) and the USA (ALZ Express, JNB School).
 */
export const DEFAULT_WORLD_MAP: WorldMapData = {
  countries: [
    country('UZ', [
      { id: 'uz-tashkent', nameEn: 'Tashkent', nameRu: 'Ташкент', lat: 41.3, lng: 69.24 },
      { id: 'uz-bukhara',  nameEn: 'Bukhara',  nameRu: 'Бухара',  lat: 39.77, lng: 64.43 },
    ]),
    country('KZ'),
    country('RU'),
    country('AE', [
      { id: 'ae-dubai', nameEn: 'Dubai', nameRu: 'Дубай', lat: 25.2, lng: 55.27 },
    ]),
    country('US'),
  ],
}

/* ── what the section is given ──────────────────────────────────────────── */

export interface SectionCity {
  id:   string
  name: string
  lat:  number
  lng:  number
}

export interface SectionCountry {
  code:   string
  name:   string
  lat:    number
  lng:    number
  /** Its dots, or null for a country smaller than one dot. */
  layer:  DotLayer | null
  cities: SectionCity[]
}

/**
 * A country's dots, cut to the part of the map they cover: each lit country
 * is its own animated layer, and a full-map layer for Qatar would cost as
 * much graphics memory as one for Russia.
 */
export interface DotLayer {
  /** One path of zero-length segments, in the base map's coordinates. */
  path:    string
  viewBox: string
  /** Where viewBox sits on the map, in percent of its width and height. */
  box:     { left: number; top: number; width: number; height: number }
}

const dotCells = dots.countries as Record<string, number[]>

/** A country's land dots as one path of zero-length segments. */
export function countryDotsPath(code: string): string {
  return (dotCells[code] ?? [])
    .map((cell) => `M${(cell % MAP_COLS) + 0.5} ${Math.floor(cell / MAP_COLS) + 0.5}h0`)
    .join('')
}

export function countryLayer(code: string): DotLayer | null {
  const cells = dotCells[code]
  if (!cells?.length) return null
  let c0 = MAP_COLS, c1 = 0, r0 = MAP_ROWS, r1 = 0
  for (const cell of cells) {
    const c = cell % MAP_COLS
    const r = Math.floor(cell / MAP_COLS)
    c0 = Math.min(c0, c); c1 = Math.max(c1, c)
    r0 = Math.min(r0, r); r1 = Math.max(r1, r)
  }
  const w = c1 - c0 + 1
  const h = r1 - r0 + 1
  const pct = (n: number, of: number) => Math.round((n / of) * 1e6) / 1e4
  return {
    path:    countryDotsPath(code),
    viewBox: `${c0} ${r0} ${w} ${h}`,
    box:     { left: pct(c0, MAP_COLS), top: pct(r0, MAP_ROWS), width: pct(w, MAP_COLS), height: pct(h, MAP_ROWS) },
  }
}

/** The map data in one language, with each country's dots resolved. */
export function sectionCountries(data: WorldMapData, locale: string): SectionCountry[] {
  const ru = locale === 'ru'
  const name = (en: string, rus: string) => ((ru ? rus : en) || en || rus).trim()
  return data.countries.map((c) => ({
    code:   c.code,
    name:   name(c.nameEn, c.nameRu),
    lat:    c.lat,
    lng:    c.lng,
    layer:  countryLayer(c.code),
    cities: c.cities.map((city) => ({
      id:   city.id,
      name: name(city.nameEn, city.nameRu),
      lat:  city.lat,
      lng:  city.lng,
    })),
  }))
}
