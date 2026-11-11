import { z } from 'zod'
import { STAT_IDS } from './homeStats'
import { INTERN_STATUSES } from './internship'
import { BRIEF_LIMITS, STYLE_IDS, TEXT_KEYS, isOptionalText } from './briefTexts'

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
  phone:   z.string().trim().max(30).refine(
    (v) => v === '' || /^\+[1-9]\d{6,14}$/.test(v),
    { message: 'Invalid phone' },
  ).optional().default(''),
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
  showYear:             z.boolean().optional().default(true),
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
  status:               z.enum(['draft', 'published']).optional().default('published'),
  imageAlts:            z.record(z.string().max(500), safeString(200)).optional(),
  metaTitle:            safeString(70).optional().default(''),
  metaTitleRu:          safeString(70).optional().default(''),
  metaDescription:      safeString(200).optional().default(''),
  metaDescriptionRu:    safeString(200).optional().default(''),
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

/* ── World map (the homepage section "Projects around the world") ──────── */

const latitude  = z.number().min(-90).max(90)
const longitude = z.number().min(-180).max(180)
const hasName   = (v: { nameEn: string; nameRu: string }) => !!(v.nameEn || v.nameRu)

export const WorldMapCitySchema = z.object({
  id:     z.string().regex(/^[a-z0-9-]{1,64}$/, 'Invalid city id'),
  nameEn: safeString(60),
  nameRu: safeString(60),
  lat:    latitude,
  lng:    longitude,
}).refine(hasName, { message: 'Every city needs a name' })

export const WorldMapCountrySchema = z.object({
  code:   z.string().regex(/^[A-Z]{2}$/, 'Invalid country code'),
  nameEn: safeString(60),
  nameRu: safeString(60),
  lat:    latitude,
  lng:    longitude,
  cities: z.array(WorldMapCitySchema).max(40),
}).refine(hasName, { message: 'Every country needs a name' })

export const WorldMapSchema = z.object({
  countries: z.array(WorldMapCountrySchema).max(120),
}).superRefine((map, ctx) => {
  const codes = new Set<string>()
  const ids   = new Set<string>()
  for (const country of map.countries) {
    if (codes.has(country.code)) ctx.addIssue({ code: 'custom', message: `${country.code} is listed twice` })
    codes.add(country.code)
    for (const city of country.cities) {
      if (ids.has(city.id)) ctx.addIssue({ code: 'custom', message: `City id ${city.id} is used twice` })
      ids.add(city.id)
    }
  }
})

/* ── Homepage numbers ("200+ projects completed"…) ──────────────────────── */

export const HomeStatSchema = z.object({
  id:      z.enum(STAT_IDS),
  value:   z.number().int().min(0).max(1_000_000),
  suffix:  safeString(4),
  labelEn: safeString(40),
  labelRu: safeString(40),
  visible: z.boolean().optional(),
}).refine((s) => !!(s.labelEn || s.labelRu), { message: 'Every number needs a caption' })

// Places missing from a set are filled with their defaults on read and on
// save (lib/homeStatsStore.ts), so a set saved before a place was added
// stays valid.
export const HomeStatsSchema = z.object({
  stats: z.array(HomeStatSchema).min(1).max(STAT_IDS.length),
}).refine((v) => new Set(v.stats.map((s) => s.id)).size === v.stats.length, {
  message: 'Each place is listed once',
})

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

/* ── Testimonial ─────────────────────────────────────────────────────────── */

export const TestimonialSchema = z.object({
  id:       z.string().min(1).max(64),
  author:   safeString(100).min(1, 'Author name is required'),
  role:     safeString(200),
  roleRu:   safeString(200),
  quote:    safeString(1500).min(1, 'Quote is required'),
  quoteRu:  safeString(1500),
  avatar:   urlOrEmpty.optional().default(''),
  rating:   z.number().int().min(1).max(5).optional(),
  featured: z.boolean().optional().default(false),
  order:    z.number().int().min(0),
})

