import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import type { LocalStat } from '@/lib/homeStats'

/**
 * The row of numbers on the About page. Its own component, on props only,
 * so the admin's "Numbers" page can show it as the site does.
 *
 * Four numbers, or three with one switched off in the admin: then three
 * columns, and on a phone the third one centred under the other two.
 */
export function AboutStats({ stats }: { stats: LocalStat[] }) {
  if (stats.length === 0) return null
  const odd = stats.length % 2 === 1
  return (
    <div className="px-6 md:px-10 py-16 border-b border-maze-border bg-maze-dark">
      <div className={`max-w-[1440px] mx-auto grid grid-cols-2 ${stats.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-8`}>
        {stats.map((s, i) => (
          <div key={s.id} className={`text-center ${odd && i === stats.length - 1 ? 'col-span-2 md:col-span-1' : ''}`}>
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
