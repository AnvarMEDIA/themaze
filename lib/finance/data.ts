/**
 * Finance data layer. Each entity is a JSON array under its own store key,
 * mutated through `updateStore` so concurrent read-modify-writes serialise.
 *
 * Deletes cascade by NULLING references rather than removing rows: a paid
 * invoice must survive its client being archived/removed, it just loses the
 * link. This keeps the ledger intact and audit-friendly.
 */
import { v4 as uuid } from 'uuid'
import { readStore, updateStore } from '../store'
import { roundMoney } from './money'
import type {
  FinanceClient,
  FinanceProject,
  FinanceRecurring,
  FinanceTransaction,
} from './types'

const K_CLIENTS = 'finance_clients'
const K_PROJECTS = 'finance_projects'
const K_TXNS = 'finance_transactions'
const K_RECUR = 'finance_recurring'

const now = () => new Date().toISOString()

/* ── Clients ─────────────────────────────────────────────────────────────── */

export async function listClients(): Promise<FinanceClient[]> {
  const rows = await readStore<FinanceClient[]>(K_CLIENTS, [])
  return [...rows].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getClient(id: string): Promise<FinanceClient | null> {
  const rows = await readStore<FinanceClient[]>(K_CLIENTS, [])
  return rows.find((c) => c.id === id) ?? null
}

export type ClientInput = Omit<FinanceClient, 'id' | 'createdAt' | 'updatedAt'>

export async function createClient(input: ClientInput): Promise<FinanceClient> {
  const ts = now()
  const client: FinanceClient = { ...input, id: uuid(), createdAt: ts, updatedAt: ts }
  await updateStore<FinanceClient[]>(K_CLIENTS, [], (cur) => [...cur, client])
  return client
}

export async function updateClient(
  id: string,
  patch: Partial<ClientInput>,
): Promise<FinanceClient | null> {
  let updated: FinanceClient | null = null
  await updateStore<FinanceClient[]>(K_CLIENTS, [], (cur) =>
    cur.map((c) => {
      if (c.id !== id) return c
      updated = { ...c, ...patch, updatedAt: now() }
      return updated
    }),
  )
  return updated
}

export async function deleteClient(id: string): Promise<boolean> {
  let existed = false
  await updateStore<FinanceClient[]>(K_CLIENTS, [], (cur) => {
    existed = cur.some((c) => c.id === id)
    return cur.filter((c) => c.id !== id)
  })
  if (existed) {
    // Cascade-null the link on dependent records; keep the records themselves.
    await updateStore<FinanceProject[]>(K_PROJECTS, [], (cur) =>
      cur.map((p) => (p.clientId === id ? { ...p, clientId: null, updatedAt: now() } : p)),
    )
    await updateStore<FinanceTransaction[]>(K_TXNS, [], (cur) =>
      cur.map((t) => (t.clientId === id ? { ...t, clientId: null, updatedAt: now() } : t)),
    )
    await updateStore<FinanceRecurring[]>(K_RECUR, [], (cur) =>
      cur.map((r) => (r.clientId === id ? { ...r, clientId: null, updatedAt: now() } : r)),
    )
  }
  return existed
}

/* ── Projects ────────────────────────────────────────────────────────────── */

export async function listProjects(): Promise<FinanceProject[]> {
  const rows = await readStore<FinanceProject[]>(K_PROJECTS, [])
  return [...rows].sort(
    (a, b) => new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime(),
  )
}

export async function getProject(id: string): Promise<FinanceProject | null> {
  const rows = await readStore<FinanceProject[]>(K_PROJECTS, [])
  return rows.find((p) => p.id === id) ?? null
}

export type ProjectInput = Omit<FinanceProject, 'id' | 'createdAt' | 'updatedAt'>

export async function createProject(input: ProjectInput): Promise<FinanceProject> {
  const ts = now()
  const project: FinanceProject = {
    ...input,
    amount: roundMoney(input.amount, input.currency),
    id: uuid(),
    createdAt: ts,
    updatedAt: ts,
  }
  await updateStore<FinanceProject[]>(K_PROJECTS, [], (cur) => [...cur, project])
  return project
}

export async function updateProject(
  id: string,
  patch: Partial<ProjectInput>,
): Promise<FinanceProject | null> {
  let updated: FinanceProject | null = null
  await updateStore<FinanceProject[]>(K_PROJECTS, [], (cur) =>
    cur.map((p) => {
      if (p.id !== id) return p
      const merged = { ...p, ...patch, updatedAt: now() }
      merged.amount = roundMoney(merged.amount, merged.currency)
      updated = merged
      return merged
    }),
  )
  return updated
}

export async function deleteProject(id: string): Promise<boolean> {
  let existed = false
  await updateStore<FinanceProject[]>(K_PROJECTS, [], (cur) => {
    existed = cur.some((p) => p.id === id)
    return cur.filter((p) => p.id !== id)
  })
  if (existed) {
    await updateStore<FinanceTransaction[]>(K_TXNS, [], (cur) =>
      cur.map((t) => (t.projectId === id ? { ...t, projectId: null, updatedAt: now() } : t)),
    )
    await updateStore<FinanceRecurring[]>(K_RECUR, [], (cur) =>
      cur.map((r) => (r.projectId === id ? { ...r, projectId: null, updatedAt: now() } : r)),
    )
  }
  return existed
}

/* ── Transactions ────────────────────────────────────────────────────────── */

export async function listTransactions(): Promise<FinanceTransaction[]> {
  const rows = await readStore<FinanceTransaction[]>(K_TXNS, [])
  return [...rows].sort(
    (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime(),
  )
}

export async function getTransaction(id: string): Promise<FinanceTransaction | null> {
  const rows = await readStore<FinanceTransaction[]>(K_TXNS, [])
  return rows.find((t) => t.id === id) ?? null
}

export type TransactionInput = Omit<FinanceTransaction, 'id' | 'createdAt' | 'updatedAt'>

export async function createTransaction(input: TransactionInput): Promise<FinanceTransaction> {
  const ts = now()
  const txn: FinanceTransaction = {
    ...input,
    amount: roundMoney(input.amount, input.currency),
    id: uuid(),
    createdAt: ts,
    updatedAt: ts,
  }
  await updateStore<FinanceTransaction[]>(K_TXNS, [], (cur) => [...cur, txn])
  return txn
}

export async function updateTransaction(
  id: string,
  patch: Partial<TransactionInput>,
): Promise<FinanceTransaction | null> {
  let updated: FinanceTransaction | null = null
  await updateStore<FinanceTransaction[]>(K_TXNS, [], (cur) =>
    cur.map((t) => {
      if (t.id !== id) return t
      const merged = { ...t, ...patch, updatedAt: now() }
      merged.amount = roundMoney(merged.amount, merged.currency)
      updated = merged
      return merged
    }),
  )
  return updated
}

export async function deleteTransaction(id: string): Promise<boolean> {
  let existed = false
  await updateStore<FinanceTransaction[]>(K_TXNS, [], (cur) => {
    existed = cur.some((t) => t.id === id)
    return cur.filter((t) => t.id !== id)
  })
  return existed
}

/* ── Recurring payments ──────────────────────────────────────────────────── */

export async function listRecurring(): Promise<FinanceRecurring[]> {
  const rows = await readStore<FinanceRecurring[]>(K_RECUR, [])
  // Soonest due first; ended series (no nextDate) sink to the bottom.
  return [...rows].sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999'))
}

export async function getRecurring(id: string): Promise<FinanceRecurring | null> {
  const rows = await readStore<FinanceRecurring[]>(K_RECUR, [])
  return rows.find((r) => r.id === id) ?? null
}

export type RecurringInput = Omit<FinanceRecurring, 'id' | 'nextDate' | 'createdAt' | 'updatedAt'>

export async function createRecurring(input: RecurringInput): Promise<FinanceRecurring> {
  const ts = now()
  const row: FinanceRecurring = {
    ...input,
    amount: roundMoney(input.amount, input.currency),
    // A new series is first due on its start date.
    nextDate: input.startDate,
    id: uuid(),
    createdAt: ts,
    updatedAt: ts,
  }
  await updateStore<FinanceRecurring[]>(K_RECUR, [], (cur) => [...cur, row])
  return row
}

export async function updateRecurring(
  id: string,
  patch: Partial<RecurringInput & { nextDate: string }>,
): Promise<FinanceRecurring | null> {
  let updated: FinanceRecurring | null = null
  await updateStore<FinanceRecurring[]>(K_RECUR, [], (cur) =>
    cur.map((r) => {
      if (r.id !== id) return r
      const merged = { ...r, ...patch, updatedAt: now() }
      merged.amount = roundMoney(merged.amount, merged.currency)
      // Moving the start of a series that has never been posted should move
      // its next due date too, otherwise the correction appears to do nothing.
      if (patch.startDate && patch.nextDate === undefined && r.nextDate === r.startDate) {
        merged.nextDate = patch.startDate
      }
      updated = merged
      return merged
    }),
  )
  return updated
}

export async function deleteRecurring(id: string): Promise<boolean> {
  let existed = false
  await updateStore<FinanceRecurring[]>(K_RECUR, [], (cur) => {
    existed = cur.some((r) => r.id === id)
    return cur.filter((r) => r.id !== id)
  })
  return existed
}

/** Set a series' next due date directly (used when posting occurrences). */
export async function setRecurringNextDate(id: string, nextDate: string): Promise<void> {
  await updateStore<FinanceRecurring[]>(K_RECUR, [], (cur) =>
    cur.map((r) => (r.id === id ? { ...r, nextDate, updatedAt: now() } : r)),
  )
}

/** Append several ledger rows in ONE store write, so a batch can't half-apply. */
export async function createTransactions(
  inputs: TransactionInput[],
): Promise<FinanceTransaction[]> {
  const ts = now()
  const rows: FinanceTransaction[] = inputs.map((input) => ({
    ...input,
    amount: roundMoney(input.amount, input.currency),
    id: uuid(),
    createdAt: ts,
    updatedAt: ts,
  }))
  await updateStore<FinanceTransaction[]>(K_TXNS, [], (cur) => [...cur, ...rows])
  return rows
}
