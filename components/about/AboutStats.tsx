import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import type { LocalStat } from '@/lib/homeStats'

/**
 * The row of numbers on the About page. Its own component, on props only,
 * so the admin's "Numbers" page can show it as the site does.
 */
export function AboutStats({ stats }: { stats: LocalStat[] }) {
  return (
    <div className="px-6 md:px-10 py-16 border-b border-maze-border bg-maze-dark">
      <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.id} className="text-center">
            <div className="display-md text-maze-lime font-black">
              <AnimatedCounter end={s.value} suffix={s.suffix} />
            </div>
            <p className="label-sm text-maze-muted mt-2">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
