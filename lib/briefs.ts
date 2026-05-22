import { readStore, writeStore } from './store'

export interface Brief {
  id:           string
  name:         string
  email:        string
  phone?:       string
  company?:     string
  website?:     string
  services:     string[]
  description:  string
  goals?:       string
  audience?:    string
  competitors?: string
  styles:       string[]
  colors:       string[]
  refLinks?:    string
  timeline?:    string
  budget?:      string
  source?:      string
  notes?:       string
  createdAt:    string
  read:         boolean
}

export async function getBriefs(): Promise<Brief[]> {
  return readStore<Brief[]>('briefs', [])
}

export async function addBrief(
  input: Omit<Brief, 'id' | 'createdAt' | 'read'>,
): Promise<Brief> {
  const all = await getBriefs()
  const brief: Brief = {
    ...input,
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    read:      false,
  }
  await writeStore('briefs', [brief, ...all])
  return brief
}

export async function markBriefRead(id: string): Promise<void> {
  const all = await getBriefs()
  await writeStore('briefs', all.map((b) => (b.id === id ? { ...b, read: true } : b)))
}

export async function deleteBrief(id: string): Promise<void> {
  const all = await getBriefs()
  await writeStore('briefs', all.filter((b) => b.id !== id))
}
