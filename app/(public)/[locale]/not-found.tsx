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
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 md:px-10 py-32">
      <div className="max-w-xl text-center">
        <p className="label-sm text-maze-muted mb-6">Error · 404</p>
        <h1 className="display-md text-maze-lime mb-6 leading-[0.9]">Lost in the maze.</h1>
        <p className="body-lg text-maze-muted mb-10">
          The page you were looking for can&apos;t be found. It may have moved
          or never existed.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-6 py-3.5 bg-maze-lime text-maze-ink font-bold rounded-full label-sm hover:bg-maze-paper transition-colors active:scale-[0.97]"
          >
            Back to home
            <Arrow direction="up-right" className="text-sm transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 px-6 py-3.5 border border-maze-border text-maze-muted font-bold rounded-full label-sm hover:border-maze-cream hover:text-maze-cream transition-colors"
          >
            See our work
          </Link>
        </div>
      </div>
    </main>
  )
}
