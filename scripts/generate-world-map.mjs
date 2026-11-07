/**
 * Builds the dotted world map used by the homepage "Geography" section and
 * its admin page. Run it again only to change the grid:
 *
 *   npm i --no-save world-atlas@2 topojson-client@3 d3-geo@3 i18n-iso-countries@7
 *   node scripts/generate-world-map.mjs
 *
 * Writes three files, all committed:
 *   public/map/world-dots.svg   every land dot, the map's base layer
 *   lib/geo/world-dots.json     the same dots, grouped by country, so a
 *                               country can be lit dot by dot
 *   lib/geo/countries.json      the countries the admin can pick, with
 *                               English and Russian names and a centre
 *
 * Geography: Natural Earth 1:50m (public domain), via world-atlas.
 * Projection: plain equirectangular, latitude cropped to the inhabited
 * band; lib/geo/projection.ts holds the same constants and must match.
 *
 * The SVG is drawn black on transparent because the page uses it as a CSS
 * mask: the dots take whatever colour the theme gives them.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { feature } from 'topojson-client'
import { geoContains, geoBounds, geoArea, geoCentroid } from 'd3-geo'
import countriesI18n from 'i18n-iso-countries'

const require = createRequire(import.meta.url)
const topo = require('world-atlas/countries-50m.json')
countriesI18n.registerLocale(require('i18n-iso-countries/langs/en.json'))
countriesI18n.registerLocale(require('i18n-iso-countries/langs/ru.json'))

// Keep in step with lib/geo/projection.ts.
const LAT_TOP    = 84
const LAT_BOTTOM = -56
const STEP       = 2                     // degrees between dots
const COLS       = 360 / STEP
const ROWS       = (LAT_TOP - LAT_BOTTOM) / STEP

// Names people use, where the ISO ones are long or formal.
const SHORT = {
  US: ['USA', 'США'],
  GB: ['United Kingdom', 'Великобритания'],
  AE: ['UAE', 'ОАЭ'],
  RU: ['Russia', 'Россия'],
  KR: ['South Korea', 'Южная Корея'],
  KP: ['North Korea', 'КНДР'],
  IR: ['Iran', 'Иран'],
  SY: ['Syria', 'Сирия'],
  VN: ['Vietnam', 'Вьетнам'],
  LA: ['Laos', 'Лаос'],
  MD: ['Moldova', 'Молдова'],
  TZ: ['Tanzania', 'Танзания'],
  BO: ['Bolivia', 'Боливия'],
  VE: ['Venezuela', 'Венесуэла'],
  CZ: ['Czechia', 'Чехия'],
  CD: ['DR Congo', 'ДР Конго'],
  CG: ['Congo', 'Конго'],
  KG: ['Kyrgyzstan', 'Кыргызстан'],
  TM: ['Turkmenistan', 'Туркменистан'],
  CN: ['China', 'Китай'],
  TW: ['Taiwan', 'Тайвань'],
  BN: ['Brunei', 'Бруней'],
  PS: ['Palestine', 'Палестина'],
  MK: ['North Macedonia', 'Северная Македония'],
  GM: ['Gambia', 'Гамбия'],
  VA: ['Vatican', 'Ватикан'],
  FM: ['Micronesia', 'Микронезия'],
  VG: ['British Virgin Islands', 'Британские Виргинские острова'],
  VI: ['U.S. Virgin Islands', 'Виргинские острова США'],
  MF: ['Saint Martin', 'Сен-Мартен'],
  SX: ['Sint Maarten', 'Синт-Мартен'],
  SH: ['Saint Helena', 'Остров Святой Елены'],
  FK: ['Falkland Islands', 'Фолклендские острова'],
  TF: ['French Southern Territories', 'Французские Южные территории'],
  GS: ['South Georgia', 'Южная Георгия'],
}

const out = (p) => path.join(process.cwd(), p)

const all = feature(topo, topo.objects.countries).features
  .map((f) => {
    const numeric = String(f.id ?? '').padStart(3, '0')
    const code = countriesI18n.numericToAlpha2(numeric)
    return code ? { code, f } : null
  })
  .filter(Boolean)

// The centre of a country is the centre of its largest piece, so France is
// not placed in the Atlantic by French Guiana, nor the USA by Alaska. A
// country can come as several features (Australia's outlying islands are
// their own), so the pieces of all of them compete.
function centre(features) {
  const parts = features.flatMap(({ geometry: g }) =>
    g.type === 'MultiPolygon'
      ? g.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }))
      : [g])
  parts.sort((a, b) => geoArea(b) - geoArea(a))
  return geoCentroid(parts[0])
}

const boxes = all.map(({ code, f }) => {
  const [[w, s], [e, n]] = geoBounds(f)
  return { code, f, w, s, e, n }
})
const inBox = (b, lng, lat) =>
  lat >= b.s && lat <= b.n && (b.w <= b.e ? lng >= b.w && lng <= b.e : lng >= b.w || lng <= b.e)

const byCountry = {}
const cells = []
for (let r = 0; r < ROWS; r++) {
  const lat = LAT_TOP - (r + 0.5) * STEP
  for (let c = 0; c < COLS; c++) {
    const lng = -180 + (c + 0.5) * STEP
    const hit = boxes.find((b) => inBox(b, lng, lat) && geoContains(b.f, [lng, lat]))
    if (!hit) continue
    const cell = r * COLS + c
    cells.push([c, r])
    ;(byCountry[hit.code] ??= []).push(cell)
  }
}

// One path of zero-length segments; round caps turn each into a dot.
const d = cells.map(([c, r]) => `M${c + 0.5} ${r + 0.5}h0`).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COLS} ${ROWS}" preserveAspectRatio="xMidYMid meet">` +
  `<path d="${d}" fill="none" stroke="#000" stroke-width="0.5" stroke-linecap="round"/></svg>\n`

fs.mkdirSync(out('public/map'), { recursive: true })
fs.mkdirSync(out('lib/geo'), { recursive: true })
fs.writeFileSync(out('public/map/world-dots.svg'), svg)
fs.writeFileSync(out('lib/geo/world-dots.json'),
  JSON.stringify({ step: STEP, cols: COLS, rows: ROWS, latTop: LAT_TOP, latBottom: LAT_BOTTOM, countries: byCountry }) + '\n')

const round = (n) => Math.round(n * 100) / 100
const featuresByCode = new Map()
for (const { code, f } of all) featuresByCode.set(code, [...(featuresByCode.get(code) ?? []), f])
const list = [...featuresByCode]
  .map(([code, features]) => {
    const [lng, lat] = centre(features)
    const [en, ru] = SHORT[code] ?? [countriesI18n.getName(code, 'en'), countriesI18n.getName(code, 'ru')]
    return { code, en, ru, lat: round(lat), lng: round(lng) }
  })
  .filter((c) => c.en && c.ru && c.lat <= LAT_TOP && c.lat >= LAT_BOTTOM)
  .sort((a, b) => a.ru.localeCompare(b.ru, 'ru'))
fs.writeFileSync(out('lib/geo/countries.json'), JSON.stringify(list, null, 0).replace(/},{/g, '},\n{') + '\n')

console.log(`dots: ${cells.length} on a ${COLS}x${ROWS} grid, countries with dots: ${Object.keys(byCountry).length}, pickable: ${list.length}`)
