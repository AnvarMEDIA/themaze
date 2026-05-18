import { v4 as uuidv4 } from 'uuid'
import { readStore, writeStore } from './store'
import { slugify } from './utils'
import type { Project, PortfolioData, CreateProjectInput, UpdateProjectInput, ProjectCategory } from './types'

type StoredProject = Omit<Project, 'categories'> & { category?: ProjectCategory; categories?: ProjectCategory[] }

function normalize(p: StoredProject): Project {
  const categories = p.categories?.length ? p.categories
    : p.category ? [p.category] : ['branding' as ProjectCategory]
  const { category: _c, ...rest } = p as StoredProject & { category?: ProjectCategory }
  return { ...rest, categories } as Project
}

async function readData(): Promise<PortfolioData> {
  const raw = await readStore<{ projects: StoredProject[] }>('portfolio', { projects: [] })
  return { projects: raw.projects.map(normalize) }
}

async function writeData(data: PortfolioData): Promise<void> {
  return writeStore('portfolio', data)
}

export async function getAllProjects(opts: { includeDeleted?: boolean } = {}): Promise<Project[]> {
  const data = await readData()
  const rows = opts.includeDeleted ? data.projects : data.projects.filter((p) => !p.deletedAt)
  return rows.sort((a, b) => {
    const aHas = typeof a.sortOrder === 'number'
    const bHas = typeof b.sortOrder === 'number'
    if (aHas && bHas) return a.sortOrder! - b.sortOrder!
    if (aHas) return -1
    if (bHas) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/** Public listings: hide drafts and deleted. */
export async function getPublishedProjects(): Promise<Project[]> {
  const all = await getAllProjects()
  return all.filter((p) => p.status !== 'draft')
}

/** Soft-delete: set deletedAt. Returns the project or null if not found. */
export async function softDeleteProject(id: string): Promise<Project | null> {
  const data = await readData()
  const idx  = data.projects.findIndex((p) => p.id === id)
  if (idx === -1) return null
  const now = new Date().toISOString()
  data.projects[idx] = { ...data.projects[idx], deletedAt: now, updatedAt: now }
  await writeData(data)
  return data.projects[idx]
}

/** Restore a soft-deleted project. */
export async function restoreProject(id: string): Promise<Project | null> {
  const data = await readData()
  const idx  = data.projects.findIndex((p) => p.id === id)
  if (idx === -1) return null
  const now = new Date().toISOString()
  data.projects[idx] = { ...data.projects[idx], deletedAt: null, updatedAt: now }
  await writeData(data)
  return data.projects[idx]
}

export async function reorderProjects(orderedIds: string[]): Promise<void> {
  const data = await readData()
  const index = new Map(orderedIds.map((id, i) => [id, i]))
  const now = new Date().toISOString()
  data.projects = data.projects.map((p) => {
    const next = index.get(p.id)
    if (next === undefined || next === p.sortOrder) return p
    return { ...p, sortOrder: next, updatedAt: now }
  })
  await writeData(data)
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const all = await getPublishedProjects()
  return all.filter((p) => p.featured)
}

/** Unique client slugs across published projects. */
export async function getClientSlugs(): Promise<Array<{ slug: string; name: string; count: number }>> {
  const all = await getPublishedProjects()
  const map = new Map<string, { name: string; count: number }>()
  for (const p of all) {
    const slug = slugify(p.client)
    if (!slug) continue
    const existing = map.get(slug)
    if (existing) existing.count += 1
    else           map.set(slug, { name: p.client, count: 1 })
  }
  return Array.from(map.entries()).map(([slug, v]) => ({ slug, ...v }))
}

/** Unique tag slugs across published projects (only tags used on ≥2 projects, to avoid orphan pages). */
export async function getTagSlugs(minCount = 2): Promise<Array<{ slug: string; tag: string; count: number }>> {
  const all = await getPublishedProjects()
  const map = new Map<string, { tag: string; count: number }>()
  for (const p of all) {
    for (const tag of p.tags ?? []) {
      const slug = slugify(tag)
      if (!slug) continue
      const existing = map.get(slug)
      if (existing) existing.count += 1
      else           map.set(slug, { tag, count: 1 })
    }
  }
  return Array.from(map.entries())
    .filter(([, v]) => v.count >= minCount)
    .map(([slug, v]) => ({ slug, ...v }))
}

export async function getProjectsByClientSlug(clientSlug: string): Promise<{ projects: Project[]; clientName: string } | null> {
  const all = await getPublishedProjects()
  const list = all.filter((p) => slugify(p.client) === clientSlug)
  if (list.length === 0) return null
  return { projects: list, clientName: list[0].client }
}

export async function getProjectsByTagSlug(tagSlug: string): Promise<{ projects: Project[]; tag: string } | null> {
  const all = await getPublishedProjects()
  let tagName = ''
  const list = all.filter((p) => {
    for (const t of p.tags ?? []) {
      if (slugify(t) === tagSlug) {
        if (!tagName) tagName = t
        return true
      }
    }
    return false
  })
  if (list.length === 0) return null
  return { projects: list, tag: tagName }
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const projects = await getAllProjects()
  return projects.find((p) => p.slug === slug) ?? null
}

export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await getAllProjects()
  return projects.find((p) => p.id === id) ?? null
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const data = await readData()
  const now = new Date().toISOString()
  const project: Project = { ...input, id: uuidv4(), createdAt: now, updatedAt: now }
  data.projects.push(project)
  await writeData(data)
  return project
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project | null> {
  const data = await readData()
  const idx = data.projects.findIndex((p) => p.id === id)
  if (idx === -1) return null
  data.projects[idx] = { ...data.projects[idx], ...input, updatedAt: new Date().toISOString() }
  await writeData(data)
  return data.projects[idx]
}

export async function deleteProject(id: string): Promise<boolean> {
  const data = await readData()
  const initial = data.projects.length
  data.projects = data.projects.filter((p) => p.id !== id)
  if (data.projects.length === initial) return false
  await writeData(data)
  return true
}
