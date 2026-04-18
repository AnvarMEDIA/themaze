import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { getAllProjects, getProjectBySlug } from '@/lib/portfolio'

interface Props {
  params: { locale: string; slug: string }
}

export async function generateStaticParams() {
  const projects = await getAllProjects()
  return routing.locales.flatMap((locale) =>
    projects.map((project) => ({ locale, slug: project.slug }))
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProjectBySlug(params.slug)
  if (!project) return {}
  const isRu = params.locale === 'ru'
  const title = isRu ? (project.titleRu || project.title) : project.title
  const desc  = isRu ? (project.shortDescriptionRu || project.shortDescription) : project.shortDescription
  return {
    title: `${title} — ${project.client}`,
    description: desc,
    openGraph: {
      title: `${title} | MAZE Studio`,
      description: desc,
      images: [{ url: project.coverImage }],
    },
  }
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = params
  setRequestLocale(locale)

  const t       = await getTranslations({ locale, namespace: 'portfolio' })
  const project = await getProjectBySlug(slug)

  if (!project) notFound()

  const all     = await getAllProjects()
  const related = all
    .filter((p) => p.id !== project.id && p.categories.some((c) => project.categories.includes(c)))
    .slice(0, 2)

  const isRu = locale === 'ru'
  const title            = isRu ? (project.titleRu            || project.title)            : project.title
  const description      = isRu ? (project.descriptionRu      || project.description)      : project.description
  const shortDescription = isRu ? (project.shortDescriptionRu || project.shortDescription) : project.shortDescription
  const results          = isRu ? (project.resultsRu          || project.results)          : project.results
  const services         = isRu ? (project.servicesRu?.length ? project.servicesRu : project.services) : project.services

  return (
    <article className="pt-28 min-h-screen">
      {/* Hero */}
      <div className="px-6 md:px-10 pb-14 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <Link
            href="/portfolio"
            className="label-sm text-maze-muted hover:text-maze-lime transition-colors mb-8 inline-flex items-center gap-2"
          >
            {t('backToWork')}
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {project.categories.map((c) => (
                  <span key={c} className="label-sm text-maze-lime">
                    {(t.raw('categories') as Record<string,string>)[c] ?? c}
                  </span>
                ))}
              </div>
              <h1 className="display-md text-maze-cream mb-4">{title}</h1>
              <p className="heading-md text-maze-muted">{project.client}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 lg:items-end">
              <div>
                <p className="label-sm text-maze-muted mb-1">{t('year')}</p>
                <p className="font-semibold text-maze-cream">{project.year}</p>
              </div>
              <div>
                <p className="label-sm text-maze-muted mb-1">{t('category')}</p>
                <p className="font-semibold text-maze-cream">
                  {project.categories.map((c) => (t.raw('categories') as Record<string,string>)[c] ?? c).join(', ')}
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
            alt={project.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[20vw] font-black opacity-5" style={{ color: project.accentColor }}>
            {project.title.slice(0, 2)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-10 py-20">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
            <h2 className="heading-lg text-maze-cream mb-6">{t('aboutProject')}</h2>
            <p className="body-lg text-maze-muted leading-relaxed mb-8">{description}</p>

            {results && (
              <div className="p-6 border border-maze-lime/30 rounded-xl bg-maze-lime/5">
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
                    <span className="w-1.5 h-1.5 rounded-full bg-maze-lime shrink-0" />
                    <span className="body-lg text-maze-cream">{s}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 pt-8 border-t border-maze-border">
                <p className="label-sm text-maze-muted mb-4">{t('likeProject')}</p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-maze-lime text-maze-ink font-bold rounded-full label-sm hover:bg-maze-paper transition-colors"
                >
                  {t('startSimilar')} ↗
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery */}
        {project.images.length > 0 && (
          <div className="max-w-[1440px] mx-auto mt-20">
            <h3 className="heading-md text-maze-cream mb-8">{t('gallery')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.images.map((img, i) => (
                <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-maze-gray">
                  <Image
                    src={img}
                    alt={`${project.title} — image ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="max-w-[1440px] mx-auto mt-24 pt-12 border-t border-maze-border">
            <h3 className="heading-md text-maze-cream mb-8">{t('relatedProjects')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/portfolio/${p.slug}`}
                  className="group block p-6 rounded-xl border border-maze-border transition-colors duration-200 [@media(hover:hover)_and_(pointer:fine)]:hover:border-maze-lime"
                  data-cursor="view"
                >
                  <p className="label-sm text-maze-lime mb-2">
                    {p.categories.map((c) => (t.raw('categories') as Record<string,string>)[c] ?? c).join(' · ')}
                  </p>
                  <h4 className="heading-md text-maze-cream transition-colors duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-maze-lime">{p.title}</h4>
                  <p className="label-sm text-maze-muted mt-1">{p.client}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
