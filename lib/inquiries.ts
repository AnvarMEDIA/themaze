import { readStore, writeStore } from './store'

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

export async function getInquiries(): Promise<Inquiry[]> {
  return readStore<Inquiry[]>('inquiries', [])
}

export async function addInquiry(
  input: Omit<Inquiry, 'id' | 'createdAt' | 'read'>
): Promise<Inquiry> {
  const all = await getInquiries()
  const inquiry: Inquiry = {
    ...input,
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    read:      false,
  }
  await writeStore('inquiries', [inquiry, ...all])
  return inquiry
}

export async function markInquiryRead(id: string): Promise<void> {
  const all = await getInquiries()
  await writeStore(
    'inquiries',
    all.map((i) => (i.id === id ? { ...i, read: true } : i))
  )
}

export async function deleteInquiry(id: string): Promise<void> {
  const all = await getInquiries()
  await writeStore('inquiries', all.filter((i) => i.id !== id))
}

export async function deleteInquiries(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const set = new Set(ids)
  const all = await getInquiries()
  const next = all.filter((i) => !set.has(i.id))
  const removed = all.length - next.length
  await writeStore('inquiries', next)
  return removed
}
