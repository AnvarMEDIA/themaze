import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { getProjectBySlug, getPublishedProjects } from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { rankRelatedProjects, relatedPostsForProject } from '@/lib/recommend'
import { ProjectGallery } from '@/components/portfolio/ProjectGallery'
import { ProjectCard } from '@/components/portfolio/ProjectCard'
import { Trail } from '@/components/ui/Trail'
import { Arrow } from '@/components/ui/Arrow'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, projectJsonLd, homeCrumb, portfolioCrumb } from '@/lib/jsonLd'
import { pageMeta, notFoundMetadata } from '@/lib/seo'
import { getAdminSession } from '@/lib/auth'
import { imageAlt, projectMetaTitle, projectMetaDescription } from '@/lib/projectMeta'
import { slugify } from '@/lib/utils'

interface Props {
  params: { locale: string; slug: string }
}

// Projects come from the dynamic store and the page reads the admin
// session for draft preview (a dynamic, cookie-based API). Without
// force-dynamic the route is SSG: a project published after the last
// deploy isn't prerendered, renders on-demand in static mode, and 500s
// (DYNAMIC_SERVER_USAGE). Matches the insights detail + listing pages.
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  const projects = await getPublishedProjects()
  return routing.locales.flatMap((locale) =>
    projects.map((project) => ({ locale, slug: project.slug }))
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProjectBySlug(params.slug)
  if (!project) return notFoundMetadata
  // Admin overrides (metaTitle / metaDescription) win; otherwise we
  // generate "{title} — {category} for {client}" plus shortDescription.
  // OG / Twitter image is auto-generated via opengraph-image.tsx.
  const title = projectMetaTitle(project, params.locale)
  const desc  = projectMetaDescription(project, params.locale)
  return pageMeta({
    locale: params.locale,
    path: `portfolio/${project.slug}`,
    title,
    description: desc,
    type: 'article',
    article: {
      publishedTime: project.createdAt,
      modifiedTime:  project.updatedAt,
      tags: [...(project.categories ?? []), ...(project.tags ?? [])],
    },
  })
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = params
  setRequestLocale(locale)

  const t       = await getTranslations({ locale, namespace: 'portfolio' })
  const project = await getProjectBySlug(slug)

  if (!project) notFound()

  if (project.status === 'draft') {
    const authed = await getAdminSession()
    if (!authed) notFound()
  }

  const [all, allPosts] = await Promise.all([
    getPublishedProjects(),
    getPublishedPosts(),
  ])
  // Weighted recommendations (same client ≫ category > tags > services,
  // recency tie-break) plus cross-links to insights on the same topics.
  const related = rankRelatedProjects(project, all, 3)
  const journal = relatedPostsForProject(project, allPosts, 2)
  const clientSlug = slugify(project.client)

  // Prev / next neighbour in the published portfolio ordering, for
  // internal linking and "keep scrolling" UX.
  const idx  = all.findIndex((p) => p.id === project.id)
  const prev = idx > 0                 ? all[idx - 1] : null
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null

  const isRu = locale === 'ru'
  const title            = isRu ? (project.titleRu            || project.title)            : project.title
  const description      = isRu ? (project.descriptionRu      || project.description)      : project.description
  const shortDescription = isRu ? (project.shortDescriptionRu || project.shortDescription) : project.shortDescription
  const results          = isRu ? (project.resultsRu          || project.results)          : project.results
  const services         = isRu ? (project.servicesRu?.length ? project.servicesRu : project.services) : project.services

  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, isRu ? 'Главная' : 'Home'),
    portfolioCrumb(locale, isRu ? 'Портфолио' : 'Portfolio'),
    {
      name: title,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'}${locale === 'en' ? '' : '/' + locale}/portfolio/${project.slug}`,
    },
  ])

  return (
    <article className="pt-28 min-h-screen">
      <JsonLd data={[crumbs, projectJsonLd(project, locale)]} />
      {/* Hero */}
      <div className="px-6 md:px-10 pt-10 md:pt-14 pb-14 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <Trail steps={[{ label: t('heading'), href: '/portfolio' }, { label: title }]} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h1 className="display-md text-maze-cream mb-4 text-balance">{title}</h1>
              <Link
                href={`/portfolio/client/${clientSlug}`}
                className="heading-md text-maze-muted hover:text-maze-cream transition-colors inline-block"
              >
                {project.client}
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 lg:items-end">
              {project.showYear !== false && (
                <div>
                  <p className="label-sm text-maze-muted mb-1">{t('year')}</p>
                  <p className="font-semibold text-maze-cream">{project.year}</p>
                </div>
              )}
              <div>
                <p className="label-sm text-maze-muted mb-1">{t('category')}</p>
                <p className="font-semibold text-maze-cream">
                  {project.categories.map((c, i) => (
                    <span key={c}>
                      {i > 0 && ', '}
                      <Link
                        href={`/portfolio/category/${c}`}
                        className="underline decoration-maze-border underline-offset-4 transition-colors hover:text-maze-lime hover:decoration-maze-lime"
                      >
                        {(t.raw('categories') as Record<string,string>)[c] ?? c}
                      </Link>
                    </span>
                  ))}
                </p>
              </div>
              <div>
                <p className="label-sm text-maze-muted mb-2">{t('tags')}</p>
                <div className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="label-sm px-2 py-0.5 border border-maze-border rounded-full text-maze-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cover image */}
      <div className="w-full aspect-[21/9] relative bg-maze-gray overflow-hidden">
        {project.coverImage && (
          <Image
            src={project.coverImage}
            alt={imageAlt(project, project.coverImage, locale)}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
      </div>

      {/* Content */}
      <div className="px-6 md:px-10 py-20">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
            <h2 className="heading-lg text-maze-cream mb-6">{t('aboutProject')}</h2>
            <p className="body-lg text-maze-muted leading-relaxed mb-8">{description}</p>

            {results && (
              <div className="p-6 border border-maze-lime/30 rounded-sm bg-maze-lime/5">
                <p className="label-sm text-maze-lime mb-2">{t('results')}</p>
                <p className="body-lg text-maze-cream">{results}</p>
              </div>
            )}
          </div>

          <div>
            <div className="sticky top-28">
              <h3 className="label-sm text-maze-muted mb-4">{t('servicesDelivered')}</h3>
              <ul className="space-y-3">
                {services.map((s) => (
                  <li key={s} className="flex items-center gap-3">
                    <span aria-hidden="true" className="w-1.5 h-1.5 bg-maze-muted shrink-0" />
                    <span className="body-lg text-maze-cream">{s}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 pt-8 border-t border-maze-border">
                <p className="label-sm text-maze-muted mb-4">{t('likeProject')}</p>
                <Link href="/contact" className="btn btn-primary">
                  {t('startSimilar')}
                  <Arrow direction="right" className="text-base" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery — fullscreen lightbox slider */}
        <ProjectGallery
          images={project.images.map((url) => ({ url, alt: imageAlt(project, url, locale) }))}
          title={project.title}
          heading={t('gallery')}
        />

        {/* Related work — ranked by shared client, category, tags & services */}
        {related.length > 0 && (
          <div className="max-w-[1440px] mx-auto mt-24 pt-12 border-t border-maze-border">
            <h3 className="heading-md text-maze-cream mb-8">{t('relatedProjects')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
              {related.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} priority={false} />
              ))}
            </div>
          </div>
        )}

        {/* From the journal — insights sharing this project's topics,
            threading internal links between portfolio and blog. */}
        {journal.length > 0 && (
          <aside className="max-w-[1440px] mx-auto mt-20 pt-12 border-t border-maze-border">
            <h3 className="heading-md text-maze-cream mb-8">{isRu ? 'Из журнала' : 'From the journal'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {journal.map((post) => {
                const jTitle = isRu ? (post.titleRu || post.title) : post.title
                return (
                  <Link
                    key={post.id}
                    href={`/insights/${post.slug}`}
                    className="group flex items-center gap-4 p-4 rounded-sm border border-maze-border transition-colors hover:border-maze-muted"
                  >
                    {post.coverImage && (
                      <div className="relative w-28 h-20 shrink-0 rounded-sm overflow-hidden bg-maze-gray">
                        <Image src={post.coverImage} alt={jTitle} fill sizes="112px" className="object-cover" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-maze-muted mb-1">{isRu ? 'Статья' : 'Article'}</p>
                      <h4 className="font-semibold text-maze-cream group-hover:text-maze-lime transition-colors">{jTitle}</h4>
                    </div>
                  </Link>
                )
              })}
            </div>
          </aside>
        )}

        {/* Prev / next — neighbour links keep visitors in the portfolio
            and pass internal PageRank between cases. */}
        {(prev || next) && (
          <nav
            aria-label="Project navigation"
            className="max-w-[1440px] mx-auto mt-20 pt-10 border-t border-maze-border grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {prev ? (
              <Link
                href={`/portfolio/${prev.slug}`}
                className="group block p-5 rounded-sm border border-maze-border transition-colors hover:border-maze-muted"
                rel="prev"
              >
                <p className="label-sm text-maze-muted mb-2">← {isRu ? 'Предыдущий' : 'Previous'}</p>
                <p className="heading-md text-maze-cream group-hover:text-maze-lime transition-colors truncate">
                  {(isRu && prev.titleRu) || prev.title}
                </p>
                <p className="label-sm text-maze-muted mt-1 truncate">{prev.client}</p>
              </Link>
            ) : <span />}
            {next ? (
              <Link
                href={`/portfolio/${next.slug}`}
                className="group block p-5 rounded-sm border border-maze-border transition-colors hover:border-maze-muted md:text-right"
                rel="next"
              >
                <p className="label-sm text-maze-muted mb-2">{isRu ? 'Следующий' : 'Next'} →</p>
                <p className="heading-md text-maze-cream group-hover:text-maze-lime transition-colors truncate">
                  {(isRu && next.titleRu) || next.title}
                </p>
                <p className="label-sm text-maze-muted mt-1 truncate">{next.client}</p>
              </Link>
            ) : <span />}
          </nav>
        )}
      </div>
    </article>
  )
}
