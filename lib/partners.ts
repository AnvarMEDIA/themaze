import fs   from 'fs'
import path from 'path'

export interface Partner {
  id:    string
  name:  string
  logo:  string
  url?:  string
  order: number
}

const DATA_PATH = path.join(process.cwd(), 'data', 'partners.json')

export function getPartners(): Partner[] {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8')
  const all = JSON.parse(raw) as Partner[]
  return all.sort((a, b) => a.order - b.order)
}

export function savePartners(partners: Partner[]): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(partners, null, 2), 'utf-8')
}
