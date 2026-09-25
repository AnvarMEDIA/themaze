import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Arrow } from '@/components/ui/Arrow'
import { MazeMark } from '@/components/home/MazeMark'
import { newMazeNumber } from '@/lib/maze'

export const metadata = {
  robots: { index: false, follow: false },
}

/**
 * Per-locale 404 — rendered inside the public layout, so the header and
 * footer stay. The homepage's maze again, walked the wrong way: in at the
 * entrance and on to a dead end. It used to be English on /ru as well.
 */
export default function LocaleNotFound() {
  const t = useTranslations('notFound')
  const mazeNo = newMazeNumber()

  return (
    <div className="min-h-[70vh] px-6 md:px-10 pt-36 md:pt-40 pb-20">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-12 lg:items-center">
        <div className="lg:col-span-7">
          <p className="font-mono text-xs text-maze-muted mb-5">{t('label')}</p>
          <h1 className="display-md text-maze-cream mb-6 text-balance">{t('heading')}</h1>
          <p className="body-lg text-maze-muted mb-10 max-w-md text-pretty">{t('body')}</p>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
            <Link href="/" className="btn btn-primary">
              {t('home')}
              <Arrow direction="right" className="text-base" />
            </Link>
            <Link href="/portfolio" className="link-arrow">
              {t('work')}
              <Arrow direction="right" className="text-base" />
            </Link>
          </div>
        </div>
        <div className="lg:col-span-4 lg:col-start-9 w-full max-w-[360px]">
          <MazeMark seed={mazeNo} lost label={t('mazeLabel')} className="block w-full h-auto" />
        </div>
      </div>
    </div>
  )
}
