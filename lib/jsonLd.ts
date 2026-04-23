import type { Project } from './types'
import type { SiteSettings } from './settings'
import type { TeamMember } from './team'
import type { Testimonial } from './testimonials'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

export const CONTEXT = 'https://schema.org'
export const ORG_ID  = `${SITE_URL}/#organization`
export const SITE_ID = `${SITE_URL}/#website`

function localePath(locale: string, path = ''): string {
  const base = locale === 'en' ? SITE_URL : `${SITE_URL}/${locale}`
  return path ? `${base}${path}` : base
}

/* ── Organization ──────────────────────────────────────────────────────── */

export function organizationJsonLd(settings: SiteSettings | null) {
  const sameAs = [
    settings?.instagram,
    settings?.behance,
    settings?.linkedin,
    settings?.twitter,
  ].filter((v): v is string => typeof v === 'string' && v.length > 0)

  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'MAZE Studio',
    alternateName: ['MAZE', 'MAZE Branding Studio', 'MAZE Design Studio'],
    description:
      'Premium branding and design studio based in Tashkent, Uzbekistan. We craft bold brand identities, logo systems, naming, packaging, and strategic design for ambitious companies across Central Asia.',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.svg`,
      width: 200,
      height: 60,
    },
    foundingDate: '2019',
    email:     settings?.email    || 'hello@maze.uz',
    telephone: settings?.phone    || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: settings?.address?.split(',')[0]?.trim() || 'Tashkent',
      addressRegion:   'Tashkent',
      addressCountry:  'UZ',
      ...(settings?.addressDetail ? { streetAddress: settings.addressDetail } : {}),
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email:            settings?.email || 'hello@maze.uz',
      telephone:        settings?.phone || undefined,
      contactType:      'customer service',
      areaServed:       ['UZ', 'KZ', 'KG', 'TJ', 'TM', 'AZ', 'GE'],
      availableLanguage: ['English', 'Russian', 'Uzbek'],
    },
    sameAs: sameAs.length ? sameAs : [
      'https://www.instagram.com/maze.uz',
      'https://www.behance.net/mazestudio',
      'https://www.linkedin.com/company/mazestudio',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Branding & Design Services',
      itemListElement: [
        'Brand Identity Design',
        'Logo Design',
        'Brand Strategy',
        'Naming',
        'Packaging Design',
        'Rebranding',
        'UI/UX Design',
        'Motion Design',
        'Print Design',
      ].map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
    },
  }
}

/* ── WebSite ───────────────────────────────────────────────────────────── */

export function websiteJsonLd() {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: SITE_URL,
    name: 'MAZE Studio',
    description: 'Branding & Design Studio — Tashkent, Uzbekistan',
    publisher: { '@id': ORG_ID },
    inLanguage: ['en', 'ru'],
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/portfolio?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

/* ── Breadcrumbs ───────────────────────────────────────────────────────── */

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  }
}

/* ── CreativeWork (project detail) ─────────────────────────────────────── */

export function projectJsonLd(project: Project, locale: string) {
  const isRu = locale === 'ru'
  const title       = isRu ? (project.titleRu            || project.title)            : project.title
  const description = isRu ? (project.descriptionRu      || project.description)      : project.description
  const shortDesc   = isRu ? (project.shortDescriptionRu || project.shortDescription) : project.shortDescription
  const url         = localePath(locale, `/portfolio/${project.slug}`)
  const images      = [project.coverImage, ...(project.images ?? [])].filter(Boolean)

  return {
    '@context': CONTEXT,
    '@type': 'CreativeWork',
    '@id': `${url}#creativework`,
    name: title,
    headline: title,
    description: description || shortDesc || undefined,
    url,
    image: images.length ? images : undefined,
    dateCreated:  project.createdAt,
    dateModified: project.updatedAt,
    inLanguage: locale,
    creator: { '@id': ORG_ID },
    author:  { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    keywords: [...(project.categories ?? []), ...(project.tags ?? [])].join(', ') || undefined,
    about: project.client ? { '@type': 'Organization', name: project.client } : undefined,
    genre: project.categories?.[0],
  }
}

/* ── ItemList for portfolio listing ────────────────────────────────────── */

export function portfolioListJsonLd(projects: Project[], locale: string) {
  const isRu = locale === 'ru'
  return {
    '@context': CONTEXT,
    '@type': 'ItemList',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: projects.length,
    itemListElement: projects.slice(0, 50).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: localePath(locale, `/portfolio/${p.slug}`),
      name: isRu ? (p.titleRu || p.title) : p.title,
    })),
  }
}

/* ── Person (team members) ─────────────────────────────────────────────── */

