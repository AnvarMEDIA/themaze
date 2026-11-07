import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatYear(year: number): string {
  return year.toString()
}

export const CATEGORY_LABELS: Record<string, string> = {
  branding:   'Branding',
  rebranding: 'Rebranding',
  identity:   'Identity',
  naming:     'Naming',
  packaging:  'Packaging',
  'ui-ux':    'UI/UX',
  print:      'Print',
  motion:     'Motion',
  strategy:   'Strategy',
}

export const CATEGORY_LABELS_RU: Record<string, string> = {
  branding:   'Брендинг',
  rebranding: 'Ребрендинг',
  identity:   'Айдентика',
  naming:     'Нейминг',
  packaging:  'Упаковка',
  'ui-ux':    'UI/UX',
  print:      'Полиграфия',
  motion:     'Motion',
  strategy:   'Стратегия',
}

export const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS)

export function categoryLabel(slug: string, locale = 'en'): string {
  const map = locale === 'ru' ? CATEGORY_LABELS_RU : CATEGORY_LABELS
  return map[slug] ?? slug
}

export function telegramHref(val: string): string {
  if (!val) return '#'
  if (val.startsWith('http')) return val
  return `https://t.me/${val.replace('@', '')}`
}

export function telegramDisplay(val: string): string {
  if (!val) return '@mazestudio'
  if (val.startsWith('http')) return `@${val.split('/').pop() ?? ''}`
  return val.startsWith('@') ? val : `@${val}`
}

/** The Russian word for a count: pluralRu(5, 'страна', 'страны', 'стран') → 'стран'. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10  = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
