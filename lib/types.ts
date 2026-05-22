export type ProjectCategory =
  | 'branding'
  | 'rebranding'
  | 'identity'
  | 'naming'
  | 'packaging'
  | 'ui-ux'
  | 'print'
  | 'motion'
  | 'strategy'

export interface Project {
  id: string
  slug: string
  title: string
  titleRu?: string
  titleUz?: string
  client: string
  categories: ProjectCategory[]
  year: number
  /** Show the year on the public site. Undefined is treated as true. */
  showYear?: boolean
  description: string
  descriptionRu?: string
  descriptionUz?: string
  shortDescription: string
  shortDescriptionRu?: string
  shortDescriptionUz?: string
  coverImage: string
  images: string[]
  tags: string[]
  services: string[]
  servicesRu?: string[]
  servicesUz?: string[]
  featured: boolean
  accentColor: string
  results?: string
  resultsRu?: string
  resultsUz?: string
  sortOrder?: number
  status?: 'draft' | 'published'
  deletedAt?: string | null
  /** Per-image alt text, keyed by image URL. Falls back to a generated string. */
  imageAlts?: Record<string, string>
  /** SEO overrides — leave blank to use auto-generated defaults. */
  metaTitle?: string
  metaTitleRu?: string
  metaTitleUz?: string
  metaDescription?: string
  metaDescriptionRu?: string
  metaDescriptionUz?: string
  createdAt: string
  updatedAt: string
}

export interface PortfolioData {
  projects: Project[]
}

export type CreateProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateProjectInput = Partial<CreateProjectInput>
