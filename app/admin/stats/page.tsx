import { StatsScreen } from '@/components/admin/StatsScreen'
import { NotifyIndexingButton } from '@/components/admin/NotifyIndexingButton'

/**
 * Admin → Статистика. The numbers are read by the screen itself
 * (/api/analytics/stats), so they can follow the period picked and refresh
 * every minute; the daily report's status is on the dashboard.
 */
export default function StatsPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Статистика</h1>
          <p className="mt-1 text-sm text-[#8A8A8A]">
            Посетители, откуда они пришли и сколько оставили заявок — по счётчику самого сайта.
          </p>
        </div>
        <NotifyIndexingButton />
      </div>
      <StatsScreen />
    </div>
  )
}
