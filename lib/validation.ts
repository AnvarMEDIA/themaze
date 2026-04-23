import { z } from 'zod'

/* ── Shared primitives ───────────────────────────────────────────────────── */

const safeString = (max = 500) =>
  z.string().trim().max(max, `Max ${max} characters`)

const urlOrEmpty = z.string().trim().max(500).refine(
  (v) => v === '' || v.startsWith('https://') || v.startsWith('http://'),
  { message: 'Must be a valid URL or empty' }
)

/* ── Contact / Inquiry ───────────────────────────────────────────────────── */

export const InquirySchema = z.object({
  name:    safeString(100).min(1, 'Name is required'),
  email:   z.string().trim().email('Invalid email').max(254),
  company: safeString(100).optional().default(''),
  service: safeString(100).optional().default(''),
  budget:  safeString(50).optional().default(''),
  message: safeString(5000).min(1, 'Message is required'),
  // Honeypot: a bot will fill this hidden field; humans cannot see it.
  website: z.string().max(500).optional().default(''),
})

export type InquiryInput = z.infer<typeof InquirySchema>

/* ── Project ─────────────────────────────────────────────────────────────── */

const VALID_CATEGORIES = [
  'branding', 'rebranding', 'identity', 'naming', 'packaging', 'ui-ux', 'print', 'motion', 'strategy',
] as const

export const ProjectSchema = z.object({
  title:                safeString(200).min(1, 'Title is required'),
  titleRu:              safeString(200).optional().default(''),
  slug:                 safeString(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, hyphens').optional(),
  client:               safeString(200).min(1, 'Client is required'),
  categories:           z.array(z.enum(VALID_CATEGORIES)).min(1, 'Select at least one category'),
  year:                 z.number().int().min(2000).max(new Date().getFullYear() + 1),
  description:          safeString(5000).optional().default(''),
  descriptionRu:        safeString(5000).optional().default(''),
  shortDescription:     safeString(500).optional().default(''),
  shortDescriptionRu:   safeString(500).optional().default(''),
  coverImage:           urlOrEmpty.optional().default(''),
  images:               z.array(urlOrEmpty).max(50).optional().default([]),
  tags:                 z.array(safeString(50)).max(20).optional().default([]),
  services:             z.array(safeString(100)).max(20).optional().default([]),
  servicesRu:           z.array(safeString(100)).max(20).optional().default([]),
  featured:             z.boolean().optional().default(false),
  accentColor:          z.string().regex(/^#[0-9A-Fa-f]{3,8}$/, 'Invalid hex color').optional().default('#C8FF47'),
  results:              safeString(2000).optional(),
  resultsRu:            safeString(2000).optional(),
})

export const ProjectUpdateSchema = ProjectSchema.partial()

export const ProjectReorderSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).max(500),
})

export const ReorderSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).max(500),
})

export type ProjectInput = z.infer<typeof ProjectSchema>

/* ── Settings ────────────────────────────────────────────────────────────── */

export const SettingsSchema = z.object({
  email:         z.string().trim().email('Invalid email').max(254).or(z.literal('')).optional().default(''),
  phone:         safeString(30).optional().default(''),
  telegram:      safeString(100).optional().default(''),
  address:       safeString(200).optional().default(''),
  addressDetail: safeString(200).optional().default(''),
  instagram:     urlOrEmpty.optional().default(''),
  behance:       urlOrEmpty.optional().default(''),
  linkedin:      urlOrEmpty.optional().default(''),
  twitter:       urlOrEmpty.optional().default(''),
  favicon:       z.string().trim().max(500).refine(
    (v) => v === '' || v.startsWith('https://') || v.startsWith('http://') || v.startsWith('/'),
    { message: 'Must be a valid URL or path' }
  ).optional().default(''),
})

export type SettingsInput = z.infer<typeof SettingsSchema>

/* ── Partner ─────────────────────────────────────────────────────────────── */

export const PartnerSchema = z.object({
  name:  safeString(100).min(1, 'Name is required'),
  logo:  urlOrEmpty.optional().default(''),
  url:   urlOrEmpty.optional().default(''),
  order: z.number().int().min(0).default(99),
})

export type PartnerInput = z.infer<typeof PartnerSchema>

/* ── Team member ─────────────────────────────────────────────────────────── */

export const TeamMemberSchema = z.object({
  id:     z.string().uuid().or(z.string().min(1).max(36)),
  name:   safeString(100).min(1, 'Name is required'),
  role:   safeString(100),
  roleRu: safeString(100),
  bio:    safeString(1000),
  bioRu:  safeString(1000),
  photo:  urlOrEmpty.optional().default(''),
  order:  z.number().int().min(0),
})

export const TeamSchema = z.array(TeamMemberSchema).max(20)

/* ── Login ───────────────────────────────────────────────────────────────── */

export const LoginSchema = z.object({
  password: z.string().min(1, 'Password required').max(200),
})
