import { readStore, updateStore } from './store'

export interface Inquiry {
  id:        string
  name:      string
  email:     string
  phone?:    string
  company?:  string
  service:   string
  budget:    string
  message:   string
  createdAt: string
  read:      boolean
}

// Cap retained submissions so the anonymous public endpoint can't grow
// the store without bound. Oldest are trimmed once the cap is exceeded.
const MAX_INQUIRIES = 5000

export async function getInquiries(): Promise<Inquiry[]> {
  return readStore<Inquiry[]>('inquiries', [])
}

export async function addInquiry(
  input: Omit<Inquiry, 'id' | 'createdAt' | 'read'>
): Promise<Inquiry> {
  const inquiry: Inquiry = {
    ...input,
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    read:      false,
  }
  // Atomic prepend via the store serialiser so concurrent public
  // submissions can't clobber each other (lost-update race).
  await updateStore<Inquiry[]>('inquiries', [], (all) =>
    [inquiry, ...all].slice(0, MAX_INQUIRIES),
  )
  return inquiry
}

export async function markInquiryRead(id: string): Promise<void> {
  await updateStore<Inquiry[]>('inquiries', [], (all) =>
    all.map((i) => (i.id === id ? { ...i, read: true } : i)),
  )
}

export async function deleteInquiry(id: string): Promise<void> {
  await updateStore<Inquiry[]>('inquiries', [], (all) => all.filter((i) => i.id !== id))
}

export async function deleteInquiries(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const set = new Set(ids)
  let removed = 0
  await updateStore<Inquiry[]>('inquiries', [], (all) => {
    const next = all.filter((i) => !set.has(i.id))
    removed = all.length - next.length
    return next
  })
  return removed
}
