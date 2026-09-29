import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { Reveal } from '@/components/ui/Reveal'
import { Arrow } from '@/components/ui/Arrow'
import { estimateReadTime, type Post } from '@/lib/posts'

// Server component (renders client <Reveal> leaves). Surfacing recent
// articles on the homepage flows authority from the site's top page to the
// blog, adds a freshness signal, and deep-links posts for indexing.

function fmt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

export function InsightsSection({ posts, locale }: { posts: Post[]; locale: string }) {
  if (!posts.length) return null
  const isRu = locale === 'ru'

  return (
    <section className="px-6 md:px-10 py-24 md:py-36 border-t border-maze-border">
      <div className="max-w-[1440px] mx-auto">
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-14 border-b border-maze-border pb-6">
            <div>
              <p className="label-sm text-maze-lime mb-3">{isRu ? 'Журнал' : 'Journal'}</p>
              <h2 className="display-md text-maze-cream">{isRu ? 'Идеи и заметки' : 'Ideas & notes'}</h2>
            </div>
            <Link
              href="/insights"
              className="group hidden sm:inline-flex items-center gap-2 label-sm text-maze-muted hover:text-maze-lime transition-colors whitespace-nowrap"
            >
              {isRu ? 'Все статьи' : 'All articles'}
              <Arrow direction="right" className="text-base transition-transform duration-200 [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((p, i) => {
            const title   = isRu ? (p.titleRu   || p.title)   : p.title
            const excerpt = isRu ? (p.excerptRu || p.excerpt) : p.excerpt
            const body    = isRu ? (p.bodyRu    || p.body)    : p.body
            const { minutes } = estimateReadTime(body)
            return (
              <Reveal key={p.id} delay={i * 0.06} className="h-full">
                <Link
                  href={`/insights/${p.slug}`}
                  data-cursor="view"
                  className="group card-lift h-full flex flex-col rounded-2xl overflow-hidden border border-maze-border bg-maze-dark/30 hover:border-maze-lime/40"
                >
                  {p.coverImage && (
                    <div className="relative aspect-[16/10] bg-maze-gray overflow-hidden">
                      <Image
                        src={p.coverImage}
                        alt={title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-3 label-sm text-maze-muted mb-4">
                      <span>{fmt(p.publishedAt, locale)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{minutes} {isRu ? 'мин' : 'min'}</span>
                    </div>
                    <h3 className="heading-md text-maze-cream mb-3 transition-colors [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-maze-lime">
                      {title}
                    </h3>
                    {excerpt && <p className="body-lg text-maze-muted flex-1 line-clamp-3">{excerpt}</p>}
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
