import { StatsScreen } from '@/components/admin/StatsScreen'
import { NotifyIndexingButton } from '@/components/admin/NotifyIndexingButton'
import { getAllProjects } from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'
import { parsePeriod } from '@/lib/stats/periods'

export const dynamic = 'force-dynamic'

/**
 * Names for the pages that have one beyond the site's own sections: a
 * project's, an article's. Without them the list of pages reads as slugs.
 * If they cannot be read the screen still opens, with the addresses alone.
 */
async function pageTitles(): Promise<Record<string, string>> {
  const titles: Record<string, string> = {}
  const [projects, posts] = await Promise.all([
    getAllProjects({ includeDeleted: true }).catch(() => []),
    getPublishedPosts().catch(() => []),
  ])
  for (const p of projects) titles[`/portfolio/${p.slug}`] = p.client ? `${p.title} — ${p.client}` : p.title
  for (const p of posts) titles[`/insights/${p.slug}`] = p.title
  return titles
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/**
 * Admin → Статистика. The numbers are read by the screen itself
 * (/api/analytics/stats), so they can follow the period picked and refresh
 * every minute; the period can come in the address (?period=7, or
 * ?from=…&to=…), which is how a reload or a shared link opens on the same
 * numbers. The daily report's status is on the dashboard.
 */
export default async function StatsPage({ searchParams }: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const initialPeriod = parsePeriod({ period: one(searchParams.period), from: one(searchParams.from), to: one(searchParams.to) })
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl">
      <StatsScreen initialPeriod={initialPeriod} pageTitles={await pageTitles()} />

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[#161616] pt-5">
        <p className="max-w-xl text-[12px] leading-relaxed text-[#6B6B6B]">
          Поисковикам (Bing, Яндекс и другим участникам IndexNow) сайт сообщает о новых страницах сам, при публикации.
          Кнопка отправляет им все страницы разом — после большого обновления сайта.
        </p>
        <NotifyIndexingButton />
      </footer>
    </div>
  )
}
