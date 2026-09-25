import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { Trail } from '@/components/ui/Trail'
import { Arrow } from '@/components/ui/Arrow'
import { getPublishedPosts, estimateReadTime } from '@/lib/posts'
import { JsonLd } from '@/components/JsonLd'
import { blogJsonLd, breadcrumbJsonLd, homeCrumb, postListJsonLd } from '@/lib/jsonLd'
import { pageMeta } from '@/lib/seo'

interface Props {
  params: { locale: string }
}

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'insights' })
  // An empty journal is a thin page: while nothing is published it stays out
  // of the index (and out of the sitemap) rather than competing for the
  // studio's own name with a heading and no content. It re-enters on its own
  // the moment a first post goes live.
  const posts = await getPublishedPosts()
  return pageMeta({
    locale,
    path: 'insights',
    title: t('metaTitle'),
    description: t('metaDesc'),
    ...(posts.length === 0 ? { robots: { index: false, follow: true } } : {}),
  })
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
    <div className="min-h-screen">
      <JsonLd data={[crumbs, blogJsonLd(locale), postListJsonLd(posts, locale)]} />

      <section className="pt-[9.5rem] md:pt-[10.5rem] pb-14 px-6 md:px-10 border-b border-maze-border">
        <div className="max-w-[1440px] mx-auto">
          <Trail steps={[{ label: t('label') }]} />
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h1 className="display-md text-maze-cream max-w-xl">{t('heading')}</h1>
            <p className="body-lg text-maze-muted max-w-sm md:text-right">{t('subtitle')}</p>
          </div>
        </div>
      </section>

      {/* A contents list, the same as the journal on the homepage: date,
          title, the first lines, the reading time. */}
      <section className="pb-24 px-6 md:px-10">
        <div className="max-w-[1440px] mx-auto">
          {posts.length === 0 ? (
            <div className="py-24 text-center text-maze-muted">
              <p className="body-lg">{t('empty')}</p>
            </div>
          ) : (
            <ul>
              {posts.map((p) => {
                const title   = isRu ? (p.titleRu   || p.title)   : p.title
                const excerpt = isRu ? (p.excerptRu || p.excerpt) : p.excerpt
                const body    = isRu ? (p.bodyRu    || p.body)    : p.body
                const { minutes } = estimateReadTime(body)
                return (
                  <li key={p.id} className="border-b border-maze-border">
                    <Link
                      href={`/insights/${p.slug}`}
                      className="group grid grid-cols-1 md:grid-cols-[9rem_minmax(0,1fr)_4rem_1rem] items-baseline gap-x-6 gap-y-2 py-7 md:py-9"
                    >
                      <time dateTime={p.publishedAt} className="font-mono text-xs text-maze-muted">
                        {fmt(p.publishedAt, locale)}
                      </time>
                      <div className="min-w-0">
                        <h2 className="heading-md text-maze-cream text-balance transition-colors duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-maze-lime">
                          {title}
                        </h2>
                        {excerpt && <p className="mt-2 max-w-3xl text-maze-muted line-clamp-2 text-pretty">{excerpt}</p>}
                        {p.tags.length > 0 && (
                          <p className="mt-3 flex flex-wrap gap-x-3 font-mono text-xs text-maze-muted">
                            {p.tags.slice(0, 4).map((tag) => <span key={tag}>#{tag}</span>)}
                          </p>
                        )}
                      </div>
                      <span className="hidden md:block font-mono text-xs text-maze-muted text-right">
                        {minutes} {isRu ? 'мин' : 'min'}
                      </span>
                      <Arrow
                        direction="right"
                        className="hidden md:block text-maze-muted transition-transform duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1"
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
