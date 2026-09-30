import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Arrow } from '@/components/ui/Arrow'

export const metadata = {
  robots: { index: false, follow: false },
}

/**
 * Per-locale 404 — rendered inside the public layout, so Navbar/Footer/
 * smooth scroll stay intact. Copy is kept deliberately short and visual.
 */
export default function LocaleNotFound() {
  // In the visitor's language — it used to be English on /ru too.
  const t = useTranslations('notFound')
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 md:px-10 py-32">
      <div className="max-w-xl text-center">
        <p className="label-sm text-maze-muted mb-6">{t('label')}</p>
        <h1 className="display-md text-maze-lime mb-6 leading-[0.9]">{t('heading')}</h1>
        <p className="body-lg text-maze-muted mb-10">{t('body')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-6 py-3.5 bg-maze-lime text-maze-ink font-bold rounded-full label-sm hover:bg-maze-paper transition-colors active:scale-[0.97]"
          >
            {t('home')}
            <Arrow direction="up-right" className="text-sm transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 px-6 py-3.5 border border-maze-border text-maze-muted font-bold rounded-full label-sm hover:border-maze-cream hover:text-maze-cream transition-colors"
          >
            {t('work')}
          </Link>
        </div>
      </div>
    </div>
  )
}
