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
