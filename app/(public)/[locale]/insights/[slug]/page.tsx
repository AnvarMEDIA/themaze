import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { SafeMDX } from '@/components/SafeMDX'
import { getPostBySlug, getPublishedPosts, estimateReadTime } from '@/lib/posts'
import { getPublishedProjects } from '@/lib/portfolio'
import { rankRelatedPosts, relatedProjectsForPost } from '@/lib/recommend'
import { getAdminSession } from '@/lib/auth'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, homeCrumb, insightsCrumb, postJsonLd } from '@/lib/jsonLd'
import { localizedAlternates, ogLocale, SITE_URL } from '@/lib/seo'

interface Props {
  params: { locale: string; slug: string }
}

// Content is served from the dynamic store, exactly like the insights
// list and every other store-backed page. Without this the route is
// treated as SSG: only posts that existed at build time get prerendered,
// and a post created afterwards renders on-demand in static mode, hits a
// dynamic server API and 500s (DYNAMIC_SERVER_USAGE). Force-dynamic keeps
// new posts working the moment they're published.
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  const posts = await getPublishedPosts()
  return routing.locales.flatMap((locale) =>
    posts.map((post) => ({ locale, slug: post.slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)
  if (!post) return {}
  const isRu  = params.locale === 'ru'
  const title = isRu ? (post.titleRu   || post.title)   : post.title
  const desc  = isRu ? (post.excerptRu || post.excerpt) : post.excerpt
  return {
    title,
    description: desc,
    alternates: localizedAlternates(params.locale, `insights/${post.slug}`),
    openGraph: {
      type: 'article',
      ...ogLocale(params.locale),
      title,
      description: desc,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  }
}

function fmt(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

export default async function InsightPage({ params }: Props) {
  const { locale, slug } = params
  setRequestLocale(locale)

  const t    = await getTranslations({ locale, namespace: 'insights' })
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  if (post.status !== 'published') {
    const authed = await getAdminSession()
    if (!authed) notFound()
  }

  const isRu  = locale === 'ru'
  const title = isRu ? (post.titleRu   || post.title)   : post.title
  const body  = isRu ? (post.bodyRu    || post.body)    : post.body
  const excerpt = isRu ? (post.excerptRu || post.excerpt) : post.excerpt
  const { minutes } = estimateReadTime(body)

  // Recommendation engine: same-type related posts + cross-links to
  // portfolio work sharing this article's topics. Threads internal links
  // between the blog and the portfolio and keeps readers on-site.
  const [allPosts, allProjects] = await Promise.all([
    getPublishedPosts(),
    getPublishedProjects(),
  ])
  const related     = rankRelatedPosts(post, allPosts, 3)
  const relatedWork = relatedProjectsForPost(post, allProjects, 3)

  const crumbs = breadcrumbJsonLd([
    homeCrumb(locale, isRu ? 'Главная' : 'Home'),
    insightsCrumb(locale, isRu ? 'Инсайты' : 'Insights'),
    { name: title, url: `${SITE_URL}${locale === 'en' ? '' : '/' + locale}/insights/${post.slug}` },
  ])

  return (
    <article className="pt-28 min-h-screen">
      <JsonLd data={[crumbs, postJsonLd(post, locale)]} />

      <div className="px-6 md:px-10 pb-14 border-b border-maze-border">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/insights"
            className="label-sm text-maze-muted hover:text-maze-lime transition-colors mb-8 inline-flex items-center gap-2"
          >
            ← {t('back')}
          </Link>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 mb-6">
              {post.tags.slice(0, 5).map((tag) => (
                <span key={tag} className="label-sm text-maze-lime">#{tag}</span>
              ))}
            </div>
          )}

          <h1 className="display-md text-maze-cream mb-6">{title}</h1>
          {excerpt && <p className="body-lg text-maze-muted max-w-2xl mb-8">{excerpt}</p>}

          <div className="flex items-center gap-3 label-sm text-maze-muted">
            <span>{post.author}</span>
            <span aria-hidden="true">·</span>
            <span>{fmt(post.publishedAt, locale)}</span>
            <span aria-hidden="true">·</span>
            <span>{minutes} {isRu ? 'мин чтения' : 'min read'}</span>
          </div>
        </div>
      </div>

      {post.coverImage && (
        <div className="w-full aspect-[21/9] relative bg-maze-gray">
          <Image
            src={post.coverImage}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="px-6 md:px-10 py-16 md:py-20">
        <div
          className="prose-mdx max-w-3xl mx-auto text-maze-cream"
          style={{
            // minimal, readable defaults — actual styles below
          }}
        >
          <SafeMDX source={body} />
        </div>
      </div>

      {related.length > 0 && (
        <aside className="px-6 md:px-10 pb-24 border-t border-maze-border">
          <div className="max-w-5xl mx-auto pt-16">
            <h2 className="heading-lg text-maze-cream mb-10">
              {isRu ? 'Похожие статьи' : 'Related reading'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((p) => {
                const rTitle = isRu ? (p.titleRu || p.title) : p.title
                return (
                  <Link key={p.id} href={`/insights/${p.slug}`} className="group block">
                    {p.coverImage && (
                      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-maze-gray mb-4">
                        <Image
                          src={p.coverImage}
                          alt={rTitle}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-105"
                        />
                      </div>
                    )}
                    <p className="label-sm text-maze-muted mb-2">{fmt(p.publishedAt, locale)}</p>
                    <h3 className="font-semibold text-maze-cream group-hover:text-maze-lime transition-colors">
                      {rTitle}
                    </h3>
                  </Link>
                )
              })}
            </div>
          </div>
        </aside>
      )}

      {relatedWork.length > 0 && (
        <aside className="px-6 md:px-10 pb-24 border-t border-maze-border">
          <div className="max-w-5xl mx-auto pt-16">
            <h2 className="heading-lg text-maze-cream mb-10">
              {isRu ? 'Связанные работы' : 'Related work'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedWork.map((p) => {
                const wTitle = isRu ? (p.titleRu || p.title) : p.title
                return (
                  <Link key={p.id} href={`/portfolio/${p.slug}`} className="group block">
                    {p.coverImage && (
                      <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-maze-gray mb-4">
                        <Image
                          src={p.coverImage}
                          alt={wTitle}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-105"
                        />
                      </div>
                    )}
                    <p className="label-sm text-maze-lime mb-1">{p.client}</p>
                    <h3 className="font-semibold text-maze-cream group-hover:text-maze-lime transition-colors">
                      {wTitle}
                    </h3>
                  </Link>
                )
              })}
            </div>
          </div>
        </aside>
      )}
    </article>
  )
}
