import { readStore, writeStore } from './store'

export interface Partner {
  id:    string
  name:  string
  logo:  string
  url?:  string
  order: number
}

export async function getPartners(): Promise<Partner[]> {
  const all = await readStore<Partner[]>('partners', [])
  return all.sort((a, b) => a.order - b.order)
}

export async function savePartners(partners: Partner[]): Promise<void> {
  return writeStore('partners', partners)
}

export async function reorderPartners(orderedIds: string[]): Promise<void> {
  const all = await readStore<Partner[]>('partners', [])
  const index = new Map(orderedIds.map((id, i) => [id, i]))
  const next = all.map((p) => {
    const order = index.get(p.id)
    return order === undefined ? p : { ...p, order }
  })
  await writeStore('partners', next)
}
