export type ProjectCategory =
  | 'branding'
  | 'identity'
  | 'naming'
  | 'ui-ux'
  | 'print'
  | 'motion'
  | 'strategy'

export interface Project {
  id: string
  slug: string
  title: string
  titleRu?: string
  client: string
  category: ProjectCategory
  year: number
  description: string
  descriptionRu?: string
  shortDescription: string
  shortDescriptionRu?: string
  coverImage: string
  images: string[]
  tags: string[]
  services: string[]
  servicesRu?: string[]
  featured: boolean
  accentColor: string
  results?: string
  resultsRu?: string
  createdAt: string
  updatedAt: string
}

export interface PortfolioData {
  projects: Project[]
}

export type CreateProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateProjectInput = Partial<CreateProjectInput>
