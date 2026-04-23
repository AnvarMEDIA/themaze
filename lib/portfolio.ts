import { v4 as uuidv4 } from 'uuid'
import { readStore, writeStore } from './store'
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

export async function getAllProjects(): Promise<Project[]> {
  const data = await readData()
  return data.projects.sort((a, b) => {
    const aHas = typeof a.sortOrder === 'number'
    const bHas = typeof b.sortOrder === 'number'
    if (aHas && bHas) return a.sortOrder! - b.sortOrder!
    if (aHas) return -1
    if (bHas) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/** Public listings: hide drafts. Items without a status are treated as published. */
export async function getPublishedProjects(): Promise<Project[]> {
  const all = await getAllProjects()
  return all.filter((p) => p.status !== 'draft')
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
