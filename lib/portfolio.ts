import { v4 as uuidv4 } from 'uuid'
import { readStore, writeStore } from './store'
import type { Project, PortfolioData, CreateProjectInput, UpdateProjectInput } from './types'

async function readData(): Promise<PortfolioData> {
  return readStore<PortfolioData>('portfolio', { projects: [] })
}

async function writeData(data: PortfolioData): Promise<void> {
  return writeStore('portfolio', data)
}

export async function getAllProjects(): Promise<Project[]> {
  const data = await readData()
  return data.projects.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const all = await getAllProjects()
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
