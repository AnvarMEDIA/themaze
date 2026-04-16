import { readStore, writeStore } from './store'

export interface SiteSettings {
  email:         string
  phone:         string
  telegram:      string  // handle or full URL
  address:       string
  addressDetail: string
  instagram:     string
  behance:       string
  linkedin:      string
  twitter:       string
}

const DEFAULT: SiteSettings = {
  email: '', phone: '', telegram: '',
  address: '', addressDetail: '',
  instagram: '', behance: '', linkedin: '', twitter: '',
}

export async function getSettings(): Promise<SiteSettings> {
  return readStore<SiteSettings>('settings', DEFAULT)
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  return writeStore('settings', settings)
}
