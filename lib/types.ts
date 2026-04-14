export type ProjectCategory =
  | 'branding'
  | 'identity'
  | 'ui-ux'
  | 'print'
  | 'motion'
  | 'strategy'

export interface Project {
  id: string
  slug: string
  title: string
  client: string
  category: ProjectCategory
  year: number
  description: string
  shortDescription: string
  coverImage: string
  images: string[]
  tags: string[]
  services: string[]
  featured: boolean
  accentColor: string
  results?: string
  createdAt: string
  updatedAt: string
}

export interface PortfolioData {
  projects: Project[]
}

export type CreateProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateProjectInput = Partial<CreateProjectInput>