export const TestimonialsSchema = z.array(TestimonialSchema).max(50)

/* ── Post / Insights ────────────────────────────────────────────────────── */

export const PostSchema = z.object({
  slug:        safeString(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, hyphens'),
  title:       safeString(200).min(1, 'Title is required'),
  titleRu:     safeString(200).optional().default(''),
  excerpt:     safeString(500).optional().default(''),
  excerptRu:   safeString(500).optional().default(''),
  body:        safeString(50000).optional().default(''),
  bodyRu:      safeString(50000).optional().default(''),
  coverImage:  urlOrEmpty.optional().default(''),
  author:      safeString(100).optional().default('MAZE Studio'),
  tags:        z.array(safeString(50)).max(20).optional().default([]),
  status:      z.enum(['draft', 'published']).optional().default('draft'),
  publishedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
})

export const PostUpdateSchema = PostSchema.partial()

/* ── Brief (multi-step client brief form) ────────────────────────────────── */

export const BriefSchema = z.object({
  name:        safeString(100).min(1, 'Name is required'),
  phone:       z.string().trim().regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone'),
  email:       z.union([z.string().trim().email('Invalid email').max(254), z.literal('')])
                 .optional().default(''),
  company:     safeString(100).optional().default(''),
  website:     safeString(300).optional().default(''),
  // Up to the editor's limits (lib/briefTexts BRIEF_LIMITS): options can be added.
  services:    z.array(safeString(100)).max(20).optional().default([]),
  description: safeString(5000).min(1, 'Description is required'),
  goals:       safeString(2000).optional().default(''),
  audience:    safeString(1000).optional().default(''),
  competitors: safeString(1000).optional().default(''),
  styles:      z.array(safeString(50)).max(8).optional().default([]),
  colors:      z.array(safeString(50)).max(12).optional().default([]),
  refLinks:    safeString(2000).optional().default(''),
  timeline:    safeString(100).optional().default(''),
  budget:      safeString(50).optional().default(''),
  source:      safeString(200).optional().default(''),
  notes:       safeString(2000).optional().default(''),
  // Honeypot: bots fill this hidden field, humans never see it.
  hp:          z.string().max(500).optional().default(''),
})
export type BriefInput = z.infer<typeof BriefSchema>

/* ── Brief form content (the admin's editor, lib/briefContent) ───────────── */

// Braces are message syntax to next-intl, which reads these texts: a stray
// "{" in a question would break the form instead of showing up in it.
const briefText = (max: number) =>
  z.string().trim().max(max, `Max ${max} characters`)
    .refine((s) => !/[{}]/.test(s), 'Curly braces { } are not allowed')

const briefLoc  = (max: number) => z.object({ ru: briefText(max), en: briefText(max) })
const filledLoc = (max: number) =>
  briefLoc(max).refine((l) => l.ru !== '' && l.en !== '', 'Fill in both languages')

const optionId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/, 'Invalid option id')
const uniqueIds = (items: Array<{ id: string }>) => new Set(items.map((i) => i.id)).size === items.length
const someShown = (items: Array<{ hidden?: boolean }>) => items.some((i) => !i.hidden)

