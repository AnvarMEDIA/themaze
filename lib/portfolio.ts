import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Project, PortfolioData, CreateProjectInput, UpdateProjectInput } from './types'

const DATA_FILE = path.join(process.cwd(), 'data', 'portfolio.json')

function readData(): PortfolioData {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw) as PortfolioData
  } catch {
    return { projects: [] }
  }
}

function writeData(data: PortfolioData): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export function getAllProjects(): Project[] {
  const data = readData()
  return data.projects.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getFeaturedProjects(): Project[] {
  return getAllProjects().filter((p) => p.featured)
}

export function getProjectBySlug(slug: string): Project | null {
  const projects = getAllProjects()
  return projects.find((p) => p.slug === slug) ?? null
}

export function getProjectById(id: string): Project | null {
  const projects = getAllProjects()
  return projects.find((p) => p.id === id) ?? null
}

export function createProject(input: CreateProjectInput): Project {
  const data = readData()
  const now = new Date().toISOString()
  const project: Project = {
    ...input,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  }
  data.projects.push(project)
  writeData(data)
  return project
}

export function updateProject(id: string, input: UpdateProjectInput): Project | null {
  const data = readData()
  const idx = data.projects.findIndex((p) => p.id === id)
  if (idx === -1) return null
  data.projects[idx] = {
    ...data.projects[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  }
  writeData(data)
  return data.projects[idx]
}

export function deleteProject(id: string): boolean {
  const data = readData()
  const initial = data.projects.length
  data.projects = data.projects.filter((p) => p.id !== id)
  if (data.projects.length === initial) return false
  writeData(data)
  return true
}
