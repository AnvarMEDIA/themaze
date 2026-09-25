import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Arrow } from '@/components/ui/Arrow'
import { MazeMark } from './MazeMark'

// The studio's own figures, stated once on the page and never animated: a
// count-up is a number that is wrong for most of the time it is on screen.
const STATS = [
  { value: '200+', key: 'projects' },
  { value: '80+',  key: 'clients' },
  { value: '5+',   key: 'countries' },
] as const

/**
 * The first screen: what MAZE is, in one sentence, and the one picture only
 * MAZE could use — a maze whose only way through draws the M.
 */
export function Hero({ mazeNo }: { mazeNo: number }) {
  const t = useTranslations('home.hero')

  return (
    <section className="px-6 md:px-10 pt-28 md:pt-32 pb-4">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-12">
        <div className="lg:col-span-7 flex flex-col">
          <h1 className="text-maze-cream font-extrabold text-balance text-[clamp(2.625rem,5.6vw,5.75rem)] leading-[0.98] tracking-[-0.035em]">
            {t('heading')}
          </h1>
          <p className="mt-7 md:mt-9 max-w-[34rem] body-lg text-maze-muted text-pretty">
            {t('sub')}
          </p>
          <div className="mt-9 md:mt-11 flex flex-wrap items-center gap-x-7 gap-y-3">
            <Link href="/brief" className="btn btn-primary">
              {t('brief')}
              <Arrow direction="right" className="text-base" />
            </Link>
            <Link href="/portfolio" className="link-arrow">
              {t('work')}
              <Arrow direction="right" className="text-base" />
            </Link>
          </div>

          {/* Pushed to the foot of the column so it lines up with the maze. */}
          <div className="mt-12 lg:mt-auto lg:pt-14">
            <dl className="grid grid-cols-3 border-t border-maze-border max-w-[40rem]">
              {STATS.map(({ value, key }) => (
                <div key={key} className="flex flex-col-reverse gap-1.5 pt-5 pr-4">
                  <dt className="text-sm text-maze-muted">{t(`stats.${key}`)}</dt>
                  <dd className="text-[clamp(1.5rem,2.4vw,2.25rem)] font-bold leading-none tracking-[-0.02em] text-maze-cream tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <figure className="lg:col-span-5 w-full max-w-[460px] lg:max-w-[500px] lg:justify-self-end">
          <MazeMark
            seed={mazeNo}
            label={t('mazeLabel', { no: mazeNo })}
            className="block w-full h-auto"
          />
          <figcaption className="mt-4 font-mono text-[11px] leading-relaxed text-maze-muted">
            {t.rich('mazeCaption', {
              no: mazeNo,
              b: (chunks) => <span className="text-maze-cream">{chunks}</span>,
            })}
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
