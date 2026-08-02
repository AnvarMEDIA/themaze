import { readStore, updateStore } from './store'

export interface Brief {
  id:           string
  name:         string
  email?:       string
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
  /** When the Telegram alert went out. Absent = never delivered. */
  notifiedAt?:  string
  /** Why the alert failed, so a broken bot is visible instead of silent. */
  notifyError?: string
}

// Cap retained submissions so the anonymous public endpoint can't grow the
// store without bound. Oldest are trimmed once the cap is exceeded.
const MAX_BRIEFS = 2000

export async function getBriefs(): Promise<Brief[]> {
  return readStore<Brief[]>('briefs', [])
}

export async function addBrief(
  input: Omit<Brief, 'id' | 'createdAt' | 'read'>,
): Promise<Brief> {
  const brief: Brief = {
    ...input,
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    read:      false,
  }
  // Atomic prepend via the store serialiser — two visitors submitting at the
  // same moment must not clobber each other (read-then-write loses one).
  await updateStore<Brief[]>('briefs', [], (all) =>
    [brief, ...all].slice(0, MAX_BRIEFS),
  )
  return brief
}

/** Record the outcome of the notification attempt for a brief. */
export async function setBriefNotified(
  id: string,
  result: { ok: boolean; error?: string },
): Promise<void> {
  await updateStore<Brief[]>('briefs', [], (all) =>
    all.map((b) =>
      b.id === id
        ? result.ok
          ? { ...b, notifiedAt: new Date().toISOString(), notifyError: undefined }
          : { ...b, notifyError: result.error ?? 'failed' }
        : b,
    ),
  )
}

export async function markBriefRead(id: string): Promise<void> {
  await updateStore<Brief[]>('briefs', [], (all) =>
    all.map((b) => (b.id === id ? { ...b, read: true } : b)),
  )
}

export async function deleteBrief(id: string): Promise<void> {
  await updateStore<Brief[]>('briefs', [], (all) => all.filter((b) => b.id !== id))
}
