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
  partnersVisible: boolean
}

const DEFAULT: SiteSettings = {
  email: '', phone: '', telegram: '',
  address: '', addressDetail: '',
  instagram: '', behance: '', linkedin: '', twitter: '',
  favicon: '',
  partnersVisible: false,
}

export async function getSettings(): Promise<SiteSettings> {
  const stored = await readStore<Partial<SiteSettings>>('settings', DEFAULT)
  return { ...DEFAULT, ...stored }
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  return writeStore('settings', settings)
}
