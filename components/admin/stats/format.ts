import { pluralRu } from '@/lib/utils'

/**
 * How the statistics screen writes numbers, dates and names, and the
 * colours its charts are drawn in.
 */

// Series colours, checked as a pair on the card surface (#0D0D0D) for
// colour-blind separation, lightness and contrast: blue for people and
// views, a darker step of the admin's lime for requests. "Lift" is the
// hovered or focused column.
export const PEOPLE = { color: '#3987E5', lift: '#5598E7' }
export const LEADS = { color: '#74A11F', lift: '#8DBF2C' }
/** A change for the better, and for the worse: always with an arrow and a number, never colour alone. */
export const GOOD = '#8FC748'
export const BAD = '#E27A5C'
/** The mark of an earlier day's value on a chart: neutral, a note on the chart rather than a series of its own. */
export const REFERENCE = '#C9C7BE'

export const card = 'rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-4 sm:p-5'
export const cardTitle = 'text-[13px] font-semibold text-white'

const nf = new Intl.NumberFormat('ru-RU')
export const fmt = (n: number) => nf.format(n)
/** A fraction as Russian writes it: 1,7. */
export const decimal = (n: number) => String(n).replace('.', ',')

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const dayIndex = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay()
export const weekday = (iso: string) => WEEKDAYS[dayIndex(iso)]
export const weekdayShort = (iso: string) => WEEKDAYS_SHORT[dayIndex(iso)]

export const hh = (h: number) => `${String(h).padStart(2, '0')}:00`

export const people = (n: number) => `${fmt(n)} чел.`
export const viewsWord = (n: number) => pluralRu(n, 'просмотр', 'просмотра', 'просмотров')
export const leadsWord = (n: number) => pluralRu(n, 'заявка', 'заявки', 'заявок')
export const views = (n: number) => `${fmt(n)} ${viewsWord(n)}`
export const leads = (n: number) => `${fmt(n)} ${leadsWord(n)}`

/** A share of a total; "<1%" rather than a zero that is not one. */
export function share(count: number, total: number): string {
  if (!total) return ''
  const p = (count / total) * 100
  return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`
}

/** Clean axis steps: 0 / 500 / 1 000 / 1 500, whole numbers only. */
export function niceScale(max: number, count = 3): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0] }
  const raw = max / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw)
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v))
  return { top, ticks }
}
export const axisTick = (v: number) => (v >= 10_000 ? `${fmt(Math.round(v / 1000))} тыс.` : fmt(v))

export const DEVICE_LABELS: Record<string, string> = { mobile: 'Телефон', desktop: 'Компьютер', tablet: 'Планшет' }
export const LOCALE_LABELS: Record<string, string> = { ru: 'Русский', en: 'English', uz: 'O‘zbekcha' }
/** The site's own sections; a project or an article is named by the page (its title). */
export const PAGE_LABELS: Record<string, string> = {
  '/': 'Главная', '/portfolio': 'Портфолио', '/services': 'Услуги', '/about': 'О студии',
  '/contact': 'Контакты', '/brief': 'Бриф', '/insights': 'Статьи', '/internship': 'Стажировка',
}

let regionNames: Intl.DisplayNames | null | undefined
/** A country by its ISO code, in Russian; XX is a visit whose country the host could not tell. */
export function countryName(code: string): string {
  if (code === 'XX') return 'Не определена'
  if (regionNames === undefined) {
    try { regionNames = new Intl.DisplayNames(['ru'], { type: 'region' }) } catch { regionNames = null }
  }
  try { return regionNames?.of(code) ?? code } catch { return code }
}
