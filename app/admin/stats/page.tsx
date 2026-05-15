import Link from 'next/link'
import { getAnalytics, sumRange, dailyTotals } from '@/lib/analytics'
import { getAllProjects } from '@/lib/portfolio'
import { getPublishedPosts } from '@/lib/posts'

export const dynamic = 'force-dynamic'

interface Row {
  path:  string
  total: number
  week:  number
  month: number
  label: string
}

function fmt(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString('en-US')
}

const STATIC_LABELS: Record<string, string> = {
  '':           'Home',
  '/':          'Home',
  '/portfolio': 'Portfolio',
  '/services':  'Services',
  '/insights':  'Insights',
  '/about':     'About',
  '/contact':   'Contact',
  '/legal/privacy': 'Privacy Policy',
  '/legal/terms':   'Terms of Service',
  '/legal/cookies': 'Cookie Policy',
}

export default async function StatsPage() {
  const [data, projects, posts] = await Promise.all([
    getAnalytics(),
    getAllProjects({ includeDeleted: true }),
    getPublishedPosts(),
  ])

  const slugToTitle = new Map<string, string>()
  for (const p of projects) slugToTitle.set(`/portfolio/${p.slug}`, `${p.title} — ${p.client}`)
  for (const p of posts)    slugToTitle.set(`/insights/${p.slug}`,  p.title)

  // Build per-path rows.
  const rows: Row[] = Object.entries(data.daily).map(([path, byDate]) => ({
    path,
    total: sumRange(byDate),
    week:  sumRange(byDate, 7),
    month: sumRange(byDate, 30),
    label: slugToTitle.get(path) ?? STATIC_LABELS[path] ?? path,
  }))

  // Totals.
  const totalAll   = rows.reduce((s, r) => s + r.total, 0)
  const totalWeek  = rows.reduce((s, r) => s + r.week,  0)
  const totalMonth = rows.reduce((s, r) => s + r.month, 0)
  const totalToday = (() => {
    const key = new Date().toISOString().slice(0, 10)
    let n = 0
    for (const byDate of Object.values(data.daily)) n += byDate[key] ?? 0
    return n
  })()

  // 30-day series for the chart.
  const series = dailyTotals(data, 30)
  const maxDaily = Math.max(1, ...series.map((d) => d.count))

  // Top pages by total.
  const topAll = [...rows].sort((a, b) => b.total - a.total).slice(0, 10)
  const topWeek = [...rows].sort((a, b) => b.week - a.week).slice(0, 10).filter((r) => r.week > 0)

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Statistics</h1>
        <p className="text-sm text-[#555] mt-1">
          First-party pageviews — bots, repeat refreshes within a minute and admin self-views are excluded.
          Data is retained for 90 days.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Today"      value={totalToday} />
        <StatCard label="This week"  value={totalWeek} />
        <StatCard label="This month" value={totalMonth} />
        <StatCard label="All time"   value={totalAll} accent />
      </div>

      {/* 30-day bar chart */}
      <section className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] p-5 mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Pageviews — last 30 days</h2>
          <span className="text-xs text-[#444]">peak: {fmt(maxDaily)} / day</span>
        </div>
        <div className="flex items-end gap-px h-32" role="img" aria-label="Daily pageviews chart">
          {series.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} view${d.count === 1 ? '' : 's'}`}
              className="flex-1 bg-[#C8FF47]/30 hover:bg-[#C8FF47] transition-colors duration-150 rounded-sm"
              style={{ height: `${Math.max(2, (d.count / maxDaily) * 100)}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[#444] mt-2 font-mono">
          <span>{series[0]?.date}</span>
          <span>{series[Math.floor(series.length / 2)]?.date}</span>
          <span>{series[series.length - 1]?.date}</span>
        </div>
      </section>

      {/* Top pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopTable title="Most viewed (all time)" rows={topAll} column="total" />
        <TopTable title="Most viewed this week"  rows={topWeek} column="week" />
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-[#555] mt-10 text-center">
          No pageviews recorded yet. Visit a public page to populate this dashboard.
        </p>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={[
      'rounded-xl border p-5',
      accent
        ? 'bg-[#C8FF47]/10 border-[#C8FF47]/30'
        : 'bg-[#0D0D0D] border-[#1E1E1E]',
    ].join(' ')}>
      <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#555] mb-2">{label}</p>
      <p className={['text-3xl font-bold tabular-nums', accent ? 'text-[#C8FF47]' : 'text-white'].join(' ')}>
        {fmt(value)}
      </p>
    </div>
  )
}

function TopTable({ title, rows, column }: { title: string; rows: Row[]; column: 'total' | 'week' }) {
  return (
    <div className="rounded-xl bg-[#0D0D0D] border border-[#1E1E1E] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1E1E1E]">
        <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#555]">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-[#555]">No data yet.</p>
      ) : (
        <ol className="divide-y divide-[#1A1A1A]">
          {rows.map((r, i) => (
            <li key={r.path} className="flex items-center gap-3 px-5 py-3 hover:bg-[#111] transition-colors">
              <span className="text-[11px] font-mono text-[#333] w-5 text-center shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <Link
                  href={r.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white truncate block hover:text-[#C8FF47] transition-colors"
                  title={r.path}
                >
                  {r.label}
                </Link>
                <p className="text-[11px] text-[#444] font-mono truncate">{r.path}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-[#C8FF47] tabular-nums">{fmt(r[column])}</p>
                <p className="text-[10px] text-[#555] tabular-nums">{column === 'total' ? `${fmt(r.week)} / week` : `${fmt(r.total)} total`}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
