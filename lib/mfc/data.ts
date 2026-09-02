/**
 * MFC data layer. Two store keys, mutated through `updateStore` so concurrent
 * read-modify-writes serialise — same discipline as lib/finance/data.ts.
 *
 * Deleting a category NULLS the link on its expenses rather than removing
 * them: the money was still spent. Archiving is the softer option and keeps
 * the history grouped.
 */
import { v4 as uuid } from 'uuid'
import { readStore, updateStore } from '../store'
import { roundMoney } from '../finance/money'
import { DEFAULT_CATEGORIES } from './defaults'
import type { MfcCategory, MfcExpense } from './types'

const K_CATEGORIES = 'mfc_categories'
const K_EXPENSES = 'mfc_expenses'

const now = () => new Date().toISOString()

/* ── Categories ──────────────────────────────────────────────────────────── */

/** A stable id from a default's English name: "Café & dining" → "cafe-dining". */
function seedId(name: string): string {
  const slug = name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip the accents NFD split off
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `seed-${slug}`
}

/**
 * Ids are derived from the name, not generated.
 *
 * Seeding is guarded by a write lock, but that lock is per process — and in
 * production two requests can be served by two instances at once (the tab
 * loads the summary and the categories together). Both would find the store
 * empty, both would seed, and the loser's write would be overwritten. With
 * random ids the browser would already be holding the losing set, so the next
 * expense filed against one of them would point at a category that no longer
 * exists and render as "Uncategorised". Deriving the id makes both writes
 * identical and the race harmless.
 */
function seedCategories(): MfcCategory[] {
  const ts = now()
  return DEFAULT_CATEGORIES.map((c, i) => ({
    ...c,
    id: seedId(c.name),
    // Defaults wear their slot; a custom colour is something a person picks.
    color: '',
    monthlyLimit: 0,
    archived: false,
    order: i,
    createdAt: ts,
    updatedAt: ts,
  }))
}

/**
 * All categories, ordered.
 *
 * The first ever read seeds the defaults, so the quick-add grid is usable the
 * moment the tab is opened rather than presenting an empty screen and a
 * chore. Seeding goes through `updateStore`, and re-checks emptiness inside
 * the callback, so two simultaneous first loads cannot both seed.
 */
export async function listCategories(): Promise<MfcCategory[]> {
  const rows = await readStore<MfcCategory[]>(K_CATEGORIES, [])
  if (rows.length === 0) {
    let seeded: MfcCategory[] = []
    await updateStore<MfcCategory[]>(K_CATEGORIES, [], (cur) => {
      if (cur.length > 0) { seeded = cur; return cur }
      seeded = seedCategories()
      return seeded
    })
    return sortCategories(seeded)
  }
  return sortCategories(rows)
}

function sortCategories(rows: MfcCategory[]): MfcCategory[] {
  return [...rows]
    // `keywords` and `color` arrived after the first categories were stored;
    // a row written before them has neither, and nothing downstream should
    // have to read undefined.
    .map((c) => ({ ...c, keywords: c.keywords ?? '', color: c.color ?? '' }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

export async function getCategory(id: string): Promise<MfcCategory | null> {
  const rows = await readStore<MfcCategory[]>(K_CATEGORIES, [])
  return rows.find((c) => c.id === id) ?? null
}

export type CategoryInput = Omit<MfcCategory, 'id' | 'createdAt' | 'updatedAt'>

export async function createCategory(
  input: Omit<CategoryInput, 'order'> & { order?: number },
): Promise<MfcCategory> {
  const ts = now()
  let created: MfcCategory | null = null
  await updateStore<MfcCategory[]>(K_CATEGORIES, [], (cur) => {
    // A new category goes to the end of the grid unless told otherwise.
    const order = input.order ?? cur.reduce((m, c) => Math.max(m, c.order + 1), 0)
    created = { ...input, order, id: uuid(), createdAt: ts, updatedAt: ts }
    return [...cur, created]
  })
  return created!
}

export async function updateCategory(
  id: string,
  patch: Partial<CategoryInput>,
): Promise<MfcCategory | null> {
  let updated: MfcCategory | null = null
  await updateStore<MfcCategory[]>(K_CATEGORIES, [], (cur) =>
    cur.map((c) => {
      if (c.id !== id) return c
      updated = { ...c, ...patch, updatedAt: now() }
      return updated
    }),
  )
  return updated
}

export async function deleteCategory(id: string): Promise<boolean> {
  let existed = false
  await updateStore<MfcCategory[]>(K_CATEGORIES, [], (cur) => {
    existed = cur.some((c) => c.id === id)
    return cur.filter((c) => c.id !== id)
  })
  if (existed) {
    // The spending stays; it just loses its label and lands in "Uncategorised".
    await updateStore<MfcExpense[]>(K_EXPENSES, [], (cur) =>
      cur.map((e) => (e.categoryId === id ? { ...e, categoryId: null, updatedAt: now() } : e)),
    )
  }
  return existed
}

/** Persist a whole ordering in one write, so a drag can't half-apply. */
export async function reorderCategories(ids: string[]): Promise<void> {
  const rank = new Map(ids.map((id, i) => [id, i]))
  const ts = now()
  await updateStore<MfcCategory[]>(K_CATEGORIES, [], (cur) =>
    cur.map((c) => {
      const r = rank.get(c.id)
      return r === undefined ? c : { ...c, order: r, updatedAt: ts }
    }),
  )
}

/* ── Expenses ────────────────────────────────────────────────────────────── */

/** Newest first; ties broken by entry time so a day's rows keep their order. */
export async function listExpenses(): Promise<MfcExpense[]> {
  const rows = await readStore<MfcExpense[]>(K_EXPENSES, [])
  return [...rows].sort(
    (a, b) => (b.date || '').localeCompare(a.date || '') ||
              (b.createdAt || '').localeCompare(a.createdAt || ''),
  )
}

export async function getExpense(id: string): Promise<MfcExpense | null> {
  const rows = await readStore<MfcExpense[]>(K_EXPENSES, [])
  return rows.find((e) => e.id === id) ?? null
}

export type ExpenseInput = Omit<MfcExpense, 'id' | 'createdAt' | 'updatedAt'>

export async function createExpense(input: ExpenseInput): Promise<MfcExpense> {
  const ts = now()
  const row: MfcExpense = {
    ...input,
    amount: roundMoney(input.amount, input.currency),
    id: uuid(),
    createdAt: ts,
    updatedAt: ts,
  }
  await updateStore<MfcExpense[]>(K_EXPENSES, [], (cur) => [...cur, row])
  return row
}

export async function updateExpense(
  id: string,
  patch: Partial<ExpenseInput>,
): Promise<MfcExpense | null> {
  let updated: MfcExpense | null = null
  await updateStore<MfcExpense[]>(K_EXPENSES, [], (cur) =>
    cur.map((e) => {
      if (e.id !== id) return e
      const merged = { ...e, ...patch, updatedAt: now() }
      merged.amount = roundMoney(merged.amount, merged.currency)
      updated = merged
      return merged
    }),
  )
  return updated
}

export async function deleteExpense(id: string): Promise<boolean> {
  let existed = false
  await updateStore<MfcExpense[]>(K_EXPENSES, [], (cur) => {
    existed = cur.some((e) => e.id === id)
    return cur.filter((e) => e.id !== id)
  })
  return existed
}
