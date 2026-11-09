import { readStore, updateStore } from './store'
import {
  DEFAULT_INTERNSHIP, INTERN_STATUSES,
  type InternApplication, type InternshipSettings, type InternStatus,
} from './internship'

const SETTINGS_KEY = 'internship_settings'
const APPS_KEY     = 'internship_applications'

// The form is public and anonymous, so the list is capped like the briefs:
// the oldest applications are trimmed once the cap is passed.
const MAX_APPLICATIONS = 2000

/** Today in Tashkent, as YYYY-MM-DD. */
function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date())
}

function completeSettings(raw: Partial<InternshipSettings> | null | undefined): InternshipSettings {
  return {
    open:     typeof raw?.open === 'boolean' ? raw.open : DEFAULT_INTERNSHIP.open,
    openedAt: typeof raw?.openedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.openedAt)
      ? raw.openedAt
      : DEFAULT_INTERNSHIP.openedAt,
  }
}

export async function getInternshipSettings(): Promise<InternshipSettings> {
  return completeSettings(await readStore<Partial<InternshipSettings> | null>(SETTINGS_KEY, null))
}

/**
 * Open or close the intake. Opening a closed one starts a new intake, dated
 * today, so the job posting says when THIS intake began, not the first one.
 */
export async function setInternshipOpen(open: boolean): Promise<InternshipSettings> {
  return updateStore<InternshipSettings>(SETTINGS_KEY, DEFAULT_INTERNSHIP, (raw) => {
    const cur = completeSettings(raw)
    return open && !cur.open ? { open: true, openedAt: today() } : { ...cur, open }
  })
}

const isStatus = (v: unknown): v is InternStatus =>
  typeof v === 'string' && (INTERN_STATUSES as readonly string[]).includes(v)

export async function getApplications(): Promise<InternApplication[]> {
  const all = await readStore<InternApplication[]>(APPS_KEY, [])
  // A row written before a status existed, or by hand, still reads as new.
  return all.map((a) => (isStatus(a.status) ? a : { ...a, status: 'new' }))
}

export async function addApplication(
  input: Omit<InternApplication, 'id' | 'createdAt' | 'status'>,
): Promise<InternApplication> {
  const app: InternApplication = {
    ...input,
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    status:    'new',
  }
  // Atomic prepend: two people applying at once must not overwrite each other.
  await updateStore<InternApplication[]>(APPS_KEY, [], (all) =>
    [app, ...all].slice(0, MAX_APPLICATIONS),
  )
  return app
}

/** Record whether the Telegram alert for an application went out. */
export async function setApplicationNotified(
  id: string,
  result: { ok: boolean; error?: string },
): Promise<void> {
  await updateStore<InternApplication[]>(APPS_KEY, [], (all) =>
    all.map((a) =>
      a.id === id
        ? result.ok
          ? { ...a, notifiedAt: new Date().toISOString(), notifyError: undefined }
          : { ...a, notifyError: result.error ?? 'failed' }
        : a,
    ),
  )
}

/** Change a candidate's status or note. Null when there is no such application. */
export async function updateApplication(
  id: string,
  patch: { status?: InternStatus; note?: string },
): Promise<InternApplication | null> {
  let found: InternApplication | null = null
  await updateStore<InternApplication[]>(APPS_KEY, [], (all) =>
    all.map((a) => {
      if (a.id !== id) return a
      found = {
        ...a,
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.note !== undefined ? { note: patch.note || undefined } : {}),
      }
      return found
    }),
  )
  return found
}

export async function deleteApplication(id: string): Promise<void> {
  await updateStore<InternApplication[]>(APPS_KEY, [], (all) => all.filter((a) => a.id !== id))
}
