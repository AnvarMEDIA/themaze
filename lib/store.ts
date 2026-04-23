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

