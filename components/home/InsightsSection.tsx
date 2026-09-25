import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Arrow } from '@/components/ui/Arrow'
import { estimateReadTime, type Post } from '@/lib/posts'
import { SectionHead } from './SectionHead'

// Recent articles on the homepage flow authority from the site's top page to
// the blog, add a freshness signal, and deep-link posts for indexing. Set as
// a contents list rather than three more image cards: the work above is the
// picture; the journal is words.

const HOVER_LIME  = '[@media(hover:hover)_and_(pointer:fine)]:group-hover:text-maze-lime'
const HOVER_NUDGE = '[@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1'

function fmt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

export function InsightsSection({ posts, locale }: { posts: Post[]; locale: string }) {
  const t = useTranslations('home.journal')
  if (!posts.length) return null
  const isRu = locale === 'ru'

  return (
    <section className="px-6 md:px-10 py-12 md:py-16">
      <div className="max-w-[1440px] mx-auto">
        <SectionHead title={t('heading')} link={{ href: '/insights', label: t('all') }} />
        <ul>
          {posts.map((p) => {
            const title   = isRu ? (p.titleRu   || p.title)   : p.title
            const excerpt = isRu ? (p.excerptRu || p.excerpt) : p.excerpt
            const body    = isRu ? (p.bodyRu    || p.body)    : p.body
            const { minutes } = estimateReadTime(body)
            return (
              <li key={p.id} className="border-b border-maze-border first:border-t">
                <Link
                  href={`/insights/${p.slug}`}
                  className="group grid grid-cols-1 md:grid-cols-[9rem_minmax(0,1fr)_4rem_1rem] items-baseline gap-x-6 gap-y-2 py-6"
                >
                  <time dateTime={p.publishedAt} className="font-mono text-xs text-maze-muted">
                    {fmt(p.publishedAt, locale)}
                  </time>
                  <div className="min-w-0">
                    <h3 className={`heading-md text-maze-cream text-balance transition-colors duration-200 ${HOVER_LIME}`}>
                      {title}
                    </h3>
                    {excerpt && <p className="mt-2 max-w-3xl text-maze-muted line-clamp-2">{excerpt}</p>}
                  </div>
                  <span className="hidden md:block font-mono text-xs text-maze-muted text-right">
                    {t('min', { n: minutes })}
                  </span>
                  <Arrow
                    direction="right"
                    className={`hidden md:block text-maze-muted transition-transform duration-200 ease-out ${HOVER_NUDGE}`}
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
