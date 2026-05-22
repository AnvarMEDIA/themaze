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

export const CATEGORY_LABELS_UZ: Record<string, string> = {
  branding:   'Brendlash',
  rebranding: 'Qayta brendlash',
  identity:   'Aydentika',
  naming:     'Nomlash',
  packaging:  'Qadoqlash',
  'ui-ux':    'UI/UX',
  print:      'Bosma',
  motion:     'Motion',
  strategy:   'Strategiya',
}

export const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS)

export function categoryLabel(slug: string, locale = 'en'): string {
  if (locale === 'ru') return CATEGORY_LABELS_RU[slug] ?? slug
  if (locale === 'uz') return CATEGORY_LABELS_UZ[slug] ?? slug
  return CATEGORY_LABELS[slug] ?? slug
}

/** Locale-aware string field lookup with fallback chain: uz→ru→en */
export function getLocalized(locale: string, en: string, ru?: string | null, uz?: string | null): string {
  if (locale === 'uz') return uz?.trim() || ru?.trim() || en
  if (locale === 'ru') return ru?.trim() || en
  return en
}

/** Locale-aware array field lookup with fallback chain: uz→ru→en */
export function getLocalizedArray(locale: string, en: string[], ru?: string[] | null, uz?: string[] | null): string[] {
  if (locale === 'uz') return uz?.length ? uz : ru?.length ? ru : en
  if (locale === 'ru') return ru?.length ? ru : en
  return en
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
