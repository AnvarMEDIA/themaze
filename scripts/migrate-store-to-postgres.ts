/**
 * One-off migration: copy every store key from Vercel Blob (or the
 * local data/ directory) into the Postgres `kv_store` table.
 *
 * Run locally after setting POSTGRES_URL (and optionally
 * BLOB_READ_WRITE_TOKEN to source from Blob):
 *
 *   pnpm tsx scripts/migrate-store-to-postgres.ts
 *   # or
 *   npx tsx scripts/migrate-store-to-postgres.ts
 *
 * The script is idempotent — re-running overwrites the Postgres rows
 * with the current Blob / local content.
 */

import fs from 'node:fs'
import path from 'node:path'

const KNOWN_KEYS = [
  'portfolio',
  'partners',
  'team',
  'testimonials',
  'posts',
  'settings',
  'inquiries',
] as const

async function readFromBlob(key: string): Promise<unknown | null> {
  try {
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ prefix: `maze-data/${key}.json` })
    if (blobs.length === 0) return null
    const res = await fetch(blobs[0].downloadUrl, { cache: 'no-store' })
    return await res.json()
  } catch (err) {
    console.warn(`  blob read failed for ${key}:`, err)
    return null
  }
}

function readFromLocal(key: string): unknown | null {
  try {
    const file = path.join(process.cwd(), 'data', `${key}.json`)
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return null
  }
}

async function main() {
  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING) {
    console.error('POSTGRES_URL is not set; aborting.')
    process.exit(1)
  }

  const { sql } = await import('@vercel/postgres')
  await sql`
    CREATE TABLE IF NOT EXISTS kv_store (
      key         text PRIMARY KEY,
      value       jsonb NOT NULL,
      updated_at  timestamptz NOT NULL DEFAULT now()
    )
  `
  console.log('kv_store table is ready')

  const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN
  const source  = useBlob ? 'Blob' : 'local data/ directory'
  console.log(`Source: ${source}\n`)

  let migrated = 0
  for (const key of KNOWN_KEYS) {
    const value = useBlob ? await readFromBlob(key) : readFromLocal(key)
    if (value === null) {
      console.log(`  ${key}: not found in ${source} — skipping`)
      continue
    }
    await sql`
      INSERT INTO kv_store (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `
    console.log(`  ${key}: migrated`)
    migrated++
  }

  console.log(`\nDone. Migrated ${migrated} / ${KNOWN_KEYS.length} keys.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