export function personJsonLd(member: TeamMember, locale: string) {
  const isRu = locale === 'ru'
  return {
    '@context': CONTEXT,
    '@type': 'Person',
    name: member.name,
    jobTitle: isRu ? (member.roleRu || member.role) : member.role,
    description: isRu ? (member.bioRu || member.bio) : member.bio,
    image: member.photo || undefined,
    worksFor: { '@id': ORG_ID },
  }
}

/* ── AboutPage ─────────────────────────────────────────────────────────── */

export function aboutPageJsonLd(team: TeamMember[], locale: string) {
  return {
    '@context': CONTEXT,
    '@type': 'AboutPage',
    url: localePath(locale, '/about'),
    inLanguage: locale,
    about: { '@id': ORG_ID },
    mainEntity: {
      '@type': 'Organization',
      '@id': ORG_ID,
      employee: team.map((m) => ({
        '@type': 'Person',
        name: m.name,
        jobTitle: locale === 'ru' ? (m.roleRu || m.role) : m.role,
        image: m.photo || undefined,
      })),
    },
  }
}

/* ── ContactPage ───────────────────────────────────────────────────────── */

export function contactPageJsonLd(locale: string) {
  return {
    '@context': CONTEXT,
    '@type': 'ContactPage',
    url: localePath(locale, '/contact'),
    inLanguage: locale,
    about: { '@id': ORG_ID },
  }
}

/* ── Services (ItemList of Service) ────────────────────────────────────── */

export function servicesJsonLd(
  services: { id: string; name: string; description: string }[],
  locale: string,
) {
  return {
    '@context': CONTEXT,
    '@type': 'ItemList',
    url: localePath(locale, '/services'),
    itemListElement: services.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Service',
        name: s.name,
        description: s.description,
        provider: { '@id': ORG_ID },
        areaServed: ['Uzbekistan', 'Central Asia'],
      },
    })),
  }
}

/* ── Testimonials / Reviews ────────────────────────────────────────────── */

export function testimonialsJsonLd(items: Testimonial[], locale: string) {
  const isRu = locale === 'ru'
  const reviews = items.map((t) => ({
    '@type': 'Review',
    reviewBody: isRu && t.quoteRu ? t.quoteRu : t.quote,
    inLanguage: isRu ? 'ru' : 'en',
    author: {
      '@type': 'Person',
      name: t.author,
      jobTitle: isRu && t.roleRu ? t.roleRu : t.role,
    },
    itemReviewed: { '@id': ORG_ID },
    reviewRating: t.rating
      ? { '@type': 'Rating', ratingValue: t.rating, bestRating: 5 }
      : undefined,
  }))

  const ratings = items.map((t) => t.rating).filter((n): n is number => typeof n === 'number')
  const avg     = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined

  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': ORG_ID,
    review: reviews,
    ...(avg !== undefined
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(avg.toFixed(1)),
            reviewCount: ratings.length,
            bestRating: 5,
          },
        }
      : {}),
  }
}

/* ── Blog / Insights ───────────────────────────────────────────────────── */

export function blogJsonLd(locale: string) {
  return {
    '@context': CONTEXT,
    '@type': 'Blog',
    url: localePath(locale, '/insights'),
    name: 'MAZE Studio — Insights',
    inLanguage: locale,
    publisher: { '@id': ORG_ID },
  }
}

export function postJsonLd(
  post: {
    slug: string
    title: string
    titleRu?: string
    excerpt: string
    excerptRu?: string
    coverImage: string
    author: string
    publishedAt: string
    updatedAt: string
    tags: string[]
  },
  locale: string,
) {
  const isRu    = locale === 'ru'
  const title   = isRu ? (post.titleRu || post.title) : post.title
  const excerpt = isRu ? (post.excerptRu || post.excerpt) : post.excerpt
  const url     = localePath(locale, `/insights/${post.slug}`)
  return {
    '@context': CONTEXT,
    '@type': 'BlogPosting',
    '@id': `${url}#post`,
    mainEntityOfPage: url,
    headline: title,
    description: excerpt || undefined,
    image: post.coverImage || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: locale,
    author: { '@type': 'Person', name: post.author || 'MAZE Studio' },
    publisher: { '@id': ORG_ID },
    keywords: post.tags.join(', ') || undefined,
  }
}

/* ── Breadcrumb helpers ────────────────────────────────────────────────── */

export function homeCrumb(locale: string, label: string) {
  return { name: label, url: localePath(locale) }
}
export function portfolioCrumb(locale: string, label: string) {
  return { name: label, url: localePath(locale, '/portfolio') }
}
export function insightsCrumb(locale: string, label: string) {
  return { name: label, url: localePath(locale, '/insights') }
}
