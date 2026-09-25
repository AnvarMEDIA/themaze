import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Arrow } from '@/components/ui/Arrow'

/**
 * Who the studio is and how an engagement actually runs.
 *
 * This replaces two sections: an About block (count-up stats a second time,
 * a paraphrased Steve Jobs quote) and a Discover / Define / Design / Deliver
 * process that describes every agency on earth. What is left is the studio's
 * own principle and the terms a prospect wants before they write — each one
 * already promised on the services page, stated here in a line.
 */
export function StudioSection() {
  const t = useTranslations('home.studio')
  const facts = t.raw('facts') as { k: string; v: string }[]

  return (
    <section className="px-6 md:px-10 py-12 md:py-16">
      <div className="max-w-[1440px] mx-auto border-t border-maze-border pt-6 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-12">
        <div className="lg:col-span-6">
          <h2 className="heading-lg text-maze-cream text-balance">{t('heading')}</h2>
          <p className="mt-6 max-w-xl body-lg text-maze-muted text-pretty">{t('body1')}</p>
          <p className="mt-4 max-w-xl body-lg text-maze-muted text-pretty">{t('body2')}</p>
          <Link href="/about" className="link-arrow mt-5">
            {t('more')}
            <Arrow direction="right" className="text-base" />
          </Link>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-maze-muted mb-3">
            {t('factsHeading')}
          </h3>
          <dl className="border-t border-maze-border">
            {facts.map((f) => (
              <div key={f.k} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 py-4 border-b border-maze-border">
                <dt className="font-mono text-xs text-maze-muted pt-[3px]">{f.k}</dt>
                <dd className="text-maze-cream">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
