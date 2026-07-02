import type { Project } from './types'
import type { Post } from './posts'
import { slugify } from './utils'

/**
 * Deterministic content-recommendation engine.
 *
 * Pure functions, no randomness — safe for SSR and static generation
 * (same input → same output, so no hydration drift). Scoring is additive
 * and tuned so the strongest editorial signals dominate:
 *
 *   projects:  same client (+5) ≫ shared category (+3) > shared tag (+1.5)
 *              > shared service (+1); featured nudges (+0.5); recency
 *              breaks ties (<1).
 *   posts:     shared tag (+2) ≫ same author (+0.5); recency tie-break.
 *
 * Same-type rankers ALWAYS return up to `limit` items, backfilling with
 * the most recent when signal is thin so a "related" rail is never
 * awkwardly empty. Cross-type rankers (post↔project) require a real
 * topical match and return fewer (or none) rather than link unrelated
 * content.
 */

const norm = (s: string): string => slugify(String(s ?? ''))
const tokens = (arr?: string[]): Set<string> =>
  new Set((arr ?? []).map(norm).filter(Boolean))

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0
  for (const x of a) if (b.has(x)) n++
  return n
}

function bounds(times: number[]): [number, number] {
  let hi = -Infinity
  let lo = Infinity
  for (const t of times) {
    if (!Number.isFinite(t)) continue
    if (t > hi) hi = t
    if (t < lo) lo = t
  }
  return [hi, lo]
}

/** Bounded recency bonus in [0, 1): newest candidate → ~1, oldest → 0. */
function recency(iso: string, hi: number, lo: number): number {
  if (hi === lo || !Number.isFinite(hi)) return 0
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 0
  return Math.min(1, Math.max(0, (t - lo) / (hi - lo)))
}

interface Scored<T> { item: T; score: number }

/** Take the top `limit`, backfilling with the highest remaining so the
 *  rail is never short while a candidate exists. */
function top<T>(scored: Scored<T>[], limit: number): T[] {
  const sorted = [...scored].sort((a, b) => b.score - a.score)
  return sorted.slice(0, limit).map((s) => s.item)
}

/* ── Same-type: related projects ─────────────────────────────────────── */

export function rankRelatedProjects(current: Project, pool: Project[], limit = 3): Project[] {
  const candidates = pool.filter((p) => p.id !== current.id)
  if (!candidates.length) return []

  const client = norm(current.client)
  const cats   = tokens(current.categories)
  const tags   = tokens(current.tags)
  const svcs   = tokens(current.services)
  const [hi, lo] = bounds(candidates.map((p) => new Date(p.updatedAt || p.createdAt).getTime()))

  const scored: Scored<Project>[] = candidates.map((p) => {
    let s = 0
    if (client && norm(p.client) === client) s += 5
    s += overlap(cats, tokens(p.categories)) * 3
    s += overlap(tags, tokens(p.tags)) * 1.5
    s += overlap(svcs, tokens(p.services)) * 1
    if (p.featured) s += 0.5
    s += recency(p.updatedAt || p.createdAt, hi, lo)
    return { item: p, score: s }
  })
  return top(scored, limit)
}

/* ── Same-type: related posts ────────────────────────────────────────── */

export function rankRelatedPosts(current: Post, pool: Post[], limit = 3): Post[] {
  const candidates = pool.filter((p) => p.slug !== current.slug)
  if (!candidates.length) return []

  const tags   = tokens(current.tags)
  const author = norm(current.author)
  const [hi, lo] = bounds(candidates.map((p) => new Date(p.publishedAt).getTime()))

  const scored: Scored<Post>[] = candidates.map((p) => {
    let s = overlap(tags, tokens(p.tags)) * 2
    if (author && norm(p.author) === author) s += 0.5
    s += recency(p.publishedAt, hi, lo)
    return { item: p, score: s }
  })
  return top(scored, limit)
}

/* ── Cross-type: projects a post should link to ──────────────────────── */

export function relatedProjectsForPost(post: Post, projects: Project[], limit = 3): Project[] {
  const postTags = tokens(post.tags)
  if (!postTags.size || !projects.length) return []
  const [hi, lo] = bounds(projects.map((p) => new Date(p.updatedAt || p.createdAt).getTime()))

  const scored: Scored<Project>[] = projects.map((p) => {
    const projTokens = new Set<string>([...tokens(p.categories), ...tokens(p.tags)])
    let s = overlap(postTags, projTokens) * 2
    if (p.featured) s += 0.25
    s += recency(p.updatedAt || p.createdAt, hi, lo)
    return { item: p, score: s }
  })
  // Require a genuine topical match (≥1 shared token → score ≥ 2); no backfill.
  return top(scored.filter((s) => s.score >= 2), limit)
}

/* ── Cross-type: posts a project should link to ──────────────────────── */

export function relatedPostsForProject(project: Project, posts: Post[], limit = 2): Post[] {
  const projTokens = new Set<string>([...tokens(project.categories), ...tokens(project.tags)])
  if (!projTokens.size || !posts.length) return []
  const [hi, lo] = bounds(posts.map((p) => new Date(p.publishedAt).getTime()))

  const scored: Scored<Post>[] = posts.map((p) => {
    let s = overlap(tokens(p.tags), projTokens) * 2
    s += recency(p.publishedAt, hi, lo)
    return { item: p, score: s }
  })
  return top(scored.filter((s) => s.score >= 2), limit)
}
