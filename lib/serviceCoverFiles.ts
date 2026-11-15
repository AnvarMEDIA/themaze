import { promises as fs } from 'fs'
import path from 'path'
import type { ServiceSlug } from './services'

/**
 * Where a service cover's files are kept: Vercel Blob in production, at
 * services/<slug>/cover-<desktop|mobile|og>-<time>.<webp|jpg>. Each upload
 * is a new name with its time in it, never an overwrite, so a CDN copy of
 * the old picture can never stand in for the new one.
 *
 * Without Blob (local development and the tests) the files go to
 * data/service-covers/<slug>/ and /api/services/covers/file serves them.
 */

export type CoverFileKind = 'desktop' | 'mobile' | 'og'

const blob = () => !!process.env.BLOB_READ_WRITE_TOKEN
const localRoot = () => path.join(process.cwd(), 'data', 'service-covers')
export const LOCAL_COVER_URL = '/api/services/covers/file'

const NAME = /^cover-(desktop|mobile|og)-(\d{10,})\.(webp|jpg)$/

export function coverFileName(kind: CoverFileKind, stamp: number): string {
  return `cover-${kind}-${stamp}.${kind === 'og' ? 'jpg' : 'webp'}`
}

/** Store one file; its public URL comes back. */
export async function putCoverFile(slug: ServiceSlug, name: string, body: Buffer, contentType: string): Promise<string> {
  if (blob()) {
    const { put } = await import('@vercel/blob')
    const saved = await put(`services/${slug}/${name}`, body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
      // The name changes with every upload, so the file itself never does.
      cacheControlMaxAge: 31_536_000,
    })
    return saved.url
  }
  const dir = path.join(localRoot(), slug)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, name), body)
  return `${LOCAL_COVER_URL}/${slug}/${name}`
}

/**
 * The file name, when `url` is one of this service's cover files of the
 * given kind, kept where this site keeps them; else null. What a save is
 * given is checked this way: no other address can become a cover.
 */
export function coverFileOf(slug: ServiceSlug, url: string, kind: CoverFileKind): string | null {
  let name: string
  if (blob()) {
    let u: URL
    try { u = new URL(url) } catch { return null }
    if (u.protocol !== 'https:' || !u.hostname.endsWith('.public.blob.vercel-storage.com') || u.search || u.hash) return null
    const prefix = `/services/${slug}/`
    if (!u.pathname.startsWith(prefix)) return null
    name = u.pathname.slice(prefix.length)
  } else {
    const prefix = `${LOCAL_COVER_URL}/${slug}/`
    if (!url.startsWith(prefix)) return null
    name = url.slice(prefix.length)
  }
  const m = name.match(NAME)
  return m && m[1] === kind ? name : null
}

/** The link-preview file made together with a desktop picture: same folder, same time. */
export function ogFileFor(desktopUrl: string): string {
  return desktopUrl.replace(/cover-desktop-(\d+)\.webp$/, 'cover-og-$1.jpg')
}

/** Whether the file is really there (in this site's own Blob store, in production). */
export async function coverFileExists(slug: ServiceSlug, url: string): Promise<boolean> {
  if (blob()) {
    const { head } = await import('@vercel/blob')
    try { await head(url); return true } catch { return false }
  }
  const name = url.slice(`${LOCAL_COVER_URL}/${slug}/`.length)
  if (!NAME.test(name)) return false
  try { await fs.stat(path.join(localRoot(), slug, name)); return true } catch { return false }
}

/**
 * Delete every file of this service's covers that `keep` does not name:
 * the pictures replaced or removed, and uploads that were never saved.
 * What was deleted comes back.
 */
export async function removeCoverFilesExcept(slug: ServiceSlug, keep: Array<string | null>): Promise<string[]> {
  const kept = new Set(keep.filter((u): u is string => !!u))
  if (blob()) {
    const { list, del } = await import('@vercel/blob')
    const all: string[] = []
    let cursor: string | undefined
    do {
      const page = await list({ prefix: `services/${slug}/`, cursor, limit: 1000 })
      all.push(...page.blobs.map((b) => b.url))
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
    const stale = all.filter((u) => !kept.has(u))
    if (stale.length) await del(stale)
    return stale
  }
  const dir = path.join(localRoot(), slug)
  let names: string[] = []
  try { names = await fs.readdir(dir) } catch { return [] }
  const stale = names.filter((n) => NAME.test(n)).map((n) => `${LOCAL_COVER_URL}/${slug}/${n}`).filter((u) => !kept.has(u))
  await Promise.all(stale.map((u) => fs.rm(path.join(dir, u.slice(u.lastIndexOf('/') + 1)), { force: true })))
  return stale
}

/** A locally kept file, for the route that serves them in development; null when there is none. */
export async function readLocalCoverFile(slug: ServiceSlug, name: string): Promise<Buffer | null> {
  if (blob() || !NAME.test(name)) return null
  try { return await fs.readFile(path.join(localRoot(), slug, name)) } catch { return null }
}
