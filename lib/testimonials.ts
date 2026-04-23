import { readStore, writeStore } from './store'

export interface Testimonial {
  id:         string
  author:     string
  role:       string     // e.g. "CEO, Uzum Market"
  roleRu:     string
  quote:      string
  quoteRu:    string
  avatar:     string     // url
  rating?:    number     // 1-5, optional
  featured?:  boolean    // highlight
  order:      number
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const all = await readStore<Testimonial[]>('testimonials', [])
  return [...all].sort((a, b) => a.order - b.order)
}

export async function saveTestimonials(items: Testimonial[]): Promise<void> {
  return writeStore('testimonials', items)
}

export async function reorderTestimonials(orderedIds: string[]): Promise<void> {
  const all = await readStore<Testimonial[]>('testimonials', [])
  const index = new Map(orderedIds.map((id, i) => [id, i + 1]))
  const next = all.map((t) => {
    const order = index.get(t.id)
    return order === undefined ? t : { ...t, order }
  })
  await writeStore('testimonials', next)
}
