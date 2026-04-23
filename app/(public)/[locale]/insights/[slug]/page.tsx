import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getPostBySlug, getPublishedPosts, estimateReadTime } from '@/lib/posts'
import { getAdminSession } from '@/lib/auth'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd, homeCrumb, insightsCrumb, postJsonLd } from '@/lib/jsonLd'
import { localizedAlternates, SITE_URL } from '@/lib/seo'

interface Props {
  params: { locale: string; slug: string }
}

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
          <MDXRemote source={body} />
        </div>
      </div>
    </article>
  )
}
