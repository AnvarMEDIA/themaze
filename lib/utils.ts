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
  branding:  'Branding',
  identity:  'Identity',
  naming:    'Naming',
  'ui-ux':   'UI/UX',
  print:     'Print',
  motion:    'Motion',
  strategy:  'Strategy',
}
