import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { getPublishedPosts, estimateReadTime } from '@/lib/posts'
import { JsonLd } from '@/components/JsonLd'
import { blogJsonLd, breadcrumbJsonLd, homeCrumb, postListJsonLd } from '@/lib/jsonLd'
import { localizedAlternates } from '@/lib/seo'

interface Props {
  params: { locale: string }
}

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'insights' })
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
    alternates: localizedAlternates(locale, 'insights'),
  }
}

function fmt(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

export default async function InsightsPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const [t, posts] = await Promise.all([
    getTranslations({ locale, namespace: 'insights' }),
    getPublishedPosts(),
  ])

  const isRu   = locale === 'ru'
  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, isRu ? 'Главная' : 'Home'),
    { name: t('heading'), url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'}${locale === 'en' ? '' : '/' + locale}/insights` },
  ])

  return (
    <main className="min-h-screen">
      <JsonLd data={[crumbs, blogJsonLd(locale), postListJsonLd(posts, locale)]} />

      <section className="pt-28 pb-16 px-6 md:px-10 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <p className="label-sm text-maze-lime mb-5">{t('label')}</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h1 className="display-md text-maze-cream max-w-xl">{t('heading')}</h1>
            <p className="body-lg text-maze-muted max-w-sm md:text-right">{t('subtitle')}</p>
          </div>
        </div>
      </section>

      <section className="pt-12 pb-24 px-6 md:px-10">
        <div className="max-w-[1440px] mx-auto">
          {posts.length === 0 ? (
            <div className="py-24 text-center text-maze-muted">
              <p className="body-lg">{t('empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => {
                const title   = isRu ? (p.titleRu   || p.title)   : p.title
                const excerpt = isRu ? (p.excerptRu || p.excerpt) : p.excerpt
                const body    = isRu ? (p.bodyRu    || p.body)    : p.body
                const { minutes } = estimateReadTime(body)
                return (
                  <Link
                    key={p.id}
                    href={`/insights/${p.slug}`}
                    className="group rounded-2xl overflow-hidden border border-maze-border bg-maze-dark/30 hover:border-maze-lime/40 transition-colors duration-200 flex flex-col"
                  >
                    {p.coverImage && (
                      <div className="relative aspect-[16/10] bg-maze-gray overflow-hidden">
                        <Image
                          src={p.coverImage}
                          alt={title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 [@media(hover:hover)]:group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-3 label-sm text-maze-muted mb-4">
                        <span>{fmt(p.publishedAt, locale)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{minutes} {isRu ? 'мин' : 'min'}</span>
                      </div>
                      <h2 className="heading-md text-maze-cream mb-3 transition-colors [@media(hover:hover)]:group-hover:text-maze-lime">
                        {title}
                      </h2>
                      {excerpt && (
                        <p className="body-lg text-maze-muted flex-1 line-clamp-3">{excerpt}</p>
                      )}
                      {p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-maze-border">
                          {p.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="label-sm text-maze-muted">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
