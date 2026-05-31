import { unstable_noStore } from 'next/cache'
import { readStore, writeStore } from './store'

export interface SiteSettings {
  email:           string
  phone:           string
  telegram:        string  // handle or full URL
  address:         string
  addressDetail:   string
  instagram:       string
  behance:         string
  linkedin:        string
  twitter:         string
  favicon:         string  // URL to favicon (ICO / PNG / SVG)
  /** When false (default), the public homepage hides the Partners & Clients block. */
  partnersVisible:   boolean
  /** Custom label above the heading (e.g. "Нам доверяют"). Falls back to i18n if empty. */
  partnersLabel:     string
  partnersLabelRu:   string
  partnersLabelUz:   string
  /** Custom heading (e.g. "Клиенты и партнёры"). Falls back to i18n if empty. */
  partnersHeading:   string
  partnersHeadingRu: string
  partnersHeadingUz: string
}

const DEFAULT: SiteSettings = {
  email: '', phone: '', telegram: '',
  address: '', addressDetail: '',
  instagram: '', behance: '', linkedin: '', twitter: '',
  favicon: '',
  partnersVisible:   false,
  partnersLabel:     '', partnersLabelRu:    '', partnersLabelUz:    '',
  partnersHeading:   '', partnersHeadingRu:  '', partnersHeadingUz:  '',
}

export async function getSettings(): Promise<SiteSettings> {
  unstable_noStore()
  const stored = await readStore<Partial<SiteSettings>>('settings', DEFAULT)
  return { ...DEFAULT, ...stored }
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  return writeStore('settings', settings)
}