export const BriefContentSchema = z.object({
  texts: z.record(z.string(), briefLoc(BRIEF_LIMITS.text)).superRefine((texts, ctx) => {
    for (const key of Object.keys(texts)) {
      if (!TEXT_KEYS.includes(key)) ctx.addIssue({ code: 'custom', message: `Unknown text "${key}"`, path: [key] })
      else if (!isOptionalText(key) && (texts[key].ru === '' || texts[key].en === '')) {
        ctx.addIssue({ code: 'custom', message: 'Fill in both languages', path: [key] })
      }
    }
  }),
  services: z.array(z.object({
    id: optionId, label: filledLoc(BRIEF_LIMITS.optionLabel), hidden: z.boolean().optional(),
  })).min(1).max(BRIEF_LIMITS.services)
    .refine(uniqueIds, 'Two services share an id')
    .refine(someShown, 'Show at least one service'),
  styles: z.array(z.object({
    id: z.enum(STYLE_IDS),
    label: filledLoc(BRIEF_LIMITS.optionLabel),
    desc: briefLoc(BRIEF_LIMITS.optionDesc),
    hidden: z.boolean().optional(),
  })).max(STYLE_IDS.length)
    .refine(uniqueIds, 'Two styles share an id')
    .refine(someShown, 'Show at least one style'),
  palettes: z.array(z.object({
    id: optionId,
    label: filledLoc(BRIEF_LIMITS.optionLabel),
    desc: briefLoc(BRIEF_LIMITS.optionDesc),
    swatches: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/, 'A colour is #RRGGBB')).min(1).max(BRIEF_LIMITS.swatches),
    hidden: z.boolean().optional(),
  })).min(1).max(BRIEF_LIMITS.palettes)
    .refine(uniqueIds, 'Two palettes share an id')
    .refine(someShown, 'Show at least one palette'),
  timelines: z.array(z.object({ id: optionId, label: filledLoc(BRIEF_LIMITS.timelineLabel) }))
    .min(1).max(BRIEF_LIMITS.choices).refine(uniqueIds, 'Two timelines share an id'),
  budgets: z.array(z.object({ id: optionId, label: filledLoc(BRIEF_LIMITS.budgetLabel) }))
    .min(1).max(BRIEF_LIMITS.choices).refine(uniqueIds, 'Two budgets share an id'),
})

/* ── Internship application ──────────────────────────────────────────────── */

// A portfolio link as people type it: "behance.net/name" is as common as the
// full address, so a missing scheme is supplied rather than refused. What is
// stored is the parsed URL's own form, with quotes, spaces and brackets
// percent-encoded, so the link is safe to put in an href as it stands.
const portfolioLink = z.string().trim().min(1, 'Portfolio is required').max(500)
  .transform((raw, ctx) => {
    try {
      const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
      const web = u.protocol === 'https:' || u.protocol === 'http:'
      // A real host has a TLD; IDN hosts arrive as punycode (xn--…).
      if (web && /\.(?:[a-z]{2,}|xn--[a-z0-9-]+)$/i.test(u.hostname)) return u.href
    } catch { /* not a URL at all */ }
    ctx.addIssue({ code: 'custom', message: 'Invalid portfolio link' })
    return z.NEVER
  })

export const InternApplicationSchema = z.object({
  name:      safeString(100).min(1, 'Name is required'),
  phone:     z.string().trim().regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone'),
  email:     z.union([z.string().trim().email('Invalid email').max(254), z.literal('')])
               .optional().default(''),
  telegram:  safeString(64).optional().default(''),
  city:      safeString(100).optional().default(''),
  portfolio: portfolioLink,
  about:     safeString(3000).min(1, 'About is required'),
  locale:    z.enum(['en', 'ru']).optional(),
  // Honeypot: bots fill this hidden field, humans never see it.
  hp:        z.string().max(500).optional().default(''),
})

export const InternApplicationPatchSchema = z.object({
  status: z.enum(INTERN_STATUSES).optional(),
  note:   safeString(2000).optional(),
}).refine((v) => v.status !== undefined || v.note !== undefined, { message: 'Nothing to update' })

export const InternshipSettingsSchema = z.object({
  open: z.boolean(),
})

/* ── Login ───────────────────────────────────────────────────────────────── */

export const LoginSchema = z.object({
  password: z.string().min(1, 'Password required').max(200),
  totp:     z.string().trim().regex(/^\d{6}$/, 'TOTP must be 6 digits').optional(),
})

export const MfaVerifySchema = z.object({
  secret: z.string().trim().min(16).max(128),
  code:   z.string().trim().regex(/^\d{6}$/, 'TOTP must be 6 digits'),
})
