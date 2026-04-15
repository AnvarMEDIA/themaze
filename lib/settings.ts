import fs   from 'fs'
import path from 'path'

export interface SiteSettings {
  email:         string
  phone:         string
  telegram:      string
  address:       string
  addressDetail: string
  instagram:     string
  behance:       string
  linkedin:      string
}

const DATA_PATH = path.join(process.cwd(), 'data', 'settings.json')

export function getSettings(): SiteSettings {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8')
  return JSON.parse(raw) as SiteSettings
}

export function saveSettings(settings: SiteSettings): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(settings, null, 2), 'utf-8')
}
