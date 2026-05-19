/**
 * Universal JSON store with three backends, selected by env:
 *
 *   1. Postgres KV — when POSTGRES_URL (or any @vercel/postgres default
 *      env) is set. Uses a single `kv_store` table with a jsonb column.
 *      Durable across serverless instances and regions, atomic writes.
 *
 *   2. Vercel Blob — when BLOB_READ_WRITE_TOKEN is set (production
 *      default prior to Postgres).
 *
 *   3. Local filesystem — dev fallback, reads/writes data/*.json.
 *
 * Postgres takes priority when both Postgres and Blob are configured
 * so migrated sites transparently serve the new backend.
 */

import fs   from 'fs'
import path from 'path'

const USE_POSTGRES =
  !!process.env.POSTGRES_URL ||
  !!process.env.POSTGRES_URL_NON_POOLING ||
  !!process.env.POSTGRES_PRISMA_URL
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN

/* ── Read-your-writes cache ──────────────────────────────────────────────
 * Vercel Blob is eventually consistent: a read issued immediately after an
 * overwrite can still return the previous CDN copy, so the admin panel
 * looks like a save "didn't stick". We keep the value this instance just
 * wrote in memory for a short window and serve it on the next read.
 *
 * Only populated by writes, so a read-only (public) instance never serves
 * a cached value — it always hits the backend. Cross-instance staleness
 * self-heals after the TTL.
 */
const WRITE_CACHE_TTL = 12_000 // ms
const writeCache = new Map<string, { data: unknown; ts: number }>()

/* ── Per-key write serialisation ─────────────────────────────────────────
 * Concurrent read-modify-write sequences (reorder + create + delete) would
 * clobber each other — last write wins, the other change is lost.
 * updateStore() chains them per key so each sees the previous one's result.
 */
const writeChains = new Map<string, Promise<unknown>>()

/* ── Postgres (lazy-loaded) ──────────────────────────────────────────── */

type VercelSql = typeof import('@vercel/postgres')['sql']

let sqlPromise: Promise<VercelSql> | null = null
let tableReady = false

async function getSql(): Promise<VercelSql> {
  if (!sqlPromise) {
    sqlPromise = import('@vercel/postgres').then((m) => m.sql)
  }
  return sqlPromise
}

async function ensureTable() {
  if (tableReady) return
  const sql = await getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS kv_store (
      key         text PRIMARY KEY,
      value       jsonb NOT NULL,
      updated_at  timestamptz NOT NULL DEFAULT now()
    )
  `
  tableReady = true
}

/* ── Public API ──────────────────────────────────────────────────────── */

function localPath(name: string) {
  return path.join(process.cwd(), 'data', `${name}.json`)
}

export async function readStore<T>(name: string, fallback: T): Promise<T> {
  // Read-your-writes: serve the value this instance just wrote, bypassing
  // any Blob/CDN propagation lag.
  const cached = writeCache.get(name)
  if (cached && Date.now() - cached.ts < WRITE_CACHE_TTL) {
    return cached.data as T
  }

  if (USE_POSTGRES) {
    try {
      await ensureTable()
      const sql = await getSql()
      const { rows } = await sql<{ value: unknown }>`
        SELECT value FROM kv_store WHERE key = ${name} LIMIT 1
      `
      if (rows.length === 0) {
        // Seed from bundled local file if present — nice for first boot.
        return readLocal(name, fallback)
      }
      return rows[0].value as T
    } catch (err) {
      console.warn(`[store] Postgres read failed for "${name}"`, err)
      // fall through to Blob / local
    }
  }

  if (USE_BLOB) {
    try {
      const { list } = await import('@vercel/blob')
      const { blobs } = await list({ prefix: `maze-data/${name}.json` })
      if (blobs.length === 0) {
        return readLocal(name, fallback)
      }
      const res = await fetch(blobs[0].downloadUrl, { cache: 'no-store' })
      return res.json() as T
    } catch {
      return readLocal(name, fallback)
    }
  }

  return readLocal(name, fallback)
}

export async function writeStore<T>(name: string, data: T): Promise<void> {
  // Populate the read-your-writes cache before the (possibly slow /
  // eventually-consistent) backend write so an immediate re-read is fresh.
  writeCache.set(name, { data, ts: Date.now() })

  if (USE_POSTGRES) {
    try {
      await ensureTable()
      const sql = await getSql()
      await sql`
        INSERT INTO kv_store (key, value, updated_at)
        VALUES (${name}, ${JSON.stringify(data)}::jsonb, now())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `
      return
    } catch (err) {
      console.warn(`[store] Postgres write failed for "${name}"`, err)
      // fall through
    }
  }

  if (USE_BLOB) {
    const { put } = await import('@vercel/blob')
    await put(`maze-data/${name}.json`, JSON.stringify(data, null, 2), {
      access:          'public',
      addRandomSuffix: false,
      allowOverwrite:  true,
      contentType:     'application/json',
    })
    return
  }

  fs.writeFileSync(localPath(name), JSON.stringify(data, null, 2), 'utf-8')
}

function readLocal<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(localPath(name), 'utf-8')) as T
  } catch {
    return fallback
  }
}

/**
 * Atomic read-modify-write for a store key.
 *
 * Calls for the same key are serialised in-process: each `mutator` runs
 * only after the previous update for that key has fully settled, so two
 * concurrent operations (e.g. a debounced reorder landing while a create
 * is in flight) can't clobber each other's changes.
 *
 * @returns the new value produced by `mutator`.
 */
export async function updateStore<T>(
  name: string,
  fallback: T,
  mutator: (current: T) => T | Promise<T>,
): Promise<T> {
  const run = async (): Promise<T> => {
    const current = await readStore<T>(name, fallback)
    const next    = await mutator(current)
    await writeStore(name, next)
    return next
  }

  // Chain after any in-flight update for this key — run() executes whether
  // the previous one resolved or rejected.
  const prev   = writeChains.get(name) ?? Promise.resolve()
  const result = prev.then(run, run)

  // Keep the chain alive but swallow its errors so one failure doesn't
  // poison subsequent updates.
  writeChains.set(name, result.then(() => {}, () => {}))
  return result
}

