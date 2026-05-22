import { randomUUID } from 'crypto'
import { readStore, updateStore } from './store'

export interface Partner {
  id:        string
  name:      string
  logo:      string
  url?:      string
  order:     number
  deletedAt?: string | null
}

export async function getPartners(): Promise<Partner[]> {
  const all = await readStore<Partner[]>('partners', [])
  return [...all]
    .filter((p) => !p.deletedAt)
    .sort((a, b) => a.order - b.order)
}

/** Create a partner. Atomic — safe against concurrent reorder/delete. */
export async function createPartner(input: Omit<Partner, 'id'>): Promise<Partner> {
  const partner: Partner = { ...input, id: randomUUID() }
  await updateStore<Partner[]>('partners', [], (all) => [...all, partner])
  return partner
}

/** Patch a partner by id. Returns the updated record, or null if missing. */
export async function updatePartner(
  id: string,
  patch: Partial<Omit<Partner, 'id'>>,
): Promise<Partner | null> {
  let updated: Partner | null = null
  await updateStore<Partner[]>('partners', [], (all) =>
    all.map((p) => {
      if (p.id !== id) return p
      updated = { ...p, ...patch, id }
      return updated
    }),
  )
  return updated
}

/** Delete a partner by id. Returns true if a record was removed. */
export async function deletePartner(id: string): Promise<boolean> {
  let removed = false
  await updateStore<Partner[]>('partners', [], (all) => {
    const next = all.filter((p) => p.id !== id)
    removed = next.length !== all.length
    return next
  })
  return removed
}

/** Apply a new display order. Atomic — won't clobber a concurrent create. */
export async function reorderPartners(orderedIds: string[]): Promise<void> {
  await updateStore<Partner[]>('partners', [], (all) => {
    const index = new Map(orderedIds.map((id, i) => [id, i]))
    return all.map((p) => {
      const order = index.get(p.id)
      return order === undefined ? p : { ...p, order }
    })
  })
}

/** Soft-delete: marks deletedAt so restore is possible. Returns true if found. */
export async function softDeletePartner(id: string): Promise<boolean> {
  let found = false
  await updateStore<Partner[]>('partners', [], (all) => {
    const idx = all.findIndex((p) => p.id === id)
    if (idx === -1) return all
    found = true
    const next = [...all]
    next[idx] = { ...next[idx], deletedAt: new Date().toISOString() }
    return next
  })
  return found
}

/** Restore a soft-deleted partner. Returns true if found. */
export async function restorePartner(id: string): Promise<boolean> {
  let found = false
  await updateStore<Partner[]>('partners', [], (all) => {
    const idx = all.findIndex((p) => p.id === id)
    if (idx === -1) return all
    found = true
    const next = [...all]
    const { deletedAt: _, ...rest } = next[idx]
    next[idx] = rest as Partner
    return next
  })
  return found
}
