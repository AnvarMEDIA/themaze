import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { SafeMDX } from '@/components/SafeMDX'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Link } from '@/i18n/navigation'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, homeCrumb, legalPageJsonLd } from '@/lib/jsonLd'
import { localizedAlternates, SITE_URL, notFoundMetadata } from '@/lib/seo'

const LEGAL_SLUGS = ['privacy', 'terms', 'cookies'] as const
type LegalSlug = (typeof LEGAL_SLUGS)[number]

interface Props {
  params: { locale: string; slug: string }
}

function isLegalSlug(v: string): v is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(v)
}

async function readDoc(slug: LegalSlug, locale: string): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), 'content', 'legal', `${slug}.${locale}.md`),
    path.join(process.cwd(), 'content', 'legal', `${slug}.en.md`),
  ]
  for (const file of candidates) {
    try {
      return stripLeadingH1(await fs.readFile(file, 'utf-8'))
    } catch {
      /* try next */
    }
  }
  return null
}

/**
 * Each document opens with a `# Title` that repeats the page heading rendered
 * below, which produced two identical <h1>s per page — bad for SEO and for
 * screen-reader document outline. The page owns the <h1>, so drop the one in
 * the body.
 */
function stripLeadingH1(md: string): string {
  return md.replace(/^﻿?\s*#\s+.*(\r?\n)+/, '')
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    LEGAL_SLUGS.map((slug) => ({ locale, slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isLegalSlug(params.slug)) return notFoundMetadata
  const t = await getTranslations({ locale: params.locale, namespace: 'legal' })
  return {
    title: t(`${params.slug}.title`),
    description: t(`${params.slug}.description`),
    alternates: localizedAlternates(params.locale, `legal/${params.slug}`),
    robots: { index: true, follow: true },
  }
}

export default async function LegalPage({ params }: Props) {
  if (!isLegalSlug(params.slug)) notFound()
  setRequestLocale(params.locale)

  const [source, t] = await Promise.all([
    readDoc(params.slug, params.locale),
    getTranslations({ locale: params.locale, namespace: 'legal' }),
  ])
  if (!source) notFound()

  const isRu   = params.locale === 'ru'
  const crumbs = breadcrumbJsonLd([
    homeCrumb(params.locale, isRu ? 'Главная' : 'Home'),
    {
      name: t(`${params.slug}.title`),
      url: `${SITE_URL}${params.locale === 'en' ? '' : '/' + params.locale}/legal/${params.slug}`,
    },
  ])

  return (
    <article className="pt-28 min-h-screen">
      <JsonLd data={[crumbs, legalPageJsonLd(params.slug, t(`${params.slug}.title`), params.locale)]} />

      <header className="px-6 md:px-10 pb-10 border-b border-maze-border">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="label-sm text-maze-muted hover:text-maze-lime transition-colors mb-8 inline-flex items-center gap-2"
          >
            ← {isRu ? 'На главную' : 'Back to home'}
          </Link>
          <h1 className="display-md text-maze-cream">
            {t(`${params.slug}.title`)}
          </h1>
        </div>
      </header>

      <div className="px-6 md:px-10 py-16">
        <div className="prose-mdx max-w-3xl mx-auto text-maze-cream">
          <SafeMDX source={source} />
        </div>
      </div>
    </article>
  )
}
